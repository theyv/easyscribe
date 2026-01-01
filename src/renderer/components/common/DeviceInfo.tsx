import { useState } from 'react'
import { useDevice } from '../../hooks/useDevice'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { Monitor, RefreshCw, Check, X } from 'lucide-react'

export function DeviceInfo() {
  const {
    deviceInfo,
    deviceName,
    deviceId,
    platform,
    isLoading,
    error,
    lastSync,
    refreshDevice,
    updateDeviceName
  } = useDevice()

  const [isEditing, setIsEditing] = useState(false)
  const [editedName, setEditedName] = useState(deviceName)
  const [isSaving, setIsSaving] = useState(false)

  const handleSaveName = async () => {
    if (editedName.trim() === editedName) {
      setIsSaving(true)
      try {
        await updateDeviceName(editedName)
        setIsEditing(false)
      } catch (err) {
        console.error('Failed to update device name:', err)
      } finally {
        setIsSaving(false)
      }
    }
  }

  const handleCancelEdit = () => {
    setEditedName(deviceName)
    setIsEditing(false)
  }

  const formatLastSync = (dateString: string | null) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return `${Math.floor(diffMins / 1440)}d ago`
  }

  const getPlatformIcon = () => {
    return <Monitor className="h-5 w-5 text-muted-foreground" />
  }

  const getPlatformLabel = () => {
    if (platform.includes('windows')) return 'Windows'
    if (platform.includes('macos')) return 'macOS'
    if (platform.includes('linux')) return 'Linux'
    return platform
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getPlatformIcon()}
          Device Information
        </CardTitle>
        <CardDescription>
          Manage your device settings and view device details
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
            <X className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="device-name">Device Name</Label>
            {isEditing ? (
              <div className="flex gap-2">
                <Input
                  id="device-name"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName()
                    if (e.key === 'Escape') handleCancelEdit()
                  }}
                  disabled={isSaving}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  onClick={handleSaveName}
                  disabled={isSaving || editedName.trim() === ''}
                >
                  {isSaving ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{deviceName}</p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditedName(deviceName)
                    setIsEditing(true)
                  }}
                  disabled={isLoading}
                >
                  Edit
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label>Device ID</Label>
            <p className="text-sm text-muted-foreground font-mono text-xs break-all">
              {deviceId}
            </p>
          </div>

          <div className="space-y-1">
            <Label>Platform</Label>
            <p className="text-sm text-muted-foreground">{getPlatformLabel()}</p>
          </div>

          <div className="space-y-1">
            <Label>OS Version</Label>
            <p className="text-sm text-muted-foreground">
              {deviceInfo?.osVersion || 'Unknown'}
            </p>
          </div>

          <div className="space-y-1">
            <Label>App Version</Label>
            <p className="text-sm text-muted-foreground">
              {deviceInfo?.appVersion || '0.1.0'}
            </p>
          </div>

          <div className="space-y-1">
            <Label>Last Sync</Label>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {formatLastSync(lastSync)}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={refreshDevice}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
