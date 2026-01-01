import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export interface FolderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (name: string, color: string) => void
  initialName?: string
  initialColor?: string
  title?: string
  description?: string
}

const PRESET_COLORS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#14b8a6', // Teal
  '#0ea5e9', // Sky
  '#3b82f6', // Blue
]

export const FolderDialog: React.FC<FolderDialogProps> = ({
  open,
  onOpenChange,
  onSave,
  initialName = '',
  initialColor = PRESET_COLORS[0],
  title = 'New Folder',
  description = 'Create a new folder to organize your transcriptions.',
}) => {
  const [name, setName] = useState(initialName)
  const [color, setColor] = useState(initialColor)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setName(initialName)
    setColor(initialColor)
    setError(null)
  }, [open, initialName, initialColor])

  const handleSave = () => {
    if (!name.trim()) {
      setError('Folder name is required')
      return
    }

    if (name.length > 255) {
      setError('Folder name must be less than 255 characters')
      return
    }

    onSave(name.trim(), color)
    onOpenChange(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="folder-name">Name</Label>
            <Input
              id="folder-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError(null)
              }}
              onKeyDown={handleKeyDown}
              placeholder="Enter folder name"
              autoFocus
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((presetColor) => (
                <button
                  key={presetColor}
                  type="button"
                  onClick={() => setColor(presetColor)}
                  className={`
                    h-8 w-8 rounded-full transition-all
                    ${color === presetColor ? 'ring-2 ring-offset-2 ring-primary' : 'hover:scale-110'}
                  `}
                  style={{ backgroundColor: presetColor }}
                  aria-label={`Select ${presetColor} color`}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg border p-3">
            <div
              className="h-6 w-6 rounded"
              style={{ backgroundColor: color }}
            />
            <span className="text-sm text-muted-foreground">Preview</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
