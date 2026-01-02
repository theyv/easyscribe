// Core domain types matching the database schema

export interface Transcription {
  id: string
  device_id: string
  folder_id?: string | null
  title: string
  content: string
  source_filename?: string | null
  audio_path?: string | null
  duration?: number | null
  type: 'recording' | 'import' | 'upload'
  language?: string | null
  metadata?: Record<string, unknown>
  synced: boolean
  created_at: string
  updated_at: string
  tags?: Tag[]
}

export interface Folder {
  id: string
  device_id: string
  name: string
  color: string
  parent_id?: string | null
  created_at: string
  updated_at: string
}

export interface Tag {
  id: string
  device_id: string
  name: string
  color: string
  created_at: string
  updated_at: string
}

export interface Setting {
  id: string
  device_id: string
  key: string
  value: unknown
  created_at: string
  updated_at: string
}

// Application settings configuration (stored in database as key-value pairs)
export interface Settings {
  // Appearance
  theme: 'light' | 'dark' | 'system'
  accentColor: 'violet' | 'blue' | 'green' | 'orange' | 'pink' | 'red'
  
  // Language
  language: string
  
  // Hotkeys
  pushToTalkHotkey: string
  toggleRecordHotkey: string
  
  // Behavior
  autoStart: boolean
  startMinimized: boolean
  openWebUiOnStart: boolean
  showFloatingIndicator: boolean
  notificationTranscriptionComplete: boolean
  notificationErrors: boolean
  notificationAppReady: boolean
  
  // Audio
  selectedMicrophone: string
  maxRecordingDuration: number
  
  // Output
  includeTimestamps: boolean
  timestampInterval: 'auto' | '30s' | '60s' | '120s' | '300s'
  timestampFormat: '[HH:MM:SS]' | '[MM:SS]' | '[seconds]'
  autoExportSrt: boolean
  defaultOutputFolder: 'source' | 'custom'
  customOutputFolder: string
  
  // Engines
  liveTranscriptionEngine: 'local' | 'groq'
  fileTranscriptionEngine: 'local' | 'groq'
  
  // API
  groqApiKey: string
  groqApiKeyValid: boolean
  supabaseProjectUrl: string
  supabaseAnonKey: string
  
  // Legacy (for compatibility)
  hotkey: string
  minimizeToTray: boolean
  audioQuality: 'low' | 'medium' | 'high'
  outputFormat: 'txt' | 'srt' | 'vtt' | 'json'
  cloudSyncEnabled: boolean
}

export type SettingsSection =
  | 'device'
  | 'engines'
  | 'api'
  | 'hotkeys'
  | 'output'
  | 'audio'
  | 'appearance'
  | 'behavior'
  | 'data'

export interface HotkeyCombination {
  key: string
  modifiers: {
    ctrl?: boolean
    shift?: boolean
    alt?: boolean
    meta?: boolean
  }
}

export interface Device {
  id: string
  deviceIdentifier: string
  deviceName: string
  deviceType: string
  osVersion?: string | null
  appVersion?: string | null
  lastSeenAt: string
  created_at: string
  updated_at: string
}

// Recording types
export enum RecordingState {
  IDLE = 'idle',
  RECORDING = 'recording',
  PROCESSING = 'processing',
  DONE = 'done'
}

export enum RecordingMode {
  PUSH_TO_TALK = 'push-to-talk',
  TOGGLE = 'toggle'
}

export interface RecordingData {
  isRecording: boolean
  isPaused: boolean
  duration: number
  audioLevel: number
  state: RecordingState
  mode: RecordingMode
}

export interface HotkeyCombination {
  key: string
  modifiers: {
    ctrl?: boolean
    shift?: boolean
    alt?: boolean
    meta?: boolean
  }
}

export interface AudioDevice {
  id: string
  name: string
  isDefault?: boolean
}

export interface RecordingOptions {
  sampleRate?: number
  channels?: number
  maxDuration?: number
  warningDuration?: number
}

export interface RecordingResult {
  audioBuffer: Buffer
  duration: number
  format: string
}

export interface SyncStatus {
  lastSync: string | null
  isSyncing: boolean
  pendingChanges: number
  error: string | null
}

export interface CloudUser {
  id: string
  email: string
  name: string
  avatar?: string
}

export interface SupabaseConfig {
  url: string
  anonKey: string
}

// IPC types
export interface IpcRequest {
  channel: string
  data?: unknown
}

export interface IpcResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}
