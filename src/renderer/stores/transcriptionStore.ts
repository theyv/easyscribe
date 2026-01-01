import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Transcription } from '@/shared/types'

export interface TranscriptionFilter {
  type?: 'recording' | 'import' | 'upload'
  folderId?: string
  tagIds?: string[]
  searchQuery?: string
  dateFrom?: Date
  dateTo?: Date
}

export interface TranscriptionState {
  transcriptions: Transcription[]
  selectedTranscriptionId: string | null
  filter: TranscriptionFilter
  isLoading: boolean
  error: string | null

  // Actions
  setTranscriptions: (transcriptions: Transcription[]) => void
  addTranscription: (transcription: Transcription) => void
  updateTranscription: (id: string, updates: Partial<Transcription>) => void
  deleteTranscription: (id: string) => void
  setSelectedTranscription: (id: string | null) => void
  setFilter: (filter: Partial<TranscriptionFilter>) => void
  clearFilter: () => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void

  // Computed
  getFilteredTranscriptions: () => Transcription[]
  getTranscriptionById: (id: string) => Transcription | undefined
}

const defaultFilter: TranscriptionFilter = {}

export const useTranscriptionStore = create<TranscriptionState>()(
  persist(
    (set, get) => ({
      transcriptions: [],
      selectedTranscriptionId: null,
      filter: defaultFilter,
      isLoading: false,
      error: null,

      setTranscriptions: (transcriptions) => set({ transcriptions }),

      addTranscription: (transcription) =>
        set((state) => ({
          transcriptions: [transcription, ...state.transcriptions]
        })),

      updateTranscription: (id, updates) =>
        set((state) => ({
          transcriptions: state.transcriptions.map((t) =>
            t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
          )
        })),

      deleteTranscription: (id) =>
        set((state) => ({
          transcriptions: state.transcriptions.filter((t) => t.id !== id),
          selectedTranscriptionId:
            state.selectedTranscriptionId === id ? null : state.selectedTranscriptionId
        })),

      setSelectedTranscription: (id) => set({ selectedTranscriptionId: id }),

      setFilter: (filter) =>
        set((state) => ({
          filter: { ...state.filter, ...filter }
        })),

      clearFilter: () => set({ filter: defaultFilter }),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      getFilteredTranscriptions: () => {
        const state = get()
        let filtered = [...state.transcriptions]

        // Filter by type
        if (state.filter.type) {
          filtered = filtered.filter((t) => t.type === state.filter.type)
        }

        // Filter by folder
        if (state.filter.folderId) {
          filtered = filtered.filter((t) => t.folderId === state.filter.folderId)
        }

        // Filter by tags
        if (state.filter.tagIds && state.filter.tagIds.length > 0) {
          filtered = filtered.filter((t) =>
            t.tags?.some((tag: { id: string }) => state.filter.tagIds!.includes(tag.id))
          )
        }

        // Filter by search query
        if (state.filter.searchQuery) {
          const query = state.filter.searchQuery.toLowerCase()
          filtered = filtered.filter(
            (t) =>
              t.title.toLowerCase().includes(query) ||
              t.content.toLowerCase().includes(query)
          )
        }

        // Filter by date range
        if (state.filter.dateFrom) {
          filtered = filtered.filter((t) => new Date(t.createdAt) >= state.filter.dateFrom!)
        }

        if (state.filter.dateTo) {
          filtered = filtered.filter((t) => new Date(t.createdAt) <= state.filter.dateTo!)
        }

        // Sort by creation date (newest first)
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

        return filtered
      },

      getTranscriptionById: (id) => {
        const state = get()
        return state.transcriptions.find((t) => t.id === id)
      }
    }),
    {
      name: 'easyscribe-transcription-storage',
      partialize: (state) => ({
        transcriptions: state.transcriptions,
        selectedTranscriptionId: state.selectedTranscriptionId,
        filter: state.filter
      })
    }
  )
)

// Selectors
export const selectTranscriptions = (state: TranscriptionState) => state.transcriptions
export const selectSelectedTranscription = (state: TranscriptionState) => {
  if (!state.selectedTranscriptionId) return null
  return state.transcriptions.find((t) => t.id === state.selectedTranscriptionId) || null
}
export const selectFilteredTranscriptions = (state: TranscriptionState) =>
  state.getFilteredTranscriptions()
export const selectTranscriptionById = (id: string) => (state: TranscriptionState) =>
  state.getTranscriptionById(id)
export const selectIsLoading = (state: TranscriptionState) => state.isLoading
export const selectError = (state: TranscriptionState) => state.error
export const selectFilter = (state: TranscriptionState) => state.filter
