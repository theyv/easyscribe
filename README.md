# EasyScribe - Transkrypcja Audio (Whisper & Parakeet v3)

Aplikacja do transkrypcji audio z możliwością wyboru między dwoma typami modeli AI:
- **Faster Whisper** - szybki model z wyborem rozmiaru (tiny/base/small/medium/large-v3)
- **NVIDIA Parakeet v3** - nowoczesny, wielojęzyczny model

## Funkcje

- ✅ Transkrypcja plików audio (drag & drop)
- ✅ Nagrywanie na żywo z mikrofonu
- ✅ Wybór modelu AI (Whisper lub Parakeet v3)
- ✅ Opcje formatowania (z/bez timecodów)
- ✅ Automatyczne wykrywanie języka
- ✅ Obsługa GPU (CUDA) dla szybszej transkrypcji
- ✅ Automatyczne pobieranie brakujących bibliotek
- ✅ Zapisywanie wyników w folderze `output`
- ✅ Ciche działanie (wyciszone logi bibliotek)

## Wymagania

### Podstawowe
```bash
pip install sounddevice numpy
```

### Dla plików audio (wybierz jedną opcję)
```bash
pip install librosa
# lub
pip install soundfile
```

### Dla Faster Whisper
```bash
pip install faster-whisper
```

### Dla NVIDIA Parakeet v3
```bash
pip install nemo_toolkit[asr]
```

### Instalacja wszystkich zależności
```bash
pip install -r requirements.txt
```

## Użytkowanie

### Uruchomienie
1. **Tryb mikrofonu**: Uruchom `easyscribe.bat` lub `python easyscribe.py`
2. **Tryb pliku**: Przeciągnij plik audio na `easyscribe.bat`

### Automatyczna instalacja
Aplikacja automatycznie wykryje i zainstaluje brakujące biblioteki przy pierwszym uruchomieniu.

### Wybór modelu
Po uruchomieniu aplikacja zapyta o wybór modelu:
- **1** - Faster Whisper (następnie wybierz rozmiar: tiny/base/small/medium/large-v3)
- **2** - NVIDIA Parakeet v3 (nowoczesny, wielojęzyczny)

### Obsługiwane formaty
- Audio: `.wav`, `.mp3`, `.m4a`, `.flac`, `.ogg`, `.aac`
- Wideo: `.mp4`, `.mkv`, `.avi`, `.mov`

## Porównanie modeli

| Model | Rozmiar | Zalety | Wady |
|-------|---------|--------|------|
| **Faster Whisper** | tiny | - Najszybszy<br>- Najmniejsze zużycie RAM | - Najmniej dokładny |
| | base | - Szybki<br>- Dobra jakość | - Średnie zużycie zasobów |
| | small | - Średnia szybkość<br>- Lepsza jakość | - Większe zużycie zasobów |
| | medium | - Wolniejszy<br>- Wysoka jakość | - Duże zużycie zasobów |
| | large-v3 | - Najwyższa jakość | - Najwolniejszy<br>- Największe zużycie RAM |
| **Parakeet v3** | - | - Bardzo wysoka dokładność<br>- Wielojęzyczny<br>- Automatyczne wykrywanie języka | - Wymaga NeMo<br>- Większe zużycie zasobów |

## Struktura plików

```
transcribe py/
├── easyscribe.py               # Główna aplikacja
├── easyscribe.bat              # Skrypt uruchamiający
├── requirements.txt            # Lista zależności
├── README.md                   # Ta dokumentacja
├── models/                     # Katalog na modele AI
└── output/                     # Katalog z transkrypcjami
```

## Rozwiązywanie problemów

### Błąd CUDA
Jeśli CUDA nie jest dostępne, aplikacja automatycznie przełączy się na CPU (może być wolne).

### Brak bibliotek dla Parakeet v3
Jeśli brakuje `nemo_toolkit[asr]`, aplikacja automatycznie przełączy się na Whisper.

### Logi Parakeet v3
Domyślnie logi NeMo są wyciszone. Aby je włączyć, ustaw zmienną środowiskową:
```bash
set SHOW_NEMO_LOGS=1
easyscribe.bat
```

### Problemy z audio
Sprawdź czy masz zainstalowane odpowiednie biblioteki audio (`librosa` lub `soundfile`).

## Licencja

Aplikacja wykorzystuje otwarte modele AI:
- Faster Whisper: MIT License
- NVIDIA Parakeet v3: Apache 2.0 License
