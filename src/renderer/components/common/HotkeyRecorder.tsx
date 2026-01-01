import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Keyboard } from 'lucide-react'
import { cn } from '../../lib/utils'

interface HotkeyRecorderProps {
  isOpen: boolean
  onClose: () => void
  onSave: (hotkey: string) => void
  title?: string
  description?: string
}

export function HotkeyRecorder({
  isOpen,
  onClose,
  onSave,
  title = 'Record Hotkey',
  description = 'Press the desired key combination...'
}: HotkeyRecorderProps) {
  const [capturedKeys, setCapturedKeys] = useState<string[]>([])
  const [modifiers, setModifiers] = useState({
    ctrl: false,
    shift: false,
    alt: false,
    meta: false
  })

  useEffect(() => {
    if (!isOpen) {
      setCapturedKeys([])
      setModifiers({ ctrl: false, shift: false, alt: false, meta: false })
    }
  }, [isOpen])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.preventDefault()

    // Handle modifier keys
    if (e.ctrlKey || e.key === 'Control') {
      setModifiers((prev) => ({ ...prev, ctrl: true }))
    }
    if (e.shiftKey || e.key === 'Shift') {
      setModifiers((prev) => ({ ...prev, shift: true }))
    }
    if (e.altKey || e.key === 'Alt') {
      setModifiers((prev) => ({ ...prev, alt: true }))
    }
    if (e.metaKey || e.key === 'Meta') {
      setModifiers((prev) => ({ ...prev, meta: true }))
    }

    // Don't capture modifier keys as the main key
    if (
      ['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)
    ) {
      return
    }

    // Capture the main key
    const key = e.key === ' ' ? 'Space' : e.key
    setCapturedKeys([key])
  }

  const handleKeyUp = (e: React.KeyboardEvent) => {
    if (e.key === 'Control') {
      setModifiers((prev) => ({ ...prev, ctrl: false }))
    }
    if (e.key === 'Shift') {
      setModifiers((prev) => ({ ...prev, shift: false }))
    }
    if (e.key === 'Alt') {
      setModifiers((prev) => ({ ...prev, alt: false }))
    }
    if (e.key === 'Meta') {
      setModifiers((prev) => ({ ...prev, meta: false }))
    }
  }

  const formatHotkey = () => {
    const parts: string[] = []
    if (modifiers.ctrl) parts.push('Ctrl')
    if (modifiers.shift) parts.push('Shift')
    if (modifiers.alt) parts.push('Alt')
    if (modifiers.meta) parts.push('Cmd')
    parts.push(...capturedKeys)
    return parts.join('+')
  }

  const handleSave = () => {
    const hotkey = formatHotkey()
    if (hotkey) {
      onSave(hotkey)
      onClose()
    }
  }

  const handleClear = () => {
    setCapturedKeys([])
    setModifiers({ ctrl: false, shift: false, alt: false, meta: false })
  }

  const hasHotkey = capturedKeys.length > 0 || Object.values(modifiers).some(Boolean)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div
          className={cn(
            "flex min-h-[120px] items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors",
            hasHotkey
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25"
          )}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          autoFocus
        >
          {hasHotkey ? (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {modifiers.ctrl && (
                <kbd className="rounded-md bg-muted px-3 py-1.5 text-sm font-medium">
                  Ctrl
                </kbd>
              )}
              {modifiers.shift && (
                <kbd className="rounded-md bg-muted px-3 py-1.5 text-sm font-medium">
                  Shift
                </kbd>
              )}
              {modifiers.alt && (
                <kbd className="rounded-md bg-muted px-3 py-1.5 text-sm font-medium">
                  Alt
                </kbd>
              )}
              {modifiers.meta && (
                <kbd className="rounded-md bg-muted px-3 py-1.5 text-sm font-medium">
                  Cmd
                </kbd>
              )}
              {capturedKeys.map((key, i) => (
                <kbd
                  key={i}
                  className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
                >
                  {key}
                </kbd>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Press any key combination...
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          {hasHotkey && (
            <Button variant="outline" onClick={handleClear}>
              Clear
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!hasHotkey}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
