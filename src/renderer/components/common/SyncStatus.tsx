import { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Cloud, CloudOff, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useSupabase } from '@/renderer/hooks/useSupabase'

type SyncStatusType = 'synced' | 'syncing' | 'offline' | 'error'

interface SyncStatusData {
  status: SyncStatusType
  lastSyncTime: Date | null
  queueSize: number
}

function isElectronMode(): boolean {
  return typeof window !== 'undefined' && !!(window as any).electron?.settingsPersistence
}

export function SyncStatus() {
  const { isConnected, isConnecting, error } = useSupabase()
  const [syncData, setSyncData] = useState<SyncStatusData>({
    status: 'synced',
    lastSyncTime: null,
    queueSize: 0
  })
  const [isManualSyncing, setIsManualSyncing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)

  // Determine sync status based on Supabase connection state
  useEffect(() => {
    if (isConnecting) {
      setSyncData(prev => ({ ...prev, status: 'syncing' }))
    } else if (error) {
      setSyncData(prev => ({ ...prev, status: 'error' }))
    } else if (isConnected) {
      setSyncData(prev => ({ ...prev, status: 'synced' }))
    } else {
      setSyncData(prev => ({ ...prev, status: 'offline' }))
    }
  }, [isConnected, isConnecting, error])

  // Load sync status on mount and periodically (Electron mode only)
  useEffect(() => {
    // Don't load sync status in web mode
    if (!isElectronMode()) {
      return
    }

    const loadSyncStatus = async () => {
      try {
        const result = await (window as any).electron.settingsPersistence.getSyncStatus()
        if (result.success && result.data) {
          setSyncData(result.data)
          if (result.data.lastSyncTime) {
            setLastSyncTime(new Date(result.data.lastSyncTime))
          }
        }
      } catch (error) {
        console.error('Failed to get sync status:', error)
      }
    }

    loadSyncStatus()

    // Poll for sync status every 5 seconds
    const interval = setInterval(loadSyncStatus, 5000)

    return () => clearInterval(interval)
  }, [])

  const handleManualSync = async () => {
    // In web mode, just update last sync time since Supabase syncs automatically
    if (!isElectronMode()) {
      setLastSyncTime(new Date())
      setSyncData(prev => ({ ...prev, status: 'synced' }))
      return
    }

    setIsManualSyncing(true)
    try {
      const result = await (window as any).electron.settingsPersistence.sync()
      if (result.success && result.data) {
        setSyncData({
          status: result.data.status,
          lastSyncTime: result.data.lastSyncTime || null,
          queueSize: result.data.queueSize || 0
        })
        if (result.data.lastSyncTime) {
          setLastSyncTime(new Date(result.data.lastSyncTime))
        }
      }
    } catch (error) {
      console.error('Failed to sync:', error)
    } finally {
      setIsManualSyncing(false)
    }
  }

  const getStatusIcon = () => {
    switch (syncData.status) {
      case 'synced':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'syncing':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
      case 'offline':
        return <CloudOff className="h-4 w-4 text-gray-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
    }
  }

  const getStatusText = () => {
    switch (syncData.status) {
      case 'synced':
        return 'Synced'
      case 'syncing':
        return 'Syncing...'
      case 'offline':
        return 'Offline'
      case 'error':
        return 'Sync Error'
    }
  }

  const getStatusVariant = () => {
    switch (syncData.status) {
      case 'synced':
        return 'default'
      case 'syncing':
        return 'secondary'
      case 'offline':
        return 'outline'
      case 'error':
        return 'destructive'
    }
  }

  const formatLastSyncTime = () => {
    const effectiveLastSyncTime = isElectronMode() ? syncData.lastSyncTime : lastSyncTime
    if (!effectiveLastSyncTime) return 'Never'

    const now = new Date()
    const diff = now.getTime() - effectiveLastSyncTime.getTime()
    const minutes = Math.floor(diff / 60000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  // Show sync status based on Supabase connection
  return (
    <div className="flex items-center gap-2">
      <Badge variant={getStatusVariant()} className="gap-1">
        {getStatusIcon()}
        <span>{getStatusText()}</span>
      </Badge>
      
      {isElectronMode() && syncData.queueSize > 0 && (
        <Badge variant="secondary" className="gap-1">
          <Cloud className="h-3 w-3" />
          {syncData.queueSize} pending
        </Badge>
      )}
      
      {(isElectronMode() ? syncData.lastSyncTime : lastSyncTime) && (
        <span className="text-xs text-muted-foreground">
          Last sync: {formatLastSyncTime()}
        </span>
      )}
      
      <Button
        variant="ghost"
        size="icon"
        onClick={handleManualSync}
        disabled={isManualSyncing || syncData.status === 'syncing'}
        title="Sync now"
      >
        <RefreshCw className={`h-4 w-4 ${isManualSyncing ? 'animate-spin' : ''}`} />
      </Button>
    </div>
  )
}
