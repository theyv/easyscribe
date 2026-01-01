import React, { useState } from 'react'
import { Folder, MoreVertical, Pencil, Trash2, FolderOpen } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface FolderItemProps {
  id: string
  name: string
  color: string
  transcriptionCount: number
  isActive?: boolean
  onClick?: () => void
  onRename?: () => void
  onDelete?: () => void
  onDragStart?: (e: React.DragEvent) => void
  onDragOver?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
  isDropTarget?: boolean
  className?: string
}

export const FolderItem: React.FC<FolderItemProps> = ({
  id,
  name,
  color,
  transcriptionCount,
  isActive = false,
  onClick,
  onRename,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  isDropTarget = false,
  className,
}) => {
  const [showMenu, setShowMenu] = useState(false)

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
    onDragStart?.(e)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    onDragOver?.(e)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    onDrop?.(e)
  }

  return (
    <div
      className={cn(
        'group relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        isDropTarget && 'ring-2 ring-primary ring-offset-2',
        className
      )}
      onClick={onClick}
      draggable={!!onDragStart}
      onDragStart={handleDragStart}
      onDragOver={onDragOver && handleDragOver}
      onDrop={onDrop && handleDrop}
    >
      <div
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded"
        style={{ backgroundColor: isActive ? 'rgba(255, 255, 255, 0.2)' : color }}
      >
        {isActive ? (
          <FolderOpen className="h-3 w-3" />
        ) : (
          <Folder className="h-3 w-3 text-white" />
        )}
      </div>

      <span className="flex-1 truncate">{name}</span>

      <span className="text-xs opacity-60">
        {transcriptionCount}
      </span>

      {(onRename || onDelete) && (
        <DropdownMenu open={showMenu} onOpenChange={setShowMenu}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-6 w-6 shrink-0 opacity-0 transition-opacity',
                'group-hover:opacity-100',
                isActive && 'opacity-100 hover:bg-white/20'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onRename && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onRename()
                  setShowMenu(false)
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Rename
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem
                className="text-destructive"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete()
                  setShowMenu(false)
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
