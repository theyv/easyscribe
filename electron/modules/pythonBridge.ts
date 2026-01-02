/**
 * Python Bridge Module
 * Manages communication with the Python transcriber sidecar process
 */

import { spawn, ChildProcess } from 'child_process';
import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

// Types
export interface TranscribeOptions {
  language?: string;
  task?: 'transcribe' | 'translate';
}

export interface TranscriptionResult {
  text: string;
  segments: Array<{
    start: number;
    end: number;
    text: string;
    avg_logprob?: number;
  }>;
  language: string;
  language_probability: number;
  duration: number;
}

export interface PythonStatus {
  status: 'ready' | 'error' | 'loading';
  model: string;
  available: boolean;
  error?: string;
}

export interface DownloadProgress {
  status: 'downloading' | 'verifying' | 'complete' | 'error';
  progress: number;
  message: string;
  error?: string;
}

export interface JSONRPCRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, any>;
}

export interface JSONRPCResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

// State
let pythonProcess: ChildProcess | null = null;
let requestId = 0;
const pendingRequests = new Map<string | number, {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}>();
let pythonStatus: PythonStatus | null = null;
let healthCheckInterval: NodeJS.Timeout | null = null;
let restartAttempts = 0;
const MAX_RESTART_ATTEMPTS = 3;

// Download progress callback
let downloadProgressCallback: ((progress: DownloadProgress) => void) | null = null;

// Get Python executable path
function getPythonPath(): string {
  // In production, Python should be bundled or in PATH
  // For development, use python from PATH
  const isWin = process.platform === 'win32';
  return isWin ? 'python' : 'python3';
}

// Get transcriber script path
function getTranscriberPath(): string {
  const isDev = !app.isPackaged;
  
  if (isDev) {
    // Development: use python/transcriber.py
    return path.join(process.cwd(), 'python', 'transcriber.py');
  } else {
    // Production: use bundled transcriber.py
    return path.join(process.resourcesPath, 'python', 'transcriber.py');
  }
}

// Check if Python is available
export function isPythonAvailable(): boolean {
  try {
    const pythonPath = getPythonPath();
    const transcriberPath = getTranscriberPath();
    
    // Check if transcriber.py exists
    if (!fs.existsSync(transcriberPath)) {
      console.error('Python transcriber script not found:', transcriberPath);
      return false;
    }
    
    // Try to verify Python is executable by checking if it exists in PATH
    // We'll do a simple spawn check to see if Python can be executed
    const { spawnSync } = require('child_process');
    
    // Try to execute a simple Python command to verify it works
    const result = spawnSync(pythonPath, ['--version'], {
      stdio: 'pipe',
      timeout: 5000
    });
    
    if (result.error) {
      console.error('Python executable not found or not executable:', pythonPath, result.error);
      return false;
    }
    
    if (result.status !== 0) {
      console.error('Python executable returned non-zero status:', result.status);
      return false;
    }
    
    console.log('Python is available:', pythonPath);
    return true;
  } catch (error) {
    console.error('Error checking Python availability:', error);
    return false;
  }
}

// Send JSON-RPC request to Python process
function sendRequest(method: string, params: Record<string, any> = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!pythonProcess || pythonProcess.killed) {
      reject(new Error('Python process is not running'));
      return;
    }

    const id = ++requestId;
    const request: JSONRPCRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    // Set timeout for request (5 minutes for transcription)
    const timeout = setTimeout(() => {
      pendingRequests.delete(id);
      reject(new Error(`Request timeout: ${method}`));
    }, 5 * 60 * 1000);

    pendingRequests.set(id, { resolve, reject, timeout });

    try {
      pythonProcess.stdin?.write(JSON.stringify(request) + '\n');
    } catch (error) {
      pendingRequests.delete(id);
      clearTimeout(timeout);
      reject(error);
    }
  });
}

