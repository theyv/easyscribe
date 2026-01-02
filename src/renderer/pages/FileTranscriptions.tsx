import React, { useState, useRef } from "react"
import { TranscriptionList, SortOption } from "../components/transcriptions/TranscriptionList"
import { useTranscriptions } from "../hooks/useTranscriptions"
import { useFileTranscription } from "../hooks/useFileTranscription"
import { useSettings } from "../hooks/useSettings"
import { validateFileForTranscription } from "../lib/fileTypes"
import type { DroppedFile } from "../components/transcriptions/FileDropZone"

export const FileTranscriptions: React.FC = () => {
  const [sortBy, setSortBy] = useState<SortOption>("date-desc")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { transcriptions, isLoading, createTranscription } = useTranscriptions()
  const { transcribeSingleFile, isTranscribing } = useFileTranscription()
  const { settings } = useSettings()

  // Filter for file transcriptions (import and upload)
  const fileTranscriptions = transcriptions.filter(
    (t) => t.type === "import" || t.type === "upload"
  )

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

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
        const droppedFile: DroppedFile = {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">File Transcriptions</h1>
        <p className="text-muted-foreground">
          Transcriptions from imported or uploaded audio files
        </p>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".mp3,.wav,.m4a,.flac,.ogg,.aac,.wma,.mp4,.mkv,.avi,.mov,.webm,.flv"
        className="hidden"
        onChange={handleFileSelect}
        disabled={isTranscribing}
      />

      <TranscriptionList
        transcriptions={fileTranscriptions}
        loading={isLoading}
        sortBy={sortBy}
        onSortChange={setSortBy}
        emptyTitle="Drop files to transcribe"
        emptyDescription={isTranscribing ? "Transcribing file..." : "Drag and drop audio files here or click to import."}
        emptyAction={{
          label: isTranscribing ? "Transcribing..." : "Import Audio File",
          onClick: handleImportClick,
        }}
      />
    </div>
  )
}
