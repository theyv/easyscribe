import { useState } from 'react'
import { useSettings } from '../../hooks/useSettings'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, Key, Database } from 'lucide-react'

export function ApiSettings() {
  const { settings, updateSetting } = useSettings()
  const [showGroqKey, setShowGroqKey] = useState(false)
  const [showSupabaseKey, setShowSupabaseKey] = useState(false)
  const [testingGroq, setTestingGroq] = useState(false)
  const [testingSupabase, setTestingSupabase] = useState(false)

  const handleTestGroqKey = async () => {
    setTestingGroq(true)
    try {
      // Test API key via IPC (this will use the groqClient module)
      // For now, we'll do a simple validation
      if (settings.groqApiKey && settings.groqApiKey.startsWith('gsk_')) {
        updateSetting('groqApiKeyValid', true)
      } else {
        updateSetting('groqApiKeyValid', false)
      }
    } catch (error) {
      updateSetting('groqApiKeyValid', false)
    } finally {
      setTestingGroq(false)
    }
  }

  const handleTestSupabase = async () => {
    setTestingSupabase(true)
    try {
      // TODO: Implement actual Supabase connection test
      await new Promise((resolve) => setTimeout(resolve, 1000))
    } catch (error) {
      console.error('Supabase connection failed:', error)
    } finally {
      setTestingSupabase(false)
    }
  }

  const isSupabaseConfigured =
    settings.supabaseProjectUrl && settings.supabaseAnonKey

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">API Configuration</h2>
        <p className="text-muted-foreground">
          Configure API keys for cloud services
        </p>
      </div>

      {/* Groq API */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Groq API
          </CardTitle>
          <CardDescription>
            Enter your Groq API key to use the Groq transcription engine
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="groq-api-key">API Key</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="groq-api-key"
                  type={showGroqKey ? 'text' : 'password'}
                  value={settings.groqApiKey}
                  onChange={(e) => updateSetting('groqApiKey', e.target.value)}
                  placeholder="gsk_..."
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowGroqKey(!showGroqKey)}
                >
                  {showGroqKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Button
                variant="outline"
                onClick={handleTestGroqKey}
                disabled={!settings.groqApiKey || testingGroq}
              >
                {testingGroq ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Test'
                )}
              </Button>
            </div>
          </div>

          {settings.groqApiKey && (
            <div className="flex items-center gap-2">
              {settings.groqApiKeyValid ? (
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Valid
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Invalid
                </Badge>
              )}
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            Get your API key from{' '}
            <a
              href="https://console.groq.com/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Groq Console
            </a>
          </p>
        </CardContent>
      </Card>

      {/* Supabase */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Supabase
          </CardTitle>
          <CardDescription>
            Configure Supabase for cloud sync and data storage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="supabase-url">Project URL</Label>
            <Input
              id="supabase-url"
              value={settings.supabaseProjectUrl}
              onChange={(e) =>
                updateSetting('supabaseProjectUrl', e.target.value)
              }
              placeholder="https://your-project.supabase.co"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="supabase-anon-key">Anon Key</Label>
            <div className="relative">
              <Input
                id="supabase-anon-key"
                type={showSupabaseKey ? 'text' : 'password'}
                value={settings.supabaseAnonKey}
                onChange={(e) =>
                  updateSetting('supabaseAnonKey', e.target.value)
                }
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowSupabaseKey(!showSupabaseKey)}
              >
                {showSupabaseKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={handleTestSupabase}
            disabled={!isSupabaseConfigured || testingSupabase}
            className="w-full"
          >
            {testingSupabase ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing Connection...
              </>
            ) : (
              'Test Connection'
            )}
          </Button>

          {isSupabaseConfigured && (
            <div className="flex items-center gap-2">
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Configured
              </Badge>
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            Get your project credentials from{' '}
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Supabase Dashboard
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
