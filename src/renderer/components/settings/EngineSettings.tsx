import { useState, useEffect } from 'react'
import { useSettings } from '../../hooks/useSettings'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Label } from '../ui/label'
import { RadioGroup, RadioGroupItem } from '../ui/radio-group'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Info, CheckCircle2, AlertCircle, Download, RefreshCw } from 'lucide-react'

export function EngineSettings() {
  const { settings, updateSetting } = useSettings()
  const [pythonAvailable, setPythonAvailable] = useState<boolean>(false)
  const [pythonStatus, setPythonStatus] = useState<any>(null)
  const [checkingStatus, setCheckingStatus] = useState(false)

  useEffect(() => {
    checkPythonStatus()
  }, [])

  const checkPythonStatus = async () => {
    setCheckingStatus(true)
    try {
      const availableResult = await window.electron.python.isAvailable()
      setPythonAvailable(availableResult.data?.available || false)
      
      if (availableResult.data?.available) {
        const statusResult = await window.electron.python.getStatus()
        setPythonStatus(statusResult.data)
      }
    } catch (error) {
      console.error('Failed to check Python status:', error)
      setPythonAvailable(false)
    } finally {
      setCheckingStatus(false)
    }
  }

  const isLocalEngineAvailable = pythonAvailable && pythonStatus?.available !== false

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Engines</h2>
        <p className="text-muted-foreground">
          Configure transcription engines for live and file transcription
        </p>
      </div>

      {/* Live Transcription Engine */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Live Transcription Engine</CardTitle>
              <CardDescription>
                Select the engine to use for real-time transcription during recording
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={checkPythonStatus}
              disabled={checkingStatus}
              title="Refresh Python status"
            >
              <RefreshCw className={`h-4 w-4 ${checkingStatus ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={settings.liveTranscriptionEngine}
            onValueChange={(value: string) =>
              updateSetting('liveTranscriptionEngine', value as 'local' | 'groq')
            }
          >
            <div className="flex items-start space-x-3">
              <RadioGroupItem
                value="local"
                id="live-local"
                disabled={!isLocalEngineAvailable}
              />
              <div className="flex-1 space-y-2">
                <Label htmlFor="live-local" className="flex items-center gap-2">
                  <span className="font-medium">Local Engine</span>
                  <Badge variant="secondary">Offline</Badge>
                  {pythonStatus?.status === 'ready' && (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Ready
                    </Badge>
                  )}
                  {pythonStatus?.status === 'error' && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Error
                    </Badge>
                  )}
                  {!pythonAvailable && (
                    <Badge variant="outline" className="gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Not Available
                    </Badge>
                  )}
                </Label>
                <p className="text-sm text-muted-foreground">
                  Runs entirely on your device. No internet connection required.
                  {!pythonAvailable && (
                    <span className="block mt-1 text-orange-600 dark:text-orange-400">
                      Requires Python and faster-whisper to be installed.
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <RadioGroupItem value="groq" id="live-groq" />
              <div className="flex-1 space-y-2">
                <Label htmlFor="live-groq" className="flex items-center gap-2">
                  <span className="font-medium">Groq Engine</span>
                  <Badge variant="outline">Cloud</Badge>
                  {settings.groqApiKeyValid ? (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Not Configured
                    </Badge>
                  )}
                </Label>
                <p className="text-sm text-muted-foreground">
                  Fast, accurate cloud-based transcription. Requires API key.
                </p>
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* File Transcription Engine */}
      <Card>
        <CardHeader>
          <CardTitle>File Transcription Engine</CardTitle>
          <CardDescription>
            Select the engine to use for transcribing audio files
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={settings.fileTranscriptionEngine}
            onValueChange={(value: string) =>
              updateSetting('fileTranscriptionEngine', value as 'local' | 'groq')
            }
          >
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="local" id="file-local" />
              <div className="flex-1 space-y-2">
                <Label htmlFor="file-local" className="flex items-center gap-2">
                  <span className="font-medium">Local Engine</span>
                  <Badge variant="secondary">Offline</Badge>
                </Label>
                <p className="text-sm text-muted-foreground">
                  Runs entirely on your device. No internet connection required.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <RadioGroupItem value="groq" id="file-groq" />
              <div className="flex-1 space-y-2">
                <Label htmlFor="file-groq" className="flex items-center gap-2">
                  <span className="font-medium">Groq Engine</span>
                  <Badge variant="outline">Cloud</Badge>
                  {settings.groqApiKeyValid ? (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Not Configured
                    </Badge>
                  )}
                </Label>
                <p className="text-sm text-muted-foreground">
                  Fast, accurate cloud-based transcription. Requires API key.
                </p>
              </div>
            </div>
          </RadioGroup>

          <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
            <p className="text-sm text-muted-foreground">
              File transcription engine can be configured independently from live
              transcription. This allows you to use local transcription for live
              recording while using cloud transcription for faster file processing.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Python Setup Instructions */}
      {!pythonAvailable && (
        <Card>
          <CardHeader>
            <CardTitle>Python Setup Required</CardTitle>
            <CardDescription>
              To use the local transcription engine, you need to install Python and the required dependencies
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold">Installation Steps:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Install Python 3.9 or later from <a href="https://python.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">python.org</a></li>
                <li>Run the setup script for your platform:</li>
              </ol>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open('https://github.com/guillaumekln/faster-whisper', '_blank')}
              >
                <Download className="h-4 w-4 mr-2" />
                View Setup Guide
              </Button>
              <Button
                variant="default"
                className="w-full"
                onClick={checkPythonStatus}
                disabled={checkingStatus}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${checkingStatus ? 'animate-spin' : ''}`} />
                Check Again
              </Button>
            </div>

            <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
              <p className="text-sm text-muted-foreground">
                The local engine uses faster-whisper, an optimized implementation of OpenAI's Whisper model.
                It requires approximately 2-3GB of disk space and works best with a dedicated GPU.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
