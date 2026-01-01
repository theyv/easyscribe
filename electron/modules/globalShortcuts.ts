import uiohook from 'uiohook-napi'
import { EventEmitter } from 'events'
import { HotkeyCombination } from '../../src/shared/types'

interface HotkeyConfig {
  pushToTalk: HotkeyCombination
  toggle: HotkeyCombination
}

type HotkeyType = 'pushToTalk' | 'toggle'

// Uiohook event interface
interface UiohookEvent {
  type: string
  keycode: number
  mask: number
  value: number
}

// Type assertion for uiohook API
const uio = uiohook as any

class GlobalShortcutsManager extends EventEmitter {
  private registered: boolean = false
  private hotkeys: HotkeyConfig | null = null
  private pushToTalkPressed: boolean = false

  /**
   * Convert key name to uiohook key code
   */
  private getKeyCode(keyName: string): number {
    const keyMap: Record<string, number> = {
      'space': 57,
      'a': 30, 'b': 48, 'c': 46, 'd': 32, 'e': 18, 'f': 33, 'g': 34, 'h': 35,
      'i': 23, 'j': 36, 'k': 37, 'l': 38, 'm': 50, 'n': 49, 'o': 24, 'p': 25,
      'q': 16, 'r': 19, 's': 31, 't': 20, 'u': 22, 'v': 47, 'w': 17, 'x': 45,
      'y': 21, 'z': 44,
      '0': 11, '1': 2, '2': 3, '3': 4, '4': 5, '5': 6, '6': 7, '7': 8, '8': 9, '9': 10,
      'f1': 59, 'f2': 60, 'f3': 61, 'f4': 62, 'f5': 63, 'f6': 64, 'f7': 65, 'f8': 66,
      'f9': 67, 'f10': 68, 'f11': 69, 'f12': 70,
      'enter': 28, 'escape': 1, 'tab': 15, 'backspace': 14, 'delete': 111,
      'home': 102, 'end': 107, 'pageup': 104, 'pagedown': 109,
      'arrowup': 103, 'arrowdown': 108, 'arrowleft': 105, 'arrowright': 106
    }
    return keyMap[keyName.toLowerCase()] || 0
  }

  /**
   * Convert modifiers to uiohook modifier mask
   */
  private getModifierMask(modifiers: HotkeyCombination['modifiers']): number {
    let mask = 0
    if (modifiers.ctrl) mask |= 0x0001  // Ctrl
    if (modifiers.shift) mask |= 0x0002 // Shift
    if (modifiers.alt) mask |= 0x0004   // Alt
    if (modifiers.meta) mask |= 0x0008  // Meta (Cmd on Mac, Win on Windows)
    return mask
  }

  /**
   * Check if event matches the hotkey combination
   */
  private matchesHotkey(event: UiohookEvent, hotkey: HotkeyCombination): boolean {
    const keyCode = this.getKeyCode(hotkey.key)
    const modifierMask = this.getModifierMask(hotkey.modifiers)
    
    // Check key code
    if (event.keycode !== keyCode) return false
    
    // Check modifiers (mask = 0x000F for all modifiers)
    const eventModifiers = event.mask & 0x000F
    return eventModifiers === modifierMask
  }

  /**
   * Handle key down event
   */
  private onKeyDown = (event: UiohookEvent) => {
    if (!this.hotkeys) return

    // Check push-to-talk hotkey
    if (this.matchesHotkey(event, this.hotkeys.pushToTalk)) {
      if (!this.pushToTalkPressed) {
        this.pushToTalkPressed = true
        this.emit('hotkey-pressed', 'pushToTalk')
      }
      return
    }

    // Check toggle hotkey
    if (this.matchesHotkey(event, this.hotkeys.toggle)) {
      this.emit('hotkey-pressed', 'toggle')
      return
    }
  }

  /**
   * Handle key up event
   */
  private onKeyUp = (event: UiohookEvent) => {
    if (!this.hotkeys) return

    // Check push-to-talk hotkey release
    if (this.matchesHotkey(event, this.hotkeys.pushToTalk)) {
      if (this.pushToTalkPressed) {
        this.pushToTalkPressed = false
        this.emit('hotkey-released', 'pushToTalk')
      }
    }
  }

  /**
   * Register global hotkeys
   */
  registerHotkeys(hotkeys: HotkeyConfig): boolean {
    try {
      // Unregister existing hotkeys first
      if (this.registered) {
        this.unregisterHotkeys()
      }

      this.hotkeys = hotkeys
      this.pushToTalkPressed = false

      // Start uiohook
      uio.start()
      
      // Register event listeners
      uio.on('keydown', this.onKeyDown)
      uio.on('keyup', this.onKeyUp)

      this.registered = true
      console.log('Global hotkeys registered:', hotkeys)
      return true
    } catch (error) {
      console.error('Failed to register global hotkeys:', error)
      return false
    }
  }

  /**
   * Unregister all global hotkeys
   */
  unregisterHotkeys(): void {
    try {
      if (this.registered) {
        uio.removeListener('keydown', this.onKeyDown)
        uio.removeListener('keyup', this.onKeyUp)
        uio.stop()
        
        this.registered = false
        this.hotkeys = null
        this.pushToTalkPressed = false
        console.log('Global hotkeys unregistered')
      }
    } catch (error) {
      console.error('Failed to unregister global hotkeys:', error)
    }
  }

  /**
   * Update hotkey configuration
   */
  updateHotkeys(hotkeys: HotkeyConfig): boolean {
    return this.registerHotkeys(hotkeys)
  }

  /**
   * Check if hotkeys are registered
   */
  isRegistered(): boolean {
    return this.registered
  }
}

// Export singleton instance
export const globalShortcuts = new GlobalShortcutsManager()

// Export functions for direct use
export const registerHotkeys = (hotkeys: HotkeyConfig) => globalShortcuts.registerHotkeys(hotkeys)
export const unregisterHotkeys = () => globalShortcuts.unregisterHotkeys()
export const updateHotkeys = (hotkeys: HotkeyConfig) => globalShortcuts.updateHotkeys(hotkeys)
