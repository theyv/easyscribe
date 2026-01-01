import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { RecordingState, RecordingMode } from '../../shared/types'

interface RecordingStore {
  // State
  state: RecordingState
  mode: RecordingMode
  isRecording: boolean
  isProcessing: boolean
  recordingDuration: number
  audioLevel: number
  lastRecordingId: string | null
  error: string | null
  transcriptionResult: string | null
  insertionStatus: 'idle' | 'inserting' | 'success' | 'error'

  // Actions
  startRecording: (mode?: RecordingMode) => void
  stopRecording: () => void
  setProcessing: (processing: boolean) => void
  updateDuration: (duration: number) => void
  updateAudioLevel: (level: number) => void
  setState: (state: RecordingState) => void
  setMode: (mode: RecordingMode) => void
  setError: (error: string | null) => void
  clearError: () => void
  setLastRecordingId: (id: string | null) => void
  setTranscriptionResult: (result: string | null) => void
  setInsertionStatus: (status: 'idle' | 'inserting' | 'success' | 'error') => void
  reset: () => void
}

const initialState = {
  state: RecordingState.IDLE,
  mode: RecordingMode.PUSH_TO_TALK,
  isRecording: false,
  isProcessing: false,
  recordingDuration: 0,
  audioLevel: 0,
  lastRecordingId: null,
  error: null,
  transcriptionResult: null,
  insertionStatus: 'idle' as const
}

export const useRecordingStore = create<RecordingStore>()(
  persist(
    (set) => ({
      ...initialState,

      startRecording: (mode = RecordingMode.PUSH_TO_TALK) =>
        set((state) => ({
          state: RecordingState.RECORDING,
          mode,
          isRecording: true,
          isProcessing: false,
          recordingDuration: 0,
          error: null
        })),

      stopRecording: () =>
        set((state) => ({
          state: state.mode === RecordingMode.PUSH_TO_TALK 
            ? RecordingState.PROCESSING 
            : RecordingState.IDLE,
          isRecording: false,
          isProcessing: state.mode === RecordingMode.PUSH_TO_TALK
        })),

      setProcessing: (processing) =>
        set({ 
          isProcessing: processing,
          state: processing ? RecordingState.PROCESSING : RecordingState.DONE
        }),

      updateDuration: (duration) =>
        set({ recordingDuration: duration }),

      updateAudioLevel: (level) =>
        set({ audioLevel: level }),

      setState: (state) =>
        set({ 
          state,
          isRecording: state === RecordingState.RECORDING,
          isProcessing: state === RecordingState.PROCESSING
        }),

      setMode: (mode) =>
        set({ mode }),

      setError: (error) =>
        set({ error }),

      clearError: () =>
        set({ error: null }),

      setLastRecordingId: (id) =>
        set({ lastRecordingId: id }),

      setTranscriptionResult: (result) =>
        set({ transcriptionResult: result }),

      setInsertionStatus: (status) =>
        set({ insertionStatus: status }),

      reset: () =>
        set(initialState)
    }),
    {
      name: 'easyscribe-recording-storage',
      partialize: (state) => ({
        mode: state.mode,
        lastRecordingId: state.lastRecordingId
      })
    }
  )
)
