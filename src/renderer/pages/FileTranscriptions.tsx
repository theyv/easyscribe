import React, { useState } from "react"
import { TranscriptionList, SortOption } from "../components/transcriptions/TranscriptionList"
import { useTranscriptions } from "../hooks/useTranscriptions"
import { Mic } from "lucide-react"

export const FileTranscriptions: React.FC = () => {
  const [sortBy, setSortBy] = useState<SortOption>("date-desc")

  const { transcriptions, isLoading } = useTranscriptions()

  // Filter for file transcriptions (import and upload)
  const fileTranscriptions = transcriptions.filter(
    (t) => t.type === "import" || t.type === "upload"
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">File Transcriptions</h1>
        <p className="text-muted-foreground">
          Transcriptions from imported or uploaded audio files
        </p>
      </div>

      <TranscriptionList
        transcriptions={fileTranscriptions}
        loading={isLoading}
        sortBy={sortBy}
        onSortChange={setSortBy}
        emptyTitle="Drop files to transcribe"
        emptyDescription="Drag and drop audio files here or click to import."
        emptyAction={{
          label: "Import Audio File",
          onClick: () => {
            // TODO: Implement file import
            console.log("Import file clicked")
          },
        }}
      />
    </div>
  )
}
