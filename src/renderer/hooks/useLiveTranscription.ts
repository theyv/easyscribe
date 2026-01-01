import { useCallback, useEffect } from 'react'
import { useRecordingStore } from '../stores/recordingStore'
import { RecordingMode, RecordingState } from '../../shared/types'
import { useSettings } from './useSettings'

interface UseLiveTranscriptionReturn {
  // State
  isRecording: boolean
  isProcessing: boolean
  state: RecordingState
  transcriptionResult: string | null
  insertionStatus: 'idle' | 'inserting' | 'success' | 'error'
  error: string | null

  // Actions
  startLiveTranscription: (mode?: RecordingMode) => Promise<void>
  stopLiveTranscription: () => Promise<void>
  toggleLiveTranscription: () => Promise<void>

  // Helpers
  isPushToTalk: boolean
  isToggle: boolean
}

export function useLiveTranscription(): UseLiveTranscriptionReturn {
  const {
    state,
    mode,
    isRecording,
    isProcessing,
    transcriptionResult,
    insertionStatus,
    error,
    startRecording: storeStartRecording,
    stopRecording: storeStopRecording,
    setState: storeSetState,
    setTranscriptionResult,
    setInsertionStatus,
    setError
  } = useRecordingStore()

  const { settings } = useSettings()

  /**
   * Start live transcription
   */
  const startLiveTranscription = useCallback(async (recordingMode?: RecordingMode) => {
    try {
      // Clear any existing error
      setError(null)
      setTranscriptionResult(null)
      setInsertionStatus('idle')

      // Call IPC to start recording
      const result = await (window as any).electron.recording?.start(recordingMode)

      if (!result?.success) {
        setError(result?.error || 'Failed to start recording')
        return
      }

      // Update store
      storeStartRecording(recordingMode)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start live transcription')
    }
  }, [storeStartRecording, setError, setTranscriptionResult, setInsertionStatus])

  /**
   * Stop live transcription and process the audio
   */
  const stopLiveTranscription = useCallback(async () => {
    try {
      // Set processing state
      storeSetState(RecordingState.PROCESSING)
      setInsertionStatus('idle')

      // Call IPC to stop recording
      const result = await (window as any).electron.recording?.stop()

      if (!result?.success) {
        setError(result?.error || 'Failed to stop recording')
        storeSetState(RecordingState.IDLE)
        return
      }

      // Update store
      storeStopRecording()

      // The main process will handle transcription and text insertion
      // We'll listen for events to update the UI
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop live transcription')
      storeSetState(RecordingState.IDLE)
    }
  }, [storeStopRecording, storeSetState, setError, setInsertionStatus])

  /**
   * Toggle live transcription (for toggle mode)
   */
  const toggleLiveTranscription = useCallback(async () => {
    if (isRecording) {
      await stopLiveTranscription()
    } else {
      await startLiveTranscription(RecordingMode.TOGGLE)
    }
  }, [isRecording, startLiveTranscription, stopLiveTranscription])

  /**
   * Listen for hotkey events from main process
   */
  useEffect(() => {
    const unsubscribeHotkeyPressed = (window as any).electron.recording?.onHotkeyPressed?.((hotkeyType: string) => {
      if (hotkeyType === 'pushToTalk') {
        // Start recording for push-to-talk
        startLiveTranscription(RecordingMode.PUSH_TO_TALK)
      } else if (hotkeyType === 'toggle') {
        // Toggle recording
        toggleLiveTranscription()
      }
    })

    const unsubscribeHotkeyReleased = (window as any).electron.recording?.onHotkeyReleased?.((hotkeyType: string) => {
      if (hotkeyType === 'pushToTalk') {
        // Stop recording when hotkey is released
        stopLiveTranscription()
      }
    })

    // Listen for state changes from main process
    const unsubscribeStateChanged = (window as any).electron.recording?.onStateChanged?.((newState: string) => {
      storeSetState(newState as RecordingState)
    })

    return () => {
      unsubscribeHotkeyPressed?.()
      unsubscribeHotkeyReleased?.()
      unsubscribeStateChanged?.()
    }
  }, [startLiveTranscription, stopLiveTranscription, toggleLiveTranscription, storeSetState])

  return {
    // State
    isRecording,
    isProcessing,
    state,
    transcriptionResult,
    insertionStatus,
    error,

    // Actions
    startLiveTranscription,
    stopLiveTranscription,
    toggleLiveTranscription,

    // Helpers
    isPushToTalk: mode === RecordingMode.PUSH_TO_TALK,
    isToggle: mode === RecordingMode.TOGGLE
  }
}
