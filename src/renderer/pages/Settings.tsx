import { useState } from 'react'
import { SettingsSection } from '../../shared/types'
import { useSettings } from '../hooks/useSettings'
import { SettingsLayout } from '../components/settings/SettingsLayout'
import { DeviceSettings } from '../components/settings/DeviceSettings'
import { EngineSettings } from '../components/settings/EngineSettings'
import { ApiSettings } from '../components/settings/ApiSettings'
import { HotkeySettings } from '../components/settings/HotkeySettings'
import { OutputSettings } from '../components/settings/OutputSettings'
import { AudioSettings } from '../components/settings/AudioSettings'
import { AppearanceSettings } from '../components/settings/AppearanceSettings'
import { BehaviorSettings } from '../components/settings/BehaviorSettings'
import { DataSettings } from '../components/settings/DataSettings'
import { SettingsSkeleton } from '../components/common/LoadingSkeleton'
import { Button } from '../components/ui/button'
import { Save, RotateCcw, Loader2 } from 'lucide-react'

export function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('device')
  const { hasUnsavedChanges, saveSettings, resetSettings, isLoading, isInitialLoading } = useSettings()

  const handleSave = async () => {
    await saveSettings()
  }

  const handleReset = () => {
    resetSettings()
  }

  // Show loading skeleton during initial load
  if (isInitialLoading) {
    return <SettingsSkeleton />
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'device':
        return <DeviceSettings />
      case 'engines':
        return <EngineSettings />
      case 'api':
        return <ApiSettings />
      case 'hotkeys':
        return <HotkeySettings />
      case 'output':
        return <OutputSettings />
      case 'audio':
        return <AudioSettings />
      case 'appearance':
        return <AppearanceSettings />
      case 'behavior':
        return <BehaviorSettings />
      case 'data':
        return <DataSettings />
      default:
        return <DeviceSettings />
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SettingsLayout
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      >
        <div className="space-y-6">
          {renderSection()}

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-4 rounded-lg border bg-card p-4">
            <div>
              <p className="text-sm font-medium">Unsaved Changes</p>
              <p className="text-sm text-muted-foreground">
                {hasUnsavedChanges
                  ? 'You have unsaved changes'
                  : 'All changes are saved'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={!hasUnsavedChanges || isLoading}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasUnsavedChanges || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </SettingsLayout>
    </div>
  )
}
