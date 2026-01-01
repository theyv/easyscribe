// Supported file formats for transcription

export const SUPPORTED_AUDIO_FORMATS = [
  'mp3',
  'wav',
  'm4a',
  'flac',
  'ogg',
  'aac',
  'wma'
] as const

export const SUPPORTED_VIDEO_FORMATS = [
  'mp4',
  'mkv',
  'avi',
  'mov',
  'webm',
  'flv'
] as const

export const SUPPORTED_FORMATS = [
  ...SUPPORTED_AUDIO_FORMATS,
  ...SUPPORTED_VIDEO_FORMATS
] as const

export type SupportedFormat = typeof SUPPORTED_FORMATS[number]

export interface FileTypeInfo {
  extension: string
  type: 'audio' | 'video'
  name: string
  icon: string
  mimeType: string
}

export const FILE_TYPE_INFO: Record<SupportedFormat, FileTypeInfo> = {
  // Audio formats
  mp3: {
    extension: 'mp3',
    type: 'audio',
    name: 'MP3 Audio',
    icon: 'Music',
    mimeType: 'audio/mpeg'
  },
  wav: {
    extension: 'wav',
    type: 'audio',
    name: 'WAV Audio',
    icon: 'Music',
    mimeType: 'audio/wav'
  },
  m4a: {
    extension: 'm4a',
    type: 'audio',
    name: 'M4A Audio',
    icon: 'Music',
    mimeType: 'audio/mp4'
  },
  flac: {
    extension: 'flac',
    type: 'audio',
    name: 'FLAC Audio',
    icon: 'Music',
    mimeType: 'audio/flac'
  },
  ogg: {
    extension: 'ogg',
    type: 'audio',
    name: 'OGG Audio',
    icon: 'Music',
    mimeType: 'audio/ogg'
  },
  aac: {
    extension: 'aac',
    type: 'audio',
    name: 'AAC Audio',
    icon: 'Music',
    mimeType: 'audio/aac'
  },
  wma: {
    extension: 'wma',
    type: 'audio',
    name: 'WMA Audio',
    icon: 'Music',
    mimeType: 'audio/x-ms-wma'
  },
  // Video formats
  mp4: {
    extension: 'mp4',
    type: 'video',
    name: 'MP4 Video',
    icon: 'Video',
    mimeType: 'video/mp4'
  },
  mkv: {
    extension: 'mkv',
    type: 'video',
    name: 'MKV Video',
    icon: 'Video',
    mimeType: 'video/x-matroska'
  },
  avi: {
    extension: 'avi',
    type: 'video',
    name: 'AVI Video',
    icon: 'Video',
    mimeType: 'video/x-msvideo'
  },
  mov: {
    extension: 'mov',
    type: 'video',
    name: 'MOV Video',
    icon: 'Video',
    mimeType: 'video/quicktime'
  },
  webm: {
    extension: 'webm',
    type: 'video',
    name: 'WebM Video',
    icon: 'Video',
    mimeType: 'video/webm'
  },
  flv: {
    extension: 'flv',
    type: 'video',
    name: 'FLV Video',
    icon: 'Video',
    mimeType: 'video/x-flv'
  }
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.')
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ''
}

/**
 * Check if file format is supported
 */
export function isSupportedFormat(extension: string): boolean {
  return SUPPORTED_FORMATS.includes(extension.toLowerCase() as SupportedFormat)
}

/**
 * Check if file is an audio format
 */
export function isAudioFormat(extension: string): boolean {
  return SUPPORTED_AUDIO_FORMATS.includes(extension.toLowerCase() as any)
}

/**
 * Check if file is a video format
 */
export function isVideoFormat(extension: string): boolean {
  return SUPPORTED_VIDEO_FORMATS.includes(extension.toLowerCase() as any)
}

/**
 * Get file type info for a given extension
 */
export function getFileTypeInfo(extension: string): FileTypeInfo | null {
  const ext = extension.toLowerCase()
  if (ext in FILE_TYPE_INFO) {
    return FILE_TYPE_INFO[ext as SupportedFormat]
  }
  return null
}

/**
 * Get icon name for a file extension
 */
export function getFileIcon(extension: string): string {
  const info = getFileTypeInfo(extension)
  return info?.icon || 'File'
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Validate file for transcription
 */
export interface ValidationResult {
  valid: boolean
  error?: string
  type?: 'audio' | 'video'
  info?: FileTypeInfo
}

export function validateFileForTranscription(filename: string): ValidationResult {
  const extension = getFileExtension(filename)

  if (!extension) {
    return {
      valid: false,
      error: 'File has no extension'
    }
  }

  if (!isSupportedFormat(extension)) {
    return {
      valid: false,
      error: `Unsupported format: .${extension}. Supported formats: ${SUPPORTED_FORMATS.join(', ')}`
    }
  }

  const info = getFileTypeInfo(extension)

  return {
    valid: true,
    type: info?.type,
    info: info || undefined
  }
}

/**
 * Get accept attribute for file input
 */
export function getFileInputAccept(): string {
  const audioMimeTypes = SUPPORTED_AUDIO_FORMATS.map(
    ext => FILE_TYPE_INFO[ext as SupportedFormat].mimeType
  )
  const videoMimeTypes = SUPPORTED_VIDEO_FORMATS.map(
    ext => FILE_TYPE_INFO[ext as SupportedFormat].mimeType
  )

  return [...audioMimeTypes, ...videoMimeTypes].join(',')
}
