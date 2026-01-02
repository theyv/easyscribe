import { useEffect, useCallback, useRef } from 'react'
import { useDeviceStore } from '../stores/deviceStore'
import { Device } from '../../shared/types'

// Refresh interval in milliseconds (5 minutes)
const REFRESH_INTERVAL = 5 * 60 * 1000

// Local storage keys for web mode
const DEVICE_ID_KEY = 'easyscribe_device_id'
const DEVICE_NAME_KEY = 'easyscribe_device_name'
const DEVICE_CREATED_AT_KEY = 'easyscribe_device_created_at'

interface UseDeviceReturn {
  deviceInfo: Device | null
  deviceName: string
  deviceId: string
  platform: string
  isLoading: boolean
  error: string | null
  lastSync: string | null
  refreshDevice: () => Promise<void>
  updateDeviceName: (name: string) => Promise<void>
}

// Check if running in Electron mode
function isElectronMode(): boolean {
  return typeof window !== 'undefined' && !!(window as any).electron?.device
}

// Generate a UUID v4
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// Generate a unique device identifier (for device_identifier field)
function generateDeviceIdentifier(): string {
  return `web_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
}

// Check if a string is a valid UUID v4
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

// Get or create device ID from localStorage
function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'unknown'
  
  let deviceId = localStorage.getItem(DEVICE_ID_KEY)
  
  // If no device ID or the stored ID is not a valid UUID, generate a new one
  if (!deviceId || !isValidUUID(deviceId)) {
    deviceId = generateUUID()
    localStorage.setItem(DEVICE_ID_KEY, deviceId)
  }
  return deviceId
}

// Get or create device identifier from localStorage
function getOrCreateDeviceIdentifier(): string {
  if (typeof window === 'undefined') return 'unknown'
  
  let deviceIdentifier = localStorage.getItem('easyscribe_device_identifier')
  if (!deviceIdentifier) {
    deviceIdentifier = generateDeviceIdentifier()
    localStorage.setItem('easyscribe_device_identifier', deviceIdentifier)
  }
  return deviceIdentifier
}

// Get device name from localStorage
function getDeviceName(): string {
  if (typeof window === 'undefined') return 'Web Device'
  
  return localStorage.getItem(DEVICE_NAME_KEY) || 'Web Device'
}

// Get or create device creation timestamp
function getDeviceCreatedAt(): string {
  if (typeof window === 'undefined') return new Date().toISOString()
  
  let createdAt = localStorage.getItem(DEVICE_CREATED_AT_KEY)
  if (!createdAt) {
    createdAt = new Date().toISOString()
    localStorage.setItem(DEVICE_CREATED_AT_KEY, createdAt)
  }
  return createdAt
}

// Parse user agent to get device type and OS
function parseUserAgent(): { deviceType: string; osVersion: string } {
  if (typeof navigator === 'undefined') {
    return { deviceType: 'web', osVersion: 'unknown' }
  }

  const ua = navigator.userAgent
  let deviceType = 'web'
  let osVersion = 'unknown'

  // Detect OS
  if (ua.includes('Windows')) {
    osVersion = 'Windows'
    deviceType = 'desktop'
  } else if (ua.includes('Mac OS X')) {
    osVersion = 'macOS'
    deviceType = 'desktop'
  } else if (ua.includes('Linux')) {
    osVersion = 'Linux'
    deviceType = 'desktop'
  } else if (ua.includes('Android')) {
    const match = ua.match(/Android\s([0-9\.]+)/)
    osVersion = match ? `Android ${match[1]}` : 'Android'
    deviceType = 'mobile'
  } else if (ua.includes('iPhone') || ua.includes('iPad')) {
    const match = ua.match(/OS\s([0-9_]+)/)
    osVersion = match ? `iOS ${match[1].replace(/_/g, '.')}` : 'iOS'
    deviceType = ua.includes('iPad') ? 'tablet' : 'mobile'
  }

  return { deviceType, osVersion }
}

// Create device info for web mode
function createWebDeviceInfo(): Device {
  const deviceId = getOrCreateDeviceId()
  const deviceIdentifier = getOrCreateDeviceIdentifier()
  const deviceName = getDeviceName()
  const createdAt = getDeviceCreatedAt()
  const { deviceType, osVersion } = parseUserAgent()
  const now = new Date().toISOString()

  return {
    id: deviceId,
    deviceIdentifier: deviceIdentifier,
    deviceName,
    deviceType,
    osVersion,
    appVersion: 'web',
    lastSeenAt: now,
    created_at: createdAt,
    updated_at: now
  }
}

export function useDevice(): UseDeviceReturn {
  const {
    deviceInfo,
    isLoading,
    error,
    lastSync,
    setDeviceInfo,
    updateDeviceName: updateStoreDeviceName,
    setLoading,
    setError,
    setLastSync
  } = useDeviceStore()

  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch device info from main process (Electron) or localStorage (web)
  const fetchDeviceInfo = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Web mode: use localStorage and browser APIs
      if (!isElectronMode()) {
        const webDeviceInfo = createWebDeviceInfo()
        setDeviceInfo(webDeviceInfo)
        setLastSync(new Date().toISOString())
        return
      }

      // Electron mode: use Electron API
      const electron = (window as any).electron
      if (!electron?.device) {
        throw new Error('Device API not available')
      }

      const info = await electron.device.getDeviceInfo()
      if (info) {
        setDeviceInfo(info)
        setLastSync(new Date().toISOString())
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch device info'
      setError(errorMessage)
      console.error('Error fetching device info:', err)
    } finally {
      setLoading(false)
    }
  }, [setDeviceInfo, setLoading, setError, setLastSync])

  // Update device name
  const updateDeviceName = useCallback(async (name: string) => {
    try {
      setLoading(true)
      setError(null)

      // Web mode: save to localStorage
      if (!isElectronMode()) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(DEVICE_NAME_KEY, name)
        }
        
        // Update device info with new name
        const currentInfo = deviceInfo || createWebDeviceInfo()
        const updatedInfo: Device = {
          ...currentInfo,
          deviceName: name,
          updated_at: new Date().toISOString()
        }
        setDeviceInfo(updatedInfo)
        updateStoreDeviceName(name)
        setLastSync(new Date().toISOString())
        return
      }

      // Electron mode: use Electron API
      const electron = (window as any).electron
      if (!electron?.device) {
        throw new Error('Device API not available')
      }

      const updatedInfo = await electron.device.updateDeviceName(name)
      if (updatedInfo) {
        setDeviceInfo(updatedInfo)
        updateStoreDeviceName(name)
        setLastSync(new Date().toISOString())
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update device name'
      setError(errorMessage)
      console.error('Error updating device name:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [deviceInfo, setDeviceInfo, updateStoreDeviceName, setLoading, setError, setLastSync])

  // Refresh device info
  const refreshDevice = useCallback(async () => {
    await fetchDeviceInfo()
  }, [fetchDeviceInfo])

  // Fetch device info on mount and set up periodic refresh
  useEffect(() => {
    fetchDeviceInfo()

    // Set up periodic refresh
    refreshIntervalRef.current = setInterval(() => {
      fetchDeviceInfo()
    }, REFRESH_INTERVAL)

    // Cleanup interval on unmount
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }
  }, [fetchDeviceInfo])

  // Extract commonly used properties
  const deviceName = deviceInfo?.deviceName || 'Unknown Device'
  const deviceId = deviceInfo?.id || deviceInfo?.deviceIdentifier || 'Unknown'
  const platform = deviceInfo?.deviceType || 'Unknown'

  return {
    deviceInfo,
    deviceName,
    deviceId,
    platform,
    isLoading,
    error,
    lastSync,
    refreshDevice,
    updateDeviceName
  }
}
