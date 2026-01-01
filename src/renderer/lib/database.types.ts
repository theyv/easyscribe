/**
 * This file contains TypeScript types that match the database schema.
 * These types are manually defined to match the SQL schema in database/schema.sql.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      devices: {
        Row: {
          id: string
          device_identifier: string
          device_name: string
          device_type: string
          os_version: string | null
          app_version: string | null
          last_seen_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          device_identifier: string
          device_name: string
          device_type: string
          os_version?: string | null
          app_version?: string | null
          last_seen_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          device_identifier?: string
          device_name?: string
          device_type?: string
          os_version?: string | null
          app_version?: string | null
          last_seen_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      settings: {
        Row: {
          id: string
          device_id: string
          key: string
          value: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          device_id: string
          key: string
          value: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          device_id?: string
          key?: string
          value?: Json
          created_at?: string
          updated_at?: string
        }
      }
      folders: {
        Row: {
          id: string
          device_id: string
          name: string
          color: string
          parent_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          device_id: string
          name: string
          color?: string
          parent_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          device_id?: string
          name?: string
          color?: string
          parent_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      tags: {
        Row: {
          id: string
          device_id: string
          name: string
          color: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          device_id: string
          name: string
          color?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          device_id?: string
          name?: string
          color?: string
          created_at?: string
          updated_at?: string
        }
      }
      transcriptions: {
        Row: {
          id: string
          device_id: string
          folder_id: string | null
          title: string
          content: string
          source_filename: string | null
          audio_path: string | null
          duration: number | null
          type: string
          language: string | null
          metadata: Json
          synced: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          device_id: string
          folder_id?: string | null
          title: string
          content: string
          source_filename?: string | null
          audio_path?: string | null
          duration?: number | null
          type?: string
          language?: string | null
          metadata?: Json
          synced?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          device_id?: string
          folder_id?: string | null
          title?: string
          content?: string
          source_filename?: string | null
          audio_path?: string | null
          duration?: number | null
          type?: string
          language?: string | null
          metadata?: Json
          synced?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      transcription_tags: {
        Row: {
          id: string
          transcription_id: string
          tag_id: string
          created_at: string
        }
        Insert: {
          id?: string
          transcription_id: string
          tag_id: string
          created_at?: string
        }
        Update: {
          id?: string
          transcription_id?: string
          tag_id?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      search_transcriptions: {
        Args: {
          search_query: string
        }
        Returns: {
          id: string
          title: string
          content: string
          source_filename: string | null
          folder_id: string | null
          created_at: string
          similarity_score: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Convenience types for common operations
export type Device = Database['public']['Tables']['devices']['Row']
export type DeviceInsert = Database['public']['Tables']['devices']['Insert']
export type DeviceUpdate = Database['public']['Tables']['devices']['Update']

export type Setting = Database['public']['Tables']['settings']['Row']
export type SettingInsert = Database['public']['Tables']['settings']['Insert']
export type SettingUpdate = Database['public']['Tables']['settings']['Update']

export type Folder = Database['public']['Tables']['folders']['Row']
export type FolderInsert = Database['public']['Tables']['folders']['Insert']
export type FolderUpdate = Database['public']['Tables']['folders']['Update']

export type Tag = Database['public']['Tables']['tags']['Row']
export type TagInsert = Database['public']['Tables']['tags']['Insert']
export type TagUpdate = Database['public']['Tables']['tags']['Update']

export type Transcription = Database['public']['Tables']['transcriptions']['Row']
export type TranscriptionInsert = Database['public']['Tables']['transcriptions']['Insert']
export type TranscriptionUpdate = Database['public']['Tables']['transcriptions']['Update']

export type TranscriptionTag = Database['public']['Tables']['transcription_tags']['Row']
export type TranscriptionTagInsert = Database['public']['Tables']['transcription_tags']['Insert']
export type TranscriptionTagUpdate = Database['public']['Tables']['transcription_tags']['Update']

// Transcription with joined tags
export type TranscriptionWithTags = Transcription & {
  tags: Tag[]
}

// Folder with transcriptions count
export type FolderWithCount = Folder & {
  transcription_count: number
}

// Search result type
export type SearchResult = Database['public']['Functions']['search_transcriptions']['Returns'][0]
