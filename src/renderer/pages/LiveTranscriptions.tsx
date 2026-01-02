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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Live Transcriptions</h1>
        <p className="text-muted-foreground">
          Transcriptions from live recording sessions
        </p>
      </div>

      <TranscriptionList
        transcriptions={liveTranscriptions}
        loading={isLoading}
        sortBy={sortBy}
        onSortChange={setSortBy}
        emptyTitle="Press hotkey to record"
        emptyDescription="Use your configured hotkey to start recording, or click below."
        emptyAction={{
          label: isRecording ? "Stop Recording" : "Start Recording",
          onClick: handleRecordingClick,
        }}
      />

      {/* Recording Indicator */}
      <RecordingIndicator />
    </div>
  )
}
