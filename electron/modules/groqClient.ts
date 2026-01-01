import FormData from 'form-data'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { transcribeWithPython, getPythonStatus } from './pythonBridge'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export interface TranscriptionOptions {
  language?: string
  prompt?: string
  responseFormat?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt'
  temperature?: number
  timestampGranularities?: ('word' | 'segment')[]
}

export interface TranscriptionSegment {
  id: number
  seek: number
  start: number
  end: number
  text: string
  tokens: number[]
  temperature: number
  avg_logprob: number
  compression_ratio: number
  no_speech_prob: number
}

export interface TranscriptionWord {
  word: string
  start: number
  end: number
}

export interface TranscriptionResult {
  text: string
  task: string
  language: string
  duration: number
  words?: TranscriptionWord[]
  segments?: TranscriptionSegment[]
}

export interface TranscriptionError {
  message: string
  type: string
  code?: string
}

const GROQ_API_ENDPOINT = 'https://api.groq.com/openai/v1/audio/transcriptions'
const GROQ_MODEL = 'whisper-large-v3-turbo'
const MAX_RETRIES = 3
const REQUEST_TIMEOUT = 30000 // 30 seconds

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Calculate exponential backoff delay
 */
function getBackoffDelay(retryCount: number): number {
  return Math.min(1000 * Math.pow(2, retryCount), 4000)
}

/**
 * Transcribe an audio file using Groq API
 */
export async function transcribeFile(
  filePath: string,
  apiKey: string,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResult> {
  if (!apiKey) {
    throw new Error('Groq API key is required')
  }

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`)
  }

  // Validate file size (Groq has a 25MB limit)
  const stats = fs.statSync(filePath)
  const fileSizeMB = stats.size / (1024 * 1024)
  if (fileSizeMB > 25) {
    throw new Error(`File size (${fileSizeMB.toFixed(2)}MB) exceeds Groq's 25MB limit`)
  }

  let lastError: Error | null = null

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Create form data
      const formData = new FormData()
      formData.append('file', fs.createReadStream(filePath), path.basename(filePath))
      formData.append('model', GROQ_MODEL)

      if (options.language) {
        formData.append('language', options.language)
      }

      if (options.prompt) {
        formData.append('prompt', options.prompt)
      }

      if (options.responseFormat) {
        formData.append('response_format', options.responseFormat)
      }

      if (options.temperature !== undefined) {
        formData.append('temperature', options.temperature.toString())
      }

      if (options.timestampGranularities) {
        options.timestampGranularities.forEach((granularity) => {
          formData.append('timestamp_granularities[]', granularity)
        })
      }

      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), REQUEST_TIMEOUT)
      })

      // Make API request
      const fetchPromise = fetch(GROQ_API_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          ...formData.getHeaders()
        },
        body: formData as any
      })

      const response = await Promise.race([fetchPromise, timeoutPromise])

      // Check for rate limit
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After')
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : getBackoffDelay(attempt)

        if (attempt < MAX_RETRIES - 1) {
          console.warn(`Rate limited. Retrying after ${delay}ms...`)
          await sleep(delay)
          continue
        }
      }

      if (!response.ok) {
        const errorData: TranscriptionError = await response.json().catch(() => ({
          message: response.statusText,
          type: 'api_error'
        }))

        throw new Error(
          `Groq API error (${response.status}): ${errorData.message || response.statusText}`
        )
      }

      const result: TranscriptionResult = await response.json()
      return result

    } catch (error) {
      lastError = error as Error

      // Don't retry on timeout
      if (error instanceof Error && error.message === 'Request timeout') {
        throw new Error('Request timeout: The transcription took too long to complete')
      }

      // Don't retry on client errors (4xx) except rate limit
      if (error instanceof Error && error.message.includes('429')) {
        // Already handled above
        continue
      }

      if (error instanceof Error && error.message.includes('4')) {
        throw error
      }

      // Retry on network errors or server errors
      if (attempt < MAX_RETRIES - 1) {
        const delay = getBackoffDelay(attempt)
        console.warn(`Transcription attempt ${attempt + 1} failed. Retrying after ${delay}ms...`, error)
        await sleep(delay)
      }
    }
  }

  throw lastError || new Error('Transcription failed after maximum retries')
}

