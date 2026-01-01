import { File, XCircle, CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react'
import type { QueueItem, QueueItemStatus } from '../../stores/queueStore'
import { Button } from '../ui/button'
import { Progress } from '../ui/progress'
import { Badge } from '../ui/badge'
import { cn } from '../../lib/utils'

interface QueueItemProps {
  item: QueueItem
  onCancel?: (id: string) => void
  onRemove?: (id: string) => void
}

const statusConfig: Record<
  QueueItemStatus,
  {
    icon: React.ReactNode
    label: string
    variant: 'default' | 'secondary' | 'destructive' | 'outline'
    color: string
  }
> = {
  waiting: {
    icon: <Clock className="h-4 w-4" />,
    label: 'Waiting',
    variant: 'secondary',
    color: 'text-muted-foreground'
  },
  processing: {
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
    label: 'Processing',
    variant: 'default',
    color: 'text-primary'
  },
  transcribing: {
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
    label: 'Transcribing',
    variant: 'default',
    color: 'text-primary'
  },
  completed: {
    icon: <CheckCircle className="h-4 w-4" />,
    label: 'Completed',
    variant: 'outline',
    color: 'text-green-600 dark:text-green-400'
  },
  error: {
    icon: <AlertCircle className="h-4 w-4" />,
    label: 'Error',
    variant: 'destructive',
    color: 'text-destructive'
  }
}

export function QueueItem({ item, onCancel, onRemove }: QueueItemProps) {
  const config = statusConfig[item.status]
  const canCancel = ['waiting', 'processing', 'transcribing'].includes(item.status)
  const canRemove = item.status === 'completed' || item.status === 'error'

  return (
    <div className="group flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50">
      {/* File Icon */}
      <div className="flex-shrink-0">
        <File className="h-8 w-8 text-muted-foreground" />
      </div>

      {/* File Info */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{item.fileName}</span>
          <Badge variant={config.variant} className="flex-shrink-0">
            {config.icon}
            <span className="ml-1">{config.label}</span>
          </Badge>
        </div>

        {/* Progress Bar */}
        {['processing', 'transcribing'].includes(item.status) && (
          <div className="flex items-center gap-2">
            <Progress value={item.progress} className="h-2" />
            <span className="text-xs text-muted-foreground">{item.progress}%</span>
          </div>
        )}

        {/* Error Message */}
        {item.status === 'error' && item.error && (
          <p className="text-xs text-destructive">{item.error}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
        {canCancel && onCancel && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onCancel(item.id)}
          >
            <XCircle className="h-4 w-4" />
          </Button>
        )}
        {canRemove && onRemove && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => onRemove(item.id)}
          >
            <XCircle className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
