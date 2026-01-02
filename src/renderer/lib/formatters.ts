import { Transcription } from '@/shared/types'

/**
 * Format duration in seconds to human-readable format
 * @param seconds - Duration in seconds
 * @param format - Output format: 'short' for "MM:SS", 'long' for "H:MM:SS"
 */
export function formatDuration(
  seconds: number,
  format: 'short' | 'long' = 'short'
): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  const pad = (num: number) => num.toString().padStart(2, '0')

  if (format === 'long' && hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(secs)}`
  }

  return `${pad(minutes)}:${pad(secs)}`
}

/**
 * Format file size in bytes to human-readable format
 * @param bytes - File size in bytes
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

/**
 * Format relative time from a date
 * @param date - Date to format
 */
export function formatRelativeTime(date: string | Date): string {
  const now = new Date()
  const past = new Date(date)
  const diffMs = now.getTime() - past.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) {
    return 'just now'
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
  } else {
    return past.toLocaleDateString()
  }
}

/**
 * Format timestamp in seconds to display format
 * @param seconds - Timestamp in seconds
 * @param format - Output format
 */
export function formatTimestamp(
  seconds: number,
  format: 'HH:MM:SS' | 'MM:SS' | 'seconds' = 'HH:MM:SS'
): string {
  if (format === 'seconds') {
    return seconds.toFixed(2)
  }

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  const pad = (num: number) => num.toString().padStart(2, '0')

  if (format === 'MM:SS') {
    return `${pad(minutes)}:${pad(secs)}`
  }

  return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`
}

/**
 * Format date to locale string
 * @param date - Date to format
 * @param options - Intl.DateTimeFormatOptions
 */
export function formatDate(
  date: string | Date,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }
): string {
  return new Date(date).toLocaleDateString(undefined, options)
}

/**
 * Format time to locale string
 * @param date - Date to format
 * @param options - Intl.DateTimeFormatOptions
 */
export function formatTime(
  date: string | Date,
  options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit'
  }
): string {
  return new Date(date).toLocaleTimeString(undefined, options)
}

/**
 * Format date and time to locale string
 * @param date - Date to format
 * @param options - Intl.DateTimeFormatOptions
 */
export function formatDateTime(
  date: string | Date,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }
): string {
  return new Date(date).toLocaleString(undefined, options)
}

/**
 * Format transcriptions as TXT
 */
export function formatTranscriptionsAsTxt(transcriptions: Transcription[]): string {
  return transcriptions.map((t, index) => {
    const header = `=== ${t.title} ===`
    const meta = `Created: ${new Date(t.created_at).toLocaleString()}\nType: ${t.type}`
    const content = t.content || '(No content)'
    const separator = index < transcriptions.length - 1 ? '\n---\n' : ''
    
    return `${header}\n${meta}\n\n${content}\n${separator}`
  }).join('\n')
}

/**
 * Format transcriptions as SRT (SubRip format)
 */
export function formatTranscriptionsAsSrt(transcriptions: Transcription[]): string {
  return transcriptions.map((t, index) => {
    const srtIndex = index + 1
    
    // Calculate start and end times based on duration
    // If no duration, use 0 and 5 seconds as default
    const duration = t.duration || 5
    const startTime = 0
    const endTime = duration
    
    const formatSrtTime = (seconds: number): string => {
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      const secs = Math.floor(seconds % 60)
      const ms = Math.floor((seconds % 1) * 1000)
      
      const pad = (num: number) => num.toString().padStart(2, '0')
      const padMs = (num: number) => num.toString().padStart(3, '0')
      
      return `${pad(hours)}:${pad(minutes)}:${pad(secs)},${padMs(ms)}`
    }
    
    const timecode = `${formatSrtTime(startTime)} --> ${formatSrtTime(endTime)}`
    const content = t.content || '(No content)'
    
    return `${srtIndex}\n${timecode}\n${content}\n`
  }).join('\n')
}
