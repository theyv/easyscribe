import { useState, useCallback } from 'react'
import { DroppedFile } from '@/renderer/components/transcriptions/FileDropZone'
import { useSettings } from './useSettings'

export interface TranscriptionProgress {
  fileId: string
  fileName: string
  status: 'pending' | 'processing' | 'transcribing' | 'completed' | 'error'
  progress: number
  error?: string
  result?: TranscriptionResult
}

export interface TranscriptionResult {
  text: string
  language: string
  duration: number
  segments?: Array<{
    start: number
    end: number
    text: string
  }>
}

export interface TranscriptionOptions {
  language?: string
  prompt?: string
  responseFormat?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt'
  temperature?: number
}

export function useFileTranscription() {
  const [transcriptions, setTranscriptions] = useState<Map<string, TranscriptionProgress>>(
    new Map()
  )
  const [isTranscribing, setIsTranscribing] = useState(false)
  const { settings } = useSettings()

  const transcribeFiles = useCallback(async (
    files: DroppedFile[],
    options?: TranscriptionOptions,
    onProgress?: (progress: Map<string, TranscriptionProgress>) => void,
    onComplete?: (results: Map<string, TranscriptionResult>) => void
  ) => {
    const validFiles = files.filter((f) => f.valid)
    if (validFiles.length === 0) {
      return
    }

    setIsTranscribing(true)

    // Initialize progress for all files
    const newProgress = new Map(transcriptions)
    validFiles.forEach((file) => {
      newProgress.set(file.id, {
        fileId: file.id,
        fileName: file.name,
        status: 'pending',
        progress: 0
      })
    })
    setTranscriptions(newProgress)
    onProgress?.(new Map(newProgress))

    const results = new Map<string, TranscriptionResult>()

    // Process files sequentially
    for (const file of validFiles) {
      try {
        // Update status to processing
        newProgress.set(file.id, {
          fileId: file.id,
          fileName: file.name,
          status: 'processing',
          progress: 10
        })
        setTranscriptions(new Map(newProgress))
        onProgress?.(new Map(newProgress))

        // Call IPC to transcribe file based on engine setting
        let response
        if (settings.fileTranscriptionEngine === 'local') {
          response = await (window as any).electron.python.transcribe(file.path, {
            language: options?.language,
            task: options?.prompt === 'translate' ? 'translate' : 'transcribe'
          })
        } else {
          response = await (window as any).electron.file.transcribe(file.path, options)
        }

        // Update status to transcribing
        newProgress.set(file.id, {
          fileId: file.id,
          fileName: file.name,
          status: 'transcribing',
          progress: 50
        })
        setTranscriptions(new Map(newProgress))
        onProgress?.(new Map(newProgress))

        if (response.success) {
          results.set(file.id, response.data)

          // Update status to completed
          newProgress.set(file.id, {
            fileId: file.id,
            fileName: file.name,
            status: 'completed',
            progress: 100,
            result: response.data
          })
        } else {
          // Update status to error
          newProgress.set(file.id, {
            fileId: file.id,
            fileName: file.name,
            status: 'error',
            progress: 0,
            error: response.error || 'Transcription failed'
          })
        }
      } catch (error) {
        // Update status to error
        newProgress.set(file.id, {
          fileId: file.id,
          fileName: file.name,
          status: 'error',
          progress: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }

      setTranscriptions(new Map(newProgress))
      onProgress?.(new Map(newProgress))
    }

    setIsTranscribing(false)
    onComplete?.(results)
  }, [transcriptions])

  const transcribeSingleFile = useCallback(async (
    file: DroppedFile,
    options?: TranscriptionOptions
  ): Promise<TranscriptionResult> => {
    const progressMap = new Map(transcriptions)
    progressMap.set(file.id, {
      fileId: file.id,
      fileName: file.name,
      status: 'pending',
      progress: 0
    })
    setTranscriptions(progressMap)

    try {
      // Update status to processing
      progressMap.set(file.id, {
        fileId: file.id,
        fileName: file.name,
        status: 'processing',
        progress: 10
      })
      setTranscriptions(new Map(progressMap))

      // Call IPC to transcribe file based on engine setting
      let response
      if (settings.fileTranscriptionEngine === 'local') {
        response = await (window as any).electron.python.transcribe(file.path, {
          language: options?.language,
          task: options?.prompt === 'translate' ? 'translate' : 'transcribe'
        })
      } else {
        response = await (window as any).electron.file.transcribe(file.path, options)
      }

      // Update status to transcribing
      progressMap.set(file.id, {
        fileId: file.id,
        fileName: file.name,
        status: 'transcribing',
        progress: 50
      })
      setTranscriptions(new Map(progressMap))

      if (response.success) {
        // Update status to completed
        progressMap.set(file.id, {
          fileId: file.id,
          fileName: file.name,
          status: 'completed',
          progress: 100,
          result: response.data
        })
        setTranscriptions(new Map(progressMap))

        return response.data
      } else {
        throw new Error(response.error || 'Transcription failed')
      }
    } catch (error) {
      // Update status to error
      progressMap.set(file.id, {
        fileId: file.id,
        fileName: file.name,
        status: 'error',
        progress: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      setTranscriptions(new Map(progressMap))

      throw error
    }
  }, [transcriptions])

  const cancelTranscription = useCallback((fileId: string) => {
    const newProgress = new Map(transcriptions)
    const progress = newProgress.get(fileId)

    if (progress && progress.status !== 'completed' && progress.status !== 'error') {
      newProgress.set(fileId, {
        ...progress,
        status: 'error',
        error: 'Transcription cancelled'
      })
      setTranscriptions(newProgress)
    }
  }, [transcriptions])

  const clearTranscriptions = useCallback(() => {
    setTranscriptions(new Map())
  }, [])

  const getTranscriptionProgress = useCallback((fileId: string) => {
    return transcriptions.get(fileId)
  }, [transcriptions])

  return {
    transcriptions,
    isTranscribing,
    transcribeFiles,
    transcribeSingleFile,
    cancelTranscription,
    clearTranscriptions,
    getTranscriptionProgress
  }
}
