// IPC Channel Names
// Main process -> Renderer
export const IPC_CHANNELS = {
  // Transcription
  TRANSCRIPTION_GET_ALL: 'transcription:get-all',
  TRANSCRIPTION_GET_BY_ID: 'transcription:get-by-id',
  TRANSCRIPTION_CREATE: 'transcription:create',
  TRANSCRIPTION_UPDATE: 'transcription:update',
  TRANSCRIPTION_DELETE: 'transcription:delete',
  TRANSCRIPTION_SEARCH: 'transcription:search',

  // File Transcription
  FILE_TRANSCRIBE: 'file:transcribe',
  FILE_VALIDATE: 'file:validate',
  FILE_PROCESS: 'file:process',

  // File Output
  FILE_SAVE: 'file:save',
  FILE_OPEN_FOLDER: 'file:open-folder',

  // Recording
  RECORDING_START: 'recording:start',
  RECORDING_STOP: 'recording:stop',
  RECORDING_PAUSE: 'recording:pause',
  RECORDING_RESUME: 'recording:resume',
  RECORDING_GET_STATE: 'recording:get-state',
  RECORDING_GET_AUDIO_LEVEL: 'recording:get-audio-level',
  RECORDING_GET_DEVICES: 'recording:get-devices',
  RECORDING_TEST_MICROPHONE: 'recording:test-microphone',
  RECORDING_REGISTER_HOTKEYS: 'recording:register-hotkeys',
  RECORDING_UPDATE_HOTKEYS: 'recording:update-hotkeys',
  RECORDING_UNREGISTER_HOTKEYS: 'recording:unregister-hotkeys',

  // Text Insertion
  TEXT_INSERT: 'text:insert',
  TEXT_TYPE: 'text:type',
  TEXT_PASTE: 'text:paste',
  TEXT_HAS_FOCUSED_INPUT: 'text:has-focused-input',

  // Notifications
  NOTIFICATION_SHOW: 'notification:show',
  NOTIFICATION_REQUEST_PERMISSION: 'notification:request-permission',

  // Audio
  AUDIO_GET_DEVICES: 'audio:get-devices',
  AUDIO_SET_DEVICE: 'audio:set-device',

  // Events (Main -> Renderer)
  RECORDING_STATE_CHANGED: 'recording:state-changed',
  RECORDING_DURATION_UPDATED: 'recording:duration-updated',
  RECORDING_AUDIO_LEVEL_UPDATED: 'recording:audio-level-updated',
  RECORDING_HOTKEY_PRESSED: 'recording:hotkey-pressed',
  RECORDING_HOTKEY_RELEASED: 'recording:hotkey-released',

  // Folders
  FOLDER_GET_ALL: 'folder:get-all',
  FOLDER_CREATE: 'folder:create',
  FOLDER_UPDATE: 'folder:update',
  FOLDER_DELETE: 'folder:delete',

  // Tags
  TAG_GET_ALL: 'tag:get-all',
  TAG_CREATE: 'tag:create',
  TAG_UPDATE: 'tag:update',
  TAG_DELETE: 'tag:delete',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_GET_ALL: 'settings:get-all',
  SETTINGS_UPDATE: 'settings:update',
  SETTINGS_RESET: 'settings:reset',

  // Sync
  SYNC_START: 'sync:start',
  SYNC_GET_STATUS: 'sync:get-status',

  // Cloud
  CLOUD_LOGIN: 'cloud:login',
  CLOUD_LOGOUT: 'cloud:logout',
  CLOUD_GET_USER: 'cloud:get-user',

  // Device
  DEVICE_GET_INFO: 'device:get-info',
  DEVICE_REGISTER: 'device:register',
  DEVICE_UPDATE_NAME: 'device:update-name',
  DEVICE_UPDATE_LAST_SEEN: 'device:update-last-seen',

  // System
  SYSTEM_GET_VERSION: 'system:get-version',
  SYSTEM_GET_PLATFORM: 'system:get-platform',
  SYSTEM_GET_DEVICE_ID: 'system:get-device-id',
  SYSTEM_QUIT: 'system:quit',
  SYSTEM_MINIMIZE: 'system:minimize',
  SYSTEM_MAXIMIZE: 'system:maximize',

  // Tray
  TRAY_GET_STATE: 'tray:get-state',
  TRAY_UPDATE_STATE: 'tray:update-state',
  TRAY_UPDATE_RECENT: 'tray:update-recent',

  // Auto-Start
  AUTOSTART_ENABLE: 'autostart:enable',
  AUTOSTART_DISABLE: 'autostart:disable',
  AUTOSTART_IS_ENABLED: 'autostart:is-enabled',

  // Settings Persistence
  SETTINGS_LOAD: 'settings:load',
  SETTINGS_SAVE: 'settings:save',
  SETTINGS_SYNC: 'settings:sync',
  SETTINGS_GET_SYNC_STATUS: 'settings:get-sync-status',

  // Python
  PYTHON_TRANSCRIBE: 'python:transcribe',
  PYTHON_GET_STATUS: 'python:get-status',
  PYTHON_IS_AVAILABLE: 'python:is-available',
  PYTHON_START: 'python:start',
  PYTHON_STOP: 'python:stop',
  PYTHON_DOWNLOAD_MODEL: 'python:download-model'
} as const

export type IpcChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS]
