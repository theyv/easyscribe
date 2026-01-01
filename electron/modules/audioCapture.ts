import { EventEmitter } from 'events'
import { RecordingOptions, RecordingResult, AudioDevice } from '../../src/shared/types'

// Type for node-audiorecorder
interface AudioRecorder {
  start(): void
  stop(): Buffer
  stream(): NodeJS.ReadableStream
}

interface NodeAudioRecorder {
  (options: Record<string, unknown>): AudioRecorder
}

// Default recording options
const DEFAULT_OPTIONS: Required<RecordingOptions> = {
  sampleRate: 16000,
  channels: 1,
  maxDuration: 300, // 5 minutes
  warningDuration: 270 // 4:30
}

class AudioCaptureManager extends EventEmitter {
  private isRecording: boolean = false
  private recorder: AudioRecorder | null = null
  private startTime: number = 0
  private warningTimeout: NodeJS.Timeout | null = null
  private maxDurationTimeout: NodeJS.Timeout | null = null
  private currentOptions: Required<RecordingOptions> = DEFAULT_OPTIONS

  /**
   * Request microphone permission on macOS
   */
  private async requestMicrophonePermission(): Promise<boolean> {
    if (process.platform === 'darwin') {
      try {
        // On macOS, we need to check for microphone access
        const { systemPreferences } = await import('electron')
        const status = systemPreferences.getMediaAccessStatus('microphone')
        
        if (status === 'granted') {
          return true
        } else if (status === 'denied') {
          return false
        } else {
          // Request permission
          const granted = await systemPreferences.askForMediaAccess('microphone')
          return granted
        }
      } catch (error) {
        console.error('Failed to request microphone permission:', error)
        return false
      }
    }
    return true
  }

  /**
   * Start audio recording
   */
  async startRecording(options: RecordingOptions = {}): Promise<{ success: boolean; error?: string }> {
    try {
      if (this.isRecording) {
        return { success: false, error: 'Recording already in progress' }
      }

      // Request microphone permission on macOS
      const hasPermission = await this.requestMicrophonePermission()
      if (!hasPermission) {
        return { success: false, error: 'Microphone permission denied' }
      }

      // Merge options with defaults
      this.currentOptions = { ...DEFAULT_OPTIONS, ...options }

      // Import node-audiorecorder
      const AudioRecorderClass: NodeAudioRecorder = require('node-audiorecorder')

      // Configure recorder
      const recorderOptions: Record<string, unknown> = {
        program: process.platform === 'darwin' ? 'sox' : 'arecord', // Use sox on macOS, arecord on Linux, ffmpeg on Windows
        silence: 0, // No silence detection
        thresholdStart: null,
        thresholdStop: null,
        sampleRate: this.currentOptions.sampleRate,
        channels: this.currentOptions.channels,
        bits: 16,
        encoding: 'signed-integer',
        format: 'WAV',
        dir: null, // Record to memory
        endOnSilence: false
      }

      // Create recorder instance
      this.recorder = new (AudioRecorderClass as any)(recorderOptions)

      // Start recording
      this.recorder!.start()
      this.startTime = Date.now()
      this.isRecording = true

      // Set up duration timers
      this.setupDurationTimers()

      this.emit('recording-started')
      console.log('Audio recording started')
      
      return { success: true }
    } catch (error) {
      console.error('Failed to start recording:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to start recording' 
      }
    }
  }

  /**
   * Set up duration warning and max duration timers
   */
  private setupDurationTimers(): void {
    // Clear existing timers
    if (this.warningTimeout) clearTimeout(this.warningTimeout)
    if (this.maxDurationTimeout) clearTimeout(this.maxDurationTimeout)

    // Warning timer (at warningDuration)
    this.warningTimeout = setTimeout(() => {
      if (this.isRecording) {
        this.emit('recording-warning', {
          message: 'Recording will stop in 30 seconds',
          remaining: 30
        })
      }
    }, this.currentOptions.warningDuration * 1000)

    // Max duration timer
    this.maxDurationTimeout = setTimeout(() => {
      if (this.isRecording) {
        this.stopRecording()
      }
    }, this.currentOptions.maxDuration * 1000)
  }

  /**
   * Clear duration timers
   */
  private clearDurationTimers(): void {
    if (this.warningTimeout) {
      clearTimeout(this.warningTimeout)
      this.warningTimeout = null
    }
    if (this.maxDurationTimeout) {
      clearTimeout(this.maxDurationTimeout)
      this.maxDurationTimeout = null
    }
  }

