import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FileText, Mic, Clock, SearchX, Filter, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/formatters'
import type { SearchResultWithMetadata, SearchFilters } from '@/renderer/hooks/useSearch'

export interface SearchResultsProps {
  results: SearchResultWithMetadata[]
  query: string
  filters: SearchFilters
  onFilterChange: (filters: SearchFilters) => void
  onResultClick: (id: string) => void
  highlightTerms: (text: string, query: string) => string
  availableFolders?: Array<{ id: string; name: string }>
  availableTags?: Array<{ id: string; name: string; color: string }>
  className?: string
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  query,
  filters,
  onFilterChange,
  onResultClick,
  highlightTerms,
  availableFolders = [],
  availableTags = [],
  className,
}) => {
  const [showFilters, setShowFilters] = useState(false)

  const getPreview = (content: string, maxLength = 150) => {
    if (!content) return ''
    const plainText = content.replace(/<[^>]*>/g, '')
    return plainText.length > maxLength ? plainText.slice(0, maxLength) + '...' : plainText
  }

  const renderHighlightedText = (text: string) => {
    const highlighted = highlightTerms(text, query)
    return (
      <span
        className="text-sm"
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Filter Controls */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
        </p>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Filters
          <ChevronDown className={cn('h-4 w-4 transition-transform', showFilters && 'rotate-180')} />
        </Button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <Card>
          <CardContent className="space-y-4 p-4">
            {/* Date Range */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date-from">From</Label>
                <Input
                  id="date-from"
                  type="date"
                  value={filters.dateFrom ? filters.dateFrom.toISOString().split('T')[0] : ''}
                  onChange={(e) => {
                    onFilterChange({
                      ...filters,
                      dateFrom: e.target.value ? new Date(e.target.value) : undefined,
                    })
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date-to">To</Label>
                <Input
                  id="date-to"
                  type="date"
                  value={filters.dateTo ? filters.dateTo.toISOString().split('T')[0] : ''}
                  onChange={(e) => {
                    onFilterChange({
                      ...filters,
                      dateTo: e.target.value ? new Date(e.target.value) : undefined,
                    })
                  }}
                />
              </div>
            </div>

            {/* Type Filter */}
            <div className="space-y-2">
              <Label htmlFor="type-filter">Type</Label>
              <Select
                value={filters.type || 'all'}
                onValueChange={(value) => {
                  onFilterChange({
                    ...filters,
                    type: value === 'all' ? undefined : value as 'recording' | 'import' | 'upload',
                  })
                }}
              >
                <SelectTrigger id="type-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="recording">Recording</SelectItem>
                  <SelectItem value="import">Import</SelectItem>
                  <SelectItem value="upload">Upload</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Folder Filter */}
            {availableFolders.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="folder-filter">Folder</Label>
                <Select
                  value={filters.folderId || 'all'}
                  onValueChange={(value) => {
                    onFilterChange({
                      ...filters,
                      folderId: value === 'all' ? undefined : value,
                    })
                  }}
                >
                  <SelectTrigger id="folder-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Folders</SelectItem>
                    {availableFolders.map((folder) => (
                      <SelectItem key={folder.id} value={folder.id}>
                        {folder.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Tag Filter */}
            {availableTags.length > 0 && (
              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => {
                        const current = filters.tagIds || []
                        const updated = current.includes(tag.id)
                          ? current.filter(id => id !== tag.id)
                          : [...current, tag.id]
                        onFilterChange({ ...filters, tagIds: updated })
                      }}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-all',
                        'hover:scale-105',
                        filters.tagIds?.includes(tag.id) && 'ring-2 ring-offset-2 ring-primary'
                      )}
                      style={{ backgroundColor: tag.color, color: 'white' }}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Clear Filters */}
            {(filters.dateFrom || filters.dateTo || filters.type || filters.folderId || filters.tagIds?.length) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onFilterChange({})}
              >
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {results.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <SearchX className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">No results found</p>
            <p className="text-sm text-muted-foreground">
              Try adjusting your search terms or filters
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {results.map((result) => {
            const isFileType = result.source_filename?.endsWith('.mp3') ||
                            result.source_filename?.endsWith('.wav') ||
                            result.source_filename?.endsWith('.m4a')

            return (
              <Card
                key={result.id}
                className="cursor-pointer transition-all hover:scale-[1.01] hover:shadow-md"
                onClick={() => onResultClick(result.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex shrink-0 items-center justify-center rounded-lg bg-muted p-2">
                      {isFileType ? (
                        <FileText className="h-5 w-5 text-primary" />
                      ) : (
                        <Mic className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-semibold">
                        {renderHighlightedText(result.title)}
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatRelativeTime(result.created_at)}
                      </p>
                      <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                        {renderHighlightedText(getPreview(result.content))}
                      </p>

                      {/* Tags */}
                      {result.tags && result.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {result.tags.map((tag) => (
                            <Badge
                              key={tag.id}
                              variant="secondary"
                              className="text-xs"
                              style={{ backgroundColor: tag.color, color: 'white' }}
                            >
                              {tag.name}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Folder */}
                      {result.folderName && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{result.folderName}</span>
                        </div>
                      )}

                      {/* Similarity Score */}
                      {result.similarity_score !== undefined && (
                        <Badge
                          variant="outline"
                          className="mt-2 text-xs"
                        >
                          {Math.round(result.similarity_score * 100)}% match
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
