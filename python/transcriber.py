#!/usr/bin/env python3
"""
EasyScribe Python Transcriber Sidecar
Implements JSON-RPC server for faster-whisper transcription
"""

import sys
import json
import os
import traceback
from pathlib import Path
from faster_whisper import WhisperModel
import time

# Model configuration
MODEL_NAME = "deepdml/faster-whisper-large-v3-turbo-ct2"
MODEL_SIZE = "large-v3-turbo"
COMPUTE_TYPE = "float16"  # Use float16 for GPU, int8 for CPU

class Transcriber:
    """Main transcriber class with JSON-RPC interface"""
    
    def __init__(self):
        self.model = None
        self.model_loaded = False
        self.load_error = None
        self._load_model()
    
    def _load_model(self):
        """Load the faster-whisper model"""
        try:
            print(json.dumps({
                "jsonrpc": "2.0",
                "method": "status",
                "params": {
                    "status": "loading",
                    "message": f"Loading model: {MODEL_NAME}"
                }
            }), flush=True)
            
            # Determine compute type based on available hardware
            import torch
            if torch.cuda.is_available():
                compute_type = "float16"
                device = "cuda"
            else:
                compute_type = "int8"
                device = "cpu"
            
            self.model = WhisperModel(
                MODEL_SIZE,
                device=device,
                compute_type=compute_type,
                download_root=os.path.join(os.path.expanduser("~"), ".cache", "huggingface")
            )
            self.model_loaded = True
            
            print(json.dumps({
                "jsonrpc": "2.0",
                "method": "status",
                "params": {
                    "status": "ready",
                    "message": f"Model loaded successfully on {device}"
                }
            }), flush=True)
            
        except Exception as e:
            self.load_error = str(e)
            self.model_loaded = False
            print(json.dumps({
                "jsonrpc": "2.0",
                "method": "error",
                "params": {
                    "code": -32603,
                    "message": f"Failed to load model: {str(e)}",
                    "data": traceback.format_exc()
                }
            }), flush=True, file=sys.stderr)
    
    def transcribe(self, audio_path, language=None, task="transcribe"):
        """
        Transcribe an audio file
        
        Args:
            audio_path: Path to audio file
            language: Language code (e.g., 'en', 'pl') or None for auto-detect
            task: 'transcribe' or 'translate'
        
        Returns:
            Dictionary with transcription results
        """
        if not self.model_loaded:
            return {
                "error": {
                    "code": -32001,
                    "message": "Model not loaded",
                    "data": self.load_error
                }
            }
        
        if not os.path.exists(audio_path):
            return {
                "error": {
                    "code": -32002,
                    "message": f"Audio file not found: {audio_path}"
                }
            }
        
        try:
            segments, info = self.model.transcribe(
                audio_path,
                language=language,
                task=task,
                beam_size=5,
                vad_filter=True,
                vad_parameters={
                    "min_silence_duration_ms": 500,
                    "speech_pad_ms": 30
                }
            )
            
            # Collect all segments
            segments_list = []
            full_text = ""
            
            for segment in segments:
                segment_data = {
                    "start": segment.start,
                    "end": segment.end,
                    "text": segment.text.strip(),
                    "avg_logprob": segment.avg_logprob if hasattr(segment, 'avg_logprob') else None
                }
                segments_list.append(segment_data)
                full_text += segment.text + " "
            
            return {
                "result": {
                    "text": full_text.strip(),
                    "segments": segments_list,
                    "language": info.language,
                    "language_probability": info.language_probability,
                    "duration": info.duration
                }
            }
            
        except Exception as e:
            return {
                "error": {
                    "code": -32003,
                    "message": f"Transcription failed: {str(e)}",
                    "data": traceback.format_exc()
                }
            }
    
    def get_status(self):
        """Get current status of the transcriber"""
        if self.model_loaded:
            return {
                "result": {
                    "status": "ready",
                    "model": MODEL_NAME,
                    "available": True
                }
            }
        else:
            return {
                "result": {
                    "status": "error",
                    "model": MODEL_NAME,
                    "available": False,
                    "error": self.load_error
                }
            }
    
    def shutdown(self):
        """Graceful shutdown"""
        self.model = None
        self.model_loaded = False
        return {
            "result": {
                "status": "shutdown",
                "message": "Transcriber shutdown complete"
            }
        }

class JSONRPCServer:
    """JSON-RPC 2.0 server implementation"""
    
    def __init__(self):
        self.transcriber = Transcriber()
        self.running = True
    
    def send_response(self, response):
        """Send JSON-RPC response to stdout"""
        print(json.dumps(response), flush=True)
    
    def send_error(self, request_id, code, message, data=None):
        """Send JSON-RPC error response"""
        error = {"code": code, "message": message}
        if data:
            error["data"] = data
        
        response = {
            "jsonrpc": "2.0",
            "id": request_id,
            "error": error
        }
        self.send_response(response)
    
    def send_result(self, request_id, result):
        """Send JSON-RPC result response"""
        response = {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": result
        }
        self.send_response(response)
    
    def handle_request(self, request):
        """Handle incoming JSON-RPC request"""
        try:
            # Validate JSON-RPC request
            if "jsonrpc" not in request or request["jsonrpc"] != "2.0":
                self.send_error(
                    request.get("id"),
                    -32600,
                    "Invalid Request: jsonrpc version must be 2.0"
                )
                return
            
            if "method" not in request:
                self.send_error(
                    request.get("id"),
                    -32600,
                    "Invalid Request: method is required"
                )
                return
            
            method = request["method"]
            params = request.get("params", {})
            request_id = request.get("id")
            
            # Handle methods
            if method == "transcribe":
                result = self.transcriber.transcribe(
                    audio_path=params.get("audio_path"),
                    language=params.get("language"),
                    task=params.get("task", "transcribe")
                )
                
                if "error" in result:
                    self.send_error(request_id, result["error"]["code"], result["error"]["message"], result["error"].get("data"))
                else:
                    self.send_result(request_id, result["result"])
            
            elif method == "get_status":
                result = self.transcriber.get_status()
                self.send_result(request_id, result["result"])
            
            elif method == "shutdown":
                result = self.transcriber.shutdown()
                self.send_result(request_id, result["result"])
                self.running = False
            
            else:
                self.send_error(
                    request_id,
                    -32601,
                    f"Method not found: {method}"
                )
        
        except json.JSONDecodeError:
            self.send_error(None, -32700, "Parse error: Invalid JSON")
        except Exception as e:
            self.send_error(
                request.get("id") if 'request' in locals() else None,
                -32603,
                f"Internal error: {str(e)}",
                traceback.format_exc()
            )
    
    def run(self):
        """Main server loop"""
        print(json.dumps({
            "jsonrpc": "2.0",
            "method": "status",
            "params": {
                "status": "starting",
                "message": "Python transcriber starting..."
            }
        }), flush=True)
        
        try:
            for line in sys.stdin:
                if not self.running:
                    break
                
                line = line.strip()
                if not line:
                    continue
                
                try:
                    request = json.loads(line)
                    self.handle_request(request)
                except json.JSONDecodeError:
                    self.send_error(None, -32700, "Parse error: Invalid JSON")
        
        except KeyboardInterrupt:
            pass
        finally:
            # Cleanup
            if self.transcriber.model:
                del self.transcriber.model

def main():
    """Main entry point"""
    server = JSONRPCServer()
    server.run()

if __name__ == "__main__":
    main()
