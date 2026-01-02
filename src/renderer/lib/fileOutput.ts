import { formatTimestamp } from './formatters'

export interface TranscriptionSegment {
  text: string
  start: number
  end: number
}

export interface TranscriptionData {
  text: string
  segments?: TranscriptionSegment[]
}

export interface TxtOutputOptions {
  includeTimestamps: boolean
  timestampFormat?: 'HH:MM:SS' | 'MM:SS' | 'seconds'
  timestampInterval?: number // in seconds
}

export interface SrtOutputOptions {
  includeSequenceNumbers?: boolean
}

/**
 * Generate TXT content from transcription data
 */
export function generateTxtContent(
  data: TranscriptionData,
  options: TxtOutputOptions
): string {
  const { includeTimestamps, timestampFormat = 'HH:MM:SS', timestampInterval = 30 } = options

  if (!includeTimestamps) {
    return data.text.trim()
  }

  // If we have segments, use them for accurate timestamps
  if (data.segments && data.segments.length > 0) {
    return data.segments
      .map((segment) => {
        const timestamp = formatTimestamp(segment.start, timestampFormat)
        return `[${timestamp}] ${segment.text.trim()}`
      })
      .join('\n')
  }

  // Otherwise, generate timestamps at intervals
  const lines = data.text.split('\n')
  let lastTimestamp = 0
  let result = ''

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Add timestamp at specified intervals
    if (i === 0 || lastTimestamp >= timestampInterval) {
      const timestamp = formatTimestamp(lastTimestamp, timestampFormat)
      result += `[${timestamp}] ${line}\n`
      lastTimestamp = 0
    } else {
      result += `${line}\n`
    }
    lastTimestamp += timestampInterval / lines.length
  }

  return result.trim()
}

/**
 * Generate SRT subtitle format from transcription segments
 */
export function generateSrtContent(
  data: TranscriptionData,
  options: SrtOutputOptions = {}
): string {
  if (!data.segments || data.segments.length === 0) {
    // If no segments, create a single subtitle entry
    return `1\n00:00:00,000 --> 00:00:05,000\n${data.text.trim()}\n`
  }

  return data.segments
    .map((segment, index) => {
      const sequenceNumber = index + 1
      const startTime = formatSrtTimestamp(segment.start)
      const endTime = formatSrtTimestamp(segment.end)

      return `${sequenceNumber}\n${startTime} --> ${endTime}\n${segment.text.trim()}\n`
    })
    .join('\n')
}

/**
 * Format seconds to SRT timestamp format (HH:MM:SS,mmm)
 */
function formatSrtTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const milliseconds = Math.floor((seconds % 1) * 1000)

  const pad = (num: number) => num.toString().padStart(2, '0')
  const padMs = (num: number) => num.toString().padStart(3, '0')

  return `${pad(hours)}:${pad(minutes)}:${pad(secs)},${padMs(milliseconds)}`
}

/**
 * Save content to file using Electron's file system API
 */
export async function saveToFile(
  content: string,
  filePath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const electron = window.electron
    if (!electron?.file) {
      throw new Error('Electron file API not available')
    }
    await electron.file.save(filePath, content)
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Generate output path based on source path and suffix
 */
export function getOutputPath(sourcePath: string, suffix: string, extension: string): string {
  const path = require('path')
  const parsedPath = path.parse(sourcePath)
  return path.join(parsedPath.dir, `${parsedPath.name}${suffix}.${extension}`)
}

/**
 * Generate default output path for transcription
 */
export function getTranscriptionOutputPath(
  sourcePath: string,
  format: 'txt' | 'srt' = 'txt'
): string {
  return getOutputPath(sourcePath, '_transcription', format)
}

/**
 * Export transcription to file
 */
export async function exportTranscription(
  data: TranscriptionData,
  sourcePath: string,
  format: 'txt' | 'srt',
  options?: TxtOutputOptions
): Promise<{ success: boolean; outputPath?: string; error?: string }> {
  let content: string

  if (format === 'txt') {
    content = generateTxtContent(data, options || { includeTimestamps: false })
  } else {
    content = generateSrtContent(data)
  }

  const outputPath = getTranscriptionOutputPath(sourcePath, format)
  const result = await saveToFile(content, outputPath)

  return {
    ...result,
    outputPath: result.success ? outputPath : undefined
  }
}
