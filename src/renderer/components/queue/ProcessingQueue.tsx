import { ListMusic, X } from 'lucide-react'
import { useQueue } from '../../hooks/useQueue'
import { QueueItem } from './QueueItem'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { ScrollArea } from '../ui/scroll-area'
import { Badge } from '../ui/badge'

interface ProcessingQueueProps {
  className?: string
}

export function ProcessingQueue({ className }: ProcessingQueueProps) {
  const {
    items,
    queueStatus,
    cancelItem,
    cancelAll,
    removeFromQueue,
    clearCompleted
  } = useQueue()

  const hasActiveItems = queueStatus.active > 0
  const hasItems = items.length > 0

  if (!hasItems) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ListMusic className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-center text-sm text-muted-foreground">
            No files in queue
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListMusic className="h-5 w-5" />
            <CardTitle>Processing Queue</CardTitle>
            <Badge variant="secondary">{queueStatus.total}</Badge>
          </div>
          <div className="flex items-center gap-2">
            {queueStatus.completed > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCompleted}
              >
                Clear Completed
              </Button>
            )}
            {hasActiveItems && (
              <Button
                variant="destructive"
                size="sm"
                onClick={cancelAll}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel All
              </Button>
            )}
          </div>
        </div>
        {queueStatus.active > 0 && (
          <CardDescription>
            Processing {queueStatus.active} file{queueStatus.active !== 1 ? 's' : ''}...
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-2">
            {items.map((item) => (
              <QueueItem
                key={item.id}
                item={item}
                onCancel={cancelItem}
                onRemove={removeFromQueue}
              />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
