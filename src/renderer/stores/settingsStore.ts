import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Settings, DEFAULT_SETTINGS } from '../../shared/defaults'

interface SettingsState {
  settings: Settings
  isLoading: boolean
  error: string | null
  hasUnsavedChanges: boolean
  
  // Actions
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  updateSettings: (updates: Partial<Settings>) => void
  resetSettings: () => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  markAsSaved: () => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      isLoading: false,
      error: null,
      hasUnsavedChanges: false,

      updateSetting: (key, value) =>
        set((state) => ({
          settings: { ...state.settings, [key]: value },
          hasUnsavedChanges: true,
          error: null
        })),

      updateSettings: (updates) =>
        set((state) => ({
          settings: { ...state.settings, ...updates },
          hasUnsavedChanges: true,
          error: null
        })),

      resetSettings: () =>
        set({
          settings: DEFAULT_SETTINGS,
          hasUnsavedChanges: true,
          error: null
        }),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error, isLoading: false }),

      markAsSaved: () => set({ hasUnsavedChanges: false })
    }),
    {
      name: 'easyscribe-settings-storage',
      partialize: (state) => ({
        settings: state.settings
      })
    }
  )
)
