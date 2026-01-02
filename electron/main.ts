import { app, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'path'
import fs from 'fs/promises'
import { getDeviceInfo, registerDevice, updateLastSeen, updateDeviceName } from './modules/deviceManager'
import { transcribeFile } from './modules/groqClient'
import { validateFile, processFile } from './modules/fileProcessor'
import { globalShortcuts } from './modules/globalShortcuts'
import { audioCapture } from './modules/audioCapture'
import { insertText, typeText, pasteText, hasFocusedInput, copyToClipboard } from './modules/textInsertion'
import {
  showNotification,
  requestPermission,
  showTranscriptionCompleteNotification,
  showTextInsertedNotification,
  showErrorNotification
} from './modules/notificationManager'
import { createTray, updateTrayState, updateRecentTranscriptions, destroyTray, TrayState } from './modules/tray'
import { enableAutoStart, disableAutoStart, isAutoStartEnabled } from './modules/autoStart'
import { loadSettings, saveSettings, syncSettings, getSyncStatus } from './modules/settingsPersistence'
import {
  startPythonProcess,
  stopPythonProcess,
  transcribeWithPython,
  getPythonStatus,
  isPythonAvailable
} from './modules/pythonBridge'
import { IPC_CHANNELS } from '../src/shared/ipc-channels'
import { DEFAULT_SETTINGS } from '../src/shared/defaults'
import { RecordingMode } from '../src/shared/types'

let mainWindow: BrowserWindow | null = null
let lastSeenInterval: NodeJS.Timeout | null = null

const isDev = process.env.NODE_ENV === 'development'

// Global error handlers for main process
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception in main process:', error)
  // Log error to file for debugging
  const errorLog = `[${new Date().toISOString()}] Uncaught Exception: ${error.message}\n${error.stack}\n\n`
  fs.appendFile(path.join(app.getPath('userData'), 'error.log'), errorLog).catch(() => {
    // Ignore file write errors
  })
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection in main process:', reason, 'at:', promise)
  // Log error to file for debugging
  const errorLog = `[${new Date().toISOString()}] Unhandled Rejection: ${reason}\n\n`
  fs.appendFile(path.join(app.getPath('userData'), 'error.log'), errorLog).catch(() => {
    // Ignore file write errors
  })
})

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    show: false
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

/**
 * Initialize device manager
 */
async function initializeDeviceManager() {
  try {
    // Register device on app start
    await registerDevice()
    
    // Update last_seen periodically (every 5 minutes)
    lastSeenInterval = setInterval(async () => {
      await updateLastSeen()
    }, 5 * 60 * 1000)
    
    console.log('Device manager initialized successfully')
  } catch (error) {
    console.error('Failed to initialize device manager:', error)
  }
}

/**
 * Setup IPC handlers for device operations
 */
function setupDeviceIpcHandlers() {
  // Get device info
  ipcMain.handle(IPC_CHANNELS.DEVICE_GET_INFO, async () => {
    try {
      const deviceInfo = getDeviceInfo()
      return { success: true, data: deviceInfo }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get device info'
      }
    }
  })

  // Register device
  ipcMain.handle(IPC_CHANNELS.DEVICE_REGISTER, async () => {
    try {
      const deviceInfo = await registerDevice()
      return { success: true, data: deviceInfo }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to register device'
      }
    }
  })

  // Update device name
  ipcMain.handle(IPC_CHANNELS.DEVICE_UPDATE_NAME, async (_event, deviceName: string) => {
    try {
      const deviceInfo = await updateDeviceName(deviceName)
      return { success: true, data: deviceInfo }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update device name'
      }
    }
  })

  // Update last seen
  ipcMain.handle(IPC_CHANNELS.DEVICE_UPDATE_LAST_SEEN, async () => {
    try {
      await updateLastSeen()
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update last seen'
      }
    }
  })
}

/**
 * Setup IPC handlers for settings operations
 */
