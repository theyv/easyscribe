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
    }
  }
}
