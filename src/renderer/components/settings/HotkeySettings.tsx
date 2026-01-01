import { useState } from 'react'
import { useSettings } from '../../hooks/useSettings'
import { HotkeyRecorder } from '../common/HotkeyRecorder'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Label } from '../ui/label'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Keyboard, AlertTriangle } from 'lucide-react'

export function HotkeySettings() {
  const { settings, updateSetting } = useSettings()
  const [recordingHotkey, setRecordingHotkey] = useState<string | null>(null)
  const [isRecorderOpen, setIsRecorderOpen] = useState(false)

  const handleRecordHotkey = (hotkeyType: 'pushToTalk' | 'toggleRecord') => {
    setRecordingHotkey(hotkeyType)
    setIsRecorderOpen(true)
  }

  const handleSaveHotkey = (hotkey: string) => {
    if (recordingHotkey === 'pushToTalk') {
      updateSetting('pushToTalkHotkey', hotkey)
    } else if (recordingHotkey === 'toggleRecord') {
      updateSetting('toggleRecordHotkey', hotkey)
    }
    setRecordingHotkey(null)
  }

  const handleCloseRecorder = () => {
    setRecordingHotkey(null)
    setIsRecorderOpen(false)
  }

  const hasConflict =
    settings.pushToTalkHotkey === settings.toggleRecordHotkey &&
    settings.pushToTalkHotkey !== ''

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Hotkeys</h2>
        <p className="text-muted-foreground">
          Configure keyboard shortcuts for recording
        </p>
      </div>

      {hasConflict && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-destructive">Hotkey Conflict</p>
            <p className="text-sm text-destructive/80">
              Both hotkeys are set to the same combination. Please choose
              different keys for each action.
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Recording Hotkeys
          </CardTitle>
          <CardDescription>
            Set keyboard shortcuts for recording controls
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Push-to-Talk Hotkey */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Push-to-Talk</Label>
              <Badge variant="secondary">Hold to record</Badge>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-md border bg-muted px-3 py-2 text-sm font-mono">
                {settings.pushToTalkHotkey || 'Not set'}
              </div>
              <Button
                variant="outline"
                onClick={() => handleRecordHotkey('pushToTalk')}
              >
                Record New
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Hold this key combination to start recording. Release to stop.
            </p>
          </div>

          {/* Toggle Record Hotkey */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Toggle Record</Label>
              <Badge variant="secondary">Press to toggle</Badge>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-md border bg-muted px-3 py-2 text-sm font-mono">
                {settings.toggleRecordHotkey || 'Not set'}
              </div>
              <Button
                variant="outline"
                onClick={() => handleRecordHotkey('toggleRecord')}
              >
                Record New
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Press this key combination to start or stop recording.
            </p>
          </div>
        </CardContent>
      </Card>

      <HotkeyRecorder
        isOpen={isRecorderOpen}
        onClose={handleCloseRecorder}
        onSave={handleSaveHotkey}
        title={
          recordingHotkey === 'pushToTalk'
            ? 'Record Push-to-Talk Hotkey'
            : 'Record Toggle Record Hotkey'
        }
      />
    </div>
  )
}
