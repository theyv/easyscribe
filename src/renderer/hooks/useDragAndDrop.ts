import { useCallback, useState } from 'react'

export interface DragItem {
  id: string
  type: 'transcription'
  data?: unknown
}

export interface DropZone {
  folderId: string | null
  isOver: boolean
}

export function useDragAndDrop() {
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null)
  const [dropZones, setDropZones] = useState<Map<string, DropZone>>(new Map())
  const [isDragging, setIsDragging] = useState(false)

  // Start dragging an item
  const startDrag = useCallback((item: DragItem) => {
    setDraggedItem(item)
    setIsDragging(true)
  }, [])

  // Stop dragging
  const endDrag = useCallback(() => {
    setDraggedItem(null)
    setIsDragging(false)
    setDropZones(new Map())
  }, [])

  // Register a drop zone
  const registerDropZone = useCallback((zoneId: string, folderId: string | null) => {
    setDropZones(prev => new Map(prev).set(zoneId, { folderId, isOver: false }))
  }, [])

  // Unregister a drop zone
  const unregisterDropZone = useCallback((zoneId: string) => {
    setDropZones(prev => {
      const next = new Map(prev)
      next.delete(zoneId)
      return next
    })
  }, [])

  // Handle drag over a drop zone
  const handleDragOver = useCallback((zoneId: string) => {
    setDropZones(prev => {
      const next = new Map(prev)
      const zone = next.get(zoneId)
      if (zone) {
        next.set(zoneId, { ...zone, isOver: true })
      }
      return next
    })
  }, [])

  // Handle drag leave a drop zone
  const handleDragLeave = useCallback((zoneId: string) => {
    setDropZones(prev => {
      const next = new Map(prev)
      const zone = next.get(zoneId)
      if (zone) {
        next.set(zoneId, { ...zone, isOver: false })
      }
      return next
    })
  }, [])

  // Handle drop on a drop zone
  const handleDrop = useCallback((
    zoneId: string,
    onDrop: (item: DragItem, folderId: string | null) => void
  ) => {
    const zone = dropZones.get(zoneId)
    if (zone && draggedItem) {
      onDrop(draggedItem, zone.folderId)
    }
    endDrag()
  }, [dropZones, draggedItem, endDrag])

  // Check if a zone is a valid drop target
  const isValidDropTarget = useCallback((zoneId: string) => {
    const zone = dropZones.get(zoneId)
    return zone?.isOver ?? false
  }, [dropZones])

  // Get visual feedback for drag and drop
  const getDropZoneStyles = useCallback((zoneId: string) => {
    const zone = dropZones.get(zoneId)
    if (!zone) return {}

    return {
      backgroundColor: zone.isOver ? 'rgba(99, 102, 241, 0.1)' : undefined,
      borderColor: zone.isOver ? '#6366f1' : undefined,
      borderWidth: zone.isOver ? '2px' : undefined,
      borderStyle: zone.isOver ? 'solid' : undefined,
    }
  }, [dropZones])

  return {
    // State
    draggedItem,
    isDragging,
    dropZones,

    // Actions
    startDrag,
    endDrag,
    registerDropZone,
    unregisterDropZone,
    handleDragOver,
    handleDragLeave,
    handleDrop,

    // Helpers
    isValidDropTarget,
    getDropZoneStyles,
  }
}