function setupSettingsIpcHandlers() {
  // Get all settings
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_ALL, async () => {
    try {
      const settings = await loadSettings()
      return { success: true, data: settings }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get settings'
      }
    }
  })

  // Get single setting
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async (_event, key: string) => {
    try {
      const settings = await loadSettings()
      const value = settings[key as keyof typeof settings]
      return { success: true, data: value }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get setting'
      }
    }
  })

  // Update settings
  ipcMain.handle(IPC_CHANNELS.SETTINGS_UPDATE, async (_event, updates: Record<string, unknown>) => {
    try {
      const result = await saveSettings(updates)
      console.log('Settings updated:', updates)
      return { success: result.success, data: updates }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update settings'
      }
    }
  })

  // Reset settings
  ipcMain.handle(IPC_CHANNELS.SETTINGS_RESET, async () => {
    try {
      const result = await resetSettings()
      return { success: result.success, data: DEFAULT_SETTINGS }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reset settings'
      }
    }
  })
}

/**
 * Setup IPC handlers for file transcription
 */
function setupFileTranscriptionIpcHandlers() {
  // Transcribe a file
  ipcMain.handle(IPC_CHANNELS.FILE_TRANSCRIBE, async (_event, filePath: string, options: Record<string, unknown> = {}) => {
    try {
      // Get API key from settings (TODO: Load from database)
      const groqApiKey = process.env.GROQ_API_KEY || ''

      if (!groqApiKey) {
        return {
          success: false,
          error: 'Groq API key not configured. Please add it in settings.'
        }
      }

      // Process file first (extract audio from video, convert to WAV)
      const processedFile = await processFile(filePath, {
        sampleRate: 16000,
        channels: 1
      })

      // Transcribe using Groq API
      const result = await transcribeFile(processedFile.outputPath, groqApiKey, {
        language: options.language as string | undefined,
        prompt: options.prompt as string | undefined,
        responseFormat: options.responseFormat as any,
        temperature: options.temperature as number | undefined,
        timestampGranularities: options.timestampGranularities as ('word' | 'segment')[] | undefined
      })

      return {
        success: true,
        data: {
          text: result.text,
          language: result.language,
          duration: result.duration,
          segments: result.segments,
          words: result.words,
          processedPath: processedFile.outputPath,
          originalPath: filePath
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to transcribe file'
      }
    }
  })

  // Validate a file
  ipcMain.handle(IPC_CHANNELS.FILE_VALIDATE, async (_event, filePath: string) => {
    try {
      const result = validateFile(filePath)
      return {
        success: true,
        data: result
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to validate file'
      }
    }
  })

  // Process a file for transcription
  ipcMain.handle(IPC_CHANNELS.FILE_PROCESS, async (_event, filePath: string, options: Record<string, unknown> = {}) => {
    try {
      const result = await processFile(filePath, {
        sampleRate: options.sampleRate as number,
        channels: options.channels as number
      })

      return {
        success: true,
        data: result
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process file'
      }
    }
  })
}

/**
 * Setup IPC handlers for file output operations
 */
function setupFileOutputIpcHandlers() {
  // Save content to file
  ipcMain.handle(IPC_CHANNELS.FILE_SAVE, async (_event, filePath: string, content: string) => {
    try {
      // Ensure directory exists
      const dir = path.dirname(filePath)
      await fs.mkdir(dir, { recursive: true })

      // Write content to file
      await fs.writeFile(filePath, content, 'utf-8')

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save file'
      }
    }
  })

  // Open folder in file explorer
  ipcMain.handle(IPC_CHANNELS.FILE_OPEN_FOLDER, async (_event, folderPath: string) => {
    try {
      await shell.openPath(folderPath)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to open folder'
      }
    }
  })
}

/**
 * Setup IPC handlers for recording operations
 */
