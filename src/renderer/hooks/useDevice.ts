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

// Generate a unique device ID
function generateDeviceId(): string {
  return `web_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
}

// Get or create device ID from localStorage
function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'unknown'
  
  let deviceId = localStorage.getItem(DEVICE_ID_KEY)
  if (!deviceId) {
    deviceId = generateDeviceId()
    localStorage.setItem(DEVICE_ID_KEY, deviceId)
  }
  return deviceId
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
  const deviceName = getDeviceName()
  const createdAt = getDeviceCreatedAt()
  const { deviceType, osVersion } = parseUserAgent()
  const now = new Date().toISOString()

  return {
    id: deviceId,
    deviceIdentifier: deviceId,
    deviceName,
    deviceType,
    osVersion,
    appVersion: 'web',
    lastSeenAt: now,
    createdAt,
    updatedAt: now
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
          updatedAt: new Date().toISOString()
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
