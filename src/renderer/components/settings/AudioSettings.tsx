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

// Check if running in Electron mode
function isElectronMode(): boolean {
  return typeof window !== 'undefined' && !!(window as any).electron?.recording
}

export function AudioSettings() {
  const { settings, updateSetting } = useSettings()
  const [audioLevel, setAudioLevel] = useState(0)
  const [isTesting, setIsTesting] = useState(false)
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([])
  const [isLoadingDevices, setIsLoadingDevices] = useState(false)

  // Load audio devices on mount
  useEffect(() => {
    const loadAudioDevices = async () => {
      try {
        setIsLoadingDevices(true)
        
        // Web mode: use Web Audio API
        if (!isElectronMode()) {
          // First, request microphone permission to ensure devices are enumerated
          if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
              // Request temporary access to get permission
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
              // Stop the stream immediately - we just needed permission
              stream.getTracks().forEach(track => track.stop())
            } catch (permError) {
              console.warn('Microphone permission denied or not yet granted:', permError)
              // Continue anyway - devices might still be available
            }
          }

          // Enumerate audio input devices
          if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
            const devices = await navigator.mediaDevices.enumerateDevices()
            const audioInputs = devices
              .filter(device => device.kind === 'audioinput')
              .map(device => ({
                id: device.deviceId,
                name: device.label || `Microphone ${device.deviceId.slice(0, 8)}...`,
                isDefault: device.deviceId === 'default'
              }))
            
            setAudioDevices(audioInputs)
            console.log(`Loaded ${audioInputs.length} audio input devices in web mode`)
          } else {
            console.error('MediaDevices API not available')
          }
        }
        // Electron mode: use Electron API
        else {
          const result = await (window as any).electron.recording.getDevices()
          if (result.success && result.data) {
            setAudioDevices(result.data)
          } else {
            console.error('Failed to load audio devices from Electron:', result.error)
          }
        }
      } catch (error) {
        console.error('Failed to load audio devices:', error)
      } finally {
        setIsLoadingDevices(false)
      }
    }
    loadAudioDevices()
  }, [])

  const handleTestMicrophone = async () => {
    setIsTesting(true)
    setAudioLevel(0)
    
    try {
      // Web mode: use Web Audio API
      if (!isElectronMode()) {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          console.error('MediaDevices API not available')
          setIsTesting(false)
          return
        }

        // Request microphone access
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: settings.selectedMicrophone ? { exact: settings.selectedMicrophone } : undefined
          }
        })

        // Create audio context and analyzer
        const audioContext = new AudioContext()
        const source = audioContext.createMediaStreamSource(stream)
        const analyzer = audioContext.createAnalyser()
        analyzer.fftSize = 256
        source.connect(analyzer)

        const dataArray = new Uint8Array(analyzer.frequencyBinCount)
        
        // Monitor audio level
        const interval = setInterval(() => {
          analyzer.getByteFrequencyData(dataArray)
          // Calculate average volume
          const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
          // Normalize to 0-100 range
          const level = Math.min(100, (average / 128) * 100)
          setAudioLevel(level)
        }, 100)

        // Stop test after 3 seconds
        setTimeout(() => {
          clearInterval(interval)
          stream.getTracks().forEach(track => track.stop())
          audioContext.close()
          setIsTesting(false)
          setAudioLevel(0)
        }, 3000)
      }
      // Electron mode: use Electron API
      else {
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
              disabled={isLoadingDevices}
            >
              <SelectTrigger>
                {isLoadingDevices ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading devices...</span>
                  </div>
                ) : (
                  <SelectValue placeholder="Select microphone..." />
                )}
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
                    {isLoadingDevices ? 'Loading devices...' : 'No devices available'}
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
