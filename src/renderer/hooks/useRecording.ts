import { useEffect, useCallback, useRef } from 'react'
import { useRecordingStore } from '../stores/recordingStore'
import { RecordingMode, RecordingState } from '../../shared/types'

interface UseRecordingReturn {
  // State
  state: RecordingState
  mode: RecordingMode
  isRecording: boolean
  isProcessing: boolean
  duration: number
  audioLevel: number
  error: string | null
  
  // Actions
  startRecording: (mode?: RecordingMode) => Promise<void>
  stopRecording: () => Promise<void>
  toggleRecording: () => Promise<void>
  setMode: (mode: RecordingMode) => void
  clearError: () => void
  
  // Helpers
  formatDuration: (seconds: number) => string
  isPushToTalk: boolean
  isToggle: boolean
}

export function useRecording(): UseRecordingReturn {
  const {
    state,
    mode,
    isRecording,
    isProcessing,
    recordingDuration,
    audioLevel,
    error,
    startRecording: storeStartRecording,
    stopRecording: storeStopRecording,
    setMode: storeSetMode,
    updateDuration,
    setError,
    clearError: storeClearError
  } = useRecordingStore()

  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const audioLevelIntervalRef = useRef<NodeJS.Timeout | null>(null)

  /**
   * Format duration in seconds to MM:SS format
   */
  const formatDuration = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }, [])

  /**
   * Start recording
   */
  const startRecording = useCallback(async (recordingMode?: RecordingMode) => {
    try {
      // Clear any existing error
      setError(null)

      // Call IPC to start recording
      const result = await (window as any).electron.recording?.start(recordingMode)
      
      if (!result?.success) {
        setError(result?.error || 'Failed to start recording')
        return
      }

      // Update store
      storeStartRecording(recordingMode)

      // Start duration tracking
      durationIntervalRef.current = setInterval(() => {
        updateDuration((Date.now() - (window as any).electron.recording?.startTime || Date.now()) / 1000)
      }, 100)

      // Start audio level tracking
      audioLevelIntervalRef.current = setInterval(async () => {
        const levelResult = await (window as any).electron.recording?.getAudioLevel()
        if (levelResult?.success) {
          useRecordingStore.setState({ audioLevel: levelResult.data?.level || 0 })
        }
      }, 100)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start recording')
    }
  }, [storeStartRecording, updateDuration, setError])

  /**
   * Stop recording
   */
  const stopRecording = useCallback(async () => {
    try {
      // Clear intervals
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
        durationIntervalRef.current = null
      }
      if (audioLevelIntervalRef.current) {
        clearInterval(audioLevelIntervalRef.current)
        audioLevelIntervalRef.current = null
      }

      // Call IPC to stop recording
      const result = await (window as any).electron.recording?.stop()
      
      if (!result?.success) {
        setError(result?.error || 'Failed to stop recording')
        return
      }

      // Update store
      storeStopRecording()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop recording')
    }
  }, [storeStopRecording, setError])

  /**
   * Toggle recording (for toggle mode)
   */
  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      await stopRecording()
    } else {
      await startRecording(RecordingMode.TOGGLE)
    }
  }, [isRecording, startRecording, stopRecording])

  /**
   * Set recording mode
   */
  const setMode = useCallback((newMode: RecordingMode) => {
    storeSetMode(newMode)
  }, [storeSetMode])

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    storeClearError()
  }, [storeClearError])

  /**
   * Cleanup intervals on unmount
   */
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
      }
      if (audioLevelIntervalRef.current) {
        clearInterval(audioLevelIntervalRef.current)
      }
    }
  }, [])

  return {
    // State
    state,
    mode,
    isRecording,
    isProcessing,
    duration: recordingDuration,
    audioLevel,
    error,
    
    // Actions
    startRecording,
    stopRecording,
    toggleRecording,
    setMode,
    clearError,
    
    // Helpers
    formatDuration,
    isPushToTalk: mode === RecordingMode.PUSH_TO_TALK,
    isToggle: mode === RecordingMode.TOGGLE
  }
}
