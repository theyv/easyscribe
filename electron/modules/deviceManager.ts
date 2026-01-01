import { machineIdSync } from 'node-machine-id'
import { hostname } from 'os'
import { createClient } from '@supabase/supabase-js'
import { Device } from '../../src/shared/types'

// Local storage path for device info (using userData for persistence)
import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'

const DEVICE_INFO_FILE = 'device-info.json'

export interface LocalDeviceInfo {
  id: string
  deviceIdentifier: string
  deviceName: string
  deviceType: string
  osVersion?: string
  appVersion?: string
  lastSeenAt: string
  createdAt: string
  updatedAt: string
}

/**
 * Get the device info file path
 */
function getDeviceInfoPath(): string {
  const userDataPath = app.getPath('userData')
  return join(userDataPath, DEVICE_INFO_FILE)
}

/**
 * Load device info from local storage
 */
function loadLocalDeviceInfo(): LocalDeviceInfo | null {
  try {
    const filePath = getDeviceInfoPath()
    if (!existsSync(filePath)) {
      return null
    }
    const data = readFileSync(filePath, 'utf-8')
    return JSON.parse(data) as LocalDeviceInfo
  } catch (error) {
    console.error('Failed to load local device info:', error)
    return null
  }
}

/**
 * Save device info to local storage
 */
function saveLocalDeviceInfo(deviceInfo: LocalDeviceInfo): void {
  try {
    const filePath = getDeviceInfoPath()
    writeFileSync(filePath, JSON.stringify(deviceInfo, null, 2), 'utf-8')
  } catch (error) {
    console.error('Failed to save local device info:', error)
  }
}

/**
 * Get the unique machine ID
 */
function getMachineId(): string {
  try {
    return machineIdSync()
  } catch (error) {
    console.error('Failed to get machine ID:', error)
    // Fallback to hostname if machine ID fails
    return hostname()
  }
}

/**
 * Get the device type based on platform
 */
function getDeviceType(): string {
  const platform = process.platform
  switch (platform) {
    case 'win32':
      return 'desktop-windows'
    case 'darwin':
      return 'desktop-macos'
    case 'linux':
      return 'desktop-linux'
    default:
      return 'desktop-unknown'
  }
}

/**
 * Get OS version
 */
function getOsVersion(): string {
  return process.version
}

/**
 * Get app version from package.json
 */
function getAppVersion(): string {
  try {
    const packagePath = join(process.cwd(), 'package.json')
    const packageData = JSON.parse(readFileSync(packagePath, 'utf-8'))
    return packageData.version || '0.1.0'
  } catch {
    return '0.1.0'
  }
}

/**
 * Generate default device name based on hostname
 */
function generateDefaultDeviceName(): string {
  const host = hostname()
  const deviceType = getDeviceType()
  const osName = deviceType.split('-')[1]?.toUpperCase() || 'DEVICE'
  return `${host} (${osName})`
}

/**
 * Get current device info (from local storage or generate new)
 */
export function getDeviceInfo(): LocalDeviceInfo {
  const localInfo = loadLocalDeviceInfo()
  
  if (localInfo) {
    return localInfo
  }

  // Generate new device info
  const now = new Date().toISOString()
  const newDeviceInfo: LocalDeviceInfo = {
    id: '', // Will be set after registration
    deviceIdentifier: getMachineId(),
    deviceName: generateDefaultDeviceName(),
    deviceType: getDeviceType(),
    osVersion: getOsVersion(),
    appVersion: getAppVersion(),
    lastSeenAt: now,
    createdAt: now,
    updatedAt: now
  }

  // Save to local storage
  saveLocalDeviceInfo(newDeviceInfo)
  
  return newDeviceInfo
}

/**
 * Update device name locally
 */
export function updateLocalDeviceName(deviceName: string): LocalDeviceInfo {
  const deviceInfo = getDeviceInfo()
  deviceInfo.deviceName = deviceName
  deviceInfo.updatedAt = new Date().toISOString()
  saveLocalDeviceInfo(deviceInfo)
  return deviceInfo
}

