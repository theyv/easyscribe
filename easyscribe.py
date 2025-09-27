import sounddevice as sd
import numpy as np
import queue
import threading
import time
import os
import sys
import subprocess
from datetime import datetime
import signal

def install_package(package_name):
    """Automatycznie instaluje brakującą bibliotekę"""
    print(f"Automatycznie instaluję {package_name}...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", package_name])
        print(f"✓ {package_name} zainstalowane pomyślnie!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"✗ Błąd podczas instalacji {package_name}: {e}")
        return False

def check_and_install_dependencies():
    """Sprawdza i instaluje brakujące zależności"""
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
        print("WYKRYTO BRAKUJĄCE BIBLIOTEKI")
        print("=" * 50)
        
        for import_name, package_name in missing_packages:
            print(f"Brakuje: {package_name}")
        
        print("\nAutomatycznie instaluję brakujące biblioteki...")
        print("-" * 50)
        
        for import_name, package_name in missing_packages:
            if not install_package(package_name):
                print(f"Nie udało się zainstalować {package_name}")
                return False
        
        print("\n✓ Wszystkie biblioteki zainstalowane!")
        print("Uruchamiam ponownie aplikację...")
        return True
    
    return False

# --- okienko końcowe (Tkinter) ---
def finished_dialog(path):
    try:
        import tkinter as tk
        root = tk.Tk()
        root.title("Transkrypcja zakończona")
        root.geometry("500x140")
        root.resizable(False, False)

        tk.Label(root, text=f"Zapisano w:\n{path}", pady=15).pack()

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
        # Jeśli Tkinter zawiedzie (np. brak GUI), fallback do konsoli
        choice = input(f"\nZapisano w:\n{path}\n\nPonowić transkrypcję? (T/n): ").strip().lower()
        return choice in ("", "t", "tak", "y", "yes")


def check_audio_libraries():
    """Sprawdza dostępność bibliotek do obsługi plików audio"""
    try:
        import librosa
        return 'librosa'
    except ImportError:
        try:
            import soundfile as sf
            return 'soundfile'
        except ImportError:
            print("BŁĄD: Brak wymaganych bibliotek do obsługi plików audio!")
            print("Zainstaluj jedną z bibliotek:")
            print("  pip install librosa")
            print("  lub")
            print("  pip install soundfile")
            sys.exit(1)


def load_audio_file(file_path):
    """Wczytuje plik audio i zwraca dane audio + sample rate"""
    audio_lib = check_audio_libraries()
    
    try:
        if audio_lib == 'librosa':
            import librosa
            # Librosa domyślnie ładuje jako mono z 22050 Hz, zmieniamy na 16000 Hz dla Whisper
            audio_data, sr = librosa.load(file_path, sr=16000, mono=True)
            return audio_data.astype(np.float32), sr
            
        elif audio_lib == 'soundfile':
            import soundfile as sf
            import librosa
            # Soundfile + librosa do resample
            audio_data, orig_sr = sf.read(file_path)
            # Konwersja na mono jeśli stereo
            if len(audio_data.shape) > 1:
                audio_data = np.mean(audio_data, axis=1)
            # Resample do 16kHz
            if orig_sr != 16000:
                audio_data = librosa.resample(audio_data, orig_sr=orig_sr, target_sr=16000)
            return audio_data.astype(np.float32), 16000
            
    except Exception as e:
        print(f"Błąd podczas wczytywania pliku {file_path}: {e}")
        sys.exit(1)


class AudioTranscriber:
    def __init__(self, audio_file_path=None):
        self.audio_file_path = audio_file_path
        self.is_file_mode = audio_file_path is not None
        
        # --- wybór modelu ---
        self.model_type = self.ask_for_model_selection()
        
        # --- preferencje formatowania ---
        self.use_timecodes = self.ask_for_format_preferences()

        # --- nazwa źródła audio ---
        if self.is_file_mode:
            self.input_name = f"Plik: {os.path.basename(audio_file_path)}"
        else:
            try:
                self.input_idx = sd.default.device[0]
                self.input_name = sd.query_devices(self.input_idx)["name"]
            except Exception:
                self.input_idx = None
                self.input_name = "Unknown"

        # --- initializacja modelu ---
        self.model = self._initialize_model()

        # --- konfiguracja dla nagrywania z mikrofonu ---
        if not self.is_file_mode:
            self.audio_queue = queue.Queue()
            self.is_running = False
            self.block_size = 3      # s
            self.channels = 1
            self.blocksize = 2048

        self.repeat_transcription = False
        self.sample_rate = 16000

        # --- ścieżka wyjściowa ---
        output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output")
        os.makedirs(output_dir, exist_ok=True)

        timestamp = datetime.now().strftime('%Y_%m_%d - %H-%M')  # Windows‑friendly
        if self.is_file_mode:
            base_name = os.path.splitext(os.path.basename(audio_file_path))[0]
            self.output_file = os.path.join(output_dir, f"{base_name}_{timestamp}.txt")
        else:
            self.output_file = os.path.join(output_dir, f"{timestamp}.txt")

        # --- nagłówek pliku ---
        if self.model_type.startswith("whisper-"):
            model_size = self.model_type.replace("whisper-", "")
            model_name = f"Faster Whisper {model_size}"
        else:  # parakeet
            model_name = "NVIDIA Parakeet v3"
        with open(self.output_file, "w", encoding="utf-8") as f:
            f.write(f"Transkrypcja ({model_name}): "
                    f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f'Input: "{self.input_name}"\n')
            f.write("-" * 50 + "\n")

        print(f"Utworzono plik: {self.output_file}")
        print(f"Źródło audio: {self.input_name}")

    def _initialize_model(self):
        """Inicjalizuje wybrany model transkrypcji"""
        if self.model_type.startswith("whisper-"):
            # Wyciągnij rozmiar modelu (np. "large-v3" z "whisper-large-v3")
            model_size = self.model_type.replace("whisper-", "")
            
            print(f"Ładowanie modelu Faster Whisper ({model_size}) na GPU...")
            print("(Pierwsze uruchomienie może potrwać dłużej – model musi zostać pobrany)")
            
            from faster_whisper import WhisperModel
            return WhisperModel(
                model_size,
                device="cuda",
                compute_type="float16",
                download_root="models"
            )
        
        
        elif self.model_type == "parakeet":
            print("Ładowanie modelu NVIDIA Parakeet v3...")
            print("(Wymaga NVIDIA NeMo Toolkit - może potrwać dłużej)")
            
            try:
                # Wycisz logi NeMo - bardziej agresywne podejście
                import logging
                import os
                import sys
                from contextlib import redirect_stdout, redirect_stderr
                import io
                
                # Ustaw zmienne środowiskowe dla NeMo
                os.environ["NEMO_LOGGING_LEVEL"] = "ERROR"
                os.environ["NVIDIA_TF32_OVERRIDE"] = "0"
                
                # Wycisz wszystkie logi Python
                logging.getLogger().setLevel(logging.CRITICAL)
                logging.getLogger("nemo").setLevel(logging.CRITICAL)
                logging.getLogger("nemo_logging").setLevel(logging.CRITICAL)
                
                # Przechwytuj stdout i stderr podczas ładowania modelu
                f = io.StringIO()
                with redirect_stdout(f), redirect_stderr(f):
                    import nemo.collections.asr as nemo_asr
                    print("✓ NVIDIA NeMo Toolkit dostępny")
                    
                    # Załaduj model Parakeet v3 przez NeMo
                    print("Ładowanie modelu nvidia/parakeet-tdt-0.6b-v3...")
                    asr_model = nemo_asr.models.ASRModel.from_pretrained(
                        model_name="nvidia/parakeet-tdt-0.6b-v3"
                    )
                
                print("✓ Pomyślnie załadowano model Parakeet v3")
                return {"model": asr_model, "type": "nemo"}
                
            except ImportError as e:
                print(f"BŁĄD: Brak wymaganych bibliotek dla Parakeet v3: {e}")
                print("Parakeet v3 wymaga NVIDIA NeMo Toolkit:")
                print("pip install -U nemo_toolkit[asr]")
                print("Automatycznie przełączam na Whisper...")
                self.model_type = "whisper"
                return self._initialize_model()
            except Exception as e:
                print(f"BŁĄD podczas ładowania Parakeet v3: {e}")
                print("Automatycznie przełączam na Whisper...")
                self.model_type = "whisper"
                return self._initialize_model()
        
        else:
            raise ValueError(f"Nieznany typ modelu: {self.model_type}")

    # ----------------------------------------------------------------

    def ask_for_model_selection(self):
        print("\n" + "=" * 50)
        print("WYBÓR MODELU TRANSKRYPCJI")
        print("=" * 50)
        print("1. Faster Whisper - szybki, wybierz rozmiar")
        print("2. NVIDIA Parakeet v3 - nowoczesny, wielojęzyczny")
        print("-" * 50)

        while True:
            try:
                choice = input("Wybierz model (1 lub 2, Enter = 1): ").strip()
                if choice in ("", "1"):
                    return self.ask_for_whisper_size()
                if choice == "2":
                    print("✓ Wybrano: NVIDIA Parakeet v3")
                    return "parakeet"
                print("Nieprawidłowy wybór. Wpisz 1 lub 2.")
            except KeyboardInterrupt:
                sys.exit()

    def ask_for_whisper_size(self):
        """Pyta o rozmiar modelu Faster Whisper"""
        print("\n" + "=" * 50)
        print("ROZMIAR MODELU FASTER WHISPER")
        print("=" * 50)
        print("1. tiny     - najszybszy, najmniej dokładny")
        print("2. base     - szybki, dobra jakość")
        print("3. small    - średni, lepsza jakość")
        print("4. medium   - wolniejszy, wysoka jakość")
        print("5. large-v3 - najwolniejszy, najwyższa jakość (domyślny)")
        print("-" * 50)

        while True:
            try:
                choice = input("Wybierz rozmiar (1-5, Enter = 5): ").strip()
                if choice in ("", "5"):
                    print("✓ Wybrano: Faster Whisper (large-v3)")
                    return "whisper-large-v3"
                if choice == "1":
                    print("✓ Wybrano: Faster Whisper (tiny)")
                    return "whisper-tiny"
                if choice == "2":
                    print("✓ Wybrano: Faster Whisper (base)")
                    return "whisper-base"
                if choice == "3":
                    print("✓ Wybrano: Faster Whisper (small)")
                    return "whisper-small"
                if choice == "4":
                    print("✓ Wybrano: Faster Whisper (medium)")
                    return "whisper-medium"
                print("Nieprawidłowy wybór. Wpisz 1-5.")
            except KeyboardInterrupt:
                sys.exit()

    def ask_for_format_preferences(self):
        print("\n" + "=" * 50)
        print("OPCJE FORMATOWANIA TRANSKRYPCJI")
        print("=" * 50)
        print("1. Z timecodami (domyślnie)  – [HH:MM:SS] tekst")
        print("2. Bez timecodów             – tylko tekst w nowych liniach")
        print("-" * 50)

        while True:
            try:
                choice = input("Wybierz opcję (1 lub 2, Enter = 1): ").strip()
                if choice in ("", "1"):
                    print("✓ Wybrano: transkrypcja z timecodami")
                    return True
                if choice == "2":
                    print("✓ Wybrano: transkrypcja bez timecodów")
                    return False
                print("Nieprawidłowy wybór. Wpisz 1 lub 2.")
            except KeyboardInterrupt:
                sys.exit()

    # ----------------------------------------------------------------

    def _transcribe_with_whisper(self, audio_data):
        """Transkrybuje audio używając Whisper"""
        segments, info = self.model.transcribe(
            audio_data,
            language="pl",
            beam_size=5,
            word_timestamps=True,
            vad_filter=True,
            vad_parameters=dict(
                min_silence_duration_ms=500,
                speech_pad_ms=100
            )
        )
        return segments, info
    
    
    def _transcribe_with_parakeet(self, audio_data):
        """Transkrybuje audio używając Parakeet v3 przez NeMo"""
        import tempfile
        import soundfile as sf
        import logging
        import sys
        from contextlib import redirect_stdout, redirect_stderr
        import io
        
        # Pobierz model NeMo
        asr_model = self.model["model"]
        
        # Zapisz audio_data do tymczasowego pliku (NeMo wymaga pliku)
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp_file:
            # Zapisz audio jako plik WAV
            sf.write(tmp_file.name, audio_data, 16000)
            
            try:
                # Bardzo agresywne wyciszanie logów
                logging.getLogger().setLevel(logging.CRITICAL)
                logging.getLogger("nemo").setLevel(logging.CRITICAL)
                logging.getLogger("nemo_logging").setLevel(logging.CRITICAL)
                
                # Przechwytuj stdout i stderr aby ukryć wszystkie logi NeMo
                f = io.StringIO()
                
                # Tymczasowo przekieruj stdout i stderr
                old_stdout = sys.stdout
                old_stderr = sys.stderr
                
                try:
                    sys.stdout = f
                    sys.stderr = f
                    
                    # Transkrybuj używając NeMo
                    output = asr_model.transcribe([tmp_file.name], timestamps=True)
                    
                finally:
                    # Przywróć stdout i stderr
                    sys.stdout = old_stdout
                    sys.stderr = old_stderr
                
                # Pobierz wyniki
                transcription = output[0].text
                
                # Sprawdź czy są timecody
                segments = []
                if hasattr(output[0], 'timestamp') and output[0].timestamp:
                    timestamps = output[0].timestamp
                    if 'segment' in timestamps and timestamps['segment']:
                        # Użyj timecodów segmentów
                        for segment in timestamps['segment']:
                            segments.append(type('Segment', (), {
                                'start': segment['start'],
                                'end': segment['end'],
                                'text': segment['segment']
                            })())
                    elif 'word' in timestamps and timestamps['word']:
                        # Jeśli brak segmentów, użyj słów
                        for word in timestamps['word']:
                            segments.append(type('Segment', (), {
                                'start': word['start'],
                                'end': word['end'],
                                'text': word['word']
                            })())
                
                # Jeśli brak timecodów, utwórz jeden segment
                if not segments:
                    segments = [type('Segment', (), {
                        'start': 0,
                        'end': len(audio_data) / 16000,
                        'text': transcription
                    })()]
                
                info = type('Info', (), {
                    'language': 'pl',  # Parakeet automatycznie wykrywa język
                    'language_probability': 0.95,
                    'duration': len(audio_data) / 16000
                })()
                
                return segments, info
                
            finally:
                # Usuń tymczasowy plik
                import os
                try:
                    os.unlink(tmp_file.name)
                except:
                    pass

    def transcribe_file(self):
        """Transkrybuje plik audio"""
        print(f"\nTranskrybowanie pliku: {os.path.basename(self.audio_file_path)}")
        print("Proszę czekać...")
        
        try:
            # Wczytaj plik audio
            audio_data, sr = load_audio_file(self.audio_file_path)
            
            # Transkrybuj używając wybranego modelu
            if self.model_type.startswith("whisper-"):
                segments, info = self._transcribe_with_whisper(audio_data)
            else:  # parakeet
                segments, info = self._transcribe_with_parakeet(audio_data)
            
            print(f"Wykryto język: {info.language} (prawdopodobieństwo: {info.language_probability:.2f})")
            print(f"Długość audio: {info.duration:.2f}s")
            print("\nTranskrypcja:")
            print("-" * 50)
            
            # Zapisuj segmenty do pliku i wyświetlaj na konsoli
            for segment in segments:
                if segment.text.strip():
                    if self.use_timecodes:
                        # Konwertuj timestamp na format HH:MM:SS
                        start_time = int(segment.start)
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
            
        except Exception as e:
            print(f"Błąd podczas transkrypcji: {e}")
            return
        
        # Dodaj informację o zakończeniu
        with open(self.output_file, "a", encoding="utf-8") as f:
            f.write(f"\nZakończono transkrypcję: "
                    f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        
        print("\n" + "=" * 50)
        print("Transkrypcja zakończona!")
        
        # Okienko z opcją powtórki
        self.repeat_transcription = finished_dialog(self.output_file)

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
                    
                    # Transkrybuj używając wybranego modelu
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
                except Exception as e:
                    print(f"Błąd przetwarzania audio: {e}")

    def start_microphone_recording(self):
        print("\nNagrywanie…  (Ctrl+C ‑ zakończ)")
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
            f.write(f"\nZakończono transkrypcję: "
                    f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

        # okienko z opcją powtórki
        self.repeat_transcription = finished_dialog(self.output_file)

    # ----------------------------------------------------------------

    def start(self):
        """Uruchamia odpowiedni tryb transkrypcji"""
        if self.is_file_mode:
            self.transcribe_file()
        else:
            self.start_microphone_recording()


# ------------------------- pętla główna -----------------------------

def main():
    # Bardzo agresywne wyciszanie logów
    import logging
    import os
    
    # Ustaw zmienne środowiskowe dla wyciszenia (chyba że użytkownik chce logi)
    if not os.environ.get("SHOW_NEMO_LOGS"):
        os.environ["NEMO_LOGGING_LEVEL"] = "CRITICAL"
        os.environ["NVIDIA_TF32_OVERRIDE"] = "0"
        os.environ["CUDA_VISIBLE_DEVICES"] = "0"  # Ogranicza do jednej karty GPU
    
    # Wycisz wszystkie logi Python
    logging.getLogger().setLevel(logging.CRITICAL)
    logging.getLogger("nemo").setLevel(logging.CRITICAL)
    logging.getLogger("nemo_logging").setLevel(logging.CRITICAL)
    logging.getLogger("transformers").setLevel(logging.CRITICAL)
    logging.getLogger("torch").setLevel(logging.CRITICAL)
    
    # Wycisz logi root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.CRITICAL)
    for handler in root_logger.handlers:
        handler.setLevel(logging.CRITICAL)
    
    # Sprawdź i zainstaluj brakujące zależności
    if check_and_install_dependencies():
        print("\n" + "=" * 50)
        print("RESTART APLIKACJI")
        print("=" * 50)
        print("Biblioteki zostały zainstalowane. Uruchamiam ponownie...")
        # Restart aplikacji z nowymi bibliotekami
        os.execv(sys.executable, [sys.executable] + sys.argv)
        return
    
    # Sprawdź czy przekazano plik jako argument
    audio_file_path = None
    
    if len(sys.argv) > 1:
        audio_file_path = sys.argv[1]
        
        # Sprawdź czy plik istnieje
        if not os.path.isfile(audio_file_path):
            print(f"BŁĄD: Plik '{audio_file_path}' nie istnieje!")
            input("Naciśnij Enter aby zakończyć...")
            return
        
        # Sprawdź rozszerzenie pliku
        supported_extensions = ['.wav', '.mp3', '.m4a', '.flac', '.ogg', '.aac', '.mp4', '.mkv', '.avi', '.mov']
        file_ext = os.path.splitext(audio_file_path)[1].lower()
        
        if file_ext not in supported_extensions:
            print(f"OSTRZEŻENIE: Rozszerzenie '{file_ext}' może nie być obsługiwane.")
            print(f"Obsługiwane formaty: {', '.join(supported_extensions)}")
            choice = input("Czy chcesz kontynuować? (T/n): ").strip().lower()
            if choice in ("n", "no", "nie"):
                return
    
    while True:
        transcriber = AudioTranscriber(audio_file_path)
        transcriber.start()
        if not transcriber.repeat_transcription:
            break
        
        # Jeśli to był tryb pliku i użytkownik chce powtórzyć - zapytaj o nowy plik
        if audio_file_path:
            print("\n" + "=" * 50)
            choice = input("Czy chcesz transkrybować ten sam plik ponownie? (T/n): ").strip().lower()
            if choice in ("n", "no", "nie"):
                break


if __name__ == "__main__":
    # bezpieczna obsługa SIGINT (Ctrl+C) – żeby uniknąć „Terminate batch job"
    signal.signal(signal.SIGINT, signal.default_int_handler)
    
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nPrzerwano przez użytkownika.")
    except Exception as e:
        print(f"\nNieoczekiwany błąd: {e}")
        input("Naciśnij Enter aby zakończyć...")