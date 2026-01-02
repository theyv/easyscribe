import React, { useState } from "react"
import { TranscriptionList, SortOption } from "../components/transcriptions/TranscriptionList"
import { useTranscriptions } from "../hooks/useTranscriptions"
import { useRecording } from "../hooks/useRecording"
import { Mic, Square } from "lucide-react"
import { RecordingIndicator } from "../components/common/RecordingIndicator"

export const LiveTranscriptions: React.FC = () => {
  const [sortBy, setSortBy] = useState<SortOption>("date-desc")

  const { transcriptions, isLoading } = useTranscriptions()
  const { isRecording, startRecording, stopRecording, toggleRecording } = useRecording()

  // Filter for live transcriptions (recording)
  const liveTranscriptions = transcriptions.filter((t) => t.type === "recording")

  const handleRecordingClick = async () => {
    if (isRecording) {
      await stopRecording()
    } else {
      await startRecording()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Live Transcriptions</h1>
          <p className="text-muted-foreground">
            Transcriptions from live recording sessions
          </p>
        </div>
        {/* Recording button - always visible when not recording */}
        {!isRecording && (
          <button
            onClick={handleRecordingClick}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Mic className="h-5 w-5" />
            <span>Start Recording</span>
          </button>
        )}
      </div>

      <TranscriptionList
        transcriptions={liveTranscriptions}
        loading={isLoading}
        sortBy={sortBy}
        onSortChange={setSortBy}
        emptyTitle="Press hotkey to record"
        emptyDescription="Use your configured hotkey to start recording, or click the Start Recording button above."
      />

      {/* Recording Indicator */}
      <RecordingIndicator />
    </div>
  )
}
