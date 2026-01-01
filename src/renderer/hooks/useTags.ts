import { useCallback, useState, useEffect } from 'react'
import { useSupabase } from './useSupabase'
import type { Tag, TagInsert, TagUpdate, TranscriptionWithTags } from '@/lib/database.types'

export function useTags(deviceId: string) {
  const { getTags, createTag, updateTag, deleteTag, addTagToTranscription, removeTagFromTranscription } = useSupabase()
  const [tags, setTags] = useState<Tag[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch tags from Supabase
  const fetchTags = useCallback(async () => {
    if (!deviceId) return

    setIsLoading(true)
    setError(null)

    try {
      const fetchedTags = await getTags(deviceId)
      setTags(fetchedTags)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tags')
    } finally {
      setIsLoading(false)
    }
  }, [deviceId, getTags])

  // Load tags on mount
  useEffect(() => {
    fetchTags()
  }, [fetchTags])

  // Create a new tag
  const createNewTag = useCallback(async (
    tag: Omit<TagInsert, 'device_id'>
  ) => {
    if (!deviceId) throw new Error('Device ID is required')

    setIsLoading(true)
    setError(null)

    try {
      const newTag = await createTag({
        ...tag,
        device_id: deviceId,
      })
      await fetchTags()
      return newTag
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tag')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [deviceId, createTag, fetchTags])

  // Update an existing tag
  const updateExistingTag = useCallback(async (
    id: string,
    updates: TagUpdate
  ) => {
    setIsLoading(true)
    setError(null)

    try {
      const updatedTag = await updateTag(id, updates)
      await fetchTags()
      return updatedTag
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update tag')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [updateTag, fetchTags])

  // Delete a tag
  const deleteExistingTag = useCallback(async (id: string) => {
    setIsLoading(true)
    setError(null)

    try {
      await deleteTag(id)
      await fetchTags()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete tag')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [deleteTag, fetchTags])

  // Add tag to transcription
  const addTag = useCallback(async (
    transcriptionId: string,
    tagId: string
  ) => {
    setIsLoading(true)
    setError(null)

    try {
      await addTagToTranscription(transcriptionId, tagId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add tag to transcription')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [addTagToTranscription])

  // Remove tag from transcription
  const removeTag = useCallback(async (
    transcriptionId: string,
    tagId: string
  ) => {
    setIsLoading(true)
    setError(null)

    try {
      await removeTagFromTranscription(transcriptionId, tagId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove tag from transcription')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [removeTagFromTranscription])

  // Get tags for a transcription
  const getTagsForTranscription = useCallback((
    transcription: TranscriptionWithTags
  ) => {
    return transcription.tags || []
  }, [])

  // Search tags by name
  const searchTags = useCallback((query: string) => {
    const lowerQuery = query.toLowerCase()
    return tags.filter(t => t.name.toLowerCase().includes(lowerQuery))
  }, [tags])

  // Merge tags (merge source tag into target tag)
  const mergeTags = useCallback(async (
    sourceTagId: string,
    targetTagId: string
  ) => {
    setIsLoading(true)
    setError(null)

    try {
      // This would need to be implemented in the backend
      // For now, we'll just delete the source tag
      await deleteTag(sourceTagId)
      await fetchTags()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to merge tags')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [deleteTag, fetchTags])

  // Get tag by ID
  const getTagById = useCallback((id: string) => {
    return tags.find(t => t.id === id)
  }, [tags])

  // Sort tags by name
  const sortedTags = [...tags].sort((a, b) => a.name.localeCompare(b.name))

  return {
    // State
    tags: sortedTags,
    isLoading,
    error,

    // Actions
    fetchTags,
    createTag: createNewTag,
    updateTag: updateExistingTag,
    deleteTag: deleteExistingTag,
    addTag,
    removeTag,
    mergeTags,

    // Queries
    getTagById,
    getTagsForTranscription,
    searchTags,
  }
}
