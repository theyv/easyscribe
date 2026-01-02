import React, { useState } from 'react'
import { Folder, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FolderDialog } from './FolderDialog'
import { FolderItem } from './FolderItem'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { useDragAndDrop } from '@/renderer/hooks/useDragAndDrop'
import { cn } from '@/lib/utils'

export interface FolderListProps {
  folders: Array<{
    id: string
    name: string
    color: string
    transcriptionCount: number
  }>
  unfiledCount?: number
  activeFolderId?: string | null
  onFolderClick?: (folderId: string | null) => void
  onCreateFolder?: (name: string, color: string) => void
  onUpdateFolder?: (id: string, name: string, color: string) => void
  onDeleteFolder?: (id: string) => void
  onMoveTranscription?: (transcriptionId: string, folderId: string | null) => void
  className?: string
  error?: string | null
  isLoading?: boolean
}

export const FolderList: React.FC<FolderListProps> = ({
  folders,
  unfiledCount = 0,
  activeFolderId,
  onFolderClick,
  onCreateFolder,
  onUpdateFolder,
  onDeleteFolder,
  onMoveTranscription,
  className,
  error,
  isLoading,
}) => {
  const [showDialog, setShowDialog] = useState(false)
  const [editingFolder, setEditingFolder] = useState<{ id: string; name: string; color: string } | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null)
  const { isDragging, getDropZoneStyles } = useDragAndDrop()

  const handleCreateFolder = (name: string, color: string) => {
    onCreateFolder?.(name, color)
  }

  const handleRename = (folder: { id: string; name: string; color: string }) => {
    setEditingFolder(folder)
    setShowDialog(true)
  }

  const handleUpdateFolder = (name: string, color: string) => {
    if (editingFolder) {
      onUpdateFolder?.(editingFolder.id, name, color)
      setEditingFolder(null)
    }
  }

  const handleDelete = (id: string) => {
    setShowDeleteDialog(id)
  }

  const handleConfirmDelete = () => {
    if (showDeleteDialog) {
      onDeleteFolder?.(showDeleteDialog)
      setShowDeleteDialog(null)
    }
  }

  const handleDrop = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault()
    const transcriptionId = e.dataTransfer.getData('text/plain')
    if (transcriptionId) {
      onMoveTranscription?.(transcriptionId, folderId)
    }
  }

  const handleDialogClose = () => {
    setShowDialog(false)
    setEditingFolder(null)
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* Error Display */}
      {error && (
        <div className="mx-3 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <p className="font-medium">Error</p>
          <p>{error}</p>
        </div>
      )}
      <div className="flex items-center justify-between px-3">
        <h3 className="text-xs font-semibold uppercase text-muted-foreground">
          Folders
        </h3>
        {onCreateFolder && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setShowDialog(true)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Unfiled folder */}
      <FolderItem
        id="unfiled"
        name="Unfiled"
        color="#94a3b8"
        transcriptionCount={unfiledCount}
        isActive={activeFolderId === null}
        onClick={() => onFolderClick?.(null)}
        onDragOver={isDragging ? (e) => e.preventDefault() : undefined}
        onDrop={(e) => handleDrop(e, null)}
        isDropTarget={isDragging && activeFolderId === null}
      />

      {/* Folders */}
      {folders.map((folder) => (
        <FolderItem
          key={folder.id}
          id={folder.id}
          name={folder.name}
          color={folder.color}
          transcriptionCount={folder.transcriptionCount}
          isActive={activeFolderId === folder.id}
          onClick={() => onFolderClick?.(folder.id)}
          onRename={() => handleRename(folder)}
          onDelete={() => handleDelete(folder.id)}
          onDragOver={isDragging ? (e) => e.preventDefault() : undefined}
          onDrop={(e) => handleDrop(e, folder.id)}
          isDropTarget={isDragging && activeFolderId === folder.id}
        />
      ))}

      {/* Create/Edit Dialog */}
      <FolderDialog
        open={showDialog}
        onOpenChange={handleDialogClose}
        onSave={editingFolder ? handleUpdateFolder : handleCreateFolder}
        initialName={editingFolder?.name}
        initialColor={editingFolder?.color}
        title={editingFolder ? 'Edit Folder' : 'New Folder'}
        description={editingFolder ? 'Update the folder details.' : 'Create a new folder to organize your transcriptions.'}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!showDeleteDialog}
        onOpenChange={(open) => !open && setShowDeleteDialog(null)}
        title="Delete Folder"
        message="Are you sure you want to delete this folder? Transcriptions in this folder will be moved to Unfiled."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
