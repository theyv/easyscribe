import React from "react"
import { cn } from "@/lib/utils"

interface PageContainerProps {
  children: React.ReactNode
  className?: string
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  className,
}) => {
  return (
    <main className={cn("flex-1 overflow-auto p-6", className)}>
      {children}
    </main>
  )
}
