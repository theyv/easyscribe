import { useState } from 'react'
import { SettingsSection } from '../../../shared/types'
import { cn } from '../../lib/utils'
import { Button } from '../ui/button'
import { ScrollArea } from '../ui/scroll-area'
import {
  Menu,
  X,
  Monitor,
  Settings,
  Key,
  Keyboard,
  FileText,
  Mic,
  Palette,
  Bell,
  Database
} from 'lucide-react'

interface SettingsLayoutProps {
  children: React.ReactNode
  activeSection: SettingsSection
  onSectionChange: (section: SettingsSection) => void
}

const SECTIONS: { id: SettingsSection; label: string; icon: React.ReactNode }[] = [
  { id: 'device', label: 'Device', icon: <Monitor className="h-5 w-5" /> },
  { id: 'engines', label: 'Engines', icon: <Settings className="h-5 w-5" /> },
  { id: 'api', label: 'API', icon: <Key className="h-5 w-5" /> },
  { id: 'hotkeys', label: 'Hotkeys', icon: <Keyboard className="h-5 w-5" /> },
  { id: 'output', label: 'Output', icon: <FileText className="h-5 w-5" /> },
  { id: 'audio', label: 'Audio', icon: <Mic className="h-5 w-5" /> },
  { id: 'appearance', label: 'Appearance', icon: <Palette className="h-5 w-5" /> },
  { id: 'behavior', label: 'Behavior', icon: <Bell className="h-5 w-5" /> },
  { id: 'data', label: 'Data', icon: <Database className="h-5 w-5" /> }
]

export function SettingsLayout({
  children,
  activeSection,
  onSectionChange
}: SettingsLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="flex items-center justify-between border-b p-4 md:hidden">
        <h1 className="text-lg font-semibold">Settings</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          'w-full border-r bg-muted/40 md:w-64 md:block',
          mobileMenuOpen ? 'block' : 'hidden md:block'
        )}
      >
        <div className="hidden border-b p-6 md:block">
          <h1 className="text-xl font-semibold">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configure your preferences
          </p>
        </div>

        <ScrollArea className="h-[calc(100vh-73px)] md:h-[calc(100vh-81px)]">
          <nav className="space-y-1 p-4">
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => {
                  onSectionChange(section.id)
                  setMobileMenuOpen(false)
                }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  activeSection === section.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground'
                )}
              >
                {section.icon}
                {section.label}
              </button>
            ))}
          </nav>
        </ScrollArea>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="container max-w-4xl py-6 md:py-10">
          {children}
        </div>
      </main>
    </div>
  )
}
