import React, { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { TranscriptionList, SortOption } from "../components/transcriptions/TranscriptionList"
import { useTranscriptions } from "../hooks/useTranscriptions"
import { Button } from "../components/ui/button"
import { ChevronLeft, Folder } from "lucide-react"

export const FolderView: React.FC = () => {
  const { folderId } = useParams<{ folderId: string }>()
  const navigate = useNavigate()
  const [sortBy, setSortBy] = useState<SortOption>("date-desc")

  const { transcriptions, isLoading } = useTranscriptions()

  // Filter transcriptions by folder
  const folderTranscriptions = folderId
    ? transcriptions.filter((t) => t.folder_id === folderId)
    : []

  // Get folder name from first transcription (or could fetch from folders API)
  const folderName = "Folder" // TODO: Fetch folder name from folders API

  return (
    <div className="space-y-6">
      {/* Header with breadcrumb */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Folder className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">{folderName}</h1>
        </div>
      </div>

      <TranscriptionList
        transcriptions={folderTranscriptions}
        loading={isLoading}
        sortBy={sortBy}
        onSortChange={setSortBy}
        emptyTitle="This folder is empty"
        emptyDescription="Drag and drop transcriptions here or create new ones."
      />
    </div>
  )
}
