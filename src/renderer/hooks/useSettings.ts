import { useCallback, useEffect } from 'react'
import { useSettingsStore } from '../stores/settingsStore'
import { Settings } from '../../shared/types'

export function useSettings() {
  const {
    settings,
    isLoading,
    isInitialLoading,
    error,
    hasUnsavedChanges,
    updateSetting,
    updateSettings,
    resetSettings,
    setLoading,
    setError,
    markAsSaved
  } = useSettingsStore()

  const saveSettings = useCallback(async () => {
    setLoading(true)
    try {
      // In Electron mode, save to main process settings persistence
      if (typeof (window as any).electron?.settingsPersistence !== 'undefined') {
        await (window as any).electron.settingsPersistence.save(settings)
      }
      markAsSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setLoading(false)
    }
  }, [settings, setLoading, setError, markAsSaved])

  const loadSettings = useCallback(async () => {
    setLoading(true)
    try {
      // In Electron mode, load from main process settings persistence
      if (typeof (window as any).electron?.settingsPersistence !== 'undefined') {
        const result = await (window as any).electron.settingsPersistence.load()
        if (result.success && result.data) {
          updateSettings(result.data as Settings)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [setLoading, setError, updateSettings])

  // Load settings from main process on mount (Electron mode only)
  useEffect(() => {
    if (typeof (window as any).electron?.settingsPersistence !== 'undefined') {
      loadSettings()
    }
  }, [loadSettings])

  return {
    settings,
    isLoading,
    isInitialLoading,
    error,
    hasUnsavedChanges,
    updateSetting,
    updateSettings,
    resetSettings,
    saveSettings,
    loadSettings,
    markAsSaved
  }
}
