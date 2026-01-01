import { Settings } from './types'

export type { Settings }

export const DEFAULT_SETTINGS: Settings = {
  // Appearance
  theme: 'system',
  accentColor: 'violet',
  
  // Language
  language: 'en',
  
  // Hotkeys
  pushToTalkHotkey: 'CmdOrCtrl+Shift+Space',
  toggleRecordHotkey: 'CmdOrCtrl+Shift+R',
  
  // Behavior
  autoStart: false,
  startMinimized: false,
  openWebUiOnStart: true,
  showFloatingIndicator: true,
  notificationTranscriptionComplete: true,
  notificationErrors: true,
  notificationAppReady: true,
  
  // Audio
  selectedMicrophone: '',
  maxRecordingDuration: 600, // 10 minutes in seconds
  
  // Output
  includeTimestamps: true,
  timestampInterval: 'auto',
  timestampFormat: '[HH:MM:SS]',
  autoExportSrt: false,
  defaultOutputFolder: 'source',
  customOutputFolder: '',
  
  // Engines
  liveTranscriptionEngine: 'local',
  fileTranscriptionEngine: 'local',
  
  // API
  groqApiKey: '',
  groqApiKeyValid: false,
  supabaseProjectUrl: '',
  supabaseAnonKey: '',
  
  // Legacy (for compatibility)
  hotkey: 'CmdOrCtrl+Shift+R',
  minimizeToTray: true,
  audioQuality: 'medium',
  outputFormat: 'txt',
  cloudSyncEnabled: false
}

export const AUDIO_QUALITY_OPTIONS = {
  low: { bitrate: 64, sampleRate: 16000 },
  medium: { bitrate: 128, sampleRate: 44100 },
  high: { bitrate: 256, sampleRate: 48000 }
} as const

export const OUTPUT_FORMATS = ['txt', 'srt', 'vtt', 'json'] as const

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'pl', name: 'Polish' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' }
] as const

export const FOLDER_COLORS = [
  '#EF4444', // red-500
  '#F97316', // orange-500
  '#EAB308', // yellow-500
  '#22C55E', // green-500
  '#14B8A6', // teal-500
  '#3B82F6', // blue-500
  '#8B5CF6', // violet-500
  '#EC4899', // pink-500
  '#6B7280'  // gray-500
] as const

export const TAG_COLORS = [
  '#EF4444', // red-500
  '#F97316', // orange-500
  '#EAB308', // yellow-500
  '#22C55E', // green-500
  '#14B8A6', // teal-500
  '#3B82F6', // blue-500
  '#8B5CF6', // violet-500
  '#EC4899', // pink-500
  '#6B7280', // gray-500
  '#0D9488', // teal-600
  '#4F46E5', // indigo-600
  '#BE185D'  // pink-700
] as const
