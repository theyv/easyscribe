import { useSettings } from '../../hooks/useSettings'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Label } from '../ui/label'
import { Switch } from '../ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Button } from '../ui/button'
import { FileText, FolderOpen } from 'lucide-react'

export function OutputSettings() {
  const { settings, updateSetting } = useSettings()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Output</h2>
        <p className="text-muted-foreground">
          Configure transcription output settings
        </p>
      </div>

      {/* Timestamps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Timestamps
          </CardTitle>
          <CardDescription>
            Configure how timestamps are included in transcriptions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Include Timestamps</Label>
              <p className="text-sm text-muted-foreground">
                Add timestamps to your transcriptions
              </p>
            </div>
            <Switch
              checked={settings.includeTimestamps}
              onCheckedChange={(checked) =>
                updateSetting('includeTimestamps', checked)
              }
            />
          </div>

          {settings.includeTimestamps && (
            <>
              <div className="space-y-2">
                <Label>Timestamp Interval</Label>
                <Select
                  value={settings.timestampInterval}
                  onValueChange={(value) =>
                    updateSetting(
                      'timestampInterval',
                      value as 'auto' | '30s' | '60s' | '120s' | '300s'
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto</SelectItem>
                    <SelectItem value="30s">30 seconds</SelectItem>
                    <SelectItem value="60s">1 minute</SelectItem>
                    <SelectItem value="120s">2 minutes</SelectItem>
                    <SelectItem value="300s">5 minutes</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  How often to insert timestamps in the transcription
                </p>
              </div>

              <div className="space-y-2">
                <Label>Timestamp Format</Label>
                <Select
                  value={settings.timestampFormat}
                  onValueChange={(value) =>
                    updateSetting(
                      'timestampFormat',
                      value as '[HH:MM:SS]' | '[MM:SS]' | '[seconds]'
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="[HH:MM:SS]">[HH:MM:SS]</SelectItem>
                    <SelectItem value="[MM:SS]">[MM:SS]</SelectItem>
                    <SelectItem value="[seconds]">[seconds]</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Display format for timestamps
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Auto Export */}
      <Card>
        <CardHeader>
          <CardTitle>Auto Export</CardTitle>
          <CardDescription>
            Automatically export transcriptions to SRT format
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto Export SRT</Label>
              <p className="text-sm text-muted-foreground">
                Automatically create SRT files for each transcription
              </p>
            </div>
            <Switch
              checked={settings.autoExportSrt}
              onCheckedChange={(checked) =>
                updateSetting('autoExportSrt', checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Output Folder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Default Output Folder
          </CardTitle>
          <CardDescription>
            Choose where transcriptions are saved by default
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Output Location</Label>
            <Select
              value={settings.defaultOutputFolder}
              onValueChange={(value) =>
                updateSetting('defaultOutputFolder', value as 'source' | 'custom')
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="source">Same as source</SelectItem>
                <SelectItem value="custom">Custom folder</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Save transcriptions in the same folder as the audio file or in a
              custom location
            </p>
          </div>

          {settings.defaultOutputFolder === 'custom' && (
            <div className="space-y-2">
              <Label>Custom Folder</Label>
              <div className="flex gap-2">
                <div className="flex-1 rounded-md border bg-muted px-3 py-2 text-sm">
                  {settings.customOutputFolder || 'Not selected'}
                </div>
                <Button variant="outline" type="button">
                  Browse
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Select a custom folder for saving transcriptions
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
