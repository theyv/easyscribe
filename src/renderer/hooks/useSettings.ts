import { useCallback } from 'react'
import { useSettingsStore } from '../stores/settingsStore'

export function useSettings() {
  const {
    settings,
    isLoading,
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
      // TODO: Implement Supabase sync
      // await syncSettingsToSupabase(settings)
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
      // TODO: Implement Supabase load
      // const loadedSettings = await loadSettingsFromSupabase()
      // if (loadedSettings) {
      //   updateSettings(loadedSettings)
      // }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [setLoading, setError, updateSettings])

  return {
    settings,
    isLoading,
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