/**
 * Transcribe with fallback to Python if Groq fails
 * @param filePath - Path to audio file
 * @param apiKey - Groq API key (can be empty to use Python directly)
 * @param options - Transcription options
 * @param usePythonFirst - If true, try Python first before Groq
 */
export async function transcribeWithFallback(
  filePath: string,
  apiKey: string,
  options: TranscriptionOptions = {},
  usePythonFirst: boolean = false
): Promise<TranscriptionResult> {
  // If Python is preferred or no API key is provided
  const pythonStatus = getPythonStatus()
  const pythonAvailable = pythonStatus?.available === true
  
  if (usePythonFirst && pythonAvailable) {
    console.log('Using Python for transcription (preferred)')
    try {
      const result = await transcribeWithPython(filePath, {
        language: options.language,
        task: options.prompt === 'translate' ? 'translate' : 'transcribe'
      })
      return {
        text: result.text,
        task: options.prompt === 'translate' ? 'translate' : 'transcribe',
        language: result.language,
        duration: result.duration,
        segments: result.segments.map((seg, idx) => ({
          id: idx,
          seek: seg.start,
          start: seg.start,
          end: seg.end,
          text: seg.text,
          tokens: [],
          temperature: 0,
          avg_logprob: seg.avg_logprob || 0,
          compression_ratio: 0,
          no_speech_prob: 0
        }))
      }
    } catch (pythonError) {
      console.error('Python transcription failed, falling back to Groq:', pythonError)
      // Fall through to Groq
    }
  }

  // Try Groq API if API key is available
  if (apiKey) {
    try {
      console.log('Using Groq API for transcription')
      return await transcribeFile(filePath, apiKey, options)
    } catch (groqError) {
      console.error('Groq transcription failed:', groqError)
      
      // Fall back to Python if available
      if (pythonAvailable && !usePythonFirst) {
        console.log('Falling back to Python transcription')
        try {
          const result = await transcribeWithPython(filePath, {
            language: options.language,
            task: options.prompt === 'translate' ? 'translate' : 'transcribe'
          })
          return {
            text: result.text,
            task: options.prompt === 'translate' ? 'translate' : 'transcribe',
            language: result.language,
            duration: result.duration,
            segments: result.segments.map((seg, idx) => ({
              id: idx,
              seek: seg.start,
              start: seg.start,
              end: seg.end,
              text: seg.text,
              tokens: [],
              temperature: 0,
              avg_logprob: seg.avg_logprob || 0,
              compression_ratio: 0,
              no_speech_prob: 0
            }))
          }
        } catch (pythonError) {
          console.error('Python fallback also failed:', pythonError)
          throw groqError // Throw original Groq error
        }
      }
      
      throw groqError
    }
  }

  // No API key and Python not available or failed
  if (pythonAvailable) {
    console.log('Using Python for transcription (no API key)')
    try {
      const result = await transcribeWithPython(filePath, {
        language: options.language,
        task: options.prompt === 'translate' ? 'translate' : 'transcribe'
      })
      return {
        text: result.text,
        task: options.prompt === 'translate' ? 'translate' : 'transcribe',
        language: result.language,
        duration: result.duration,
        segments: result.segments.map((seg, idx) => ({
          id: idx,
          seek: seg.start,
          start: seg.start,
          end: seg.end,
          text: seg.text,
          tokens: [],
          temperature: 0,
          avg_logprob: seg.avg_logprob || 0,
          compression_ratio: 0,
          no_speech_prob: 0
        }))
      }
    } catch (pythonError) {
      console.error('Python transcription failed:', pythonError)
      throw new Error('No API key provided and Python transcription failed')
    }
  }

  throw new Error('No transcription method available: API key is required and Python is not available')
}

/**
 * Validate Groq API key
 */
export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    // Try to make a minimal request to validate the key
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    })

    return response.ok
  } catch {
    return false
  }
}
