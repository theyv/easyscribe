import React from "react"
import { Mic, Search, Sun, Moon, Bell } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { SyncStatus } from "../common/SyncStatus"

interface HeaderProps {
  className?: string
  theme?: "light" | "dark" | "system"
  onThemeToggle?: () => void
  onSearch?: (query: string) => void
}

export const Header: React.FC<HeaderProps> = ({
  className,
  theme = "system",
  onThemeToggle,
  onSearch,
}) => {
  const [searchQuery, setSearchQuery] = React.useState("")

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    onSearch?.(value)
  }

  const getThemeIcon = () => {
    if (theme === "dark") {
      return <Moon className="h-5 w-5" />
    }
    return <Sun className="h-5 w-5" />
  }

  return (
    <header
      className={cn(
        "flex h-16 items-center justify-between border-b bg-background px-4",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Mic className="h-5 w-5" />
        </div>
        <h1 className="text-xl font-bold">EasyScribe</h1>
      </div>

      <div className="flex flex-1 max-w-md items-center gap-4 px-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search transcriptions..."
            className="pl-9"
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <SyncStatus />
        
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onThemeToggle}
          aria-label="Toggle theme"
        >
          {getThemeIcon()}
        </Button>
      </div>
    </header>
  )
}
