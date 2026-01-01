import React, { useState } from "react"
import { TranscriptionList, SortOption } from "../components/transcriptions/TranscriptionList"
import { Input } from "../components/ui/input"
import { Button } from "../components/ui/button"
import { Search } from "lucide-react"
import { useTranscriptions } from "../hooks/useTranscriptions"
import type { Transcription } from "@/shared/types"

export const AllTranscriptions: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<"all" | "recording" | "import" | "upload">("all")
  const [sortBy, setSortBy] = useState<SortOption>("date-desc")

  const { transcriptions, isLoading } = useTranscriptions()

  // Filter transcriptions
  const filteredTranscriptions = transcriptions.filter((t) => {
    const matchesSearch =
      searchQuery === "" ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.sourceFilename?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesType =
      typeFilter === "all" || t.type === typeFilter

    return matchesSearch && matchesType
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">All Transcriptions</h1>
        <p className="text-muted-foreground">
          View and manage all your transcriptions
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search transcriptions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={typeFilter === "all" ? "default" : "outline"}
            onClick={() => setTypeFilter("all")}
          >
            All
          </Button>
          <Button
            variant={typeFilter === "recording" ? "default" : "outline"}
            onClick={() => setTypeFilter("recording")}
          >
            Recording
          </Button>
          <Button
            variant={typeFilter === "import" ? "default" : "outline"}
            onClick={() => setTypeFilter("import")}
          >
            Import
          </Button>
          <Button
            variant={typeFilter === "upload" ? "default" : "outline"}
            onClick={() => setTypeFilter("upload")}
          >
            Upload
          </Button>
        </div>
      </div>

      {/* Transcription List */}
      <TranscriptionList
        transcriptions={filteredTranscriptions}
        loading={isLoading}
        sortBy={sortBy}
        onSortChange={setSortBy}
        emptyTitle="No transcriptions yet"
        emptyDescription={
          searchQuery || typeFilter !== "all"
            ? "Try adjusting your search or filters"
            : "Your transcriptions will appear here once you create them."
        }
      />
    </div>
  )
}
