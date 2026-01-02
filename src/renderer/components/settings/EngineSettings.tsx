import { useState, useEffect, useCallback } from 'react'
import { useSettings } from '../../hooks/useSettings'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Label } from '../ui/label'
import { RadioGroup, RadioGroupItem } from '../ui/radio-group'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Progress } from '../ui/progress'
import { Info, CheckCircle2, AlertCircle, Download, RefreshCw, ExternalLink, X } from 'lucide-react'

export function EngineSettings() {
  const { settings, updateSetting } = useSettings()
  const [pythonAvailable, setPythonAvailable] = useState<boolean>(false)
  const [pythonStatus, setPythonStatus] = useState<any>(null)
  const [checkingStatus, setCheckingStatus] = useState(false)
  const [isWebMode, setIsWebMode] = useState<boolean>(false)
  const [downloading, setDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [downloadMessage, setDownloadMessage] = useState('')
  const [downloadError, setDownloadError] = useState<string | null>(null)

  useEffect(() => {
    // Check if we're in web mode (Electron API not available)
    if (typeof window !== 'undefined' && !window.electron) {
      setIsWebMode(true)
    } else {
      checkPythonStatus()
      setupDownloadProgressListener()
    }

    return () => {
      // Cleanup download progress listener
      if (window.electron?.python?.onModelDownloadProgress) {
        window.electron.python.onModelDownloadProgress(() => {})
      }
    }
  }, [])

  const setupDownloadProgressListener = useCallback(() => {
    if (!window.electron?.python?.onModelDownloadProgress) return

    const unsubscribe = window.electron.python.onModelDownloadProgress((progress) => {
      console.log('Download progress:', progress)
      setDownloadProgress(progress.progress)
      setDownloadMessage(progress.message)
      
      if (progress.status === 'complete') {
        setDownloading(false)
        setDownloadProgress(100)
        setDownloadMessage('Model downloaded successfully!')
        setDownloadError(null)
        // Refresh Python status after download completes
        setTimeout(() => checkPythonStatus(), 1000)
      } else if (progress.status === 'error') {
        setDownloading(false)
        setDownloadError(progress.error || 'Download failed')
      }
    })

    return unsubscribe
  }, [])

  const checkPythonStatus = async () => {
    setCheckingStatus(true)
    try {
      if (!window.electron?.python) {
        setPythonAvailable(false)
        return
      }
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
  const isModelAvailable = pythonStatus?.status === 'ready'
  const modelDownloadUrl = 'https://huggingface.co/guillaumekln/faster-whisper-large-v3'

  const handleDownloadModel = async () => {
    // Check if Python is available before attempting download
    if (!pythonAvailable) {
      setDownloadError('Python is not available. Please install Python and the required dependencies first.')
      return
    }

    if (!window.electron?.python?.downloadModel) {
      // Fallback to opening HuggingFace URL if Electron API not available
      window.open(modelDownloadUrl, '_blank')
      return
    }

    setDownloading(true)
    setDownloadProgress(0)
    setDownloadMessage('Installing dependencies and starting download...')
    setDownloadError(null)

    try {
      const result = await window.electron.python.downloadModel()
      if (!result.success) {
        setDownloading(false)
        setDownloadError(result.error || 'Download failed')
      }
    } catch (error) {
      setDownloading(false)
      setDownloadError(error instanceof Error ? error.message : 'Download failed')
    }
  }

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
                disabled={!isLocalEngineAvailable && !isWebMode}
              />
              <div className="flex-1 space-y-2">
                <Label htmlFor="live-local" className="flex items-center gap-2">
                  <span className="font-medium">Local Engine</span>
                  <Badge variant="secondary">Offline</Badge>
                  {isWebMode && (
                    <Badge variant="outline" className="gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Web Mode
                    </Badge>
                  )}
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
                  {!pythonAvailable && !isWebMode && (
                    <Badge variant="outline" className="gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Not Available
                    </Badge>
                  )}
                </Label>
                <p className="text-sm text-muted-foreground">
                  Runs entirely on your device. No internet connection required.
                  {!pythonAvailable && !isWebMode && (
                    <span className="block mt-1 text-orange-600 dark:text-orange-400">
                      Requires Python and faster-whisper to be installed.
                    </span>
                  )}
                </p>
                
                {/* Model Download Suggestion */}
                {settings.liveTranscriptionEngine === 'local' && !isModelAvailable && (
                  <div className="mt-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <p className="text-sm font-medium text-orange-800 dark:text-orange-300">
                          Model not found
                        </p>
                        <p className="text-xs text-muted-foreground">
                          The Whisper model needs to be downloaded to use local transcription.
                        </p>
                        
                        {!downloading && !downloadError && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7 gap-1"
                            onClick={handleDownloadModel}
                            disabled={!pythonAvailable}
                            title={!pythonAvailable ? 'Python is not available. Please install Python first.' : ''}
                          >
                            <Download className="h-3 w-3" />
                            Download Model
                          </Button>
                        )}
                        
                        {downloading && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">{downloadMessage}</span>
                              <span className="font-medium">{downloadProgress}%</span>
                            </div>
                            <Progress value={downloadProgress} className="h-2" />
                          </div>
                        )}
                        
                        {downloadError && (
                          <div className="space-y-2">
                            <p className="text-xs text-red-600 dark:text-red-400">
                              {downloadError}
                            </p>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-7 gap-1"
                                onClick={handleDownloadModel}
                              >
                                <RefreshCw className="h-3 w-3" />
                                Retry
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs h-7"
                                onClick={() => setDownloadError(null)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
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
                <li>Click the button below to automatically install dependencies and download the model</li>
              </ol>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open('https://github.com/guillaumekln/faster-whisper', '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
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
