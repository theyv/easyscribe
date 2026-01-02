import { useSettings } from '../../hooks/useSettings'
import { useTheme } from '../providers/ThemeProvider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Label } from '../ui/label'
import { RadioGroup, RadioGroupItem } from '../ui/radio-group'
import { Palette, Sun, Moon, Monitor } from 'lucide-react'

const ACCENT_COLORS = [
  { name: 'violet', color: '#8B5CF6', label: 'Violet' },
  { name: 'blue', color: '#3B82F6', label: 'Blue' },
  { name: 'green', color: '#22C55E', label: 'Green' },
  { name: 'orange', color: '#F97316', label: 'Orange' },
  { name: 'pink', color: '#EC4899', label: 'Pink' },
  { name: 'red', color: '#EF4444', label: 'Red' }
] as const

export function AppearanceSettings() {
  const { settings, updateSetting } = useSettings()
  const { setTheme, setAccentColor } = useTheme()

  const handleThemeChange = (value: 'light' | 'dark' | 'system') => {
    updateSetting('theme', value)
    setTheme(value)
  }

  const handleAccentColorChange = (color: 'violet' | 'blue' | 'green' | 'orange' | 'pink' | 'red') => {
    updateSetting('accentColor', color)
    setAccentColor(color)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Appearance</h2>
        <p className="text-muted-foreground">
          Customize the look and feel of the application
        </p>
      </div>

      {/* Theme */}
      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
          <CardDescription>
            Select your preferred color theme
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={settings.theme}
            onValueChange={handleThemeChange}
          >
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="light" id="theme-light" />
              <Label htmlFor="theme-light" className="flex items-center gap-3 cursor-pointer">
                <Sun className="h-5 w-5" />
                <div>
                  <p className="font-medium">Light</p>
                  <p className="text-sm text-muted-foreground">
                    Always use light mode
                  </p>
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-3">
              <RadioGroupItem value="dark" id="theme-dark" />
              <Label htmlFor="theme-dark" className="flex items-center gap-3 cursor-pointer">
                <Moon className="h-5 w-5" />
                <div>
                  <p className="font-medium">Dark</p>
                  <p className="text-sm text-muted-foreground">
                    Always use dark mode
                  </p>
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-3">
              <RadioGroupItem value="system" id="theme-system" />
              <Label htmlFor="theme-system" className="flex items-center gap-3 cursor-pointer">
                <Monitor className="h-5 w-5" />
                <div>
                  <p className="font-medium">System</p>
                  <p className="text-sm text-muted-foreground">
                    Match your system preference
                  </p>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Accent Color */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Accent Color
          </CardTitle>
          <CardDescription>
            Choose your preferred accent color
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {ACCENT_COLORS.map((color) => (
              <button
                key={color.name}
                onClick={() => handleAccentColorChange(color.name)}
                className={`
                  flex items-center gap-3 rounded-lg border-2 p-3 transition-colors
                  ${settings.accentColor === color.name
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                  }
                `}
              >
                <div
                  className="h-8 w-8 rounded-full"
                  style={{ backgroundColor: color.color }}
                />
                <span className="font-medium">{color.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