function setupRecordingIpcHandlers() {
  // Start recording
  ipcMain.handle(IPC_CHANNELS.RECORDING_START, async (_event, mode?: string) => {
    try {
      const result = await audioCapture.startRecording()

      if (result.success) {
        // Update tray state
        updateTrayState('recording')
        // Send state change event
        mainWindow?.webContents.send(IPC_CHANNELS.RECORDING_STATE_CHANGED, 'recording')
      }

      return result
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start recording'
      }
    }
  })

  // Stop recording
  ipcMain.handle(IPC_CHANNELS.RECORDING_STOP, async () => {
    try {
      const result = audioCapture.stopRecording()

      if (result.success && result.data?.audioBuffer) {
        // Update tray state
        updateTrayState('processing')
        // Send state change event
        mainWindow?.webContents.send(IPC_CHANNELS.RECORDING_STATE_CHANGED, 'processing')

        // Transcribe the audio buffer
        try {
          // Get API key from settings (TODO: Load from database)
          const groqApiKey = process.env.GROQ_API_KEY || ''

          if (!groqApiKey) {
            showErrorNotification('Groq API key not configured. Please add it in settings.')
            mainWindow?.webContents.send(IPC_CHANNELS.RECORDING_STATE_CHANGED, 'error')
            return {
              success: false,
              error: 'Groq API key not configured. Please add it in settings.'
            }
          }

          // Save buffer to temporary file
          const tempDir = app.getPath('temp')
          const tempFilePath = path.join(tempDir, `recording-${Date.now()}.wav`)
          await fs.writeFile(tempFilePath, result.data.audioBuffer)

          try {
            // Transcribe using Groq API
            const transcriptionResult = await transcribeFile(tempFilePath, groqApiKey, {
              language: 'en' // TODO: Get from settings
            })

            // Insert text at cursor position
            const insertResult = await insertText(transcriptionResult.text)

            if (insertResult.success) {
              // Show text inserted notification
              showTextInsertedNotification()

              // Send transcription result to renderer
              mainWindow?.webContents.send('recording:transcription-complete', {
                text: transcriptionResult.text,
                language: transcriptionResult.language,
                duration: transcriptionResult.duration,
                insertionMethod: insertResult.method
              })

              // Update tray state back to idle
              updateTrayState('idle')
              mainWindow?.webContents.send(IPC_CHANNELS.RECORDING_STATE_CHANGED, 'done')
            } else {
              // Copy to clipboard if insertion failed
              copyToClipboard(transcriptionResult.text)
              showErrorNotification(insertResult.error || 'Failed to insert text. Text copied to clipboard.')

              // Send transcription result to renderer
              mainWindow?.webContents.send('recording:transcription-complete', {
                text: transcriptionResult.text,
                language: transcriptionResult.language,
                duration: transcriptionResult.duration,
                insertionMethod: 'clipboard',
                error: insertResult.error
              })

              mainWindow?.webContents.send(IPC_CHANNELS.RECORDING_STATE_CHANGED, 'done')
            }

            return {
              success: true,
              data: {
                text: transcriptionResult.text,
                language: transcriptionResult.language,
                duration: transcriptionResult.duration,
                insertionMethod: insertResult.method
              }
            }
          } finally {
            // Clean up temporary file
            try {
              await fs.unlink(tempFilePath)
            } catch {
              // Ignore cleanup errors
            }
          }
        } catch (transcriptionError) {
          const errorMessage = transcriptionError instanceof Error ? transcriptionError.message : 'Failed to transcribe audio'
          showErrorNotification(errorMessage)
          // Update tray state to error
          updateTrayState('error')
          mainWindow?.webContents.send(IPC_CHANNELS.RECORDING_STATE_CHANGED, 'error')
          return {
            success: false,
            error: errorMessage
          }
        }
      }

      return result
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to stop recording'
      }
    }
  })

  // Pause recording
  ipcMain.handle(IPC_CHANNELS.RECORDING_PAUSE, async () => {
    try {
      // TODO: Implement pause functionality
      mainWindow?.webContents.send(IPC_CHANNELS.RECORDING_STATE_CHANGED, 'paused')
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to pause recording'
      }
    }
  })

  // Resume recording
  ipcMain.handle(IPC_CHANNELS.RECORDING_RESUME, async () => {
    try {
      // TODO: Implement resume functionality
      mainWindow?.webContents.send(IPC_CHANNELS.RECORDING_STATE_CHANGED, 'recording')
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to resume recording'
      }
    }
  })

  // Get recording state
  ipcMain.handle(IPC_CHANNELS.RECORDING_GET_STATE, async () => {
    try {
      const isRecording = audioCapture.isRecordingNow()
      const duration = audioCapture.getDuration()
      
      return {
        success: true,
        data: {
          isRecording,
          duration
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get recording state'
      }
    }
  })

  // Get audio level
  ipcMain.handle(IPC_CHANNELS.RECORDING_GET_AUDIO_LEVEL, async () => {
    try {
      // TODO: Implement actual audio level monitoring
      return {
        success: true,
        data: { level: Math.floor(Math.random() * 100) }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get audio level'
      }
    }
  })

  // Get audio devices
  ipcMain.handle(IPC_CHANNELS.RECORDING_GET_DEVICES, async () => {
    return await audioCapture.getAudioDevices()
  })

  // Test microphone
  ipcMain.handle(IPC_CHANNELS.RECORDING_TEST_MICROPHONE, async (_event, deviceId?: string) => {
    return await audioCapture.testMicrophone(deviceId)
  })

  // Register hotkeys
  ipcMain.handle(IPC_CHANNELS.RECORDING_REGISTER_HOTKEYS, async (_event, hotkeys: Record<string, unknown>) => {
    try {
      const success = globalShortcuts.registerHotkeys(hotkeys as any)
      return { success }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to register hotkeys'
      }
    }
  })

  // Update hotkeys
  ipcMain.handle(IPC_CHANNELS.RECORDING_UPDATE_HOTKEYS, async (_event, hotkeys: Record<string, unknown>) => {
    try {
      const success = globalShortcuts.updateHotkeys(hotkeys as any)
      return { success }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update hotkeys'
      }
    }
  })

  // Unregister hotkeys
  ipcMain.handle(IPC_CHANNELS.RECORDING_UNREGISTER_HOTKEYS, async () => {
    try {
      globalShortcuts.unregisterHotkeys()
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unregister hotkeys'
      }
    }
  })
}

