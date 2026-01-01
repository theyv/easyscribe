import { clipboard } from 'electron'
import robot from 'robotjs'

/**
 * Text Insertion Module
 * Handles text insertion at cursor position using robotjs (primary) or clipboard (fallback)
 */

// Map of special characters to their robotjs equivalents
const SPECIAL_CHARS: Record<string, string> = {
  '\n': 'enter',
  '\t': 'tab',
  '\r': 'enter',
  ' ': 'space',
  '!': '!',
  '@': '@',
  '#': '#',
  $: '$',
  '%': '%',
  '^': '^',
  '&': '&',
  '*': '*',
  '(': '(',
  ')': ')',
  '-': '-',
  '_': '_',
  '=': '=',
  '+': '+',
  '[': '[',
  ']': ']',
  '{': '{',
  '}': '}',
  '\\': '\\',
  '|': '|',
  ';': ';',
  ':': ':',
  "'": "'",
  '"': '"',
  ',': ',',
  '<': '<',
  '.': '.',
  '>': '>',
  '/': '/',
  '?': '?',
  '`': '`',
  '~': '~'
}

/**
 * Check if a character is a special character that needs special handling
 */
function isSpecialChar(char: string): boolean {
  return SPECIAL_CHARS[char] !== undefined || char.length > 1
}

/**
 * Type text character by character using robotjs
 * This is the primary method for text insertion
 */
export function typeText(text: string): { success: boolean; error?: string; hasUnicode?: boolean } {
  try {
    // Check if text contains unicode characters that robotjs can't handle
    const hasUnicode = [...text].some(char => char.charCodeAt(0) > 127)

    if (hasUnicode) {
      return { success: false, error: 'Text contains unicode characters', hasUnicode: true }
    }

    // Type each character
    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      const specialKey = SPECIAL_CHARS[char]

      if (specialKey) {
        // Use special key mapping
        robot.typeString(specialKey)
      } else {
        // Type regular character
        robot.typeString(char)
      }

      // Small delay between keystrokes for stability
      robot.setKeyboardDelay(10)
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to type text'
    }
  }
}

/**
 * Copy text to clipboard and paste (fallback method)
 */
export async function pasteText(text: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Save current clipboard content
    const previousClipboard = clipboard.readText()

    // Copy new text to clipboard
    clipboard.writeText(text)

    // Simulate paste (Ctrl+V or Cmd+V)
    const isMac = process.platform === 'darwin'
    const modifier = isMac ? 'command' : 'control'

    robot.keyTap('v', modifier)

    // Wait for paste to complete
    await new Promise(resolve => setTimeout(resolve, 100))

    // Restore previous clipboard content
    clipboard.writeText(previousClipboard)

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to paste text'
    }
  }
}

/**
 * Check if there's a focused text input
 * This is a heuristic check - we can't reliably detect focused inputs across all apps
 */
export function hasFocusedInput(): boolean {
  try {
    // Get the current focused window
    const activeWindow = robot.getActiveWindow()

    // Check if the window title suggests a text editor or input field
    // This is a basic heuristic - can be improved with platform-specific checks
    const title = activeWindow.title.toLowerCase()

    const textEditorPatterns = [
      'notepad',
      'text editor',
      'word',
      'excel',
      'powerpoint',
      'google docs',
      'google sheets',
      'google slides',
      'vscode',
      'visual studio',
      'intellij',
      'pycharm',
      'webstorm',
      'atom',
      'sublime',
      'vim',
      'emacs',
      'terminal',
      'command prompt',
      'powershell',
      'bash',
      'slack',
      'discord',
      'teams',
      'zoom',
      'skype',
      'telegram',
      'whatsapp',
      'messenger',
      'gmail',
      'outlook',
      'thunderbird',
      'chrome',
      'firefox',
      'edge',
      'safari',
      'opera',
      'brave'
    ]

    // Check if any pattern matches
    const isTextEditor = textEditorPatterns.some(pattern => title.includes(pattern))

    return isTextEditor
  } catch (error) {
    // If we can't detect, assume there's a focused input
    return true
  }
}

/**
 * Insert text at cursor position
 * Primary method: robotjs typing
 * Fallback method: clipboard paste
 */
export async function insertText(text: string): Promise<{ success: boolean; error?: string; method?: string }> {
  try {
    // Check if there's a focused text input
    const hasInput = hasFocusedInput()

    if (!hasInput) {
      // No focused text input - copy to clipboard only and notify user
      clipboard.writeText(text)
      return {
        success: false,
        error: 'No focused text input detected. Text has been copied to clipboard.',
        method: 'clipboard'
      }
    }

    // Try robotjs typing first (primary method)
    const typeResult = typeText(text)

    if (typeResult.success) {
      return { success: true, method: 'type' }
    }

    // If typing failed due to unicode, use clipboard paste
    if (typeResult.hasUnicode || !typeResult.success) {
      const pasteResult = await pasteText(text)
      return { ...pasteResult, method: 'paste' }
    }

    return {
      success: false,
      error: typeResult.error || 'Failed to insert text',
      method: 'error'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to insert text',
      method: 'error'
    }
  }
}

/**
 * Copy text to clipboard only (for when there's no focused input)
 */
export function copyToClipboard(text: string): { success: boolean; error?: string } {
  try {
    clipboard.writeText(text)
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to copy to clipboard'
    }
  }
}
