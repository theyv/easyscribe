import { app, Menu, Tray, nativeImage, BrowserWindow } from 'electron'
import path from 'path'
import { IPC_CHANNELS } from '../../src/shared/ipc-channels'

export type TrayState = 'idle' | 'recording' | 'processing' | 'error'

interface TrayOptions {
  onOpenInterface?: () => void
  onStartRecording?: () => void
  onOpenTranscription?: (id: string) => void
  onOpenSettings?: () => void
  onQuit?: () => void
}

class TrayManager {
  private tray: Tray | null = null
  private state: TrayState = 'idle'
  private recentTranscriptions: Array<{ id: string; title: string }> = []
  private options: TrayOptions = {}

  constructor() {}

  /**
   * Create system tray
   */
  createTray(options: TrayOptions = {}): void {
    this.options = options

    // Get icon path based on platform
    const iconPath = this.getIconPath('tray-idle')

    // Create native image from icon
    const icon = nativeImage.createFromPath(iconPath)

    // Create tray
    this.tray = new Tray(icon)

    // Set initial tooltip
    this.tray.setToolTip('EasyScribe - Ready to record')

    // Build initial context menu
    this.updateContextMenu()

    // Handle tray click
    this.tray.on('click', () => {
      this.options.onOpenInterface?.()
    })
  }

  /**
   * Update tray state (icon and tooltip)
   */
  updateTrayState(state: TrayState): void {
    this.state = state

    if (!this.tray) return

    // Get icon path for current state
    const iconPath = this.getIconPath(`tray-${state}`)

    // Update icon
    const icon = nativeImage.createFromPath(iconPath)
    this.tray.setImage(icon)

    // Update tooltip based on state
    const tooltip = this.getTooltipForState(state)
    this.tray.setToolTip(tooltip)

    // Update context menu
    this.updateContextMenu()
  }

  /**
   * Update recent transcriptions in tray menu
   */
  updateRecentTranscriptions(transcriptions: Array<{ id: string; title: string }>): void {
    this.recentTranscriptions = transcriptions.slice(0, 5) // Keep only last 5
    this.updateContextMenu()
  }

  /**
   * Destroy tray
   */
  destroyTray(): void {
    if (this.tray) {
      this.tray.destroy()
      this.tray = null
    }
  }

  /**
   * Get icon path for a given state
   */
  private getIconPath(iconName: string): string {
    const isDev = process.env.NODE_ENV === 'development'

    if (isDev) {
      // Development: use path from resources directory
      return path.join(__dirname, '../../resources/icons', `${iconName}.png`)
    } else {
      // Production: use path from asar unpacked resources
      return path.join(process.resourcesPath, 'icons', `${iconName}.png`)
    }
  }

  /**
   * Get tooltip text for a given state
   */
  private getTooltipForState(state: TrayState): string {
    switch (state) {
      case 'idle':
        return 'EasyScribe - Ready to record'
      case 'recording':
        return 'EasyScribe - Recording...'
      case 'processing':
        return 'EasyScribe - Processing...'
      case 'error':
        return 'EasyScribe - Error occurred'
      default:
        return 'EasyScribe'
    }
  }

  /**
   * Update context menu
   */
  private updateContextMenu(): void {
    if (!this.tray) return

    const menuItems: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'Open Web Interface',
        click: () => this.options.onOpenInterface?.()
      },
      { type: 'separator' },
      {
        label: this.state === 'recording' ? 'Stop Recording' : 'Start Recording',
        accelerator: 'Ctrl+Space',
        click: () => this.options.onStartRecording?.()
      },
      { type: 'separator' }
    ]

    // Add recent transcriptions if available
    if (this.recentTranscriptions.length > 0) {
      menuItems.push(
        { label: 'Recent Transcriptions', enabled: false },
        ...this.recentTranscriptions.map(t => ({
          label: t.title || 'Untitled',
          click: () => this.options.onOpenTranscription?.(t.id)
        })),
        { type: 'separator' }
      )
    }

    // Add settings and quit
    menuItems.push(
      {
        label: 'Settings',
        click: () => this.options.onOpenSettings?.()
      },
      { type: 'separator' },
      {
        label: 'Quit EasyScribe',
        click: () => this.options.onQuit?.()
      }
    )

    const contextMenu = Menu.buildFromTemplate(menuItems)
    this.tray.setContextMenu(contextMenu)
  }

  /**
   * Show tray balloon (Windows) or notification
   */
  showNotification(title: string, body: string): void {
    if (!this.tray) return

    this.tray.displayBalloon({
      title,
      content: body,
      iconType: 'info'
    })
  }
}

// Export singleton instance
export const trayManager = new TrayManager()

// Export functions for external use
export function createTray(options: TrayOptions = {}): void {
  trayManager.createTray(options)
}

export function updateTrayState(state: TrayState): void {
  trayManager.updateTrayState(state)
}

export function updateRecentTranscriptions(transcriptions: Array<{ id: string; title: string }>): void {
  trayManager.updateRecentTranscriptions(transcriptions)
}

export function destroyTray(): void {
  trayManager.destroyTray()
}