/**
 * Create Supabase client for device operations
 */
function createSupabaseClient() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || ''
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase credentials not configured')
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
  })
}

/**
 * Register device in Supabase
 */
export async function registerDevice(): Promise<LocalDeviceInfo> {
  try {
    const deviceInfo = getDeviceInfo()
    const supabase = createSupabaseClient()

    // Check if device already exists
    const { data: existingDevice, error: fetchError } = await supabase
      .from('devices')
      .select('*')
      .eq('device_identifier', deviceInfo.deviceIdentifier)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 means no rows returned, which is expected for new devices
      console.error('Error fetching device:', fetchError)
      throw fetchError
    }

    if (existingDevice) {
      // Device exists, update it
      const { data: updatedDevice, error: updateError } = await supabase
        .from('devices')
        .update({
          device_name: deviceInfo.deviceName,
          device_type: deviceInfo.deviceType,
          os_version: deviceInfo.osVersion,
          app_version: deviceInfo.appVersion,
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingDevice.id)
        .select()
        .single()

      if (updateError) {
        throw updateError
      }

      // Update local info with the database ID
      deviceInfo.id = updatedDevice.id
      deviceInfo.lastSeenAt = updatedDevice.last_seen_at
      deviceInfo.updatedAt = updatedDevice.updated_at
      saveLocalDeviceInfo(deviceInfo)

      return deviceInfo
    }

    // Create new device
    const { data: newDevice, error: insertError } = await supabase
      .from('devices')
      .insert({
        device_identifier: deviceInfo.deviceIdentifier,
        device_name: deviceInfo.deviceName,
        device_type: deviceInfo.deviceType,
        os_version: deviceInfo.osVersion,
        app_version: deviceInfo.appVersion,
        last_seen_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      throw insertError
    }

    // Update local info with the database ID
    deviceInfo.id = newDevice.id
    deviceInfo.lastSeenAt = newDevice.last_seen_at
    deviceInfo.updatedAt = newDevice.updated_at
    saveLocalDeviceInfo(deviceInfo)

    return deviceInfo
  } catch (error) {
    console.error('Failed to register device:', error)
    // Return local info even if registration fails
    return getDeviceInfo()
  }
}

/**
 * Update last_seen timestamp
 */
export async function updateLastSeen(): Promise<void> {
  try {
    const deviceInfo = getDeviceInfo()
    
    // Update local timestamp
    deviceInfo.lastSeenAt = new Date().toISOString()
    deviceInfo.updatedAt = new Date().toISOString()
    saveLocalDeviceInfo(deviceInfo)

    // If we have a database ID, update it in Supabase
    if (deviceInfo.id) {
      const supabase = createSupabaseClient()
      const { error } = await supabase
        .from('devices')
        .update({
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', deviceInfo.id)

      if (error) {
        console.error('Failed to update last_seen in database:', error)
        // Don't throw - local update was successful
      }
    }
  } catch (error) {
    console.error('Failed to update last_seen:', error)
  }
}

/**
 * Update device name both locally and in Supabase
 */
export async function updateDeviceName(deviceName: string): Promise<LocalDeviceInfo> {
  try {
    const deviceInfo = updateLocalDeviceName(deviceName)

    // If we have a database ID, update it in Supabase
    if (deviceInfo.id) {
      const supabase = createSupabaseClient()
      const { data: updatedDevice, error } = await supabase
        .from('devices')
        .update({
          device_name: deviceName,
          updated_at: new Date().toISOString()
        })
        .eq('id', deviceInfo.id)
        .select()
        .single()

      if (error) {
        console.error('Failed to update device name in database:', error)
        // Return local info even if database update fails
        return deviceInfo
      }

      deviceInfo.updatedAt = updatedDevice.updated_at
      saveLocalDeviceInfo(deviceInfo)
    }

    return deviceInfo
  } catch (error) {
    console.error('Failed to update device name:', error)
    // Return local info even if update fails
    return getDeviceInfo()
  }
}
