import React, { useState } from "react"
import { TranscriptionList, SortOption } from "../components/transcriptions/TranscriptionList"
import { useTranscriptions } from "../hooks/useTranscriptions"
import { Mic } from "lucide-react"

export const LiveTranscriptions: React.FC = () => {
  const [sortBy, setSortBy] = useState<SortOption>("date-desc")

  const { transcriptions, isLoading } = useTranscriptions()

  // Filter for live transcriptions (recording)
  const liveTranscriptions = transcriptions.filter((t) => t.type === "recording")

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
          label: "Start Recording",
          onClick: () => {
            // TODO: Implement start recording
            console.log("Start recording clicked")
          },
        }}
      />
    </div>
  )
}
