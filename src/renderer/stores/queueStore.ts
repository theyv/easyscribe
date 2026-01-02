import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type QueueItemStatus = 'waiting' | 'processing' | 'transcribing' | 'completed' | 'error'

export interface QueueItem {
  id: string
  filePath: string
  fileName: string
  status: QueueItemStatus
  progress: number
  error: string | null
  transcription?: string
  created_at: string
  updated_at: string
}

interface QueueState {
  items: QueueItem[]
  isProcessing: boolean
  currentItem: QueueItem | null

  // Actions
  addToQueue: (filePath: string, fileName: string) => string
  updateQueueItem: (id: string, updates: Partial<QueueItem>) => void
  removeFromQueue: (id: string) => void
  cancelItem: (id: string) => void
  cancelAll: () => void
  setCurrentItem: (item: QueueItem | null) => void
  setProcessing: (isProcessing: boolean) => void
  clearCompleted: () => void
}

export const useQueueStore = create<QueueState>()(
  persist(
    (set, get) => ({
      items: [],
      isProcessing: false,
      currentItem: null,

      addToQueue: (filePath, fileName) => {
        const id = crypto.randomUUID()
        const newItem: QueueItem = {
          id,
          filePath,
          fileName,
          status: 'waiting',
          progress: 0,
          error: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        set((state) => ({
          items: [...state.items, newItem]
        }))
        return id
      },

      updateQueueItem: (id, updates) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? { ...item, ...updates, updated_at: new Date().toISOString() }
              : item
          ),
          currentItem:
            state.currentItem?.id === id
              ? { ...state.currentItem, ...updates, updated_at: new Date().toISOString() }
              : state.currentItem
        })),

      removeFromQueue: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
          currentItem: state.currentItem?.id === id ? null : state.currentItem
        })),

      cancelItem: (id) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id && ['waiting', 'processing', 'transcribing'].includes(item.status)
              ? { ...item, status: 'error', error: 'Cancelled', progress: 0, updated_at: new Date().toISOString() }
              : item
          )
        })),

      cancelAll: () =>
        set((state) => ({
          items: state.items.map((item) =>
            ['waiting', 'processing', 'transcribing'].includes(item.status)
              ? { ...item, status: 'error', error: 'Cancelled', progress: 0, updated_at: new Date().toISOString() }
              : item
          ),
          isProcessing: false,
          currentItem: null
        })),

      setCurrentItem: (item) => set({ currentItem: item }),

      setProcessing: (isProcessing) => set({ isProcessing }),

      clearCompleted: () =>
        set((state) => ({
          items: state.items.filter((item) => item.status !== 'completed'),
          currentItem:
            state.currentItem?.status === 'completed' ? null : state.currentItem
        }))
    }),
    {
      name: 'easyscribe-queue-storage',
      partialize: (state) => ({
        items: state.items
      })
    }
  )
)

// Computed selectors
export const queueSelectors = {
  activeItems: (state: QueueState) =>
    state.items.filter((item) => ['waiting', 'processing', 'transcribing'].includes(item.status)),
  completedItems: (state: QueueState) =>
    state.items.filter((item) => item.status === 'completed'),
  failedItems: (state: QueueState) =>
    state.items.filter((item) => item.status === 'error'),
  waitingItems: (state: QueueState) =>
    state.items.filter((item) => item.status === 'waiting'),
  getQueueCount: (state: QueueState) => state.items.length,
  getActiveCount: (state: QueueState) =>
    state.items.filter((item) => ['waiting', 'processing', 'transcribing'].includes(item.status)).length,
  getCompletedCount: (state: QueueState) =>
    state.items.filter((item) => item.status === 'completed').length,
  getFailedCount: (state: QueueState) =>
    state.items.filter((item) => item.status === 'error').length
}