/**
 * Setup IPC handlers for text insertion operations
 */
function setupTextInsertionIpcHandlers() {
  // Insert text at cursor position
  ipcMain.handle(IPC_CHANNELS.TEXT_INSERT, async (_event, text: string) => {
    try {
      const result = await insertText(text)
      return result
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to insert text'
      }
    }
  })

  // Type text character by character
  ipcMain.handle(IPC_CHANNELS.TEXT_TYPE, async (_event, text: string) => {
    try {
      const result = typeText(text)
      return result
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to type text'
      }
    }
  })

  // Paste text using clipboard
  ipcMain.handle(IPC_CHANNELS.TEXT_PASTE, async (_event, text: string) => {
    try {
      const result = await pasteText(text)
      return result
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to paste text'
      }
    }
  })

  // Check if there's a focused text input
  ipcMain.handle(IPC_CHANNELS.TEXT_HAS_FOCUSED_INPUT, async () => {
    try {
      const hasInput = hasFocusedInput()
      return { success: true, data: hasInput }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check focused input'
      }
    }
  })
}

/**
 * Setup IPC handlers for notification operations
 */
function setupNotificationIpcHandlers() {
  // Show notification
  ipcMain.handle(IPC_CHANNELS.NOTIFICATION_SHOW, async (_event, type: string, options: Record<string, unknown>) => {
    try {
      const result = showNotification(type as any, options as any)
      return result
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to show notification'
      }
    }
  })

  // Request notification permission
  ipcMain.handle(IPC_CHANNELS.NOTIFICATION_REQUEST_PERMISSION, async () => {
    try {
      const granted = await requestPermission()
      return { success: true, data: granted }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to request permission'
      }
    }
  })
}

/**
 * Setup IPC handlers for tray operations
 */
function setupTrayIpcHandlers() {
  // Get tray state
  ipcMain.handle(IPC_CHANNELS.TRAY_GET_STATE, async () => {
    try {
      return { success: true, data: { state: 'idle' } }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get tray state'
      }
    }
  })

  // Update tray state
  ipcMain.handle(IPC_CHANNELS.TRAY_UPDATE_STATE, async (_event, state: TrayState) => {
    try {
      updateTrayState(state)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update tray state'
      }
    }
  })

  // Update recent transcriptions
  ipcMain.handle(IPC_CHANNELS.TRAY_UPDATE_RECENT, async (_event, transcriptions: Array<{ id: string; title: string }>) => {
    try {
      updateRecentTranscriptions(transcriptions)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update recent transcriptions'
      }
    }
  })
}

/**
 * Setup IPC handlers for auto-start operations
 */
