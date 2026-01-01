import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Device } from '../../shared/types'

interface DeviceState {
  deviceInfo: Device | null
  isLoading: boolean
  error: string | null
  lastSync: string | null
  
  // Actions
  setDeviceInfo: (deviceInfo: Device) => void
  updateDeviceName: (deviceName: string) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  setLastSync: (lastSync: string) => void
  clearDevice: () => void
}

export const useDeviceStore = create<DeviceState>()(
  persist(
    (set) => ({
      deviceInfo: null,
      isLoading: false,
      error: null,
      lastSync: null,

      setDeviceInfo: (deviceInfo) => 
        set({ deviceInfo, error: null }),

      updateDeviceName: (deviceName) =>
        set((state) => ({
          deviceInfo: state.deviceInfo
            ? { ...state.deviceInfo, deviceName, updatedAt: new Date().toISOString() }
            : null,
          error: null
        })),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error, isLoading: false }),

      setLastSync: (lastSync) => set({ lastSync }),

      clearDevice: () => 
        set({ deviceInfo: null, error: null, lastSync: null })
    }),
    {
      name: 'easyscribe-device-storage',
      partialize: (state) => ({
        deviceInfo: state.deviceInfo,
        lastSync: state.lastSync
      })
    }
  )
)
