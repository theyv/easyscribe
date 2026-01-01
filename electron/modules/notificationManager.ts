import { Notification } from 'electron'

/**
 * Notification Manager Module
 * Handles desktop notifications for EasyScribe
 */

export type NotificationType =
  | 'transcription-complete'
  | 'text-inserted'
  | 'error'
  | 'queue-complete'
  | 'app-ready'

export interface NotificationOptions {
  title: string
  body: string
  icon?: string
  silent?: boolean
  urgency?: 'normal' | 'critical' | 'low'
  onClick?: () => void
}

/**
 * Check if notifications are supported
 */
export function isNotificationSupported(): boolean {
  return Notification.isSupported()
}

/**
 * Request notification permission
 */
export async function requestPermission(): Promise<boolean> {
  try {
    if (!isNotificationSupported()) {
      return false
    }

    // On Windows and Linux, permissions are granted by default
    // On macOS, we need to request permission
    if (process.platform === 'darwin') {
      // Electron doesn't have a built-in permission request for macOS
      // The user needs to enable notifications in System Preferences
      return true
    }

    return true
  } catch (error) {
    console.error('Failed to request notification permission:', error)
    return false
  }
}

/**
 * Show a notification
 */
export function showNotification(
  type: NotificationType,
  options: NotificationOptions
): { success: boolean; error?: string } {
  try {
    if (!isNotificationSupported()) {
      return {
        success: false,
        error: 'Notifications are not supported on this system'
      }
    }

    // Create notification
    const notification = new Notification({
      title: options.title,
      body: options.body,
      icon: options.icon,
      silent: options.silent || false,
      urgency: options.urgency || 'normal'
    })

    // Handle click event
    if (options.onClick) {
      notification.on('click', options.onClick)
    }

    // Show notification
    notification.show()

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to show notification'
    }
  }
}

/**
 * Show transcription complete notification
 */
export function showTranscriptionCompleteNotification(
  filename: string,
  duration?: number
): { success: boolean; error?: string } {
  const durationText = duration ? ` (${Math.round(duration)}s)` : ''
  return showNotification('transcription-complete', {
    title: 'Transcription Complete',
    body: `"${filename}" has been transcribed${durationText}`,
    silent: false
  })
}

/**
 * Show text inserted notification
 */
export function showTextInsertedNotification(): { success: boolean; error?: string } {
  return showNotification('text-inserted', {
    title: 'Text Inserted',
    body: 'Your transcription has been inserted at the cursor position',
    silent: true
  })
}

/**
 * Show error notification
 */
export function showErrorNotification(
  message: string
): { success: boolean; error?: string } {
  return showNotification('error', {
    title: 'Error',
    body: message,
    silent: false,
    urgency: 'critical'
  })
}

/**
 * Show queue complete notification
 */
export function showQueueCompleteNotification(
  count: number
): { success: boolean; error?: string } {
  return showNotification('queue-complete', {
    title: 'Queue Complete',
    body: `${count} file(s) have been transcribed`,
    silent: false
  })
}

/**
 * Show app ready notification
 */
export function showAppReadyNotification(): { success: boolean; error?: string } {
  return showNotification('app-ready', {
    title: 'EasyScribe Ready',
    body: 'Press Ctrl+Space to start recording',
    silent: true
  })
}