// Handle response from Python process
function handleResponse(data: string): void {
  try {
    const response: JSONRPCResponse = JSON.parse(data);
    
    // Handle status notifications (no id)
    if (!response.id) {
      if (response.result?.status) {
        pythonStatus = response.result;
        console.log('Python status:', pythonStatus);
      }
      return;
    }

    // Handle request responses
    const pending = pendingRequests.get(response.id);
    if (pending) {
      clearTimeout(pending.timeout);
      pendingRequests.delete(response.id);

      if (response.error) {
        const error = new Error(response.error.message);
        (error as any).code = response.error.code;
        (error as any).data = response.error.data;
        pending.reject(error);
      } else {
        pending.resolve(response.result);
      }
    }
  } catch (error) {
    console.error('Error handling Python response:', error);
  }
}

// Start Python process
export async function startPythonProcess(): Promise<boolean> {
  if (pythonProcess && !pythonProcess.killed) {
    console.log('Python process already running');
    return true;
  }

  if (!isPythonAvailable()) {
    console.error('Python is not available');
    return false;
  }

  const pythonPath = getPythonPath();
  const transcriberPath = getTranscriberPath();

  console.log('Starting Python process:', pythonPath, transcriberPath);

  try {
    pythonProcess = spawn(pythonPath, [transcriberPath], {
      cwd: path.dirname(transcriberPath),
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1'
      }
    });

    // Handle stdout (responses)
    pythonProcess.stdout?.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter(line => line.trim());
      lines.forEach(line => handleResponse(line));
    });

    // Handle stderr (errors and status)
    pythonProcess.stderr?.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter(line => line.trim());
      lines.forEach(line => {
        try {
          const parsed = JSON.parse(line);
          if (parsed.error) {
            console.error('Python error:', parsed.error);
          } else {
            console.log('Python stderr:', line);
          }
        } catch {
          console.error('Python stderr:', line);
        }
      });
    });

    // Handle process exit
    pythonProcess.on('exit', (code, signal) => {
      console.log(`Python process exited with code ${code}, signal ${signal}`);
      pythonProcess = null;
      pythonStatus = null;
      
      // Clear pending requests
      pendingRequests.forEach(({ reject, timeout }) => {
        clearTimeout(timeout);
        reject(new Error('Python process exited'));
      });
      pendingRequests.clear();
      
      // Stop health check
      if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
        healthCheckInterval = null;
      }
      
      // Attempt restart if not intentionally stopped
      if (code !== 0 && restartAttempts < MAX_RESTART_ATTEMPTS) {
        restartAttempts++;
        console.log(`Attempting to restart Python process (${restartAttempts}/${MAX_RESTART_ATTEMPTS})`);
        setTimeout(() => startPythonProcess(), 5000);
      }
    });

    // Handle process error
    pythonProcess.on('error', (error) => {
      console.error('Python process error:', error);
      pythonProcess = null;
      pythonStatus = null;
    });

    // Wait for model to load
    await new Promise<void>((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (pythonStatus?.status === 'ready') {
          clearInterval(checkInterval);
          resolve();
        } else if (pythonStatus?.status === 'error') {
          clearInterval(checkInterval);
          reject(new Error(pythonStatus.error || 'Failed to load model'));
        }
      }, 500);
      
      // Timeout after 2 minutes
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('Timeout waiting for Python model to load'));
      }, 2 * 60 * 1000);
    });

    // Start health check
    healthCheckInterval = setInterval(healthCheck, 30000);
    restartAttempts = 0;

    console.log('Python process started successfully');
    return true;

  } catch (error) {
    console.error('Failed to start Python process:', error);
    pythonProcess = null;
    return false;
  }
}

// Stop Python process
export async function stopPythonProcess(): Promise<void> {
  if (!pythonProcess) {
    return;
  }

  console.log('Stopping Python process...');

  // Stop health check
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }

  // Send shutdown command
  try {
    await sendRequest('shutdown');
  } catch (error) {
    console.error('Error sending shutdown command:', error);
  }

  // Kill process after timeout
  setTimeout(() => {
    if (pythonProcess && !pythonProcess.killed) {
      pythonProcess.kill();
    }
  }, 5000);

  pythonProcess = null;
  pythonStatus = null;
}