function setupAutoStartIpcHandlers() {
  // Enable auto-start
  ipcMain.handle(IPC_CHANNELS.AUTOSTART_ENABLE, async (_event, minimized: boolean) => {
    try {
      await enableAutoStart(minimized)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to enable auto-start'
      }
    }
  })

  // Disable auto-start
  ipcMain.handle(IPC_CHANNELS.AUTOSTART_DISABLE, async () => {
    try {
      await disableAutoStart()
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to disable auto-start'
      }
    }
  })

  // Check if auto-start is enabled
  ipcMain.handle(IPC_CHANNELS.AUTOSTART_IS_ENABLED, async () => {
    try {
      const enabled = await isAutoStartEnabled()
      return { success: true, data: { enabled } }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check auto-start status'
      }
    }
  })
}

/**
 * Setup IPC handlers for settings persistence operations
 */
function setupSettingsPersistenceIpcHandlers() {
  // Load settings
  ipcMain.handle(IPC_CHANNELS.SETTINGS_LOAD, async () => {
    try {
      const settings = await loadSettings()
      return { success: true, data: settings }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load settings'
      }
    }
  })

  // Save settings
  ipcMain.handle(IPC_CHANNELS.SETTINGS_SAVE, async (_event, settings: Record<string, unknown>) => {
    try {
      const result = await saveSettings(settings)
      return { success: result.success, data: result }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save settings'
      }
    }
  })

  // Sync settings
  ipcMain.handle(IPC_CHANNELS.SETTINGS_SYNC, async () => {
    try {
      const result = await syncSettings()
      return { success: result.success, data: result }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync settings'
      }
    }
  })

  // Get sync status
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_SYNC_STATUS, async () => {
    try {
      const status = getSyncStatus()
      return { success: true, data: status }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get sync status'
      }
    }
  })
}

/**
 * Setup IPC handlers for Python operations
 */
function setupPythonIpcHandlers() {
  // Transcribe with Python
  ipcMain.handle(IPC_CHANNELS.PYTHON_TRANSCRIBE, async (_event, audioPath: string, options: { language?: string; task?: 'transcribe' | 'translate' } = {}) => {
    try {
      const result = await transcribeWithPython(audioPath, options)
      return {
        success: true,
        data: result
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to transcribe with Python'
      }
    }
  })

  // Get Python status
  ipcMain.handle(IPC_CHANNELS.PYTHON_GET_STATUS, async () => {
    try {
      const status = getPythonStatus()
      return {
        success: true,
        data: status
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get Python status'
      }
    }
  })

  // Check if Python is available
  ipcMain.handle(IPC_CHANNELS.PYTHON_IS_AVAILABLE, async () => {
    try {
      const available = isPythonAvailable()
      return {
        success: true,
        data: { available }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check Python availability'
      }
    }
  })

  // Start Python process
  ipcMain.handle(IPC_CHANNELS.PYTHON_START, async () => {
    try {
      const started = await startPythonProcess()
      return {
        success: true,
        data: { started }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start Python process'
      }
    }
  })

  // Stop Python process
  ipcMain.handle(IPC_CHANNELS.PYTHON_STOP, async () => {
    try {
      await stopPythonProcess()
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to stop Python process'
      }
    }
  })
}

/**
 * Initialize system tray
 */
function initializeSystemTray() {
  try {
    console.log('Initializing system tray...')
    createTray({
      onOpenInterface: () => {
        if (mainWindow) {
          if (mainWindow.isMinimized()) {
            mainWindow.restore()
          }
          mainWindow.show()
          mainWindow.focus()
        }
      },
      onStartRecording: async () => {
        const isRecording = audioCapture.isRecordingNow()
        if (isRecording) {
          const result = audioCapture.stopRecording()
          if (result.success) {
            updateTrayState('processing')
            mainWindow?.webContents.send(IPC_CHANNELS.RECORDING_STATE_CHANGED, 'processing')
          }
        } else {
          const result = await audioCapture.startRecording()
          if (result.success) {
            updateTrayState('recording')
            mainWindow?.webContents.send(IPC_CHANNELS.RECORDING_STATE_CHANGED, 'recording')
          }
        }
      },
      onOpenSettings: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
          // Navigate to settings page
          mainWindow.webContents.send('navigate-to', '/settings')
        }
      },
      onQuit: () => {
        app.quit()
      }
    })
    console.log('System tray initialized successfully')
  } catch (error) {
    console.error('Failed to initialize system tray:', error)
    // Continue app execution even if tray fails
  }
}

