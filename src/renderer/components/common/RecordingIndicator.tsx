import React, { useEffect, useState } from 'react'
import { Mic, MicOff, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useRecordingStore } from '../../stores/recordingStore'
import { RecordingState } from '../../../shared/types'

export interface RecordingIndicatorProps {
  className?: string
}

export const RecordingIndicator: React.FC<RecordingIndicatorProps> = ({ className }) => {
  const { state, recordingDuration, audioLevel, transcriptionResult, insertionStatus, error } = useRecordingStore()
  const [formattedDuration, setFormattedDuration] = useState('00:00')

  // Format duration to MM:SS
  useEffect(() => {
    const mins = Math.floor(recordingDuration / 60)
    const secs = Math.floor(recordingDuration % 60)
    setFormattedDuration(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`)
  }, [recordingDuration])

  // Get indicator state
  const getIndicatorState = () => {
    switch (state) {
      case RecordingState.RECORDING:
        return {
          icon: Mic,
          iconColor: 'text-red-500',
          bgColor: 'bg-red-500',
          pulse: true,
          text: 'Recording...'
        }
      case RecordingState.PROCESSING:
        return {
          icon: Loader2,
          iconColor: 'text-blue-500',
          bgColor: 'bg-blue-500',
          pulse: false,
          text: 'Processing...'
        }
      case RecordingState.DONE:
        return {
          icon: CheckCircle,
          iconColor: 'text-green-500',
          bgColor: 'bg-green-500',
          pulse: false,
          text: insertionStatus === 'success' ? 'Text inserted!' : 'Done'
        }
      case RecordingState.IDLE:
        return {
          icon: MicOff,
          iconColor: 'text-muted-foreground',
          bgColor: 'bg-muted',
          pulse: false,
          text: 'Ready to record'
        }
      default:
        return {
          icon: MicOff,
          iconColor: 'text-muted-foreground',
          bgColor: 'bg-muted',
          pulse: false,
          text: 'Ready to record'
        }
    }
  }

  const indicatorState = getIndicatorState()
  const Icon = indicatorState.icon

  return (
    <div
      className={cn(
        'fixed top-4 right-4 z-50 flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg transition-all duration-300',
        indicatorState.bgColor,
        className
      )}
    >
      {/* Icon */}
      <div className="relative">
        <Icon
          className={cn(
            'h-5 w-5 text-white',
            indicatorState.pulse && 'animate-pulse'
          )}
        />
        {indicatorState.pulse && (
          <div className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-red-500 animate-ping" />
        )}
      </div>

      {/* Text */}
      <div className="flex flex-col">
        <span className="text-sm font-medium text-white">{indicatorState.text}</span>
        {state === RecordingState.RECORDING && (
          <span className="text-xs text-white/80">{formattedDuration}</span>
        )}
      </div>

      {/* Audio level indicator (only during recording) */}
      {state === RecordingState.RECORDING && (
        <div className="flex items-end gap-1 ml-2 h-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={cn(
                'w-1 bg-white/80 rounded-full transition-all duration-100',
                i < Math.ceil(audioLevel / 20) ? 'h-4' : 'h-1'
              )}
            />
          ))}
        </div>
      )}

      {/* Error indicator */}
      {error && (
        <div className="ml-2">
          <XCircle className="h-5 w-5 text-white" />
        </div>
      )}
    </div>
  )
}
