# Product Context

This file provides a high-level overview of the project and the expected product that will be created. Initially it is based upon projectBrief.md (if provided) and all other available project-related information in the working directory. This file is intended to be updated as the project evolves, and should be used to inform all other modes of the project's goals and context.
2026-01-01 16:20:38 - Log of updates made will be appended as footnotes to the end of this file.

*

## Project Goal

EasyScribe is a desktop audio transcription application that provides folder organization, tagging, and cloud sync capabilities. The app allows users to transcribe audio files from their computer or record live audio, organize transcriptions into folders, add tags for categorization, and optionally sync data to Supabase cloud storage.

## Key Features

- File transcription - Drop audio files to transcribe them
- Live transcription - Record and transcribe audio in real-time using hotkeys
- Folder organization - Organize transcriptions into custom folders
- Tagging system - Add tags to transcriptions for easy filtering
- Cloud sync - Optional Supabase integration for data synchronization
- Processing queue - Queue and track transcription progress
- Search functionality - Search across all transcriptions
- Settings management - Configure audio devices, hotkeys, API keys, and app behavior
- Dark/light theme support - Toggle between appearance themes
- Tray icon - System tray integration for quick access

## Overall Architecture

- **Electron** - Desktop framework providing main process and IPC communication
- **React** - UI library for the renderer process
- **TypeScript** - Type safety across the codebase
- **Vite** - Build tool for fast development and optimized production builds
- **Tailwind CSS** - Utility-first CSS framework for styling
- **Zustand** - State management for client-side state
- **TanStack Query** - Data fetching and caching
- **Supabase** - Cloud sync backend (PostgreSQL database)
- **Python** - Audio processing backend (transcriber.py)
- **Groq API** - AI-powered transcription service

The app follows a modular architecture with:
- Main process modules in `electron/modules/` for system-level operations
- Renderer components in `src/renderer/components/` organized by feature
- Custom hooks in `src/renderer/hooks/` for reusable logic
- Shared types and constants in `src/shared/`
