import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import ffmpegPath from 'ffmpeg-static'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Supported file formats
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

export interface ValidationResult {
  valid: boolean
  format?: string
  type?: 'audio' | 'video'
  error?: string
}

export interface ProcessOptions {
  sampleRate?: number
  channels?: number
  outputFormat?: 'wav'
  tempDir?: string
}

export interface ProcessResult {
  outputPath: string
  duration: number
  size: number
  format: string
}

/**
 * Get file extension from file path
 */
export function getFileExtension(filePath: string): string {
  return path.extname(filePath).toLowerCase().slice(1)
}

/**
 * Validate if file is supported for transcription
 */
export function validateFile(filePath: string): ValidationResult {
  if (!fs.existsSync(filePath)) {
    return {
      valid: false,
      error: 'File does not exist'
    }
  }

  const stats = fs.statSync(filePath)
  if (!stats.isFile()) {
    return {
      valid: false,
      error: 'Path is not a file'
    }
  }

  const ext = getFileExtension(filePath)

  if (SUPPORTED_AUDIO_FORMATS.includes(ext as any)) {
    return {
      valid: true,
      format: ext,
      type: 'audio'
    }
  }

  if (SUPPORTED_VIDEO_FORMATS.includes(ext as any)) {
    return {
      valid: true,
      format: ext,
      type: 'video'
    }
  }

  return {
    valid: false,
    error: `Unsupported file format: ${ext}. Supported formats: ${SUPPORTED_FORMATS.join(', ')}`
  }
}

/**
 * Get file duration using FFprobe (part of FFmpeg)
 */
async function getFileDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const ffprobePath = ffmpegPath?.replace('ffmpeg', 'ffprobe')
    const args = [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath
    ]

    const ffprobe = spawn(ffprobePath || 'ffprobe', args)
    let output = ''

    ffprobe.stdout.on('data', (data) => {
      output += data.toString()
    })

    ffprobe.on('close', (code) => {
      if (code === 0 && output) {
        resolve(parseFloat(output.trim()))
      } else {
        reject(new Error('Failed to get file duration'))
      }
    })

    ffprobe.on('error', (err) => {
      reject(err)
    })
  })
}

/**
 * Extract audio from video file using FFmpeg
 */
async function extractAudio(
  inputPath: string,
  outputPath: string,
  options: ProcessOptions = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = [
      '-i', inputPath,
      '-vn', // No video
      '-acodec', 'pcm_s16le', // PCM 16-bit
      '-ar', (options.sampleRate || 16000).toString(), // Sample rate
      '-ac', (options.channels || 1).toString(), // Mono
      '-y', // Overwrite output file
      outputPath
    ]

    const ffmpeg = spawn(ffmpegPath || 'ffmpeg', args)
    let stderr = ''

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`FFmpeg failed with code ${code}: ${stderr}`))
      }
    })

    ffmpeg.on('error', (err) => {
      reject(err)
    })
  })
}

/**
 * Convert audio file to WAV format
 */
async function convertToWav(
  inputPath: string,
  outputPath: string,
  options: ProcessOptions = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = [
      '-i', inputPath,
      '-acodec', 'pcm_s16le', // PCM 16-bit
      '-ar', (options.sampleRate || 16000).toString(), // Sample rate
      '-ac', (options.channels || 1).toString(), // Mono
      '-y', // Overwrite output file
      outputPath
    ]

    const ffmpeg = spawn(ffmpegPath || 'ffmpeg', args)
    let stderr = ''

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`FFmpeg failed with code ${code}: ${stderr}`))
      }
    })

    ffmpeg.on('error', (err) => {
      reject(err)
    })
  })
}

/**
 * Process file for transcription
 * - Extracts audio from video files
 * - Converts audio to WAV format (16kHz mono)
 * - Returns processed audio path
 */
export async function processFile(
  filePath: string,
  options: ProcessOptions = {}
): Promise<ProcessResult> {
  // Validate file
  const validation = validateFile(filePath)
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid file')
  }

  // Get file duration
  const duration = await getFileDuration(filePath)

  // Create temp directory if not provided
  const tempDir = options.tempDir || path.join(__dirname, '../../temp')
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true })
  }

  const baseName = path.basename(filePath, path.extname(filePath))
  const outputPath = path.join(tempDir, `${baseName}_processed.wav`)

  // Process based on file type
  if (validation.type === 'video') {
    // Extract audio from video
    await extractAudio(filePath, outputPath, options)
  } else {
    // Convert audio to WAV
    await convertToWav(filePath, outputPath, options)
  }

  // Get output file stats
  const stats = fs.statSync(outputPath)

  return {
    outputPath,
    duration,
    size: stats.size,
    format: 'wav'
  }
}

/**
 * Clean up processed files
 */
export function cleanupProcessedFiles(tempDir?: string): void {
  const dir = tempDir || path.join(__dirname, '../../temp')

  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir)
    files.forEach((file) => {
      const filePath = path.join(dir, file)
      if (file.endsWith('_processed.wav')) {
        fs.unlinkSync(filePath)
      }
    })
  }
}

/**
 * Check if FFmpeg is available
 */
export function isFFmpegAvailable(): boolean {
  try {
    return fs.existsSync(ffmpegPath || '')
  } catch {
    return false
  }
}
