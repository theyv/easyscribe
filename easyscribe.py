import sounddevice as sd
import numpy as np
import queue
import threading
import time
import os
import sys
import io
import subprocess
from datetime import datetime
import signal

SUPPORTED_EXTENSIONS = ['.wav', '.mp3', '.m4a', '.flac', '.ogg', '.aac', '.mp4', '.mkv', '.avi', '.mov']

def install_package(package_name):
    """Automatically installs a missing package."""
    print(f"Automatically installing {package_name}...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", package_name])
        print(f"✓ {package_name} installed successfully!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"✗ Error while installing {package_name}: {e}")
        return False

def check_and_install_dependencies():
    """Checks and installs missing dependencies."""
    required_packages = {
        'torch': 'torch',
        'torchaudio': 'torchaudio',
        'faster_whisper': 'faster-whisper',
        'librosa': 'librosa',
        'soundfile': 'soundfile',
        'nemo': 'nemo_toolkit[asr]'
    }
    
    missing_packages = []
    
    for import_name, package_name in required_packages.items():
        try:
            __import__(import_name)
        except ImportError:
            missing_packages.append((import_name, package_name))
    
    if missing_packages:
        print("\n" + "=" * 50)
        print("MISSING DEPENDENCIES DETECTED")
        print("=" * 50)
        
        for import_name, package_name in missing_packages:
            print(f"Missing: {package_name}")
        
        print("\nAutomatically installing missing packages...")
        print("-" * 50)
        
        for import_name, package_name in missing_packages:
            if not install_package(package_name):
                print(f"Failed to install {package_name}")
                return False
        
        print("\n✓ All packages installed!")
        print("Restarting the application...")
        return True
    
    return False

# --- final dialog (Tkinter) ---
def finished_dialog(path):
    try:
        import tkinter as tk
        root = tk.Tk()
        root.title("Transcription complete")
        root.geometry("500x140")
        root.resizable(False, False)

        tk.Label(root, text=f"Saved to:\n{path}", pady=15).pack()

        answer = {"repeat": False}

        def on_ok():
            root.destroy()
            answer["repeat"] = False

        def on_repeat():
            root.destroy()
            answer["repeat"] = True

        btn_frame = tk.Frame(root)
        btn_frame.pack(pady=10)
        tk.Button(btn_frame, text="OK", width=18, command=on_ok).pack(side="left", padx=10)
        tk.Button(btn_frame, text="Repeat Transcription", width=18, command=on_repeat).pack(side="right", padx=10)

        root.mainloop()
        return answer["repeat"]
    except Exception:
        # If Tkinter fails (for example, no GUI), fall back to the console.
        choice = input(f"\nSaved to:\n{path}\n\nRepeat transcription? (Y/n): ").strip().lower()
        return choice in ("", "y", "yes", "t", "tak")


def check_audio_libraries():
    """Checks for libraries used to load audio files."""
    try:
        import librosa
        return 'librosa'
    except ImportError:
        try:
            import soundfile as sf
            return 'soundfile'
        except ImportError:
            print("ERROR: Missing required audio libraries!")
            print("Install one of these packages:")
            print("  pip install librosa")
            print("  or")
            print("  pip install soundfile")
            sys.exit(1)


def load_audio_file(file_path):
    """Loads an audio file and returns audio data plus sample rate."""
    audio_lib = check_audio_libraries()
    
    try:
        if audio_lib == 'librosa':
            import librosa
            # Librosa loads mono at 22050 Hz by default; resample to 16000 Hz for Whisper.
            audio_data, sr = librosa.load(file_path, sr=16000, mono=True)
            return audio_data.astype(np.float32), sr
            
        elif audio_lib == 'soundfile':
            import soundfile as sf
            import librosa
            # Soundfile + librosa do resample
            audio_data, orig_sr = sf.read(file_path)
            # Convert to mono if the file is stereo.
            if len(audio_data.shape) > 1:
                audio_data = np.mean(audio_data, axis=1)
            # Resample to 16 kHz.
            if orig_sr != 16000:
                audio_data = librosa.resample(audio_data, orig_sr=orig_sr, target_sr=16000)
            return audio_data.astype(np.float32), 16000
            
    except Exception as e:
        print(f"Error while loading file {file_path}: {e}")
        sys.exit(1)


def safe_relative_dir(file_path, root_parent):
    relative_dir = os.path.relpath(os.path.dirname(file_path), root_parent)
    if relative_dir == ".":
        return ""
    return relative_dir


def collect_audio_inputs(paths):
    audio_items = []

    for input_path in paths:
        input_path = os.path.abspath(input_path)

        if not os.path.exists(input_path):
            print(f"ERROR: Path '{input_path}' does not exist!")
            input("Press Enter to exit...")
            return None

        if os.path.isdir(input_path):
            root_parent = os.path.dirname(input_path)
            found_in_dir = 0
            print(f"Scanning folder: {input_path}")

            for current_dir, dir_names, file_names in os.walk(input_path):
                dir_names[:] = [name for name in dir_names if name.lower() != "output"]

                for file_name in sorted(file_names):
                    file_path = os.path.join(current_dir, file_name)
                    file_ext = os.path.splitext(file_path)[1].lower()
                    if file_ext in SUPPORTED_EXTENSIONS:
                        output_subdir = safe_relative_dir(file_path, root_parent)
                        audio_items.append((file_path, output_subdir))
                        found_in_dir += 1

            if found_in_dir == 0:
                print(f"WARNING: No supported recordings found in folder: {input_path}")
            else:
                print(f"Found {found_in_dir} audio/video files in the folder.")

            continue

        if not os.path.isfile(input_path):
            print(f"ERROR: '{input_path}' is neither a file nor a folder.")
            input("Press Enter to exit...")
            return None

        file_ext = os.path.splitext(input_path)[1].lower()
        if file_ext not in SUPPORTED_EXTENSIONS:
            print(f"WARNING: Extension '{file_ext}' may not be supported.")
            print(f"Supported formats: {', '.join(SUPPORTED_EXTENSIONS)}")
            choice = input("Do you want to continue? (Y/n): ").strip().lower()
            if choice in ("n", "no", "nie"):
                return None

        audio_items.append((input_path, ""))

    return audio_items


class AudioTranscriber:
    def __init__(self, audio_file_path=None, output_subdir=""):
        # --- model selection ---
        self.model_type = self.ask_for_model_selection()

        # --- formatting preferences ---
        self.use_timecodes = self.ask_for_format_preferences()

        # --- diarization ---
        self.use_diarization, self.num_speakers = self.ask_for_diarization()
        self.diarization_workers = self.ask_for_diarization_workers() if self.use_diarization else 1

        # --- GPU load profile ---
        self.performance_profile = self.ask_for_performance_profile()
        self.apply_performance_profile()

        # --- model initialization ---
        self.model = self._initialize_model()

        # --- diarization initialization (after ASR model so VRAM is already allocated) ---
        self.diarization_pipeline = self._initialize_diarization() if self.use_diarization else None

        self.repeat_transcription = False
        self.sample_rate = 16000
        self.output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output")
        os.makedirs(self.output_dir, exist_ok=True)

        self.set_audio_source(audio_file_path, output_subdir)

        # --- microphone recording configuration ---
        if not self.is_file_mode:
            self.audio_queue = queue.Queue()
            self.is_running = False
            self.block_size = 3      # s
            self.channels = 1
            self.blocksize = 2048

    def set_audio_source(self, audio_file_path=None, output_subdir=""):
        self.audio_file_path = audio_file_path
        self.is_file_mode = audio_file_path is not None

        # --- audio source name ---
        if self.is_file_mode:
            self.input_name = f"File: {os.path.basename(audio_file_path)}"
        else:
            try:
                self.input_idx = sd.default.device[0]
                self.input_name = sd.query_devices(self.input_idx)["name"]
            except Exception:
                self.input_idx = None
                self.input_name = "Unknown"

        # --- output path ---
        timestamp = datetime.now().strftime('%Y_%m_%d - %H-%M')  # Windows‑friendly
        if self.is_file_mode:
            base_name = os.path.splitext(os.path.basename(audio_file_path))[0]
            target_dir = os.path.join(self.output_dir, output_subdir)
            os.makedirs(target_dir, exist_ok=True)
            self.output_file = os.path.join(target_dir, f"{base_name}_{timestamp}.txt")
        else:
            self.output_file = os.path.join(self.output_dir, f"{timestamp}.txt")

        # --- file header ---
        if self.model_type.startswith("whisper-"):
            model_size = self.model_type.replace("whisper-", "")
            model_name = f"Faster Whisper {model_size}"
        else:  # parakeet
            model_name = "NVIDIA Parakeet v3"
        with open(self.output_file, "w", encoding="utf-8") as f:
            f.write(f"Transcription ({model_name}): "
                    f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f'Input: "{self.input_name}"\n')
            f.write(f"Load profile: {self.performance_profile}\n")
            if self.use_diarization:
                f.write(f"Diarization: yes ({self.num_speakers} speakers, FoxNoseTech/diarize)\n")
                f.write(f"Parallel diarizations: {self.diarization_workers}\n")
            f.write("-" * 50 + "\n")

        print(f"Created file: {self.output_file}")
        print(f"Audio source: {self.input_name}")

    def _initialize_model(self):
        """Initializes the selected transcription model."""
        if self.model_type.startswith("whisper-"):
            # Extract the model size (for example, "large-v3" from "whisper-large-v3")
            model_size = self.model_type.replace("whisper-", "")

            device = "cuda"
            compute_type = "float16"
            try:
                import torch
                if not torch.cuda.is_available():
                    print("WARNING: PyTorch does not see CUDA/GPU.")
                    choice = input("Continue on CPU, which will be slower? (y/N): ").strip().lower()
                    if choice not in ("t", "tak", "y", "yes"):
                        sys.exit(1)
                    device = "cpu"
                    compute_type = "int8"
                else:
                    gpu_name = torch.cuda.get_device_name(0)
                    print(f"CUDA GPU detected: {gpu_name}")
                    if self.performance_profile != "full":
                        compute_type = "int8_float16"
                        print("Economy profile: using int8_float16 to reduce VRAM usage.")
            except ImportError:
                print("WARNING: Cannot check CUDA because torch is missing.")
                print("Trying to run Faster Whisper on CUDA.")

            print(f"Loading Faster Whisper model ({model_size}) on {device} ({compute_type})...")
            print("(The first run may take longer because the model needs to be downloaded)")
            
            from faster_whisper import WhisperModel
            return WhisperModel(
                model_size,
                device=device,
                compute_type=compute_type,
                download_root="models"
            )
        
        
        elif self.model_type == "parakeet":
            print("Loading NVIDIA Parakeet v3 model...")
            print("(Requires NVIDIA NeMo Toolkit - this may take longer)")
            
            try:
                # Silence NeMo logs more aggressively.
                import logging
                import os
                import sys
                from contextlib import redirect_stdout, redirect_stderr
                import io
                
                # Set environment variables for NeMo.
                os.environ["NEMO_LOGGING_LEVEL"] = "ERROR"
                os.environ["NVIDIA_TF32_OVERRIDE"] = "0"
                
                # Silence all Python logs.
                logging.getLogger().setLevel(logging.CRITICAL)
                logging.getLogger("nemo").setLevel(logging.CRITICAL)
                logging.getLogger("nemo_logging").setLevel(logging.CRITICAL)
                
                # Capture stdout and stderr while loading the model.
                f = io.StringIO()
                with redirect_stdout(f), redirect_stderr(f):
                    import nemo.collections.asr as nemo_asr
                    print("✓ NVIDIA NeMo Toolkit available")
                    
                    # Load the Parakeet v3 model through NeMo.
                    print("Loading nvidia/parakeet-tdt-0.6b-v3 model...")
                    asr_model = nemo_asr.models.ASRModel.from_pretrained(
                        model_name="nvidia/parakeet-tdt-0.6b-v3"
                    )

                    try:
                        import torch
                        if torch.cuda.is_available() and hasattr(asr_model, "to"):
                            asr_model = asr_model.to("cuda")
                            asr_model.eval()
                    except Exception:
                        pass
                
                print("✓ Successfully loaded the Parakeet v3 model")
                return {"model": asr_model, "type": "nemo"}
                
            except ImportError as e:
                print(f"ERROR: Missing required libraries for Parakeet v3: {e}")
                print("Parakeet v3 requires NVIDIA NeMo Toolkit:")
                print("pip install -U nemo_toolkit[asr]")
                print("Switching to Whisper automatically...")
                self.model_type = "whisper-large-v3"
                return self._initialize_model()
            except Exception as e:
                print(f"ERROR while loading Parakeet v3: {e}")
                print("Switching to Whisper automatically...")
                self.model_type = "whisper-large-v3"
                return self._initialize_model()
        
        else:
            raise ValueError(f"Unknown model type: {self.model_type}")

    # ----------------------------------------------------------------

    def ask_for_model_selection(self):
        print("\n" + "=" * 50)
        print("TRANSCRIPTION MODEL SELECTION")
        print("=" * 50)
        print("1. Faster Whisper - fast, choose a size")
        print("2. NVIDIA Parakeet v3 - modern, multilingual")
        print("-" * 50)

        while True:
            try:
                choice = input("Choose a model (1 or 2, Enter = 1): ").strip()
                if choice in ("", "1"):
                    return self.ask_for_whisper_size()
                if choice == "2":
                    print("✓ Selected: NVIDIA Parakeet v3")
                    return "parakeet"
                print("Invalid choice. Enter 1 or 2.")
            except KeyboardInterrupt:
                sys.exit()

    def ask_for_whisper_size(self):
        """Asks for the Faster Whisper model size."""
        print("\n" + "=" * 50)
        print("FASTER WHISPER MODEL SIZE")
        print("=" * 50)
        print("1. tiny     - fastest, least accurate")
        print("2. base     - fast, good quality")
        print("3. small    - medium speed, better quality")
        print("4. medium   - slower, high quality")
        print("5. large-v3 - slowest, highest quality (default)")
        print("-" * 50)

        while True:
            try:
                choice = input("Choose a size (1-5, Enter = 5): ").strip()
                if choice in ("", "5"):
                    print("✓ Selected: Faster Whisper (large-v3)")
                    return "whisper-large-v3"
                if choice == "1":
                    print("✓ Selected: Faster Whisper (tiny)")
                    return "whisper-tiny"
                if choice == "2":
                    print("✓ Selected: Faster Whisper (base)")
                    return "whisper-base"
                if choice == "3":
                    print("✓ Selected: Faster Whisper (small)")
                    return "whisper-small"
                if choice == "4":
                    print("✓ Selected: Faster Whisper (medium)")
                    return "whisper-medium"
                print("Invalid choice. Enter 1-5.")
            except KeyboardInterrupt:
                sys.exit()

    def ask_for_diarization(self):
        print("\n" + "=" * 50)
        print("DIARIZATION (2-SPEAKER SEPARATION)")
        print("=" * 50)
        print("1. No diarization (default)")
        print("2. With diarization - labels Speaker 1 / Speaker 2")
        print("   (file mode only, runs on CPU alongside GPU)")
        print("-" * 50)

        while True:
            try:
                choice = input("Choose an option (1 or 2, Enter = 1): ").strip()
                if choice in ("", "1"):
                    print("✓ No diarization")
                    return False, None
                if choice == "2":
                    print("✓ Diarization enabled (2 speakers)")
                    return True, 2
                print("Invalid choice. Enter 1 or 2.")
            except KeyboardInterrupt:
                sys.exit()

    def ask_for_diarization_workers(self):
        print("\n" + "=" * 50)
        print("PARALLEL CPU DIARIZATIONS")
        print("=" * 50)
        print("How many files should be diarized in parallel in the background?")
        print("Enter = 3, minimum = 1, maximum = 8")
        print("-" * 50)

        while True:
            try:
                choice = input("Parallel diarization workers (Enter = 3): ").strip()
                if choice == "":
                    workers = 3
                else:
                    workers = int(choice)
                if 1 <= workers <= 8:
                    print(f"✓ Parallel diarization workers: {workers}")
                    return workers
                print("Enter a number from 1 to 8.")
            except ValueError:
                print("Enter a number from 1 to 8.")
            except KeyboardInterrupt:
                sys.exit()

    def _initialize_diarization(self):
        if not self.use_diarization:
            return None
        try:
            from diarize import diarize as _diarize_fn
        except ImportError:
            print("Missing diarize package. Installing...")
            if not install_package("diarize"):
                print("✗ Installation failed. Disabling diarization.")
                self.use_diarization = False
                return None
            try:
                from diarize import diarize as _diarize_fn
            except ImportError as e:
                print(f"✗ Import after installation failed: {e}. Disabling diarization.")
                self.use_diarization = False
                return None
        print("✓ diarize library ready (CPU pipeline)")
        return _diarize_fn

    def _run_diarization(self, audio_data, sample_rate):
        if not self.diarization_pipeline:
            return []
        import tempfile, soundfile as sf
        try:
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
                tmp_path = tmp.name
            sf.write(tmp_path, audio_data, sample_rate, subtype="PCM_16")
            try:
                result = self.diarization_pipeline(
                    tmp_path,
                    num_speakers=self.num_speakers
                )
            finally:
                try:
                    os.remove(tmp_path)
                except OSError:
                    pass

            unique = sorted({s.speaker for s in result.segments})
            speaker_map = {s: f"Speaker {i+1}" for i, s in enumerate(unique)}
            return [(s.start, s.end, speaker_map[s.speaker]) for s in result.segments]
        except Exception as e:
            return RuntimeError(str(e))

    def _prepare_diarization_wav(self, audio_data, sample_rate):
        import tempfile, soundfile as sf
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp_path = tmp.name
        sf.write(tmp_path, audio_data, sample_rate, subtype="PCM_16")
        return tmp_path

    def _run_diarization_from_wav(self, wav_path):
        if not self.diarization_pipeline:
            return []
        try:
            result = self.diarization_pipeline(
                wav_path,
                num_speakers=self.num_speakers
            )
            unique = sorted({s.speaker for s in result.segments})
            speaker_map = {s: f"Speaker {i+1}" for i, s in enumerate(unique)}
            return [(s.start, s.end, speaker_map[s.speaker]) for s in result.segments]
        except Exception as e:
            return RuntimeError(str(e))
        finally:
            try:
                os.remove(wav_path)
            except OSError:
                pass

    def _assign_speaker(self, seg_start, seg_end, turns):
        if not turns:
            return None
        best_speaker, best_overlap = None, 0.0
        for t_start, t_end, speaker in turns:
            overlap = min(seg_end, t_end) - max(seg_start, t_start)
            if overlap > best_overlap:
                best_overlap, best_speaker = overlap, speaker
        return best_speaker

    def ask_for_format_preferences(self):
        print("\n" + "=" * 50)
        print("TRANSCRIPTION FORMATTING OPTIONS")
        print("=" * 50)
        print("1. With timestamps (default) - [HH:MM:SS] text")
        print("2. Without timestamps        - text only on new lines")
        print("-" * 50)

        while True:
            try:
                choice = input("Choose an option (1 or 2, Enter = 1): ").strip()
                if choice in ("", "1"):
                    print("✓ Selected: transcription with timestamps")
                    return True
                if choice == "2":
                    print("✓ Selected: transcription without timestamps")
                    return False
                print("Invalid choice. Enter 1 or 2.")
            except KeyboardInterrupt:
                sys.exit()

    def ask_for_performance_profile(self):
        print("\n" + "=" * 50)
        print("GPU LOAD PROFILE")
        print("=" * 50)
        print("1. Full speed   - maximum speed, may keep the GPU at 100%")
        print("2. Balanced     - slower, usually easier to run in parallel")
        print("3. Background   - lightest on the machine, slowest")
        print("-" * 50)

        while True:
            try:
                choice = input("Choose a profile (1-3, Enter = 1): ").strip()
                if choice in ("", "1"):
                    print("✓ Selected: Full speed")
                    return "full"
                if choice == "2":
                    print("✓ Selected: Balanced")
                    return "balanced"
                if choice == "3":
                    print("✓ Selected: Background")
                    return "background"
                print("Invalid choice. Enter 1-3.")
            except KeyboardInterrupt:
                sys.exit()

    def apply_performance_profile(self):
        profiles = {
            "full": {
                "beam_size": 5,
                "word_timestamps": True,
                "chunk_seconds": 120,
                "segment_pause": 0.0,
                "file_pause": 0.0,
            },
            "balanced": {
                "beam_size": 2,
                "word_timestamps": self.use_timecodes,
                "chunk_seconds": 60,
                "segment_pause": 0.08,
                "file_pause": 2.0,
            },
            "background": {
                "beam_size": 1,
                "word_timestamps": False,
                "chunk_seconds": 30,
                "segment_pause": 0.25,
                "file_pause": 5.0,
            },
        }
        self.performance_settings = profiles[self.performance_profile]

        if self.performance_profile != "full":
            print("Note: this is not a hard GPU percentage limit, only a load reducer.")
            print("If the driver/model still heavily uses the GPU, choose Background or CPU if CUDA is unavailable.")

    def throttle_if_needed(self):
        pause_seconds = self.performance_settings.get("segment_pause", 0.0)
        if pause_seconds > 0:
            time.sleep(pause_seconds)

    def pause_between_files_if_needed(self):
        pause_seconds = self.performance_settings.get("file_pause", 0.0)
        if pause_seconds > 0:
            print(f"Profile pause {self.performance_profile}: {pause_seconds:.0f}s before the next file...")
            time.sleep(pause_seconds)

    # ----------------------------------------------------------------

    def _transcribe_with_whisper(self, audio_data):
        """Transcribes audio using Whisper."""
        segments, info = self.model.transcribe(
            audio_data,
            language="pl",
            beam_size=self.performance_settings["beam_size"],
            word_timestamps=self.performance_settings["word_timestamps"],
            vad_filter=True,
            vad_parameters=dict(
                min_silence_duration_ms=500,
                speech_pad_ms=100
            )
        )
        return segments, info
    
    
    def _transcribe_with_parakeet(self, audio_data):
        """Transcribes audio using Parakeet v3 through NeMo."""
        import tempfile
        import soundfile as sf
        import logging
        import sys
        from contextlib import redirect_stdout, redirect_stderr
        import io
        
        # Get the NeMo model.
        asr_model = self.model["model"]
        
        # Save audio_data to a temporary file (NeMo requires a file).
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp_file:
            # Write the audio as a WAV file.
            sf.write(tmp_file.name, audio_data, 16000)
            
            try:
                # Silence logs very aggressively.
                logging.getLogger().setLevel(logging.CRITICAL)
                logging.getLogger("nemo").setLevel(logging.CRITICAL)
                logging.getLogger("nemo_logging").setLevel(logging.CRITICAL)
                
                # Capture stdout and stderr to hide all NeMo logs.
                f = io.StringIO()
                
                # Temporarily redirect stdout and stderr.
                old_stdout = sys.stdout
                old_stderr = sys.stderr
                
                try:
                    sys.stdout = f
                    sys.stderr = f
                    
                    # Transcribe using NeMo.
                    output = asr_model.transcribe(
                        [tmp_file.name],
                        batch_size=1,
                        num_workers=0,
                        timestamps=True
                    )
                    
                finally:
                    # Restore stdout and stderr.
                    sys.stdout = old_stdout
                    sys.stderr = old_stderr
                
                # Get the results.
                transcription = output[0].text
                
                # Check whether timestamps are available.
                segments = []
                if hasattr(output[0], 'timestamp') and output[0].timestamp:
                    timestamps = output[0].timestamp
                    if 'segment' in timestamps and timestamps['segment']:
                        # Use segment timestamps.
                        for segment in timestamps['segment']:
                            segments.append(type('Segment', (), {
                                'start': segment['start'],
                                'end': segment['end'],
                                'text': segment['segment']
                            })())
                    elif 'word' in timestamps and timestamps['word']:
                        # If there are no segments, use words.
                        for word in timestamps['word']:
                            segments.append(type('Segment', (), {
                                'start': word['start'],
                                'end': word['end'],
                                'text': word['word']
                            })())
                
                # If there are no timestamps, create a single segment.
                if not segments:
                    segments = [type('Segment', (), {
                        'start': 0,
                        'end': len(audio_data) / 16000,
                        'text': transcription
                    })()]
                
                info = type('Info', (), {
                    'language': 'pl',  # Parakeet detects the language automatically.
                    'language_probability': 0.95,
                    'duration': len(audio_data) / 16000
                })()
                
                return segments, info
                
            finally:
                # Remove the temporary file.
                import os
                try:
                    os.unlink(tmp_file.name)
                except:
                    pass

    def clear_cuda_cache(self):
        try:
            import torch
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
                torch.cuda.ipc_collect()
        except Exception:
            pass

    def is_cuda_oom(self, error):
        return "cuda out of memory" in str(error).lower()

    def write_segments(self, segments, offset_seconds=0.0):
        wrote_anything = False
        for segment in segments:
            if segment.text.strip():
                if self.use_timecodes:
                    start_time = int(segment.start + offset_seconds)
                    hours = start_time // 3600
                    minutes = (start_time % 3600) // 60
                    seconds = start_time % 60
                    time_str = f"[{hours:02d}:{minutes:02d}:{seconds:02d}]"
                    line = f"{time_str} {segment.text}\n"
                else:
                    line = f"{segment.text}\n"

                with open(self.output_file, "a", encoding="utf-8") as f:
                    f.write(line)
                print(line, end="")
                wrote_anything = True
                self.throttle_if_needed()
        return wrote_anything

    def _get_segments_from_chunk(self, audio_chunk):
        if self.model_type.startswith("whisper-"):
            return self._transcribe_with_whisper(audio_chunk)
        return self._transcribe_with_parakeet(audio_chunk)

    def transcribe_audio_chunk(self, audio_chunk, offset_seconds, collect=None):
        segments, info = self._get_segments_from_chunk(audio_chunk)

        if collect is not None:
            for seg in segments:
                if seg.text.strip():
                    abs_start = seg.start + offset_seconds
                    abs_end = seg.end + offset_seconds
                    text = seg.text.strip()
                    collect.append((
                        abs_start,
                        abs_end,
                        text
                    ))
                    if self.use_timecodes:
                        start_time = int(abs_start)
                        hours = start_time // 3600
                        minutes = (start_time % 3600) // 60
                        seconds = start_time % 60
                        line = f"[{hours:02d}:{minutes:02d}:{seconds:02d}] {text}\n"
                    else:
                        line = f"{text}\n"
                    with open(self.output_file, "a", encoding="utf-8") as f:
                        f.write(line)
                    print(line, end="")
        else:
            self.write_segments(segments, offset_seconds)
        return info

    def transcribe_audio_chunk_with_retry(self, audio_chunk, offset_seconds, collect=None):
        duration = len(audio_chunk) / self.sample_rate
        try:
            return self.transcribe_audio_chunk(audio_chunk, offset_seconds, collect=collect)
        except Exception as e:
            if not self.is_cuda_oom(e) or duration <= 35:
                raise

            self.clear_cuda_cache()
            half = len(audio_chunk) // 2
            print(f"\nCUDA OOM on a {duration:.1f}s chunk. Splitting it in half and trying again.")

            first_info = self.transcribe_audio_chunk_with_retry(
                audio_chunk[:half], offset_seconds, collect=collect
            )
            self.transcribe_audio_chunk_with_retry(
                audio_chunk[half:],
                offset_seconds + (half / self.sample_rate),
                collect=collect
            )
            return first_info

    def _write_diarized_output(self, collected, turns, output_file, use_timecodes):
        print("\n" + "-" * 50)
        print("Transcription with diarization:")
        print("-" * 50)
        try:
            with open(output_file, "r", encoding="utf-8") as existing:
                current_content = existing.read()
            raw_marker = "\nRaw transcription (saved live before diarization):"
            diar_marker = "\nTranscription with diarization:"
            if raw_marker in current_content:
                header = current_content.split(raw_marker, 1)[0].rstrip()
            elif diar_marker in current_content:
                header = current_content.split(diar_marker, 1)[0].rstrip()
            else:
                header = current_content.rstrip()
        except OSError:
            header = ""

        with open(output_file, "w", encoding="utf-8") as f:
            if header:
                f.write(header + "\n\n")
            f.write("Transcription with diarization:\n")
            f.write("-" * 50 + "\n")
            for abs_start, abs_end, text in collected:
                speaker = self._assign_speaker(abs_start, abs_end, turns)
                label = f"[{speaker}] " if speaker else ""
                if use_timecodes:
                    t = int(abs_start)
                    ts = f"[{t//3600:02d}:{(t%3600)//60:02d}:{t%60:02d}] "
                else:
                    ts = ""
                line = f"{ts}{label}{text}\n"
                f.write(line)
                print(line, end="")
            f.write(f"\nTranscription completed: "
                    f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    def _write_diarized_segments(self, segments, turns):
        self._write_diarized_output(segments, turns, self.output_file, self.use_timecodes)

    def transcribe_file(self, show_finished_dialog=True, file_index=None, total_files=None, defer_diarization=False):
        """Transcribes an audio file."""
        file_basename = os.path.basename(self.audio_file_path)
        if file_index is not None and total_files is not None:
            self._progress_label = f"[File {file_index}/{total_files}: {file_basename}]"
        else:
            self._progress_label = f"[{file_basename}]"
        print(f"\nTranscribing file: {file_basename}")
        print("Please wait...")

        try:
            # Load the audio file.
            audio_data, sr = load_audio_file(self.audio_file_path)
            duration = len(audio_data) / self.sample_rate
            chunk_seconds = self.performance_settings["chunk_seconds"]
            chunk_samples = int(chunk_seconds * self.sample_rate)

            print(f"Audio length: {duration:.2f}s")
            print(f"Chunk size: {chunk_seconds}s per chunk")
            print("\nTranscription:")
            print("-" * 50)

            collected = [] if self.use_diarization else None
            if collected is not None:
                with open(self.output_file, "a", encoding="utf-8") as f:
                    f.write("\nRaw transcription (saved live before diarization):\n")
                    f.write("-" * 50 + "\n")
            first_info = None
            total_chunks = max(1, (len(audio_data) + chunk_samples - 1) // chunk_samples)
            for chunk_index, start_sample in enumerate(range(0, len(audio_data), chunk_samples), start=1):
                end_sample = min(start_sample + chunk_samples, len(audio_data))
                offset_seconds = start_sample / self.sample_rate
                chunk_duration = (end_sample - start_sample) / self.sample_rate
                print(f"\n--- {self._progress_label} Chunk {chunk_index}/{total_chunks}: "
                      f"{offset_seconds:.1f}s + {chunk_duration:.1f}s ---")

                info = self.transcribe_audio_chunk_with_retry(
                    audio_data[start_sample:end_sample],
                    offset_seconds,
                    collect=collected
                )
                if first_info is None:
                    first_info = info

                self.clear_cuda_cache()

            if first_info is not None:
                print(f"\nDetected language: {first_info.language} "
                      f"(probability: {first_info.language_probability:.2f})")

            if self.use_diarization and collected is not None:
                self.clear_cuda_cache()
                with open(self.output_file, "a", encoding="utf-8") as f:
                    f.write(f"\nRaw transcription completed: "
                            f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                if defer_diarization:
                    diar_wav_path = self._prepare_diarization_wav(audio_data, sr)
                    self._deferred_diar = (
                        collected, diar_wav_path,
                        self.output_file, self.use_timecodes
                    )
                else:
                    speaker_turns = self._run_diarization(audio_data, sr)
                    if isinstance(speaker_turns, Exception):
                        print(f"✗ Diarization error: {speaker_turns}. Continuing without speaker labels.")
                        speaker_turns = []
                    self._write_diarized_output(collected, speaker_turns, self.output_file, self.use_timecodes)

        except Exception as e:
            print(f"Transcription error: {e}")
            self.clear_cuda_cache()
            return False

        if not (self.use_diarization and collected is not None):
            with open(self.output_file, "a", encoding="utf-8") as f:
                f.write(f"\nTranscription completed: "
                        f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        
        print("\n" + "=" * 50)
        print("Transcription complete!")
        
        # Dialog offering a repeat.
        if show_finished_dialog:
            self.repeat_transcription = finished_dialog(self.output_file)
        return True

    # ----------------------------------------------------------------
    # Metody dla nagrywania z mikrofonu (bez zmian)

    def audio_callback(self, indata, frames, time_info, status):
        if status:
            print(f"Status: {status}")
        data = indata.mean(axis=1) if indata.ndim > 1 else indata.copy()
        self.audio_queue.put(data)

    def process_audio(self):
        while self.is_running:
            audio_data = []
            finish_at = time.time() + self.block_size

            while time.time() < finish_at and self.is_running:
                try:
                    audio_data.append(self.audio_queue.get(timeout=1))
                except queue.Empty:
                    continue

            if audio_data and self.is_running:
                try:
                    block = np.concatenate(audio_data).astype(np.float32) / 32768.0
                    
                    # Transcribe using the selected model.
                    if self.model_type.startswith("whisper-"):
                        segments, _ = self._transcribe_with_whisper(block)
                    else:  # parakeet
                        segments, _ = self._transcribe_with_parakeet(block)
                    
                    for seg in segments:
                        if seg.text.strip():
                            line = (f"[{datetime.now().strftime('%H:%M:%S')}] {seg.text}\n"
                                    if self.use_timecodes else f"{seg.text}\n")
                            with open(self.output_file, "a", encoding="utf-8") as f:
                                f.write(line)
                            print(line, end="")
                            self.throttle_if_needed()
                except Exception as e:
                    print(f"Audio processing error: {e}")

    def start_microphone_recording(self):
        print("\nRecording... (Ctrl+C to stop)")
        self.is_running = True
        self.thread = threading.Thread(target=self.process_audio, daemon=True)
        self.thread.start()

        try:
            with sd.InputStream(
                device=self.input_idx,
                channels=self.channels,
                samplerate=self.sample_rate,
                dtype=np.int16,
                blocksize=self.blocksize,
                callback=self.audio_callback
            ):
                while self.is_running:
                    time.sleep(0.1)
        except KeyboardInterrupt:
            pass
        finally:
            self.stop_microphone_recording()

    def stop_microphone_recording(self):
        self.is_running = False
        if hasattr(self, "thread"):
            self.thread.join()

        with open(self.output_file, "a", encoding="utf-8") as f:
            f.write(f"\nTranscription completed: "
                    f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

        # Dialog offering a repeat.
        self.repeat_transcription = finished_dialog(self.output_file)

    # ----------------------------------------------------------------

    def start(self):
        """Starts the selected transcription mode."""
        if self.is_file_mode:
            self.transcribe_file()
        else:
            if self.use_diarization:
                print("\n⚠ Diarization is not supported in microphone mode (it requires the full file).")
                print("  Continuing without diarization.")
                self.use_diarization = False
            self.start_microphone_recording()


# ------------------------- main loop -----------------------------

def main():
    # Silence logs aggressively.
    import logging
    import os
    
    # Set environment variables for silence unless the user wants logs.
    if not os.environ.get("SHOW_NEMO_LOGS"):
        os.environ["NEMO_LOGGING_LEVEL"] = "CRITICAL"
        os.environ["NVIDIA_TF32_OVERRIDE"] = "0"
        os.environ["CUDA_VISIBLE_DEVICES"] = "0"  # Ogranicza do jednej karty GPU
    os.environ.setdefault("PYTORCH_CUDA_ALLOC_CONF", "expandable_segments:True")
    
    # Silence all Python logs.
    logging.getLogger().setLevel(logging.CRITICAL)
    logging.getLogger("nemo").setLevel(logging.CRITICAL)
    logging.getLogger("nemo_logging").setLevel(logging.CRITICAL)
    logging.getLogger("transformers").setLevel(logging.CRITICAL)
    logging.getLogger("torch").setLevel(logging.CRITICAL)
    
    # Silence the root logger.
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.CRITICAL)
    for handler in root_logger.handlers:
        handler.setLevel(logging.CRITICAL)
    
    # Check and install missing dependencies.
    if check_and_install_dependencies():
        print("\n" + "=" * 50)
        print("APPLICATION RESTART")
        print("=" * 50)
        print("The packages were installed. Restarting...")
        # Restart the application with the newly installed packages.
        os.execv(sys.executable, [sys.executable] + sys.argv)
        return
    
    # Check whether files/folders were passed as arguments.
    audio_items = []
    
    if len(sys.argv) > 1:
        audio_items = collect_audio_inputs(sys.argv[1:])
        if audio_items is None:
            return
        if not audio_items:
            print("No supported audio/video files were found in the provided paths.")
            print(f"Supported formats: {', '.join(SUPPORTED_EXTENSIONS)}")
            input("Press Enter to exit...")
            return

    if audio_items:
        print("\n" + "=" * 50)
        print("FILE MODE")
        print("=" * 50)
        print(f"Number of files to transcribe: {len(audio_items)}")
        for index, (audio_file_path, output_subdir) in enumerate(audio_items, start=1):
            output_hint = output_subdir if output_subdir else "."
            print(f"{index}. {audio_file_path} -> output\\{output_hint}")
        print("-" * 50)

        first_audio_path, first_output_subdir = audio_items[0]
        transcriber = AudioTranscriber(first_audio_path, first_output_subdir)

        n = len(audio_items)
        parallel_diar = transcriber.use_diarization and n > 1
        diar_workers = transcriber.diarization_workers if parallel_diar else 1
        # CPU tasks: diarization + immediate save to the target file.
        # Pending tasks keep audio as temp WAV on disk, not as numpy arrays in RAM.
        all_diar = []

        from concurrent.futures import ThreadPoolExecutor
        import time

        def run_and_write_diarization(collected, diar_wav_path, out_file, use_tc, fidx):
            turns = transcriber._run_diarization_from_wav(diar_wav_path)
            if isinstance(turns, Exception):
                print(f"\n  ✗ File {fidx}/{n}: diarization error: {turns}. Saving without labels.", flush=True)
                turns = []
            else:
                print(f"\n  ✓ File {fidx}/{n}: diarization complete ({len(turns)} segments)", flush=True)
            transcriber._write_diarized_output(collected, turns, out_file, use_tc)
            return fidx

        def collect_finished_diarizations(wait=False):
            pending = []
            for future, fidx in all_diar:
                if not wait and not future.done():
                    pending.append((future, fidx))
                    continue
                while not future.done():
                    time.sleep(5)
                    if not future.done():
                        print(f"  (diarization for file {fidx}/{n} is still running...)", flush=True)
                future.result()
            all_diar[:] = pending

        if parallel_diar:
            print(f"Parallel CPU diarizations: {diar_workers}")

        with ThreadPoolExecutor(max_workers=diar_workers) as diar_pool:
            for index, (audio_file_path, output_subdir) in enumerate(audio_items, start=1):
                if index > 1:
                    transcriber.set_audio_source(audio_file_path, output_subdir)
                print("\n" + "=" * 50)
                print(f"FILE {index}/{n}")
                print("=" * 50)
                try:
                    success = transcriber.transcribe_file(
                        show_finished_dialog=False,
                        file_index=index,
                        total_files=n,
                        defer_diarization=parallel_diar,
                    )
                except KeyboardInterrupt:
                    print(f"\n\nInterrupted file {index}/{n}.")
                    if index < n:
                        remaining = n - index
                        try:
                            choice = input(f"Skip this file and continue with the remaining {remaining}? (y/N): ").strip().lower()
                        except KeyboardInterrupt:
                            print("\nStopping everything.")
                            break
                        if choice in ("y", "yes"):
                            continue
                    print("Stopping processing.")
                    break

                # Submit diarization for this file immediately in the background.
                curr_diar = getattr(transcriber, '_deferred_diar', None)
                transcriber._deferred_diar = None
                if curr_diar is not None:
                    collected, diar_wav_path, out_file, use_tc = curr_diar
                    print(f"\n↳ Diarization for file {index}/{n} in the background (CPU)...", flush=True)
                    future = diar_pool.submit(
                        run_and_write_diarization,
                        collected,
                        diar_wav_path,
                        out_file,
                        use_tc,
                        index
                    )
                    all_diar.append((future, index))
                    collect_finished_diarizations(wait=False)

                if not success:
                    choice = input("This file failed to transcribe. Continue with the next one? (Y/n): ").strip().lower()
                    if choice in ("n", "no"):
                        break
                if index < n:
                    transcriber.pause_between_files_if_needed()

            # All transcriptions are done - collect diarization results and write files.
            if all_diar:
                print(f"\n{'='*50}")
                print("Finalizing diarization (CPU)...")
                collect_finished_diarizations(wait=True)

        print("\n" + "=" * 50)
        print("Finished transcribing all files.")
        print(f"Output: {transcriber.output_dir}")
        return
    
    while True:
        transcriber = AudioTranscriber()
        transcriber.start()
        if not transcriber.repeat_transcription:
            break


if __name__ == "__main__":
    # Safe SIGINT handling (Ctrl+C) to avoid the "Terminate batch job" prompt.
    signal.signal(signal.SIGINT, signal.default_int_handler)
    
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nInterrupted by the user.")
    except Exception as e:
        print(f"\nUnexpected error: {e}")
        input("Press Enter to exit...")
