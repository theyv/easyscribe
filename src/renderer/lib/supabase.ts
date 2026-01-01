import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validate environment variables
if (!supabaseUrl) {
  throw new Error('VITE_SUPABASE_URL environment variable is not set')
}

if (!supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_ANON_KEY environment variable is not set')
}

// Create Supabase client
let supabaseInstance: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
        db: {
          schema: 'public',
        },
        global: {
          headers: {
            'x-application-name': 'easyscribe',
          },
        },
      })
    } catch (error) {
      console.error('Failed to create Supabase client:', error)
      throw new Error(`Failed to initialize Supabase client: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  return supabaseInstance
}

// Export a singleton instance
export const supabase = getSupabaseClient()

// Test connection function
export async function testConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('devices').select('id').limit(1)
    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown connection error',
    }
  }
}

// Health check function
export async function healthCheck(): Promise<boolean> {
  try {
    const result = await testConnection()
    return result.success
  } catch {
    return false
  }
}
