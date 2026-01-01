import { BrowserWindow, screen } from 'electron'
import path from 'path'
import fs from 'fs/promises'

type IndicatorState = 'recording' | 'processing' | 'done'

interface IndicatorPosition {
  x: number
  y: number
}

const INDICATOR_WIDTH = 120
const INDICATOR_HEIGHT = 40
const DEFAULT_POSITION: IndicatorPosition = {
  x: 0, // Will be centered
  y: 20
}

class RecordingIndicatorManager {
  private window: BrowserWindow | null = null
  private state: IndicatorState = 'recording'
  private position: IndicatorPosition = { ...DEFAULT_POSITION }
  private hideTimeout: NodeJS.Timeout | null = null
  private durationInterval: NodeJS.Timeout | null = null
  private startTime: number = 0

  /**
   * Get the saved position from storage
   */
  private async loadPosition(): Promise<IndicatorPosition> {
    try {
      const userDataPath = (await import('electron')).app.getPath('userData')
      const positionFile = path.join(userDataPath, 'indicator-position.json')
      
      const data = await fs.readFile(positionFile, 'utf-8')
      const saved = JSON.parse(data)
      
      // Validate saved position
      if (saved.x !== undefined && saved.y !== undefined) {
        return { x: saved.x, y: saved.y }
      }
    } catch {
      // File doesn't exist or is invalid, use default
    }
    
    return { ...DEFAULT_POSITION }
  }

  /**
   * Save the position to storage
   */
  private async savePosition(): Promise<void> {
    try {
      const userDataPath = (await import('electron')).app.getPath('userData')
      const positionFile = path.join(userDataPath, 'indicator-position.json')
      
      await fs.writeFile(positionFile, JSON.stringify(this.position), 'utf-8')
    } catch (error) {
      console.error('Failed to save indicator position:', error)
    }
  }

  /**
   * Calculate centered X position
   */
  private calculateCenteredX(): number {
    const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize
    return Math.floor((screenWidth - INDICATOR_WIDTH) / 2)
  }

  /**
   * Create the indicator window
   */
  private async createWindow(): Promise<BrowserWindow> {
    // Load saved position
    this.position = await this.loadPosition()
    
    // If X is 0 (default), center it
    if (this.position.x === 0) {
      this.position.x = this.calculateCenteredX()
    }

    const window = new BrowserWindow({
      width: INDICATOR_WIDTH,
      height: INDICATOR_HEIGHT,
      x: this.position.x,
      y: this.position.y,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: true,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false
      },
      show: false
    })

    // Handle window move to save position
    window.on('moved', async () => {
      const [x, y] = window.getPosition()
      this.position = { x, y }
      await this.savePosition()
    })

    // Load the indicator HTML
    window.loadURL(this.getIndicatorHtml())

    // Show when ready
    window.once('ready-to-show', () => {
      window.show()
    })

