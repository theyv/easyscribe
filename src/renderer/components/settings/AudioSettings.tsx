import { useState, useEffect } from 'react'
import { useSettings } from '../../hooks/useSettings'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Button } from '../ui/button'
import { Progress } from '../ui/progress'
import { Mic, Volume2, Loader2 } from 'lucide-react'

interface AudioDevice {
  id: string
  name: string
  isDefault?: boolean
}

export function AudioSettings() {
  const { settings, updateSetting } = useSettings()
  const [audioLevel, setAudioLevel] = useState(0)
  const [isTesting, setIsTesting] = useState(false)
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([])

  // Load audio devices on mount
  useEffect(() => {
    const loadAudioDevices = async () => {
      try {
        const result = await (window as any).electron.recording.getDevices()
        if (result.success && result.data) {
          setAudioDevices(result.data)
        }
      } catch (error) {
        console.error('Failed to load audio devices:', error)
      }
    }
    loadAudioDevices()
  }, [])

  const handleTestMicrophone = async () => {
    setIsTesting(true)
    try {
      // Start microphone test via IPC
      const result = await (window as any).electron.recording.testMicrophone(settings.selectedMicrophone)
      
      if (result.success) {
        // Monitor audio level during test
        const interval = setInterval(async () => {
          try {
            const levelResult = await (window as any).electron.recording.getAudioLevel()
            if (levelResult.success && levelResult.data) {
              setAudioLevel(levelResult.data.level)
            }
          } catch (error) {
            console.error('Failed to get audio level:', error)
          }
        }, 100)

        // Stop test after 3 seconds
        setTimeout(() => {
          clearInterval(interval)
          setIsTesting(false)
          setAudioLevel(0)
        }, 3000)
      } else {
        setIsTesting(false)
        console.error('Microphone test failed:', result.error)
      }
    } catch (error) {
      console.error('Failed to test microphone:', error)
      setIsTesting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Audio</h2>
        <p className="text-muted-foreground">
          Configure audio input and recording settings
        </p>
      </div>

      {/* Microphone Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Microphone
          </CardTitle>
          <CardDescription>
            Select and test your microphone
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Input Device</Label>
            <Select
              value={settings.selectedMicrophone}
              onValueChange={(value) => updateSetting('selectedMicrophone', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select microphone..." />
              </SelectTrigger>
              <SelectContent>
                {audioDevices.length > 0 ? (
                  audioDevices.map((device) => (
                    <SelectItem key={device.id} value={device.id}>
                      {device.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="default" disabled>
                    No devices available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Test Microphone</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestMicrophone}
                disabled={isTesting || !settings.selectedMicrophone}
              >
                {isTesting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  'Start Test'
                )}
              </Button>
            </div>
            <div className="space-y-1">
              <Progress value={audioLevel} className="h-2" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Volume2 className="h-3 w-3" />
                  Input Level
                </span>
                <span>{Math.round(audioLevel)}%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recording Duration */}
      <Card>
        <CardHeader>
          <CardTitle>Recording Duration</CardTitle>
          <CardDescription>
            Set the maximum duration for recordings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label>Maximum Duration</Label>
          <Select
            value={settings.maxRecordingDuration.toString()}
            onValueChange={(value) =>
              updateSetting('maxRecordingDuration', parseInt(value))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="60">1 minute</SelectItem>
              <SelectItem value="300">5 minutes</SelectItem>
              <SelectItem value="600">10 minutes</SelectItem>
              <SelectItem value="1800">30 minutes</SelectItem>
              <SelectItem value="3600">1 hour</SelectItem>
              <SelectItem value="7200">2 hours</SelectItem>
              <SelectItem value="0">Unlimited</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Recording will automatically stop after this duration
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
