import React, { useState, useRef, useEffect } from 'react'
import { Search, X, Clock, ArrowRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onSearch?: (query: string) => void
  isLoading?: boolean
  placeholder?: string
  className?: string
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onSearch,
  isLoading = false,
  placeholder = 'Search transcriptions...',
  className,
}) => {
  const [showRecent, setShowRecent] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Load recent searches on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('recent-searches')
      if (stored) {
        setRecentSearches(JSON.parse(stored))
      }
    } catch {
      // Ignore errors
    }
  }, [])

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowRecent(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleClear = () => {
    onChange('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (value.trim()) {
        handleSaveRecent(value.trim())
        onSearch?.(value.trim())
        setShowRecent(false)
      }
    } else if (e.key === 'Escape') {
      setShowRecent(false)
    }
  }

  const handleSaveRecent = (query: string) => {
    try {
      const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 10)
      localStorage.setItem('recent-searches', JSON.stringify(updated))
      setRecentSearches(updated)
    } catch {
      // Ignore errors
    }
  }

  const handleRecentClick = (query: string) => {
    onChange(query)
    onSearch?.(query)
    setShowRecent(false)
  }

  const handleClearRecent = () => {
    try {
      localStorage.removeItem('recent-searches')
      setRecentSearches([])
    } catch {
      // Ignore errors
    }
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowRecent(true)}
          placeholder={placeholder}
          className="pl-9 pr-9"
        />
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClear}
            className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
        {isLoading && (
          <div className="absolute right-1 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        )}
      </div>

      {/* Recent Searches Dropdown */}
      {showRecent && recentSearches.length > 0 && !value && (
        <div className="absolute z-50 mt-2 w-full rounded-lg border bg-popover p-2 shadow-md">
          <div className="mb-2 flex items-center justify-between px-2">
            <span className="text-xs font-semibold text-muted-foreground">
              Recent Searches
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearRecent}
              className="h-5 px-2 text-xs text-muted-foreground hover:text-destructive"
            >
              Clear
            </Button>
          </div>
          <div className="space-y-1">
            {recentSearches.map((query, index) => (
              <button
                key={`${query}-${index}`}
                type="button"
                onClick={() => handleRecentClick(query)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
              >
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="flex-1 truncate">{query}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