  /**
   * Stop audio recording and return the result
   */
  stopRecording(): { success: boolean; data?: RecordingResult; error?: string } {
    try {
      if (!this.isRecording || !this.recorder) {
        return { success: false, error: 'No recording in progress' }
      }

      // Clear timers
      this.clearDurationTimers()

      // Stop recording and get buffer
      const audioBuffer = this.recorder.stop()
      const duration = (Date.now() - this.startTime) / 1000

      // Reset state
      this.isRecording = false
      this.recorder = null
      this.startTime = 0

      const result: RecordingResult = {
        audioBuffer,
        duration,
        format: 'wav'
      }

      this.emit('recording-stopped', result)
      console.log('Audio recording stopped, duration:', duration, 's')

      return { success: true, data: result }
    } catch (error) {
      console.error('Failed to stop recording:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to stop recording' 
      }
    }
  }

  /**
   * Get current recording duration in seconds
   */
  getDuration(): number {
    if (!this.isRecording) return 0
    return (Date.now() - this.startTime) / 1000
  }

  /**
   * Check if currently recording
   */
  isRecordingNow(): boolean {
    return this.isRecording
  }

  /**
   * Get available audio devices
   */
  async getAudioDevices(): Promise<{ success: boolean; data?: AudioDevice[]; error?: string }> {
    try {
      // On macOS, use system_profiler
      if (process.platform === 'darwin') {
        const { exec } = await import('child_process')
        const { promisify } = await import('util')
        const execAsync = promisify(exec)

        try {
          const { stdout } = await execAsync('system_profiler SPAudioDataType | grep -A 1 "Input Devices"')
          const lines = stdout.split('\n').filter((line: string) => line.trim())
          
          const devices: AudioDevice[] = lines
            .filter((line: string) => line.includes(':'))
            .map((line: string, index: number) => ({
              id: `mic-${index}`,
              name: line.split(':')[1]?.trim() || `Microphone ${index + 1}`,
              isDefault: index === 0
            }))

          return { success: true, data: devices }
        } catch {
          // Fallback to default device
          return { 
            success: true, 
            data: [{ id: 'default', name: 'Default Microphone', isDefault: true }] 
          }
        }
      }

      // On Windows, use PowerShell
      if (process.platform === 'win32') {
        const { exec } = await import('child_process')
        const { promisify } = await import('util')
        const execAsync = promisify(exec)

        try {
          const { stdout } = await execAsync(
            'powershell -Command "Get-WmiObject Win32_SoundDevice | Where-Object {$_.ConfigManagerErrorCode -eq 0} | Select-Object Name"'
          )
          const lines = stdout.split('\n').filter((line: string) => line.trim())
          
          const devices: AudioDevice[] = lines
            .filter((line: string) => line.includes('-') && !line.includes('---'))
            .map((line: string, index: number) => {
              const name = line.split('-')[1]?.trim() || `Microphone ${index + 1}`
              return {
                id: `mic-${index}`,
                name,
                isDefault: index === 0
              }
            })

          return { success: true, data: devices }
        } catch {
          return { 
            success: true, 
            data: [{ id: 'default', name: 'Default Microphone', isDefault: true }] 
          }
        }
      }

      // On Linux, use arecord
      if (process.platform === 'linux') {
        const { exec } = await import('child_process')
        const { promisify } = await import('util')
        const execAsync = promisify(exec)

        try {
          const { stdout } = await execAsync('arecord -l')
          const lines = stdout.split('\n').filter((line: string) => line.includes('card'))
          
          const devices: AudioDevice[] = lines.map((line: string, index: number) => {
            const match = line.match(/card (\d+).*?\[(.*?)\]/)
            return {
              id: `mic-${index}`,
              name: match ? match[2] : `Microphone ${index + 1}`,
              isDefault: index === 0
            }
          })

          return { success: true, data: devices }
        } catch {
          return { 
            success: true, 
            data: [{ id: 'default', name: 'Default Microphone', isDefault: true }] 
          }
        }
      }

      // Default fallback
      return { 
        success: true, 
        data: [{ id: 'default', name: 'Default Microphone', isDefault: true }] 
      }
    } catch (error) {
      console.error('Failed to get audio devices:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get audio devices' 
      }
    }
  }

  /**
   * Test microphone level
   */
  async testMicrophone(deviceId?: string): Promise<{ success: boolean; data?: { level: number }; error?: string }> {
    try {
      // Request microphone permission on macOS
      const hasPermission = await this.requestMicrophonePermission()
      if (!hasPermission) {
        return { success: false, error: 'Microphone permission denied' }
      }

      // This is a simplified test - in a real implementation, you would
      // actually record a short sample and analyze the audio level
      // For now, we'll return a mock level
      return { 
        success: true, 
        data: { level: Math.floor(Math.random() * 100) } 
      }
    } catch (error) {
      console.error('Failed to test microphone:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to test microphone' 
      }
    }
  }
}

// Export singleton instance
export const audioCapture = new AudioCaptureManager()

// Export functions for direct use
export const startRecording = (options?: RecordingOptions) => audioCapture.startRecording(options)
export const stopRecording = () => audioCapture.stopRecording()
export const getAudioDevices = () => audioCapture.getAudioDevices()
export const testMicrophone = (deviceId?: string) => audioCapture.testMicrophone(deviceId)
