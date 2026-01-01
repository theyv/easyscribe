import React, { useState } from 'react'
import { Tag, Plus, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { TagBadge } from './TagBadge'
import { cn } from '@/lib/utils'

export interface TagListProps {
  tags: Array<{
    id: string
    name: string
    color: string
  }>
  activeTagIds?: string[]
  onTagClick?: (tagId: string) => void
  onCreateTag?: () => void
  onRenameTag?: (id: string) => void
  onDeleteTag?: (id: string) => void
  onMergeTags?: (sourceId: string, targetId: string) => void
  className?: string
}

export const TagList: React.FC<TagListProps> = ({
  tags,
  activeTagIds = [],
  onTagClick,
  onCreateTag,
  onRenameTag,
  onDeleteTag,
  onMergeTags,
  className,
}) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null)
  const [showMergeDialog, setShowMergeDialog] = useState<string | null>(null)

  const handleDelete = (id: string) => {
    setShowDeleteDialog(id)
  }

  const handleConfirmDelete = () => {
    if (showDeleteDialog) {
      onDeleteTag?.(showDeleteDialog)
      setShowDeleteDialog(null)
    }
  }

  const handleMerge = (id: string) => {
    setShowMergeDialog(id)
  }

  const handleConfirmMerge = (targetId: string) => {
    if (showMergeDialog) {
      onMergeTags?.(showMergeDialog, targetId)
      setShowMergeDialog(null)
    }
  }

  const sortedTags = [...tags].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between px-3">
        <h3 className="text-xs font-semibold uppercase text-muted-foreground">
          Tags
        </h3>
        {onCreateTag && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onCreateTag}
          >
            <Plus className="h-3 w-3" />
          </Button>
        )}
      </div>

      {sortedTags.length === 0 ? (
        <p className="px-3 text-xs text-muted-foreground">
          No tags yet
        </p>
      ) : (
        <div className="flex flex-wrap gap-2 px-3">
          {sortedTags.map((tag) => (
            <div key={tag.id} className="group relative">
              <TagBadge
                id={tag.id}
                name={tag.name}
                color={tag.color}
                isActive={activeTagIds.includes(tag.id)}
                onClick={() => onTagClick?.(tag.id)}
              />

              {(onRenameTag || onDeleteTag || onMergeTags) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute -right-1 -top-1 h-5 w-5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onRenameTag && (
                      <DropdownMenuItem onClick={() => onRenameTag(tag.id)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Rename
                      </DropdownMenuItem>
                    )}
                    {onMergeTags && (
                      <DropdownMenuItem onClick={() => handleMerge(tag.id)}>
                        <Tag className="mr-2 h-4 w-4" />
                        Merge with...
                      </DropdownMenuItem>
                    )}
                    {onDeleteTag && (
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDelete(tag.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!showDeleteDialog}
        onOpenChange={(open) => !open && setShowDeleteDialog(null)}
        title="Delete Tag"
        message="Are you sure you want to delete this tag? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleConfirmDelete}
      />

      {/* Merge Dialog */}
      {showMergeDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
            <h3 className="mb-4 text-lg font-semibold">Merge Tag</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Select a tag to merge "{tags.find(t => t.id === showMergeDialog)?.name}" into.
              The source tag will be deleted.
            </p>
            <div className="space-y-2">
              {sortedTags
                .filter(t => t.id !== showMergeDialog)
                .map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => handleConfirmMerge(tag.id)}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent"
                  >
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span>{tag.name}</span>
                  </button>
                ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowMergeDialog(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
