import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../src/shared/ipc-channels'
import { Settings } from '../src/shared/types'

contextBridge.exposeInMainWorld('electron', {
  // System
  getVersions: () => process.versions,
  getPlatform: () => process.platform,

  // Device API
  device: {
    getDeviceInfo: () => ipcRenderer.invoke(IPC_CHANNELS.DEVICE_GET_INFO),
    registerDevice: () => ipcRenderer.invoke(IPC_CHANNELS.DEVICE_REGISTER),
    updateDeviceName: (deviceName: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.DEVICE_UPDATE_NAME, deviceName),
    updateLastSeen: () => ipcRenderer.invoke(IPC_CHANNELS.DEVICE_UPDATE_LAST_SEEN)
  },

  // Settings API
  settings: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_ALL),
    get: (key: string) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET, key),
    update: (updates: Partial<Settings>) =>
      ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_UPDATE, updates),
    reset: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_RESET)
  },

  // File Transcription API
  file: {
    transcribe: (filePath: string, options?: Record<string, unknown>) =>
      ipcRenderer.invoke(IPC_CHANNELS.FILE_TRANSCRIBE, filePath, options),
    validate: (filePath: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.FILE_VALIDATE, filePath),
    process: (filePath: string, options?: Record<string, unknown>) =>
      ipcRenderer.invoke(IPC_CHANNELS.FILE_PROCESS, filePath, options),
    save: (filePath: string, content: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.FILE_SAVE, filePath, content),
    openFolder: (folderPath: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.FILE_OPEN_FOLDER, folderPath)
  },

  // Text Insertion API
  text: {
    insert: (text: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.TEXT_INSERT, text),
    type: (text: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.TEXT_TYPE, text),
    paste: (text: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.TEXT_PASTE, text),
    hasFocusedInput: () =>
      ipcRenderer.invoke(IPC_CHANNELS.TEXT_HAS_FOCUSED_INPUT)
  },

  // Notification API
  notification: {
    show: (type: string, options: Record<string, unknown>) =>
      ipcRenderer.invoke(IPC_CHANNELS.NOTIFICATION_SHOW, type, options),
    requestPermission: () =>
      ipcRenderer.invoke(IPC_CHANNELS.NOTIFICATION_REQUEST_PERMISSION)
  },

  // Tray API
  tray: {
    getState: () => ipcRenderer.invoke(IPC_CHANNELS.TRAY_GET_STATE),
    updateState: (state: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.TRAY_UPDATE_STATE, state),
    updateRecent: (transcriptions: Array<{ id: string; title: string }>) =>
      ipcRenderer.invoke(IPC_CHANNELS.TRAY_UPDATE_RECENT, transcriptions)
  },

  // Auto-Start API
  autoStart: {
    enable: (minimized: boolean) =>
      ipcRenderer.invoke(IPC_CHANNELS.AUTOSTART_ENABLE, minimized),
    disable: () =>
      ipcRenderer.invoke(IPC_CHANNELS.AUTOSTART_DISABLE),
    isEnabled: () =>
      ipcRenderer.invoke(IPC_CHANNELS.AUTOSTART_IS_ENABLED)
  },

  // Settings Persistence API
  settingsPersistence: {
    load: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_LOAD),
    save: (settings: Record<string, unknown>) =>
      ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SAVE, settings),
    sync: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SYNC),
    getSyncStatus: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_SYNC_STATUS)
  },

  // Recording API
  recording: {
    start: (mode?: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.RECORDING_START, mode),
    stop: () =>
      ipcRenderer.invoke(IPC_CHANNELS.RECORDING_STOP),
    pause: () =>
      ipcRenderer.invoke(IPC_CHANNELS.RECORDING_PAUSE),
    resume: () =>
      ipcRenderer.invoke(IPC_CHANNELS.RECORDING_RESUME),
    getState: () =>
      ipcRenderer.invoke(IPC_CHANNELS.RECORDING_GET_STATE),
    getAudioLevel: () =>
      ipcRenderer.invoke(IPC_CHANNELS.RECORDING_GET_AUDIO_LEVEL),
    getDevices: () =>
      ipcRenderer.invoke(IPC_CHANNELS.RECORDING_GET_DEVICES),
    testMicrophone: (deviceId?: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.RECORDING_TEST_MICROPHONE, deviceId),
    registerHotkeys: (hotkeys: Record<string, unknown>) =>
      ipcRenderer.invoke(IPC_CHANNELS.RECORDING_REGISTER_HOTKEYS, hotkeys),
    updateHotkeys: (hotkeys: Record<string, unknown>) =>
      ipcRenderer.invoke(IPC_CHANNELS.RECORDING_UPDATE_HOTKEYS, hotkeys),
    unregisterHotkeys: () =>
      ipcRenderer.invoke(IPC_CHANNELS.RECORDING_UNREGISTER_HOTKEYS),
    
    // Event listeners
    onStateChanged: (callback: (state: string) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, state: string) => callback(state)
      ipcRenderer.on(IPC_CHANNELS.RECORDING_STATE_CHANGED, listener)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.RECORDING_STATE_CHANGED, listener)
    },
    onDurationUpdated: (callback: (duration: number) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, duration: number) => callback(duration)
      ipcRenderer.on(IPC_CHANNELS.RECORDING_DURATION_UPDATED, listener)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.RECORDING_DURATION_UPDATED, listener)
    },
    onHotkeyPressed: (callback: (hotkeyType: string) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, hotkeyType: string) => callback(hotkeyType)
      ipcRenderer.on(IPC_CHANNELS.RECORDING_HOTKEY_PRESSED, listener)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.RECORDING_HOTKEY_PRESSED, listener)
    },
    onHotkeyReleased: (callback: (hotkeyType: string) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, hotkeyType: string) => callback(hotkeyType)
      ipcRenderer.on(IPC_CHANNELS.RECORDING_HOTKEY_RELEASED, listener)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.RECORDING_HOTKEY_RELEASED, listener)
    }
  },

  // Python API
  python: {
    transcribe: (audioPath: string, options?: { language?: string; task?: 'transcribe' | 'translate' }) =>
      ipcRenderer.invoke(IPC_CHANNELS.PYTHON_TRANSCRIBE, audioPath, options),
    getStatus: () =>
      ipcRenderer.invoke(IPC_CHANNELS.PYTHON_GET_STATUS),
    isAvailable: () =>
      ipcRenderer.invoke(IPC_CHANNELS.PYTHON_IS_AVAILABLE),
    start: () =>
      ipcRenderer.invoke(IPC_CHANNELS.PYTHON_START),
    stop: () =>
      ipcRenderer.invoke(IPC_CHANNELS.PYTHON_STOP)
  }
})
