import { useEffect, useCallback, useRef } from 'react'
import { useDeviceStore } from '../stores/deviceStore'
import { Device } from '../../shared/types'

// Refresh interval in milliseconds (5 minutes)
const REFRESH_INTERVAL = 5 * 60 * 1000

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

  // Fetch device info from main process
  const fetchDeviceInfo = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

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
  }, [setDeviceInfo, updateStoreDeviceName, setLoading, setError, setLastSync])

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
