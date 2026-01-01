import React, { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { TranscriptionDetail } from "../components/transcriptions/TranscriptionDetail"
import { TranscriptionEditor } from "../components/transcriptions/TranscriptionEditor"
import { useTranscriptions } from "../hooks/useTranscriptions"
import { useFolders } from "../hooks/useFolders"
import { useTags } from "../hooks/useTags"
import { useDevice } from "../hooks/useDevice"
import { DetailSkeleton } from "../components/common/LoadingSkeleton"
import type { Transcription } from "@/shared/types"

export const TranscriptionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { transcriptions, updateTranscription, deleteTranscription } = useTranscriptions()
  const { folders } = useFolders('')
  const { tags, addTag, removeTag, createTag } = useTags('')
  const { device } = useDevice()
  const [isEditing, setIsEditing] = useState(false)

  const transcription = id
    ? transcriptions.find((t) => t.id === id)
    : null

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleSave = async (content: string) => {
    if (id) {
      await updateTranscription(id, { content })
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
  }

  const handleDelete = async (transcriptionId: string) => {
    await deleteTranscription(transcriptionId)
    navigate("/transcriptions")
  }

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content)
  }

  const handleExportTxt = (transcription: Transcription) => {
    // TODO: Implement TXT export
    console.log("Export TXT:", transcription)
  }

  const handleExportSrt = (transcription: Transcription) => {
    // TODO: Implement SRT export
    console.log("Export SRT:", transcription)
  }

  const handleOpenFolder = (path: string) => {
    // TODO: Implement open folder via IPC
    console.log("Open folder:", path)
  }

  const handleFolderChange = async (folderId: string) => {
    if (id) {
      await updateTranscription(id, { folderId })
    }
  }

  const handleTagToggle = async (tagId: string) => {
    if (!id || !device) return

    const currentTags = transcription?.tags || []
    const isAttached = currentTags.some(t => t.id === tagId)

    if (isAttached) {
      await removeTag(id, tagId)
    } else {
      await addTag(id, tagId)
    }
  }

  const handleCreateTag = async (name: string, color: string) => {
    if (!device) return

    const newTag = await createTag({ name, color })
    if (newTag && id) {
      await addTag(id, newTag.id)
    }
  }

  if (!transcription) {
    return <DetailSkeleton />
  }

  if (isEditing) {
    return (
      <TranscriptionEditor
        initialContent={transcription.content}
        onSave={handleSave}
        onCancel={handleCancelEdit}
      />
    )
  }

  const availableFolders = folders.map(f => ({ id: f.id, name: f.name }))
  const availableTags = tags.map(t => ({ id: t.id, name: t.name, color: t.color }))

  return (
    <TranscriptionDetail
      transcription={transcription}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onCopy={handleCopy}
      onExportTxt={handleExportTxt}
      onExportSrt={handleExportSrt}
      onOpenFolder={handleOpenFolder}
      onFolderChange={handleFolderChange}
      availableFolders={availableFolders}
      availableTags={availableTags}
      onTagToggle={handleTagToggle}
      onCreateTag={handleCreateTag}
    />
  )
}
