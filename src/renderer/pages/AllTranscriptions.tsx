import React, { useState, useRef } from "react"
import { TranscriptionList, SortOption } from "../components/transcriptions/TranscriptionList"
import { Input } from "../components/ui/input"
import { Button } from "../components/ui/button"
import { Search, Upload } from "lucide-react"
import { useTranscriptions } from "../hooks/useTranscriptions"
import { useFileTranscription } from "../hooks/useFileTranscription"
import { validateFileForTranscription } from "../lib/fileTypes"
import type { Transcription } from "@/shared/types"

export const AllTranscriptions: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<"all" | "recording" | "import" | "upload" | "file">("all")
  const [sortBy, setSortBy] = useState<SortOption>("date-desc")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { transcriptions, isLoading, createTranscription } = useTranscriptions()
  const { transcribeSingleFile, isTranscribing } = useFileTranscription()

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    if (!file) return

    // Check if running in Electron or web mode
    const isElectron = typeof (window as any).electron !== 'undefined'

    // Validate file
    const validation = validateFileForTranscription(file.name)
    if (!validation.valid) {
      alert(validation.error || "Invalid file format")
      return
    }

    try {
      if (!isElectron) {
        // Web mode: Use Groq API directly with FormData
        const apiKey = (window as any).electron?.settingsPersistence
          ? await (window as any).electron.settingsPersistence.loadSettings().then((s: any) => s.groqApiKey)
          : import.meta.env.VITE_GROQ_API_KEY

        if (!apiKey) {
          alert('Groq API key is required. Please add your API key in Settings.')
          return
        }

        // Create FormData for the API request
        const formData = new FormData()
        formData.append('file', file)
        formData.append('model', 'whisper-large-v3-turbo')
        formData.append('response_format', 'verbose_json')

        // Make API request
        const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`
          },
          body: formData
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }))
          throw new Error(`Groq API error (${response.status}): ${errorData.error?.message || response.statusText}`)
        }

        const result = await response.json()
        console.log('Web mode transcription result:', result)

        // Create transcription record
        await createTranscription({
          device_id: 'web-device',
          folder_id: null,
          title: file.name.replace(/\.[^/.]+$/, ""),
          content: result.text,
          source_filename: file.name,
          audio_path: file.name,
          duration: result.duration,
          type: "import",
          language: result.language || 'auto',
          metadata: {
            segments: result.segments
          },
          synced: false,
          tags: []
        })

        // Refresh transcriptions list
        window.location.reload()
      } else {
        // Electron mode: Use IPC
        const filePath = (file as any).path || file.name

        // Create DroppedFile object
        const droppedFile: any = {
          id: `${file.name}-${Date.now()}`,
          name: file.name,
          path: filePath,
          size: file.size,
          type: validation.type || 'audio',
          valid: true
        }

        // Transcribe file with auto language detection (don't specify language)
        const result = await transcribeSingleFile(droppedFile, {
          // Don't specify language to enable auto-detection
          responseFormat: 'verbose_json'
        })

        // Create transcription record
        await createTranscription({
          device_id: 'import',
          folder_id: null,
          title: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
          content: result.text,
          source_filename: file.name,
          audio_path: filePath,
          duration: result.duration,
          type: "import",
          language: result.language || 'auto',
          metadata: {
            segments: result.segments
          },
          synced: false,
          tags: []
        })

        // Refresh transcriptions list
        window.location.reload()
      }
    } catch (error) {
      console.error("Failed to transcribe file:", error)
      alert(error instanceof Error ? error.message : "Failed to transcribe file")
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Filter transcriptions
  const filteredTranscriptions = transcriptions.filter((t) => {
    const matchesSearch =
      searchQuery === "" ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.source_filename?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesType =
      typeFilter === "all" ||
      t.type === typeFilter ||
      (typeFilter === "file" && (t.type === "import" || t.type === "upload"))

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
          {/* Action buttons */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isTranscribing}
            title="Import audio file"
          >
            <Upload className="h-4 w-4" />
          </Button>
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
            variant={typeFilter === "file" ? "default" : "outline"}
            onClick={() => setTypeFilter("file")}
          >
            File Transcription
          </Button>
        </div>
      </div>

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".mp3,.wav,.m4a,.flac,.ogg,.aac,.wma,.mp4,.mkv,.avi,.mov,.webm,.flv"
        className="hidden"
        onChange={handleFileSelect}
        disabled={isTranscribing}
      />

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
