import React from "react"
import { cn } from "@/lib/utils"

export interface BentoItem {
  id: string
  content: React.ReactNode
  colSpan?: 1 | 2
  rowSpan?: 1 | 2
}

interface BentoGridProps {
  children: React.ReactNode
  className?: string
}

export const BentoGrid: React.FC<BentoGridProps> = ({ children, className }) => {
  return (
    <div
      className={cn(
        "grid auto-rows-[minmax(180px,auto)] gap-4",
        "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
        className
      )}
    >
      {children}
    </div>
  )
}

export const BentoItem: React.FC<BentoItem & { className?: string }> = ({
  id,
  content,
  colSpan = 1,
  rowSpan = 1,
  className,
}) => {
  return (
    <div
      key={id}
      className={cn(
        "rounded-xl border bg-card p-6 shadow-sm",
        "transition-all hover:shadow-md",
        colSpan === 2 && "md:col-span-2",
        rowSpan === 2 && "md:row-span-2",
        className
      )}
    >
      {content}
    </div>
  )
}
