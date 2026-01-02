import { useCallback } from 'react'
import { supabase } from '@/renderer/lib/supabase'
import { useTranscriptionStore, TranscriptionFilter } from '@/renderer/stores/transcriptionStore'
import { Transcription } from '@/shared/types'

export function useTranscriptions() {
  const {
    transcriptions,
    selectedTranscriptionId,
    filter,
    isLoading,
    error,
    setTranscriptions,
    addTranscription,
    updateTranscription,
    deleteTranscription,
    setSelectedTranscription,
    setFilter,
    clearFilter,
    setLoading,
    setError,
    getFilteredTranscriptions,
    getTranscriptionById
  } = useTranscriptionStore()

  // Fetch transcriptions from Supabase
  const fetchTranscriptions = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('transcriptions')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setTranscriptions(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transcriptions')
    } finally {
      setLoading(false)
    }
  }, [setLoading, setError, setTranscriptions])

  // Create a new transcription
  const createTranscription = useCallback(async (
    transcription: Omit<Transcription, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    setLoading(true)
    setError(null)

    try {
      // TODO: Implement Supabase create
      // const { data, error } = await supabase
      //   .from('transcriptions')
      //   .insert(transcription)
      //   .select()
      //   .single()

      // if (error) throw error

      // addTranscription(data)
      // return data

      // Mock implementation
      const newTranscription: Transcription = {
        ...transcription,
        id: `transcription-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      addTranscription(newTranscription)
      return newTranscription
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create transcription')
      throw err
    } finally {
      setLoading(false)
    }
  }, [setLoading, setError, addTranscription])

  // Update an existing transcription
  const updateExistingTranscription = useCallback(async (
    id: string,
    updates: Partial<Transcription>
  ) => {
    setLoading(true)
    setError(null)

    try {
      // TODO: Implement Supabase update
      // const { data, error } = await supabase
      //   .from('transcriptions')
      //   .update(updates)
      //   .eq('id', id)
      //   .select()
      //   .single()

      // if (error) throw error

      // updateTranscription(id, updates)
      // return data

      // Mock implementation
      updateTranscription(id, updates)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update transcription')
      throw err
    } finally {
      setLoading(false)
    }
  }, [setLoading, setError, updateTranscription])

  // Delete a transcription
  const removeTranscription = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)

    try {
      // TODO: Implement Supabase delete
      // const { error } = await supabase
      //   .from('transcriptions')
      //   .delete()
      //   .eq('id', id)

      // if (error) throw error

      deleteTranscription(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete transcription')
      throw err
    } finally {
      setLoading(false)
    }
  }, [setLoading, setError, deleteTranscription])

  // Filter transcriptions
  const filterTranscriptions = useCallback((newFilter: Partial<TranscriptionFilter>) => {
    setFilter(newFilter)
  }, [setFilter])

  // Clear filters
  const resetFilters = useCallback(() => {
    clearFilter()
  }, [clearFilter])

  // Get transcriptions by type
  const getTranscriptionsByType = useCallback((type: 'recording' | 'import' | 'upload') => {
    return transcriptions.filter((t) => t.type === type)
  }, [transcriptions])

  // Get transcriptions by folder
  const getTranscriptionsByFolder = useCallback((folderId: string) => {
    return transcriptions.filter((t) => t.folderId === folderId)
  }, [transcriptions])

  // Get transcriptions by tags
  const getTranscriptionsByTags = useCallback((tagIds: string[]) => {
    return transcriptions.filter((t) =>
      t.tags?.some((tag) => tagIds.includes(tag.id))
    )
  }, [transcriptions])

  // Search transcriptions
  const searchTranscriptions = useCallback((query: string) => {
    const lowerQuery = query.toLowerCase()
    return transcriptions.filter(
      (t) =>
        t.title.toLowerCase().includes(lowerQuery) ||
        t.content.toLowerCase().includes(lowerQuery)
    )
  }, [transcriptions])

  return {
    // State
    transcriptions,
    selectedTranscription: selectedTranscriptionId ? getTranscriptionById(selectedTranscriptionId) : null,
    filteredTranscriptions: getFilteredTranscriptions(),
    filter,
    isLoading,
    error,

    // Actions
    fetchTranscriptions,
    createTranscription,
    updateTranscription: updateExistingTranscription,
    deleteTranscription: removeTranscription,
    selectTranscription: setSelectedTranscription,
    filterTranscriptions,
    resetFilters,

    // Queries
    getTranscriptionById,
    getTranscriptionsByType,
    getTranscriptionsByFolder,
    getTranscriptionsByTags,
    searchTranscriptions
  }
}
