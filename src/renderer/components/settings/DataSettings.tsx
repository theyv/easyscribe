import { useState } from 'react'
import { useSettings } from '../../hooks/useSettings'
import { useTranscriptions } from '../../hooks/useTranscriptions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { Download, Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import { formatTranscriptionsAsTxt, formatTranscriptionsAsSrt } from '../../lib/formatters'
import { supabase } from '../../lib/supabase'
import type { Transcription } from '@/shared/types'

export function DataSettings() {
  const { resetSettings } = useSettings()
  const { transcriptions } = useTranscriptions()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleExportAll = async (format: 'txt' | 'srt' = 'txt') => {
    setIsExporting(true)
    try {
      // Fetch all transcriptions from Supabase
      const { data: transcriptionsData, error } = await supabase
        .from('transcriptions')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Convert Supabase snake_case to camelCase for Transcription type
      const allTranscriptions: Transcription[] = (transcriptionsData || []).map((t) => ({
        id: t.id,
        device_id: t.device_id,
        folder_id: t.folder_id,
        title: t.title,
        content: t.content,
        source_filename: t.source_filename,
        audio_path: t.audio_path,
        duration: t.duration,
        type: t.type,
        language: t.language,
        metadata: t.metadata,
        synced: t.synced,
        created_at: t.created_at,
        updated_at: t.updated_at,
        tags: t.tags
      }))

      // Handle empty state
      if (allTranscriptions.length === 0) {
        alert('No transcriptions to export.')
        return
      }

      // Format transcriptions based on selected format
      let content: string
      let filename: string
      let mimeType: string

      if (format === 'srt') {
        content = formatTranscriptionsAsSrt(allTranscriptions)
        filename = `transcriptions-${new Date().toISOString().slice(0, 10)}.srt`
        mimeType = 'text/plain'
      } else {
        content = formatTranscriptionsAsTxt(allTranscriptions)
        filename = `transcriptions-${new Date().toISOString().slice(0, 10)}.txt`
        mimeType = 'text/plain'
      }

      // Create Blob and trigger download
      const blob = new Blob([content], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      console.log(`Exported ${allTranscriptions.length} transcriptions as ${format.toUpperCase()}`)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export transcriptions. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const handleClearCache = async () => {
    setIsClearing(true)
    try {
      // TODO: Implement actual cache clearing
      await new Promise((resolve) => setTimeout(resolve, 1500))
    } catch (error) {
      console.error('Clear cache failed:', error)
    } finally {
      setIsClearing(false)
    }
  }

  const handleDeleteAllData = async () => {
    setIsDeleting(true)
    try {
      // TODO: Implement actual data deletion
      await new Promise((resolve) => setTimeout(resolve, 2000))
      resetSettings()
      setShowDeleteDialog(false)
    } catch (error) {
      console.error('Delete data failed:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Data Management</h2>
        <p className="text-muted-foreground">
          Export, clear, or delete your data
        </p>
      </div>

      {/* Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Data
          </CardTitle>
          <CardDescription>
            Export all your transcriptions and settings
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleExportAll('txt')}
              disabled={isExporting}
              className="flex-1"
            >
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export as TXT
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExportAll('srt')}
              disabled={isExporting}
              className="flex-1"
            >
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export as SRT
                </>
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Export all your transcriptions in TXT or SRT format
          </p>
        </CardContent>
      </Card>

      {/* Cache */}
      <Card>
        <CardHeader>
          <CardTitle>Local Cache</CardTitle>
          <CardDescription>
            Clear cached data to free up space
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={handleClearCache}
            disabled={isClearing}
          >
            {isClearing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Clearing...
              </>
            ) : (
              'Clear Local Cache'
            )}
          </Button>
          <p className="mt-2 text-sm text-muted-foreground">
            This will clear temporary files and cached data. Your transcriptions
            will not be affected.
          </p>
        </CardContent>
      </Card>

      {/* Delete All Data */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Delete All Data
          </CardTitle>
          <CardDescription>
            Permanently delete all transcriptions and settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete All Data
          </Button>
          <p className="mt-2 text-sm text-muted-foreground">
            This action cannot be undone. All your transcriptions, settings,
            and data will be permanently deleted.
          </p>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete All Data
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete all your data? This action cannot be
              undone and will permanently delete:
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• All transcriptions</li>
            <li>• All settings and preferences</li>
            <li>• All cached data</li>
            <li>• All local files</li>
          </ul>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAllData}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Everything'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
