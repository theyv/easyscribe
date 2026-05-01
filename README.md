# EasyScribe - Audio Transcription (Whisper & Parakeet v3)

EasyScribe is an audio transcription app with a choice between two AI model families:
- **Faster Whisper** - a fast model with selectable sizes (tiny/base/small/medium/large-v3)
- **NVIDIA Parakeet v3** - a modern multilingual model

## Features

- Audio file transcription via drag and drop
- Live microphone recording
- AI model selection (Whisper or Parakeet v3)
- Formatting options with or without timestamps
- Automatic language detection
- CUDA GPU support for faster transcription
- Automatic installation of missing packages
- Output saved to the `output` folder
- Quiet operation with library logs silenced by default
- Optional two-speaker diarization through FoxNoseTech/diarize
- Parallel CPU diarization while GPU transcription continues

## Requirements

### Basic
```bash
pip install sounddevice numpy
```

### Audio File Support
Choose one option:

```bash
pip install librosa
# or
pip install soundfile
```

### Faster Whisper
```bash
pip install faster-whisper
```

### NVIDIA Parakeet v3
```bash
pip install nemo_toolkit[asr]
```

### All Dependencies
```bash
pip install -r requirements.txt
```

## Usage

### Start
1. **Microphone mode**: run `easyscribe.bat` or `python easyscribe.py`
2. **File mode**: drag an audio file onto `easyscribe.bat`, or pass files/folders as arguments

### Automatic Installation
The app detects and installs missing packages on first run.

### Model Selection
On startup, the app asks which model to use:
- **1** - Faster Whisper, then choose a size: tiny/base/small/medium/large-v3
- **2** - NVIDIA Parakeet v3

### Diarization
If diarization is enabled, EasyScribe saves a raw transcription live first. When diarization finishes, the output file is rewritten with speaker labels.

For multiple files, transcription can continue on the GPU while CPU diarization runs in the background. The default number of parallel diarization workers is 3.

### Supported Formats
- Audio: `.wav`, `.mp3`, `.m4a`, `.flac`, `.ogg`, `.aac`
- Video: `.mp4`, `.mkv`, `.avi`, `.mov`

## Model Comparison

| Model | Size | Pros | Cons |
|-------|------|------|------|
| **Faster Whisper** | tiny | Fastest, lowest RAM usage | Least accurate |
| | base | Fast, good quality | Medium resource usage |
| | small | Medium speed, better quality | Higher resource usage |
| | medium | Slower, high quality | High resource usage |
| | large-v3 | Best quality | Slowest, highest RAM usage |
| **Parakeet v3** | - | Very high accuracy, multilingual, automatic language detection | Requires NeMo, higher resource usage |

## Project Structure

```text
easyscribe/
├── easyscribe.py               # Main application
├── easyscribe.bat              # Windows launcher
├── requirements.txt            # Dependency list
├── README.md                   # This documentation
├── models/                     # AI model directory
└── output/                     # Transcription output directory
```

## Troubleshooting

### CUDA Error
If CUDA is unavailable, the app can continue on CPU, but it will be slower.

### Missing Parakeet v3 Libraries
If `nemo_toolkit[asr]` is missing or Parakeet fails to load, the app switches to Whisper automatically.

### Parakeet v3 Logs
NeMo logs are silenced by default. To enable them, set:

```bash
set SHOW_NEMO_LOGS=1
easyscribe.bat
```

### Audio Issues
Make sure the required audio libraries are installed (`librosa` or `soundfile`).

## License

EasyScribe uses open AI models:
- Faster Whisper: MIT License
- NVIDIA Parakeet v3: Apache 2.0 License
