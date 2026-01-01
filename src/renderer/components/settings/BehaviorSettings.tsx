import { useEffect, useState } from 'react'
import { useSettings } from '../../hooks/useSettings'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Label } from '../ui/label'
import { Switch } from '../ui/switch'
import { Separator } from '../ui/separator'
import { Bell, Zap, Monitor } from 'lucide-react'

export function BehaviorSettings() {
  const { settings, updateSetting } = useSettings()
  const [autoStartEnabled, setAutoStartEnabled] = useState(false)

  // Check auto-start status on mount
  useEffect(() => {
    const checkAutoStart = async () => {
      try {
        const result = await (window as any).electron.autoStart.isEnabled()
        if (result.success) {
          setAutoStartEnabled(result.data.enabled)
        }
      } catch (error) {
        console.error('Failed to check auto-start status:', error)
      }
    }
    checkAutoStart()
  }, [])

  // Handle auto-start toggle
  const handleAutoStartChange = async (checked: boolean) => {
    try {
      if (checked) {
        await (window as any).electron.autoStart.enable(settings.startMinimized)
      } else {
        await (window as any).electron.autoStart.disable()
      }
      setAutoStartEnabled(checked)
      updateSetting('autoStart', checked)
    } catch (error) {
      console.error('Failed to toggle auto-start:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Behavior</h2>
        <p className="text-muted-foreground">
          Configure application behavior and startup options
        </p>
      </div>

      {/* Startup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Startup
          </CardTitle>
          <CardDescription>
            Configure how the application starts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Start with System</Label>
              <p className="text-sm text-muted-foreground">
                Automatically launch when you log in
              </p>
            </div>
            <Switch
              checked={autoStartEnabled}
              onCheckedChange={handleAutoStartChange}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Start Minimized</Label>
              <p className="text-sm text-muted-foreground">
                Launch application minimized to tray
              </p>
            </div>
            <Switch
              checked={settings.startMinimized}
              onCheckedChange={(checked) =>
                updateSetting('startMinimized', checked)
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Open Web UI on Start</Label>
              <p className="text-sm text-muted-foreground">
                Automatically open the web interface when starting
              </p>
            </div>
            <Switch
              checked={settings.openWebUiOnStart}
              onCheckedChange={(checked) =>
                updateSetting('openWebUiOnStart', checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Interface
          </CardTitle>
          <CardDescription>
            Configure interface behavior
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Show Floating Indicator</Label>
              <p className="text-sm text-muted-foreground">
                Display a floating indicator when recording
              </p>
            </div>
            <Switch
              checked={settings.showFloatingIndicator}
              onCheckedChange={(checked) =>
                updateSetting('showFloatingIndicator', checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>
            Configure which notifications you receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Transcription Complete</Label>
              <p className="text-sm text-muted-foreground">
                Notify when transcription is finished
              </p>
            </div>
            <Switch
              checked={settings.notificationTranscriptionComplete}
              onCheckedChange={(checked) =>
                updateSetting('notificationTranscriptionComplete', checked)
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Errors</Label>
              <p className="text-sm text-muted-foreground">
                Notify when errors occur
              </p>
            </div>
            <Switch
              checked={settings.notificationErrors}
              onCheckedChange={(checked) =>
                updateSetting('notificationErrors', checked)
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>App Ready</Label>
              <p className="text-sm text-muted-foreground">
                Notify when the application is ready to use
              </p>
            </div>
            <Switch
              checked={settings.notificationAppReady}
              onCheckedChange={(checked) =>
                updateSetting('notificationAppReady', checked)
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
