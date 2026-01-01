# EasyScribe

Audio transcription app with folder organization, tagging, and cloud sync.

## Project Structure

```
easyscribe/
├── electron/              # Electron main process files
│   ├── main.ts           # Main Electron entry point
│   ├── preload.ts        # Preload script
│   └── modules/          # Electron modules (empty for now)
├── python/               # Python dependencies for audio processing
│   └── requirements.txt
├── src/                  # Source code
│   ├── renderer/         # React renderer process
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── stores/       # State management (Zustand)
│   │   ├── lib/          # Utility libraries
│   │   ├── styles/       # CSS/Tailwind styles
│   │   ├── App.tsx       # Root React component
│   │   └── main.tsx      # React entry point
│   └── shared/           # Shared code between processes
│       ├── types.ts      # TypeScript interfaces
│       ├── ipc-channels.ts # IPC channel constants
│       └── defaults.ts   # Default values
├── resources/            # Static resources
│   └── icons/            # App icons (empty for now)
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── electron.vite.config.ts # Electron + Vite config
├── electron-builder.yml  # Electron builder config
├── tailwind.config.js    # Tailwind CSS config
└── postcss.config.js     # PostCSS config
```

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+ (for audio processing)
- FFmpeg (for audio processing, included via ffmpeg-static)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-org/easyscribe.git
cd easyscribe
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your API keys
```

4. Install Python dependencies:
```bash
# Windows
python/install.bat

# macOS/Linux
python/install.sh
```

### Development

Start the development server:
```bash
npm run dev
```

### Build

Build for development:
```bash
npm run build
```

### Build for Production

Build distribution packages for your platform:

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

Built files will be in the `out/` directory.

### Preview Production Build

```bash
npm run preview
```

## Configuration

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Groq API Key (for AI transcription)
VITE_GROQ_API_KEY=your-groq-api-key
```

### Settings

The app stores settings locally and can be configured through the Settings page:
- **Device Settings**: Configure audio input devices
- **Engine Settings**: Choose transcription engine (Groq, Whisper, etc.)
- **API Settings**: Configure API keys for transcription services
- **Hotkey Settings**: Set global hotkeys for recording
- **Output Settings**: Configure output format and location
- **Audio Settings**: Adjust audio quality and format
- **Appearance Settings**: Theme and display preferences
- **Behavior Settings**: Auto-start, notifications, etc.
- **Data Settings**: Database management and sync settings

## Features

- **File Transcription**: Import or upload audio files for transcription
- **Live Recording**: Record audio in real-time using global hotkeys
- **Folder Organization**: Organize transcriptions into custom folders
- **Tagging System**: Add tags to transcriptions for easy filtering
- **Cloud Sync**: Optional Supabase integration for data synchronization
- **Search**: Full-text search across all transcriptions
- **Export**: Export transcriptions as TXT or SRT files
- **Multiple Engines**: Support for Groq, Whisper, and other transcription engines

## Troubleshooting

### Python Dependencies Not Found

If you encounter Python-related errors:

1. Ensure Python 3.10+ is installed:
```bash
python --version
```

2. Reinstall Python dependencies:
```bash
# Windows
python/install.bat

# macOS/Linux
python/install.sh
```

### Audio Device Not Found

If no audio devices are detected:

1. Check system audio settings
2. Ensure microphone permissions are granted
3. Try restarting the application

### Transcription Fails

If transcription fails:

1. Check your API key in Settings > API Settings
2. Ensure you have internet connectivity (for cloud-based transcription)
3. Check the error message in the processing queue
4. Try a different transcription engine

### Build Errors

If you encounter build errors:

1. Clear the build cache:
```bash
rm -rf dist dist-electron out node_modules
npm install
```

2. Ensure all dependencies are installed:
```bash
npm install
```

3. Check Node.js version (must be 18+):
```bash
node --version
```

## Technology Stack

- **Electron** - Desktop framework
- **React** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **TanStack Query** - Data fetching
- **Supabase** - Cloud sync backend
- **Groq API** - AI transcription service
- **Python** - Audio processing backend

## License

MIT
