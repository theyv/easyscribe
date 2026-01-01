import { app } from 'electron'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

const execAsync = promisify(exec)

/**
 * Auto-start manager for cross-platform support
 */
class AutoStartManager {
  private isEnabled = false
  private startMinimized = false

  /**
   * Enable auto-start
   */
  async enableAutoStart(minimized: boolean = false): Promise<void> {
    this.startMinimized = minimized

    switch (process.platform) {
      case 'win32':
        await this.enableWindowsAutoStart(minimized)
        break
      case 'darwin':
        await this.enableMacOSAutoStart(minimized)
        break
      case 'linux':
        await this.enableLinuxAutoStart(minimized)
        break
      default:
        throw new Error(`Auto-start not supported on platform: ${process.platform}`)
    }

    this.isEnabled = true
  }

  /**
   * Disable auto-start
   */
  async disableAutoStart(): Promise<void> {
    switch (process.platform) {
      case 'win32':
        await this.disableWindowsAutoStart()
        break
      case 'darwin':
        await this.disableMacOSAutoStart()
        break
      case 'linux':
        await this.disableLinuxAutoStart()
        break
      default:
        throw new Error(`Auto-start not supported on platform: ${process.platform}`)
    }

    this.isEnabled = false
  }

  /**
   * Check if auto-start is enabled
   */
  async isAutoStartEnabled(): Promise<boolean> {
    try {
      switch (process.platform) {
        case 'win32':
          return await this.checkWindowsAutoStart()
        case 'darwin':
          return await this.checkMacOSAutoStart()
        case 'linux':
          return await this.checkLinuxAutoStart()
        default:
          return false
      }
    } catch (error) {
      console.error('Failed to check auto-start status:', error)
      return false
    }
  }

  /**
   * Windows: Enable auto-start via Registry
   */
  private async enableWindowsAutoStart(minimized: boolean): Promise<void> {
    const appPath = process.execPath
    const args = minimized ? '--hidden' : ''

    // Use reg command to add registry key
    const regCommand = `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "EasyScribe" /t REG_SZ /d "${appPath}" ${args ? `/f "${args}"` : '/f'} /f`

    try {
      await execAsync(regCommand)
    } catch (error) {
      console.error('Failed to enable Windows auto-start:', error)
      throw error
    }
  }

  /**
   * Windows: Disable auto-start via Registry
   */
  private async disableWindowsAutoStart(): Promise<void> {
    const regCommand = 'reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "EasyScribe" /f'

    try {
      await execAsync(regCommand)
    } catch (error) {
      // Ignore error if key doesn't exist
      console.warn('Auto-start may not be enabled:', error)
    }
  }

  /**
   * Windows: Check if auto-start is enabled
   */
  private async checkWindowsAutoStart(): Promise<boolean> {
    const regCommand = 'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "EasyScribe"'

    try {
      await execAsync(regCommand)
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * macOS: Enable auto-start via Login Items
   */
  private async enableMacOSAutoStart(minimized: boolean): Promise<void> {
    // For macOS, we use launch agents
    const homeDir = os.homedir()
    const launchAgentsDir = path.join(homeDir, 'Library', 'LaunchAgents')
    const plistPath = path.join(launchAgentsDir, 'com.easyscribe.launcher.plist')

    // Create launch agents directory if it doesn't exist
    await fs.mkdir(launchAgentsDir, { recursive: true })

    const appPath = process.execPath
    const args = minimized ? ['--hidden'] : []

    const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.easyscribe.launcher</string>
  <key>ProgramArguments</key>
  <array>
    <string>${appPath}</string>
    ${args.map(arg => `<string>${arg}</string>`).join('\n    ')}
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <false/>
</dict>
</plist>`

    await fs.writeFile(plistPath, plistContent, 'utf-8')

    // Load the launch agent
    try {
      await execAsync(`launchctl load "${plistPath}"`)
    } catch (error) {
      console.error('Failed to load launch agent:', error)
      throw error
    }
  }

  /**
   * macOS: Disable auto-start via Login Items
   */
  private async disableMacOSAutoStart(): Promise<void> {
    const homeDir = os.homedir()
    const plistPath = path.join(homeDir, 'Library', 'LaunchAgents', 'com.easyscribe.launcher.plist')

    try {
      // Unload the launch agent
      await execAsync(`launchctl unload "${plistPath}"`)
    } catch (error) {
      // Ignore error if agent not loaded
      console.warn('Launch agent may not be loaded:', error)
    }

    try {
      // Delete the plist file
      await fs.unlink(plistPath)
    } catch (error) {
      // Ignore error if file doesn't exist
      console.warn('Launch agent plist may not exist:', error)
    }
  }

  /**
   * macOS: Check if auto-start is enabled
   */
  private async checkMacOSAutoStart(): Promise<boolean> {
    const homeDir = os.homedir()
    const plistPath = path.join(homeDir, 'Library', 'LaunchAgents', 'com.easyscribe.launcher.plist')

    try {
      await fs.access(plistPath)
      return true
    } catch {
      return false
    }
  }

  /**
   * Linux: Enable auto-start via .desktop file
   */
  private async enableLinuxAutoStart(minimized: boolean): Promise<void> {
    const homeDir = os.homedir()
    const autostartDir = path.join(homeDir, '.config', 'autostart')
    const desktopPath = path.join(autostartDir, 'easyscribe.desktop')

    // Create autostart directory if it doesn't exist
    await fs.mkdir(autostartDir, { recursive: true })

    const appPath = process.execPath
    const execCommand = minimized ? `${appPath} --hidden` : appPath

    const desktopContent = `[Desktop Entry]
Type=Application
Name=EasyScribe
Exec=${execCommand}
Icon=easyscribe
Terminal=false
Categories=Utility;AudioVideo;Recorder;
X-GNOME-Autostart-enabled=true`

    await fs.writeFile(desktopPath, desktopContent, 'utf-8')
  }

  /**
   * Linux: Disable auto-start via .desktop file
   */
  private async disableLinuxAutoStart(): Promise<void> {
    const homeDir = os.homedir()
    const desktopPath = path.join(homeDir, '.config', 'autostart', 'easyscribe.desktop')

    try {
      await fs.unlink(desktopPath)
    } catch (error) {
      // Ignore error if file doesn't exist
      console.warn('Autostart desktop file may not exist:', error)
    }
  }

  /**
   * Linux: Check if auto-start is enabled
   */
  private async checkLinuxAutoStart(): Promise<boolean> {
    const homeDir = os.homedir()
    const desktopPath = path.join(homeDir, '.config', 'autostart', 'easyscribe.desktop')

    try {
      await fs.access(desktopPath)
      return true
    } catch {
      return false
    }
  }
}

// Export singleton instance
export const autoStartManager = new AutoStartManager()

// Export functions for external use
export async function enableAutoStart(minimized: boolean = false): Promise<void> {
  await autoStartManager.enableAutoStart(minimized)
}

export async function disableAutoStart(): Promise<void> {
  await autoStartManager.disableAutoStart()
}

export async function isAutoStartEnabled(): Promise<boolean> {
  return await autoStartManager.isAutoStartEnabled()
}
