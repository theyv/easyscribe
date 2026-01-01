import { app } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Settings } from '../../src/shared/types'
import { DEFAULT_SETTINGS } from '../../src/shared/defaults'

// Create Supabase client for main process
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''

let supabaseInstance: SupabaseClient | null = null

function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase credentials not configured, sync will be disabled')
      // Return a mock client that won't throw errors
      supabaseInstance = createClient('https://mock.supabase.co', 'mock-key') as any
    } else {
      supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        db: {
          schema: 'public',
        },
        global: {
          headers: {
            'x-application-name': 'easyscribe',
          },
        },
      })
    }
  }
  return supabaseInstance!
}

const supabase = getSupabaseClient()

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error'

interface SyncResult {
  success: boolean
  status: SyncStatus
  error?: string
  lastSyncTime?: Date
}

/**
 * Settings persistence manager with offline support and Supabase sync
 */
class SettingsPersistenceManager {
  private settingsPath: string
  private syncStatus: SyncStatus = 'synced'
  private lastSyncTime: Date | null = null
  private offlineQueue: Array<{ settings: Partial<Settings>; timestamp: Date }> = []
  private syncInProgress = false

  constructor() {
    // Get user data directory
    const userDataPath = app.getPath('userData')
    this.settingsPath = path.join(userDataPath, 'settings.json')
  }

  /**
   * Load settings from local storage
   */
  async loadSettings(): Promise<Settings> {
    try {
      // Try to read from local file
      const fileContent = await fs.readFile(this.settingsPath, 'utf-8')
      const localSettings = JSON.parse(fileContent)

      // Merge with defaults to ensure all keys exist
      return { ...DEFAULT_SETTINGS, ...localSettings }
    } catch (error) {
      // File doesn't exist or is invalid, return defaults
      console.warn('Settings file not found or invalid, using defaults:', error)
      return { ...DEFAULT_SETTINGS }
    }
  }

  /**
   * Save settings to local storage
   */
  async saveSettings(settings: Partial<Settings>): Promise<SyncResult> {
    try {
      // Load current settings
      const currentSettings = await this.loadSettings()

      // Merge with new settings
      const updatedSettings = { ...currentSettings, ...settings }

      // Save to local file
      await fs.mkdir(path.dirname(this.settingsPath), { recursive: true })
      await fs.writeFile(this.settingsPath, JSON.stringify(updatedSettings, null, 2), 'utf-8')

      // Try to sync with Supabase if online
      const syncResult = await this.syncSettings(updatedSettings)

      return syncResult
    } catch (error) {
      console.error('Failed to save settings:', error)
      return {
        success: false,
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to save settings'
      }
    }
  }

  /**
   * Sync settings with Supabase
   */
  async syncSettings(settings?: Partial<Settings>): Promise<SyncResult> {
    if (this.syncInProgress) {
      return {
        success: false,
        status: this.syncStatus,
        error: 'Sync already in progress'
      }
    }

    this.syncInProgress = true
    this.syncStatus = 'syncing'

    try {
      // Check if we're online
      const isOnline = await this.checkOnlineStatus()

      if (!isOnline) {
        this.syncStatus = 'offline'

        // Queue the settings for later sync
        if (settings) {
          this.offlineQueue.push({
            settings,
            timestamp: new Date()
          })
        }

        return {
          success: false,
          status: 'offline',
          error: 'Offline - changes queued for sync'
        }
      }

      // Load settings if not provided
      const settingsToSync = settings || await this.loadSettings()

      // Get user ID from Supabase
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        this.syncStatus = 'synced'
        this.lastSyncTime = new Date()
        return {
          success: true,
          status: 'synced',
          lastSyncTime: this.lastSyncTime
        }
      }

      // Upsert settings to Supabase
      const { error: upsertError } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          settings: settingsToSync,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })

      if (upsertError) {
        throw upsertError
      }

      // Process offline queue
      await this.processOfflineQueue()

      this.syncStatus = 'synced'
      this.lastSyncTime = new Date()

      return {
        success: true,
        status: 'synced',
        lastSyncTime: this.lastSyncTime
      }
    } catch (error) {
      console.error('Failed to sync settings:', error)
      this.syncStatus = 'error'

      // Queue the settings for later sync
      if (settings) {
        this.offlineQueue.push({
          settings,
          timestamp: new Date()
        })
      }

      return {
        success: false,
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to sync settings'
      }
    } finally {
      this.syncInProgress = false
    }
  }

  /**
   * Load settings from Supabase
   */
  async loadFromSupabase(): Promise<Settings | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return null
      }

      const { data, error } = await supabase
        .from('user_settings')
        .select('settings')
        .eq('user_id', user.id)
        .single()

      if (error || !data) {
        return null
      }

      // Merge with defaults
      return { ...DEFAULT_SETTINGS, ...data.settings }
    } catch (error) {
      console.error('Failed to load settings from Supabase:', error)
      return null
    }
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): { status: SyncStatus; lastSyncTime: Date | null; queueSize: number } {
    return {
      status: this.syncStatus,
      lastSyncTime: this.lastSyncTime,
      queueSize: this.offlineQueue.length
    }
  }

  /**
   * Process offline queue
   */
  private async processOfflineQueue(): Promise<void> {
    if (this.offlineQueue.length === 0) {
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return
      }

      // Process all queued settings
      for (const item of this.offlineQueue) {
        await supabase
          .from('user_settings')
          .upsert({
            user_id: user.id,
            settings: item.settings,
            updated_at: item.timestamp.toISOString()
          }, {
            onConflict: 'user_id'
          })
      }

      // Clear queue
      this.offlineQueue = []
    } catch (error) {
      console.error('Failed to process offline queue:', error)
    }
  }

  /**
   * Check if we're online
   */
  private async checkOnlineStatus(): Promise<boolean> {
    try {
      // Try to fetch from Supabase
      const { error } = await supabase.auth.getSession()

      // If no error, we're online
      return !error
    } catch {
      return false
    }
  }

  /**
   * Reset settings to defaults
   */
  async resetSettings(): Promise<SyncResult> {
    return await this.saveSettings(DEFAULT_SETTINGS)
  }
}

// Export singleton instance
export const settingsPersistenceManager = new SettingsPersistenceManager()

// Export functions for external use
export async function loadSettings(): Promise<Settings> {
  return await settingsPersistenceManager.loadSettings()
}

export async function saveSettings(settings: Partial<Settings>): Promise<SyncResult> {
  return await settingsPersistenceManager.saveSettings(settings)
}

export async function syncSettings(settings?: Partial<Settings>): Promise<SyncResult> {
  return await settingsPersistenceManager.syncSettings(settings)
}

export function getSyncStatus(): { status: SyncStatus; lastSyncTime: Date | null; queueSize: number } {
  return settingsPersistenceManager.getSyncStatus()
}

export async function resetSettings(): Promise<SyncResult> {
  return await settingsPersistenceManager.resetSettings()
}
