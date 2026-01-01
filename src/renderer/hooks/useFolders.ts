import { useCallback, useState, useEffect } from 'react'
import { useSupabase } from './useSupabase'
import type { Folder, FolderInsert, FolderUpdate, Transcription } from '@/lib/database.types'
import { FolderWithCount } from '@/lib/database.types'

export interface FolderWithTranscriptionCount extends Folder {
  transcriptionCount: number
}

export function useFolders(deviceId: string) {
  const { getFolders, getFolderWithCount, createFolder, updateFolder, deleteFolder } = useSupabase()
  const [folders, setFolders] = useState<FolderWithTranscriptionCount[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch folders from Supabase
  const fetchFolders = useCallback(async () => {
    if (!deviceId) return

    setIsLoading(true)
    setError(null)

    try {
      const foldersWithCount = await getFolderWithCount(deviceId)
      const mappedFolders: FolderWithTranscriptionCount[] = foldersWithCount.map(f => ({
        id: f.id,
        device_id: f.device_id,
        name: f.name,
        color: f.color,
        parent_id: f.parent_id,
        created_at: f.created_at,
        updated_at: f.updated_at,
        transcriptionCount: f.transcriptions.count,
      }))
      setFolders(mappedFolders)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch folders')
    } finally {
      setIsLoading(false)
    }
  }, [deviceId, getFolderWithCount])

  // Load folders on mount
  useEffect(() => {
    fetchFolders()
  }, [fetchFolders])

  // Create a new folder
  const createNewFolder = useCallback(async (
    folder: Omit<FolderInsert, 'device_id'>
  ) => {
    if (!deviceId) throw new Error('Device ID is required')

    setIsLoading(true)
    setError(null)

    try {
      const newFolder = await createFolder({
        ...folder,
        device_id: deviceId,
      })
      await fetchFolders()
      return newFolder
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create folder')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [deviceId, createFolder, fetchFolders])

  // Update an existing folder
  const updateExistingFolder = useCallback(async (
    id: string,
    updates: FolderUpdate
  ) => {
    setIsLoading(true)
    setError(null)

    try {
      const updatedFolder = await updateFolder(id, updates)
      await fetchFolders()
      return updatedFolder
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update folder')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [updateFolder, fetchFolders])

  // Delete a folder
  const deleteExistingFolder = useCallback(async (id: string) => {
    setIsLoading(true)
    setError(null)

    try {
      await deleteFolder(id)
      await fetchFolders()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete folder')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [deleteFolder, fetchFolders])

  // Move transcription to folder
  const moveTranscriptionToFolder = useCallback(async (
    transcriptionId: string,
    folderId: string | null
  ) => {
    // This will be handled by the transcriptions hook
    // Just refresh folders to update counts
    await fetchFolders()
  }, [fetchFolders])

  // Get unfiled transcriptions count
  const getUnfiledCount = useCallback((transcriptions: Transcription[]) => {
    return transcriptions.filter(t => !t.folder_id).length
  }, [])

  // Get folder by ID
  const getFolderById = useCallback((id: string) => {
    return folders.find(f => f.id === id)
  }, [folders])

  // Sort folders by name
  const sortedFolders = [...folders].sort((a, b) => a.name.localeCompare(b.name))

  return {
    // State
    folders: sortedFolders,
    isLoading,
    error,

    // Actions
    fetchFolders,
    createFolder: createNewFolder,
    updateFolder: updateExistingFolder,
    deleteFolder: deleteExistingFolder,
    moveTranscriptionToFolder,

    // Queries
    getFolderById,
    getUnfiledCount,
  }
}
