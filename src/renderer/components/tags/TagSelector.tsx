import React, { useState, useRef, useEffect } from 'react'
import { Tag, Plus, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TagBadge } from './TagBadge'
import { cn } from '@/lib/utils'

export interface TagSelectorProps {
  availableTags: Array<{
    id: string
    name: string
    color: string
  }>
  selectedTagIds: string[]
  onToggleTag: (tagId: string) => void
  onCreateTag?: (name: string, color: string) => void
  maxVisible?: number
  placeholder?: string
  className?: string
}

const DEFAULT_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#0ea5e9', '#3b82f6',
]

export const TagSelector: React.FC<TagSelectorProps> = ({
  availableTags,
  selectedTagIds,
  onToggleTag,
  onCreateTag,
  maxVisible = 5,
  placeholder = 'Add tags...',
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [selectedColor, setSelectedColor] = useState(DEFAULT_COLORS[0])
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedTags = availableTags.filter(t => selectedTagIds.includes(t.id))
  const availableTagsFiltered = availableTags.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !selectedTagIds.includes(t.id)
  )

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setShowCreateForm(false)
        setSearchQuery('')
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleCreateTag = () => {
    if (newTagName.trim() && onCreateTag) {
      onCreateTag(newTagName.trim(), selectedColor)
      setNewTagName('')
      setShowCreateForm(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (showCreateForm) {
        handleCreateTag()
      } else if (searchQuery && availableTagsFiltered.length === 0 && onCreateTag) {
        // Auto-create if no matches
        onCreateTag(searchQuery.trim(), DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)])
        setSearchQuery('')
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setShowCreateForm(false)
      setSearchQuery('')
    }
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Selected Tags */}
      <div className="flex flex-wrap items-center gap-2">
        {selectedTags.slice(0, maxVisible).map((tag) => (
          <TagBadge
            key={tag.id}
            id={tag.id}
            name={tag.name}
            color={tag.color}
            isEditing
            onRemove={() => onToggleTag(tag.id)}
          />
        ))}

        {selectedTags.length > maxVisible && (
          <span className="text-xs text-muted-foreground">
            +{selectedTags.length - maxVisible} more
          </span>
        )}

        {/* Add Button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="h-7 gap-1"
        >
          <Plus className="h-3 w-3" />
          {selectedTags.length === 0 ? placeholder : 'Add'}
        </Button>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full min-w-[200px] rounded-lg border bg-popover p-2 shadow-md">
          {/* Search Input */}
          <div className="mb-2">
            <Input
              type="text"
              placeholder="Search tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              className="h-8"
            />
          </div>

          {/* Available Tags */}
          <div className="max-h-48 space-y-1 overflow-y-auto">
            {availableTagsFiltered.length > 0 ? (
              availableTagsFiltered.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => {
                    onToggleTag(tag.id)
                    setSearchQuery('')
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
                >
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="flex-1">{tag.name}</span>
                  <Check className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                </button>
              ))
            ) : (
              <p className="px-2 py-2 text-xs text-muted-foreground">
                {searchQuery ? 'No tags found' : 'No tags available'}
              </p>
            )}
          </div>

          {/* Create New Tag */}
          {onCreateTag && (
            <>
              {showCreateForm ? (
                <div className="mt-2 space-y-2 border-t pt-2">
                  <Input
                    type="text"
                    placeholder="New tag name..."
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="h-8"
                  />
                  <div className="flex flex-wrap gap-1">
                    {DEFAULT_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setSelectedColor(color)}
                        className={cn(
                          'h-5 w-5 rounded-full transition-all',
                          selectedColor === color && 'ring-2 ring-offset-1 ring-primary'
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleCreateTag}
                      className="h-7 flex-1"
                    >
                      Create
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowCreateForm(false)
                        setNewTagName('')
                      }}
                      className="h-7"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCreateForm(true)}
                  className="mt-2 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <Plus className="h-3 w-3" />
                  Create new tag
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