/**
 * Initialize auto-start based on settings
 */
async function initializeAutoStart() {
  try {
    const settings = await loadSettings()
    if (settings.autoStart) {
      await enableAutoStart(settings.startMinimized)
      console.log('Auto-start enabled')
    }
  } catch (error) {
    console.error('Failed to initialize auto-start:', error)
  }
}

/**
 * Initialize global shortcuts
 */
function initializeGlobalShortcuts() {
  try {
    // Register default hotkeys
    const defaultHotkeys = {
      pushToTalk: {
        key: 'space',
        modifiers: { ctrl: true, meta: true } // Ctrl+Space or Cmd+Space
      },
      toggle: {
        key: 'space',
        modifiers: { ctrl: true, shift: true, meta: true } // Ctrl+Shift+Space or Cmd+Shift+Space
      }
    }
    
    globalShortcuts.registerHotkeys(defaultHotkeys)
    
    // Listen for hotkey events
    globalShortcuts.on('hotkey-pressed', (hotkeyType: string) => {
      if (!mainWindow) return
      
      mainWindow.webContents.send(IPC_CHANNELS.RECORDING_HOTKEY_PRESSED, hotkeyType)
      
      if (hotkeyType === 'pushToTalk') {
        // Start recording
        audioCapture.startRecording()
        mainWindow.webContents.send(IPC_CHANNELS.RECORDING_STATE_CHANGED, 'recording')
      } else if (hotkeyType === 'toggle') {
        // Toggle recording
        const isRecording = audioCapture.isRecordingNow()
        if (isRecording) {
          audioCapture.stopRecording()
          mainWindow.webContents.send(IPC_CHANNELS.RECORDING_STATE_CHANGED, 'processing')
        } else {
          audioCapture.startRecording()
          mainWindow.webContents.send(IPC_CHANNELS.RECORDING_STATE_CHANGED, 'recording')
        }
      }
    })
    
    globalShortcuts.on('hotkey-released', (hotkeyType: string) => {
      if (!mainWindow) return
      
      mainWindow.webContents.send(IPC_CHANNELS.RECORDING_HOTKEY_RELEASED, hotkeyType)
      
      if (hotkeyType === 'pushToTalk') {
        // Stop recording on release
        audioCapture.stopRecording()
        mainWindow.webContents.send(IPC_CHANNELS.RECORDING_STATE_CHANGED, 'processing')
      }
    })
    
    console.log('Global shortcuts initialized')
  } catch (error) {
    console.error('Failed to initialize global shortcuts:', error)
  }
}

app.whenReady().then(async () => {
  createWindow()

  // Initialize device manager
  initializeDeviceManager()

  // Initialize system tray
  initializeSystemTray()

  // Initialize auto-start
  await initializeAutoStart()

  // Initialize global shortcuts
  initializeGlobalShortcuts()

  // Setup IPC handlers
  setupDeviceIpcHandlers()
  setupSettingsIpcHandlers()
  setupFileTranscriptionIpcHandlers()
  setupFileOutputIpcHandlers()
  setupRecordingIpcHandlers()
  setupTextInsertionIpcHandlers()
  setupNotificationIpcHandlers()
  setupTrayIpcHandlers()
  setupAutoStartIpcHandlers()
  setupSettingsPersistenceIpcHandlers()
  setupPythonIpcHandlers()

  // Start Python process (if available)
  if (isPythonAvailable()) {
    startPythonProcess().catch((error) => {
      console.error('Failed to start Python process:', error)
    })
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  // Cleanup interval before quitting
  if (lastSeenInterval) {
    clearInterval(lastSeenInterval)
    lastSeenInterval = null
  }

  // Unregister global shortcuts
  globalShortcuts.unregisterHotkeys()

  // Destroy system tray
  destroyTray()

  // Stop Python process
  stopPythonProcess().catch((error) => {
    console.error('Error stopping Python process:', error)
  })
})
