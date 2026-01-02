import { useEffect, useCallback, useRef } from 'react'
import { useRecordingStore } from '../stores/recordingStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useTranscriptionStore } from '../stores/transcriptionStore'
import { RecordingMode, RecordingState, HotkeyCombination, Transcription } from '../../shared/types'

// Check if running in web mode (not Electron)
const isWebMode = () => {
  return !(window as any).electron
}

/**
 * Parse hotkey string (e.g., "CmdOrCtrl+Shift+Space") into HotkeyCombination
 */
const parseHotkeyString = (hotkeyString: string): HotkeyCombination => {
  const parts = hotkeyString.split('+').map(p => p.trim().toLowerCase())
  
  const modifiers: HotkeyCombination['modifiers'] = {
    ctrl: parts.some(p => p === 'ctrl' || p === 'cmdorctrl'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt'),
    meta: parts.includes('meta') || parts.includes('cmd')
  }
  
  // The key is the last part
  const key = parts[parts.length - 1]
  
  return { key, modifiers }
}

/**
 * Check if keyboard event matches a hotkey combination
 */
const matchesHotkey = (event: KeyboardEvent, hotkey: HotkeyCombination): boolean => {
  const eventKey = event.key.toLowerCase()
  const hotkeyKey = hotkey.key.toLowerCase()
  
  // Check key match (handle space specially)
  const keyMatch = hotkeyKey === 'space'
    ? eventKey === ' '
    : eventKey === hotkeyKey
  
  // Check modifiers
  const ctrlMatch = hotkey.modifiers.ctrl === (event.ctrlKey || event.metaKey)
  const shiftMatch = hotkey.modifiers.shift === event.shiftKey
  const altMatch = hotkey.modifiers.alt === event.altKey
  const metaMatch = hotkey.modifiers.meta === event.metaKey
  
  return keyMatch && ctrlMatch && shiftMatch && altMatch && metaMatch
}

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
    clearError: storeClearError,
    setProcessing,
    setTranscriptionResult
  } = useRecordingStore()
  
  const { settings } = useSettingsStore()
  const { addTranscription } = useTranscriptionStore()

  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const audioLevelIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const startTimeRef = useRef<number>(0)

  /**
   * Format duration in seconds to MM:SS format
   */
  const formatDuration = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }, [])

  /**
   * Transcribe audio blob using Groq API
   */
  const transcribeAudioBlob = useCallback(async (audioBlob: Blob) => {
    try {
      console.log('Starting transcription...')
      
      // Check if API key is available (from settings or environment variable)
      const apiKey = settings.groqApiKey || (import.meta.env.VITE_GROQ_API_KEY as string)
      if (!apiKey) {
        throw new Error('Groq API key is required. Please add your API key in Settings.')
      }

      // Create FormData for the API request
      const formData = new FormData()
      formData.append('file', audioBlob, 'recording.webm')
      formData.append('model', 'whisper-large-v3-turbo')
      
      // Add language if specified
      if (settings.language) {
        formData.append('language', settings.language)
      }

      // Make API request
      const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        },
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }))
        throw new Error(`Groq API error (${response.status}): ${errorData.error?.message || response.statusText}`)
      }

      const result = await response.json()
      console.log('Transcription result:', result)

      // Create transcription object
      const transcription: Transcription = {
        id: `rec-${Date.now()}`,
        deviceId: 'web-device',
        title: `Recording ${new Date().toLocaleString()}`,
        content: result.text,
        type: 'recording',
        language: result.language || settings.language,
        duration: result.duration || recordingDuration,
        synced: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // Add to store
      addTranscription(transcription)
      setTranscriptionResult(result.text)
      setProcessing(false)
      
      console.log('Transcription saved successfully')
    } catch (err) {
      console.error('Transcription failed:', err)
      setError(err instanceof Error ? err.message : 'Transcription failed')
      setProcessing(false)
    }
  }, [settings.groqApiKey, settings.language, recordingDuration, addTranscription, setTranscriptionResult, setProcessing, setError])

  /**
   * Start recording
   */
  const startRecording = useCallback(async (recordingMode?: RecordingMode) => {
    try {
      // Clear any existing error
      setError(null)

      if (isWebMode()) {
        // Web mode: Use MediaRecorder API
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
          
          // Create audio context for audio level analysis
          audioContextRef.current = new AudioContext()
          analyserRef.current = audioContextRef.current.createAnalyser()
          const source = audioContextRef.current.createMediaStreamSource(stream)
          source.connect(analyserRef.current)
          analyserRef.current.fftSize = 256
          
          // Create MediaRecorder
          mediaRecorderRef.current = new MediaRecorder(stream)
          audioChunksRef.current = []
          
          mediaRecorderRef.current.ondataavailable = (event) => {
            if (event.data.size > 0) {
              audioChunksRef.current.push(event.data)
            }
          }
          
          // Start recording
          mediaRecorderRef.current.start(100) // Collect data every 100ms
          startTimeRef.current = Date.now()
          
          // Update store
          storeStartRecording(recordingMode)
          
          // Start duration tracking
          durationIntervalRef.current = setInterval(() => {
            updateDuration((Date.now() - startTimeRef.current) / 1000)
          }, 100)
          
          // Start audio level tracking
          audioLevelIntervalRef.current = setInterval(() => {
            if (analyserRef.current) {
              const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
              analyserRef.current.getByteFrequencyData(dataArray)
              
              // Calculate average audio level
              const sum = dataArray.reduce((acc, val) => acc + val, 0)
              const average = sum / dataArray.length
              const level = Math.min(100, Math.round((average / 255) * 100))
              
              useRecordingStore.setState({ audioLevel: level })
            }
          }, 100)
          
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to access microphone')
          return
        }
      } else {
        // Electron mode: Use IPC
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
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start recording')
    }
  }, [storeStartRecording, updateDuration, setError, transcribeAudioBlob])

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

      if (isWebMode()) {
        // Web mode: Stop MediaRecorder
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop()
          
          // Stop all audio tracks
          if (mediaRecorderRef.current.stream) {
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
          }
        }
        
        // Close audio context
        if (audioContextRef.current) {
          await audioContextRef.current.close()
          audioContextRef.current = null
        }
        
        // Create audio blob from chunks
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        console.log('Recording stopped. Audio blob size:', audioBlob.size, 'bytes')
        
        // Transcribe the audio blob
        await transcribeAudioBlob(audioBlob)
        
        mediaRecorderRef.current = null
      } else {
        // Electron mode: Use IPC
        const result = await (window as any).electron.recording?.stop()
        
        if (!result?.success) {
          setError(result?.error || 'Failed to stop recording')
          return
        }
      }

      // Update store
      storeStopRecording()
      
      // Clear processing state
      setProcessing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop recording')
    }
  }, [storeStopRecording, setError, setProcessing])

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
      
      // Clean up web mode resources
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
        if (mediaRecorderRef.current.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
        }
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  /**
   * Listen for transcription complete event (Electron mode only)
   */
  useEffect(() => {
    if (isWebMode()) {
      return
    }

    const handleTranscriptionComplete = (data: any) => {
      console.log('Received transcription complete event:', data)
      
      // Create transcription object
      const transcription: Transcription = {
        id: `rec-${Date.now()}`,
        deviceId: 'electron-device',
        title: `Recording ${new Date().toLocaleString()}`,
        content: data.text || '',
        type: 'recording',
        language: data.language || 'en',
        duration: data.duration || 0,
        synced: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // Add to store
      addTranscription(transcription)
      setTranscriptionResult(data.text || '')
      setProcessing(false)
      
      console.log('Transcription saved from Electron mode')
    }

    const electron = (window as any).electron
    if (electron?.recording) {
      // Listen for transcription complete event
      const cleanup = electron.recording.onTranscriptionComplete?.(handleTranscriptionComplete)
      
      console.log('Electron mode transcription listener registered')

      return () => {
        cleanup?.()
        console.log('Electron mode transcription listener unregistered')
      }
    }
  }, [addTranscription, setTranscriptionResult, setProcessing])

  /**
   * Global hotkeys handling
   */
  useEffect(() => {
    const pushToTalkPressedRef = { current: false }

    if (!isWebMode()) {
      // Electron mode: Listen for IPC events from main process
      const handleHotkeyPressed = async (_event: Electron.IpcRendererEvent, hotkeyType: string) => {
        if (hotkeyType === 'pushToTalk') {
          if (!pushToTalkPressedRef.current && !isRecording) {
            pushToTalkPressedRef.current = true
            await startRecording(RecordingMode.PUSH_TO_TALK)
          }
        } else if (hotkeyType === 'toggle') {
          await toggleRecording()
        }
      }

      const handleHotkeyReleased = async (_event: Electron.IpcRendererEvent, hotkeyType: string) => {
        if (hotkeyType === 'pushToTalk') {
          if (pushToTalkPressedRef.current && isRecording && mode === RecordingMode.PUSH_TO_TALK) {
            pushToTalkPressedRef.current = false
            await stopRecording()
          }
        }
      }

      // Add IPC event listeners
      const electron = (window as any).electron
      if (electron?.recording) {
        const cleanupHotkeyPressed = electron.recording.onHotkeyPressed(handleHotkeyPressed)
        const cleanupHotkeyReleased = electron.recording.onHotkeyReleased(handleHotkeyReleased)
        
        console.log('Electron mode global hotkeys listeners registered')

        // Cleanup
        return () => {
          cleanupHotkeyPressed?.()
          cleanupHotkeyReleased?.()
          console.log('Electron mode global hotkeys listeners unregistered')
        }
      }
    }

    // Web mode: Use window event listeners
    const pushToTalkHotkey = parseHotkeyString(settings.pushToTalkHotkey)
    const toggleHotkey = parseHotkeyString(settings.toggleRecordHotkey)

    const handleKeyDown = async (event: KeyboardEvent) => {
      // Prevent default for our hotkeys
      if (matchesHotkey(event, pushToTalkHotkey) || matchesHotkey(event, toggleHotkey)) {
        event.preventDefault()
      }

      // Check push-to-talk hotkey
      if (matchesHotkey(event, pushToTalkHotkey)) {
        if (!pushToTalkPressedRef.current && !isRecording) {
          pushToTalkPressedRef.current = true
          await startRecording(RecordingMode.PUSH_TO_TALK)
        }
        return
      }

      // Check toggle hotkey
      if (matchesHotkey(event, toggleHotkey)) {
        await toggleRecording()
        return
      }
    }

    const handleKeyUp = async (event: KeyboardEvent) => {
      // Check push-to-talk hotkey release
      if (matchesHotkey(event, pushToTalkHotkey)) {
        if (pushToTalkPressedRef.current && isRecording && mode === RecordingMode.PUSH_TO_TALK) {
          pushToTalkPressedRef.current = false
          await stopRecording()
        }
      }
    }

    // Add event listeners
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    console.log('Web mode global hotkeys registered:', {
      pushToTalk: settings.pushToTalkHotkey,
      toggle: settings.toggleRecordHotkey
    })

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      console.log('Web mode global hotkeys unregistered')
    }
  }, [settings.pushToTalkHotkey, settings.toggleRecordHotkey, isRecording, mode, startRecording, stopRecording, toggleRecording])

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
