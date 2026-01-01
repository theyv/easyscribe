import { useCallback, useEffect, useState } from 'react'
import { supabase, testConnection, healthCheck } from '@/lib/supabase'
import type {
  Device,
  DeviceInsert,
  DeviceUpdate,
  Setting,
  SettingInsert,
  SettingUpdate,
  Folder,
  FolderInsert,
  FolderUpdate,
  Tag,
  TagInsert,
  TagUpdate,
  Transcription,
  TranscriptionInsert,
  TranscriptionUpdate,
  TranscriptionTag,
  TranscriptionTagInsert,
  TranscriptionWithTags,
  FolderWithCount,
  SearchResult,
} from '@/lib/database.types'

export interface SupabaseError {
  message: string
  code?: string
  details?: string
}

export function useSupabase() {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<SupabaseError | null>(null)

  // Check connection status
  useEffect(() => {
    let mounted = true

    const checkConnection = async () => {
      setIsConnecting(true)
      try {
        const result = await testConnection()
        if (mounted) {
          setIsConnected(result.success)
          if (!result.success) {
            setError({ message: result.error || 'Connection failed' })
          } else {
            setError(null)
          }
        }
      } catch (err) {
        if (mounted) {
          setIsConnected(false)
          setError({
            message: err instanceof Error ? err.message : 'Unknown error',
          })
        }
      } finally {
        if (mounted) {
          setIsConnecting(false)
        }
      }
    }

    checkConnection()

    return () => {
      mounted = false
    }
  }, [])

  // Generic error handler
  const handleError = useCallback((err: unknown): SupabaseError => {
    if (err && typeof err === 'object' && 'message' in err) {
      return {
        message: String(err.message),
        code: 'code' in err ? String(err.code) : undefined,
        details: 'details' in err ? String(err.details) : undefined,
      }
    }
    return { message: 'An unknown error occurred' }
  }, [])

  // Devices operations
  const getDevices = useCallback(async () => {
    const { data, error: err } = await supabase.from('devices').select('*')
    if (err) throw handleError(err)
    return data as Device[]
  }, [handleError])

  const getDeviceById = useCallback(async (id: string) => {
    const { data, error: err } = await supabase.from('devices').select('*').eq('id', id).single()
    if (err) throw handleError(err)
    return data as Device
  }, [handleError])

  const getDeviceByIdentifier = useCallback(async (identifier: string) => {
    const { data, error: err } = await supabase
      .from('devices')
      .select('*')
      .eq('device_identifier', identifier)
      .single()
    if (err) throw handleError(err)
    return data as Device
  }, [handleError])

  const createDevice = useCallback(async (device: DeviceInsert) => {
    const { data, error: err } = await supabase.from('devices').insert(device).select().single()
    if (err) throw handleError(err)
    return data as Device
  }, [handleError])

  const updateDevice = useCallback(async (id: string, updates: DeviceUpdate) => {
    const { data, error: err } = await supabase
      .from('devices')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (err) throw handleError(err)
    return data as Device
  }, [handleError])

  const deleteDevice = useCallback(async (id: string) => {
    const { error: err } = await supabase.from('devices').delete().eq('id', id)
    if (err) throw handleError(err)
  }, [handleError])

  // Settings operations
  const getSettings = useCallback(async (deviceId: string) => {
    const { data, error: err } = await supabase.from('settings').select('*').eq('device_id', deviceId)
    if (err) throw handleError(err)
    return data as Setting[]
  }, [handleError])

  const getSetting = useCallback(async (deviceId: string, key: string) => {
    const { data, error: err } = await supabase
      .from('settings')
      .select('*')
      .eq('device_id', deviceId)
      .eq('key', key)
      .single()
    if (err) throw handleError(err)
    return data as Setting
  }, [handleError])

  const upsertSetting = useCallback(async (setting: SettingInsert) => {
    const { data, error: err } = await supabase
      .from('settings')
      .upsert(setting)
      .select()
      .single()
    if (err) throw handleError(err)
    return data as Setting
  }, [handleError])

  const deleteSetting = useCallback(async (deviceId: string, key: string) => {
    const { error: err } = await supabase
      .from('settings')
      .delete()
      .eq('device_id', deviceId)
      .eq('key', key)
    if (err) throw handleError(err)
  }, [handleError])

  // Folders operations
  const getFolders = useCallback(async (deviceId: string) => {
    const { data, error: err } = await supabase
      .from('folders')
      .select('*')
      .eq('device_id', deviceId)
      .order('name')
    if (err) throw handleError(err)
    return data as Folder[]
  }, [handleError])

  const getFolderWithCount = useCallback(async (deviceId: string) => {
    const { data, error: err } = await supabase
      .from('folders')
      .select('*, transcriptions(count)')
      .eq('device_id', deviceId)
      .order('name')
    if (err) throw handleError(err)
    return data as (Folder & { transcriptions: { count: number } })[]
  }, [handleError])

  const createFolder = useCallback(async (folder: FolderInsert) => {
    const { data, error: err } = await supabase.from('folders').insert(folder).select().single()
    if (err) throw handleError(err)
    return data as Folder
  }, [handleError])

  const updateFolder = useCallback(async (id: string, updates: FolderUpdate) => {
    const { data, error: err } = await supabase
      .from('folders')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (err) throw handleError(err)
    return data as Folder
  }, [handleError])

  const deleteFolder = useCallback(async (id: string) => {
    const { error: err } = await supabase.from('folders').delete().eq('id', id)
    if (err) throw handleError(err)
  }, [handleError])

  // Tags operations
  const getTags = useCallback(async (deviceId: string) => {
    const { data, error: err } = await supabase.from('tags').select('*').eq('device_id', deviceId).order('name')
    if (err) throw handleError(err)
    return data as Tag[]
  }, [handleError])

  const createTag = useCallback(async (tag: TagInsert) => {
    const { data, error: err } = await supabase.from('tags').insert(tag).select().single()
    if (err) throw handleError(err)
    return data as Tag
  }, [handleError])

  const updateTag = useCallback(async (id: string, updates: TagUpdate) => {
    const { data, error: err } = await supabase
      .from('tags')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (err) throw handleError(err)
    return data as Tag
  }, [handleError])

  const deleteTag = useCallback(async (id: string) => {
    const { error: err } = await supabase.from('tags').delete().eq('id', id)
    if (err) throw handleError(err)
  }, [handleError])

  // Transcriptions operations
  const getTranscriptions = useCallback(async (deviceId: string, options?: {
    folderId?: string
    limit?: number
    offset?: number
  }) => {
    let query = supabase
      .from('transcriptions')
      .select('*')
      .eq('device_id', deviceId)

    if (options?.folderId) {
      query = query.eq('folder_id', options.folderId)
    }

    query = query.order('created_at', { ascending: false })

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
    }

    const { data, error: err } = await query
    if (err) throw handleError(err)
    return data as Transcription[]
  }, [handleError])

  const getTranscriptionWithTags = useCallback(async (id: string) => {
    const { data, error: err } = await supabase
      .from('transcriptions')
      .select('*, tags(*)')
      .eq('id', id)
      .single()
    if (err) throw handleError(err)
    return data as TranscriptionWithTags
  }, [handleError])

  const createTranscription = useCallback(async (transcription: TranscriptionInsert) => {
    const { data, error: err } = await supabase
      .from('transcriptions')
      .insert(transcription)
      .select()
      .single()
    if (err) throw handleError(err)
    return data as Transcription
  }, [handleError])

  const updateTranscription = useCallback(async (id: string, updates: TranscriptionUpdate) => {
    const { data, error: err } = await supabase
      .from('transcriptions')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (err) throw handleError(err)
    return data as Transcription
  }, [handleError])

  const deleteTranscription = useCallback(async (id: string) => {
    const { error: err } = await supabase.from('transcriptions').delete().eq('id', id)
    if (err) throw handleError(err)
  }, [handleError])

  // Transcription tags operations
  const addTagToTranscription = useCallback(async (transcriptionId: string, tagId: string) => {
    const { data, error: err } = await supabase
      .from('transcription_tags')
      .insert({ transcription_id: transcriptionId, tag_id: tagId })
      .select()
      .single()
    if (err) throw handleError(err)
    return data as TranscriptionTag
  }, [handleError])

  const removeTagFromTranscription = useCallback(async (transcriptionId: string, tagId: string) => {
    const { error: err } = await supabase
      .from('transcription_tags')
      .delete()
      .eq('transcription_id', transcriptionId)
      .eq('tag_id', tagId)
    if (err) throw handleError(err)
  }, [handleError])

  // Search operations
  const searchTranscriptions = useCallback(async (query: string) => {
    const { data, error: err } = await supabase.rpc('search_transcriptions', {
      search_query: query,
    })
    if (err) throw handleError(err)
    return data as SearchResult[]
  }, [handleError])

  return {
    supabase,
    isConnected,
    isConnecting,
    error,
    // Devices
    getDevices,
    getDeviceById,
    getDeviceByIdentifier,
    createDevice,
    updateDevice,
    deleteDevice,
    // Settings
    getSettings,
    getSetting,
    upsertSetting,
    deleteSetting,
    // Folders
    getFolders,
    getFolderWithCount,
    createFolder,
    updateFolder,
    deleteFolder,
    // Tags
    getTags,
    createTag,
    updateTag,
    deleteTag,
    // Transcriptions
    getTranscriptions,
    getTranscriptionWithTags,
    createTranscription,
    updateTranscription,
    deleteTranscription,
    // Transcription tags
    addTagToTranscription,
    removeTagFromTranscription,
    // Search
    searchTranscriptions,
  }
}