    return window
  }

  /**
   * Get the indicator HTML content
   */
  private getIndicatorHtml(): string {
    return `data:text/html;charset=utf-8,${encodeURIComponent(this.getIndicatorHtmlContent())}`
  }

  /**
   * Get the indicator HTML content
   */
  private getIndicatorHtmlContent(): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12px;
      overflow: hidden;
      -webkit-app-region: drag;
    }
    
    .indicator {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 20px;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(10px);
      color: white;
      user-select: none;
      cursor: move;
    }
    
    .indicator.recording {
      background: rgba(239, 68, 68, 0.9);
    }
    
    .indicator.processing {
      background: rgba(139, 92, 246, 0.9);
    }
    
    .indicator.done {
      background: rgba(34, 197, 94, 0.9);
    }
    
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: white;
    }
    
    .dot.recording {
      animation: pulse 1s infinite;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    
    .spinner {
      width: 12px;
      height: 12px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    .checkmark {
      width: 14px;
      height: 14px;
    }
    
    .text {
      white-space: nowrap;
    }
    
    .timer {
      font-family: monospace;
      font-size: 11px;
      opacity: 0.9;
    }
  </style>
</head>
<body>
  <div id="indicator" class="indicator recording">
    <div id="dot" class="dot recording"></div>
    <span id="text" class="text">Recording...</span>
    <span id="timer" class="timer">00:00</span>
  </div>
  
  <script>
    const indicator = document.getElementById('indicator');
    const dot = document.getElementById('dot');
    const text = document.getElementById('text');
    const timer = document.getElementById('timer');
    
    let startTime = Date.now();
    let timerInterval = null;
    
    function updateTimer() {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
      const secs = (elapsed % 60).toString().padStart(2, '0');
      timer.textContent = mins + ':' + secs;
    }
    
    function setState(state) {
      indicator.className = 'indicator ' + state;
      
      if (state === 'recording') {
        dot.className = 'dot recording';
        dot.style.display = 'block';
        text.textContent = 'Recording...';
        timer.style.display = 'inline';
        startTime = Date.now();
        if (!timerInterval) {
          timerInterval = setInterval(updateTimer, 1000);
        }
      } else if (state === 'processing') {
        dot.className = 'spinner';
        dot.style.display = 'block';
        text.textContent = 'Transcribing...';
        timer.style.display = 'none';
        if (timerInterval) {
          clearInterval(timerInterval);
          timerInterval = null;
        }
      } else if (state === 'done') {
        dot.className = 'checkmark';
        dot.style.display = 'block';
        dot.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>';
        text.textContent = 'Done!';
        timer.style.display = 'none';
        if (timerInterval) {
          clearInterval(timerInterval);
          timerInterval = null;
        }
      }
    }
    
    // Expose function to update state
    window.electronAPI = {
      setState: setState
    };
    
    // Start timer
    timerInterval = setInterval(updateTimer, 1000);
  </script>
</body>
</html>
    `
  }

  /**
   * Show the indicator with a specific state
   */
  async showIndicator(state: IndicatorState = 'recording'): Promise<void> {
    try {
      this.state = state

      // Clear any existing hide timeout
      if (this.hideTimeout) {
        clearTimeout(this.hideTimeout)
        this.hideTimeout = null
      }

      // Create window if it doesn't exist
      if (!this.window || this.window.isDestroyed()) {
        this.window = await this.createWindow()
      } else {
        // Update existing window state
        this.window.webContents.executeJavaScript(`window.electronAPI.setState('${state}')`)
        this.window.show()
      }

      // If in 'done' state, auto-hide after 1.5 seconds
      if (state === 'done') {
        this.hideTimeout = setTimeout(() => {
          this.hideIndicator()
        }, 1500)
      }
    } catch (error) {
      console.error('Failed to show indicator:', error)
    }
  }

  /**
   * Hide the indicator
   */
  hideIndicator(): void {
    try {
      if (this.window && !this.window.isDestroyed()) {
        this.window.hide()
      }
      
      // Clear any hide timeout
      if (this.hideTimeout) {
        clearTimeout(this.hideTimeout)
        this.hideTimeout = null
      }
    } catch (error) {
      console.error('Failed to hide indicator:', error)
    }
  }

  /**
   * Update the indicator state
   */
  async updateIndicator(state: IndicatorState): Promise<void> {
    await this.showIndicator(state)
  }

  /**
   * Set the indicator position
   */
  async setPosition(position: IndicatorPosition): Promise<void> {
    try {
      this.position = position
      
      if (this.window && !this.window.isDestroyed()) {
        this.window.setPosition(position.x, position.y)
      }
      
      await this.savePosition()
    } catch (error) {
      console.error('Failed to set indicator position:', error)
    }
  }

  /**
   * Check if the indicator is visible
   */
  isVisible(): boolean {
    return this.window !== null && !this.window.isDestroyed() && this.window.isVisible()
  }

  /**
   * Destroy the indicator window
   */
  destroy(): void {
    try {
      if (this.window && !this.window.isDestroyed()) {
        this.window.destroy()
        this.window = null
      }
      
      // Clear timers
      if (this.hideTimeout) {
        clearTimeout(this.hideTimeout)
        this.hideTimeout = null
      }
      if (this.durationInterval) {
        clearInterval(this.durationInterval)
        this.durationInterval = null
      }
    } catch (error) {
      console.error('Failed to destroy indicator:', error)
    }
  }
}

// Export singleton instance
export const recordingIndicator = new RecordingIndicatorManager()

// Export functions for direct use
export const showIndicator = (state?: IndicatorState) => recordingIndicator.showIndicator(state)
export const hideIndicator = () => recordingIndicator.hideIndicator()
export const updateIndicator = (state: IndicatorState) => recordingIndicator.updateIndicator(state)
export const setPosition = (position: IndicatorPosition) => recordingIndicator.setPosition(position)