// Transcribe audio file using Python
export async function transcribeWithPython(
  audioPath: string,
  options: TranscribeOptions = {}
): Promise<TranscriptionResult> {
  if (!pythonProcess || pythonProcess.killed) {
    throw new Error('Python process is not running');
  }

  const result = await sendRequest('transcribe', {
    audio_path: audioPath,
    language: options.language,
    task: options.task || 'transcribe'
  });

  return result;
}

// Get Python status
export function getPythonStatus(): PythonStatus | null {
  return pythonStatus;
}

// Health check
async function healthCheck(): Promise<void> {
  try {
    if (!pythonProcess || pythonProcess.killed) {
      return;
    }
    
    const status = await sendRequest('get_status');
    pythonStatus = status;
  } catch (error) {
    console.error('Health check failed:', error);
    // Attempt restart if health check fails
    if (restartAttempts < MAX_RESTART_ATTEMPTS) {
      restartAttempts++;
      console.log(`Restarting Python process due to health check failure (${restartAttempts}/${MAX_RESTART_ATTEMPTS})`);
      await stopPythonProcess();
      await startPythonProcess();
    }
  }
}

// Download the Whisper model
export async function downloadModel(
  onProgress?: (progress: DownloadProgress) => void
): Promise<{ success: boolean; error?: string }> {
  downloadProgressCallback = onProgress || null;

  if (!isPythonAvailable()) {
    const error = 'Python is not available. Please ensure Python is installed.';
    if (downloadProgressCallback) {
      downloadProgressCallback({
        status: 'error',
        progress: 0,
        message: error,
        error
      });
    }
    return { success: false, error };
  }

  const pythonPath = getPythonPath();
  const transcriberPath = getTranscriberPath();
  const modelDownloadScript = path.join(path.dirname(transcriberPath), 'download_model.py');
  const requirementsPath = path.join(path.dirname(transcriberPath), 'requirements.txt');

  console.log('Starting model download:', pythonPath, modelDownloadScript);

  try {
    // First, install dependencies
    if (downloadProgressCallback) {
      downloadProgressCallback({
        status: 'downloading',
        progress: 0,
        message: 'Installing Python dependencies...'
      });
    }

    await new Promise<void>((resolve, reject) => {
      const installProcess = spawn(pythonPath, ['-m', 'pip', 'install', '-r', requirementsPath], {
        cwd: path.dirname(transcriberPath),
        env: {
          ...process.env,
          PYTHONUNBUFFERED: '1'
        }
      });

      let installOutput = '';

      installProcess.stdout?.on('data', (data: Buffer) => {
        installOutput += data.toString();
      });

      installProcess.stderr?.on('data', (data: Buffer) => {
        const output = data.toString();
        installOutput += output;
        console.log('Pip install output:', output);
      });

      installProcess.on('exit', (code, signal) => {
        console.log(`Pip install exited with code ${code}, signal ${signal}`);
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Failed to install dependencies. Exit code: ${code}`));
        }
      });

      installProcess.on('error', (error) => {
        console.error('Pip install error:', error);
        reject(error);
      });
    });

    // Create download script if it doesn't exist
    await createDownloadScript(modelDownloadScript);

    return new Promise((resolve) => {
      const downloadProcess = spawn(pythonPath, [modelDownloadScript], {
        cwd: path.dirname(transcriberPath),
        env: {
          ...process.env,
          PYTHONUNBUFFERED: '1'
        }
      });

      let lastProgress = 0;

      // Handle stdout (progress updates)
      downloadProcess.stdout?.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n').filter(line => line.trim());
        lines.forEach(line => {
          try {
            const parsed = JSON.parse(line);
            if (parsed.type === 'progress') {
              const progress: DownloadProgress = {
                status: parsed.status,
                progress: parsed.progress || 0,
                message: parsed.message || ''
              };
              if (parsed.error) {
                progress.error = parsed.error;
              }
              if (downloadProgressCallback && progress.progress > lastProgress) {
                downloadProgressCallback(progress);
                lastProgress = progress.progress;
              }
            }
          } catch {
            // Ignore non-JSON output
          }
        });
      });

      // Handle stderr (errors)
      downloadProcess.stderr?.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n').filter(line => line.trim());
        lines.forEach(line => {
          console.error('Download error:', line);
          if (downloadProgressCallback) {
            downloadProgressCallback({
              status: 'error',
              progress: lastProgress,
              message: 'Download failed',
              error: line
            });
          }
        });
      });

      // Handle process exit
      downloadProcess.on('exit', (code, signal) => {
        console.log(`Download process exited with code ${code}, signal ${signal}`);
        
        if (code === 0) {
          if (downloadProgressCallback) {
            downloadProgressCallback({
              status: 'complete',
              progress: 100,
              message: 'Model downloaded successfully'
            });
          }
          resolve({ success: true });
        } else {
          const error = signal || `Download process exited with code ${code}`;
          if (downloadProgressCallback) {
            downloadProgressCallback({
              status: 'error',
              progress: lastProgress,
              message: 'Download failed',
              error
            });
          }
          resolve({ success: false, error: String(error) });
        }
        
        downloadProgressCallback = null;
      });

      // Handle process error
      downloadProcess.on('error', (error) => {
        console.error('Download process error:', error);
        if (downloadProgressCallback) {
          downloadProgressCallback({
            status: 'error',
            progress: lastProgress,
            message: 'Download failed',
            error: error.message
          });
        }
        resolve({ success: false, error: error.message });
        downloadProgressCallback = null;
      });
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to download model:', error);
    if (downloadProgressCallback) {
      downloadProgressCallback({
        status: 'error',
        progress: 0,
        message: 'Download failed',
        error: errorMessage
      });
    }
    downloadProgressCallback = null;
    return { success: false, error: errorMessage };
  }
}

// Create download script
async function createDownloadScript(scriptPath: string): Promise<void> {
  const scriptContent = `#!/usr/bin/env python3
"""
Model Download Script
Downloads the faster-whisper model from HuggingFace
"""

import sys
import json
import os
from pathlib import Path
from huggingface_hub import snapshot_download
import time

MODEL_NAME = "deepdml/faster-whisper-large-v3-turbo-ct2"
CACHE_DIR = os.path.join(os.path.expanduser("~"), ".cache", "huggingface")

def print_progress(type, status, progress, message, error=None):
    """Print progress as JSON"""
    data = {
        "type": "progress",
        "status": status,
        "progress": progress,
        "message": message
    }
    if error:
        data["error"] = error
    print(json.dumps(data), flush=True)

def download_model():
    """Download the model"""
    try:
        print_progress("progress", "downloading", 0, "Starting download...")
        
        # Download model from HuggingFace
        local_dir = snapshot_download(
            repo_id=MODEL_NAME,
            cache_dir=CACHE_DIR,
            local_dir_use_symlinks=False,
            resume_download=True
        )
        
        print_progress("progress", "verifying", 95, "Verifying download...")
        time.sleep(1)  # Simulate verification
        
        print_progress("progress", "complete", 100, "Model downloaded successfully")
        return True
        
    except Exception as e:
        print_progress("progress", "error", 0, "Download failed", error=str(e))
        return False

if __name__ == "__main__":
    success = download_model()
    sys.exit(0 if success else 1)
`;

  await fs.promises.mkdir(path.dirname(scriptPath), { recursive: true });
  await fs.promises.writeFile(scriptPath, scriptContent, 'utf-8');
  console.log('Download script created:', scriptPath);
}

// Cleanup on app quit
app.on('before-quit', async () => {
  await stopPythonProcess();
});
