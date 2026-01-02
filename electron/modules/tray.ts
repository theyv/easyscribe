import { Menu, Tray, nativeImage, NativeImage } from 'electron'
import path from 'path'
import fs from 'fs'

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
    try {
      this.options = options

      // Get tray icon (with fallback if file doesn't exist)
      const icon = this.getTrayIcon('idle')
      
      if (icon.isEmpty()) {
        console.error('Failed to create tray icon: icon is empty')
        return
      }

      // Create tray
      this.tray = new Tray(icon)
      console.log('System tray created successfully')

      // Set initial tooltip
      this.tray.setToolTip('EasyScribe - Ready to record')

      // Build initial context menu
      this.updateContextMenu()

      // Handle tray click
      this.tray.on('click', () => {
        this.options.onOpenInterface?.()
      })
      
      // Also handle double-click for better UX
      this.tray.on('double-click', () => {
        this.options.onOpenInterface?.()
      })
    } catch (error) {
      console.error('Failed to create system tray:', error)
      throw error
    }
  }

  /**
   * Update tray state (icon and tooltip)
   */
  updateTrayState(state: TrayState): void {
    this.state = state

    if (!this.tray) return

    // Get tray icon (with fallback if file doesn't exist)
    const icon = this.getTrayIcon(state)
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
   * Get color for a given state
   */
  private getColorForState(state: TrayState): { r: number; g: number; b: number; a: number } {
    switch (state) {
      case 'idle':
        return { r: 139, g: 92, b: 246, a: 255 } // Violet (#8b5cf6)
      case 'recording':
        return { r: 239, g: 68, b: 68, a: 255 } // Red (#ef4444)
      case 'processing':
        return { r: 59, g: 130, b: 246, a: 255 } // Blue (#3b82f6)
      case 'error':
        return { r: 245, g: 158, b: 11, a: 255 } // Orange (#f59e0b)
      default:
        return { r: 139, g: 92, b: 246, a: 255 } // Default violet
    }
  }

  /**
   * Create a fallback icon programmatically if icon file doesn't exist
   */
  private createFallbackIcon(state: TrayState): NativeImage {
    const size = 64 // Larger size for better visibility on high-DPI displays
    const color = this.getColorForState(state)
    
    // Create a simple colored circle icon
    const buffer = Buffer.alloc(size * size * 4)
    
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const index = (y * size + x) * 4
        
        // Create a circular icon
        const centerX = size / 2
        const centerY = size / 2
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2)
        const radius = size / 2 - 4
        
        if (distance <= radius) {
          // Inside circle - use state color
          buffer[index] = color.r     // R
          buffer[index + 1] = color.g   // G
          buffer[index + 2] = color.b   // B
          buffer[index + 3] = 255       // A (fully opaque)
        } else {
          // Outside circle - transparent
          buffer[index] = 0
          buffer[index + 1] = 0
          buffer[index + 2] = 0
          buffer[index + 3] = 0
        }
      }
    }
    
    // Create image from buffer and resize to appropriate tray size
    const image = nativeImage.createFromBuffer(buffer, { width: size, height: size })
    
    // Resize to standard tray icon size (16x16 is standard for most platforms)
    return image.resize({ width: 16, height: 16 })
  }

  /**
   * Get tray icon (with fallback if file doesn't exist)
   */
  private getTrayIcon(state: TrayState): NativeImage {
    const iconName = `tray-${state}`
    const iconPath = this.getIconPath(iconName)
    
    console.log(`Loading tray icon for state '${state}' from path: ${iconPath}`)
    
    // Check if icon file exists
    if (fs.existsSync(iconPath)) {
      const icon = nativeImage.createFromPath(iconPath)
      if (!icon.isEmpty()) {
        console.log(`Successfully loaded tray icon from file: ${iconPath}`)
        return icon
      } else {
        console.warn(`Icon file exists but is empty: ${iconPath}`)
      }
    } else {
      console.warn(`Tray icon file not found at: ${iconPath}`)
    }
    
    // Fallback to programmatically created icon
    console.log(`Using fallback icon for state '${state}'`)
    return this.createFallbackIcon(state)
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
