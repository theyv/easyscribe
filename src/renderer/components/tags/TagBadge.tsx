import React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface TagBadgeProps {
  id: string
  name: string
  color: string
  isActive?: boolean
  isEditing?: boolean
  onClick?: () => void
  onRemove?: () => void
  className?: string
}

export const TagBadge: React.FC<TagBadgeProps> = ({
  id,
  name,
  color,
  isActive = false,
  isEditing = false,
  onClick,
  onRemove,
  className,
}) => {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-all',
        'hover:scale-105 active:scale-95',
        isActive && 'ring-2 ring-offset-2 ring-primary',
        onClick && 'cursor-pointer',
        className
      )}
      style={{ backgroundColor: color, color: 'white' }}
      onClick={onClick}
    >
      <span>{name}</span>
      {isEditing && onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="ml-0.5 rounded-full hover:bg-white/20 p-0.5"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </button>
  )
}
