/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_GROQ_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Electron API types for web mode
interface Window {
  electron?: {
    python?: {
      isAvailable: () => Promise<{ data?: { available?: boolean } }>
      getStatus: () => Promise<{ data?: { status?: string; model?: string; available?: boolean; error?: string } }>
      start: () => Promise<any>
      stop: () => Promise<any>
      transcribe: (audioPath: string, options?: any) => Promise<any>
      downloadModel: () => Promise<{ success: boolean; error?: string }>
      onModelDownloadProgress: (callback: (progress: { status: string; progress: number; message: string; error?: string }) => void) => () => void
    }
    file?: {
      transcribe: (filePath: string) => Promise<any>
      save: (filePath: string, content: string) => Promise<void>
    }
    recording?: {
      start: (mode?: any) => Promise<any>
      stop: () => Promise<any>
      startTime?: number
      onAudioLevelUpdated?: (callback: (data: { level: number }) => () => void) => () => void
      onTranscriptionComplete?: (callback: (data: any) => void) => () => void
      onHotkeyPressed?: (callback: (event: any, hotkeyType: string) => void) => () => void
      onHotkeyReleased?: (callback: (event: any, hotkeyType: string) => void) => () => void
    }
    device?: {
      getDeviceInfo: () => Promise<any>
      updateDeviceName: (name: string) => Promise<any>
    }
  }
}
