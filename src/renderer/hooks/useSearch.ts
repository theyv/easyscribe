import { useCallback, useState, useEffect } from 'react'
import { useSupabase } from './useSupabase'
import type { SearchResult, Transcription, TranscriptionWithTags, Tag } from '@/lib/database.types'

export interface SearchFilters {
  dateFrom?: Date
  dateTo?: Date
  type?: 'recording' | 'import' | 'upload'
  folderId?: string
  tagIds?: string[]
}

export interface SearchOptions extends SearchFilters {
  query: string
}

export interface SearchResultWithMetadata extends SearchResult {
  tags?: Array<{ id: string; name: string; color: string }>
  folderName?: string
}

export function useSearch(deviceId: string) {
  const { searchTranscriptions } = useSupabase()
  const [results, setResults] = useState<SearchResultWithMetadata[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  // Perform search
  const search = useCallback(async (options: SearchOptions) => {
    if (!options.query || options.query.trim().length < 2) {
      setResults([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const searchResults = await searchTranscriptions(options.query)
      setResults(searchResults as SearchResultWithMetadata[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setIsLoading(false)
    }
  }, [searchTranscriptions])

  // Highlight matched terms in text
  const highlightTerms = useCallback((text: string, query: string) => {
    if (!query || !text) return text

    const terms = query.split(' ').filter(t => t.length > 2)
    if (terms.length === 0) return text

    const regex = new RegExp(`(${terms.join('|')})`, 'gi')
    return text.replace(regex, '<mark>$1</mark>')
  }, [])

  // Filter results by criteria
  const filterResults = useCallback((
    results: SearchResultWithMetadata[],
    filters: SearchFilters,
    allTranscriptions: (Transcription | TranscriptionWithTags)[]
  ) => {
    let filtered = [...results]

    // Filter by type
    if (filters.type) {
      filtered = filtered.filter(r => {
        const transcription = allTranscriptions.find(t => t.id === r.id)
        return transcription?.type === filters.type
      })
    }

    // Filter by folder
    if (filters.folderId) {
      filtered = filtered.filter(r => r.folder_id === filters.folderId)
    }

    // Filter by tags
    if (filters.tagIds && filters.tagIds.length > 0) {
      filtered = filtered.filter(r => {
        const transcription = allTranscriptions.find(t => t.id === r.id) as TranscriptionWithTags | undefined
        if (!transcription || !transcription.tags) return false
        return transcription.tags.some((tag: Tag) => filters.tagIds!.includes(tag.id))
      })
    }

    // Filter by date range
    if (filters.dateFrom) {
      filtered = filtered.filter(r => new Date(r.created_at) >= filters.dateFrom!)
    }

    if (filters.dateTo) {
      filtered = filtered.filter(r => new Date(r.created_at) <= filters.dateTo!)
    }

    return filtered
  }, [])

  // Get search suggestions
  const getSuggestions = useCallback((query: string, maxSuggestions = 5) => {
    if (!query || query.length < 2) return []

    // This could be enhanced with actual suggestion data
    return []
  }, [])

  // Clear search results
  const clearResults = useCallback(() => {
    setResults([])
    setError(null)
  }, [])

  // Get recent searches from localStorage
  const getRecentSearches = useCallback((): string[] => {
    try {
      const stored = localStorage.getItem('recent-searches')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }, [])

  // Save search to recent searches
  const saveRecentSearch = useCallback((query: string) => {
    if (!query || query.trim().length < 2) return

    try {
      const recent = getRecentSearches()
      const filtered = recent.filter(s => s.toLowerCase() !== query.toLowerCase())
      const updated = [query, ...filtered].slice(0, 10)
      localStorage.setItem('recent-searches', JSON.stringify(updated))
    } catch {
      // Ignore localStorage errors
    }
  }, [getRecentSearches])

  // Clear recent searches
  const clearRecentSearches = useCallback(() => {
    try {
      localStorage.removeItem('recent-searches')
    } catch {
      // Ignore localStorage errors
    }
  }, [])

  return {
    // State
    results,
    isLoading,
    error,
    query,
    debouncedQuery,
    setQuery,

    // Actions
    search,
    clearResults,

    // Helpers
    highlightTerms,
    filterResults,
    getSuggestions,

    // Recent searches
    getRecentSearches,
    saveRecentSearch,
    clearRecentSearches,
  }
}
