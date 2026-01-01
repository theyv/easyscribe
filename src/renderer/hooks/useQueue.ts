import { useCallback, useEffect } from 'react'
import { useQueueStore, queueSelectors, QueueItem, QueueItemStatus } from '../stores/queueStore'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import type { IpcResponse } from '../../shared/types'

export interface UseQueueOptions {
  autoProcess?: boolean
  onItemComplete?: (item: QueueItem) => void
  onItemError?: (item: QueueItem) => void
}

export function useQueue(options: UseQueueOptions = {}) {
  const {
    items,
    isProcessing,
    currentItem,
    addToQueue,
    updateQueueItem,
    removeFromQueue,
    cancelItem,
    cancelAll,
    setCurrentItem,
    setProcessing,
    clearCompleted
  } = useQueueStore()

  const { autoProcess = true, onItemComplete, onItemError } = options

  // Add files to queue
  const addFilesToQueue = useCallback((files: Array<{ path: string; name: string }>) => {
    files.forEach((file) => {
      addToQueue(file.path, file.name)
    })
  }, [addToQueue])

  // Process next item in queue
  const processNextItem = useCallback(async () => {
    if (isProcessing || currentItem) {
      return
    }

    const waitingItems = queueSelectors.waitingItems(useQueueStore.getState())
    if (waitingItems.length === 0) {
      return
    }

    const nextItem = waitingItems[0]
    setProcessing(true)
    setCurrentItem(nextItem)

    try {
      // Update status to processing
      updateQueueItem(nextItem.id, { status: 'processing', progress: 10 })

      // Start transcription via IPC
      const response = await window.electron.file.transcribe(nextItem.filePath) as IpcResponse<{ transcription: string }>

      if (response.success && response.data) {
        // Update status to completed
        updateQueueItem(nextItem.id, {
          status: 'completed',
          progress: 100,
          transcription: response.data.transcription
        })

        onItemComplete?.(nextItem)
      } else {
        throw new Error(response.error || 'Transcription failed')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      updateQueueItem(nextItem.id, {
        status: 'error',
        error: errorMessage,
        progress: 0
      })

      onItemError?.(nextItem)
    } finally {
      setProcessing(false)
      setCurrentItem(null)
    }
  }, [isProcessing, currentItem, setProcessing, setCurrentItem, updateQueueItem, onItemComplete, onItemError])

  // Auto-process queue
  useEffect(() => {
    if (!autoProcess) {
      return
    }

    const waitingItems = queueSelectors.waitingItems(useQueueStore.getState())
    if (waitingItems.length > 0 && !isProcessing && !currentItem) {
      processNextItem()
    }
  }, [items, isProcessing, currentItem, autoProcess, processNextItem])

  // Monitor queue status
  const queueStatus = {
    total: queueSelectors.getQueueCount(useQueueStore.getState()),
    active: queueSelectors.getActiveCount(useQueueStore.getState()),
    completed: queueSelectors.getCompletedCount(useQueueStore.getState()),
    failed: queueSelectors.getFailedCount(useQueueStore.getState())
  }

  return {
    // State
    items,
    isProcessing,
    currentItem,
    queueStatus,

    // Actions
    addFilesToQueue,
    addFileToQueue: (filePath: string, fileName: string) => addToQueue(filePath, fileName),
    cancelItem,
    cancelAll,
    removeFromQueue,
    clearCompleted,
    processNextItem,

    // Computed
    activeItems: queueSelectors.activeItems(useQueueStore.getState()),
    completedItems: queueSelectors.completedItems(useQueueStore.getState()),
    failedItems: queueSelectors.failedItems(useQueueStore.getState()),
    waitingItems: queueSelectors.waitingItems(useQueueStore.getState())
  }
}
