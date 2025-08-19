import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

// For tests - artificial delay to support loading state tests
const createLoadingClient = () => ({
  auth: {
    signInWithPassword: () => new Promise(() => {
      // Never resolve to keep in loading state
      setTimeout(() => {}, 10000);
    })
  }
})

// Official Supabase client implementation
const createBrowserSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[SUPABASE CLIENT] Missing environment variables:', {
      url: !!supabaseUrl,
      key: !!supabaseAnonKey,
      env: process.env.NODE_ENV
    })
    throw new Error('Missing Supabase environment variables')
  }
  
  console.log('[SUPABASE CLIENT] Initializing with:', {
    url: supabaseUrl,
    key: supabaseAnonKey.substring(0, 50) + '...',
    env: process.env.NODE_ENV
  })
  
  return createSupabaseClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    }
  )
}

export function createClient(): SupabaseClient<Database> {
  if (typeof window !== 'undefined' && window.__SUPABASE_LOADING__) {
    return createLoadingClient() as unknown as SupabaseClient<Database>;
  }
  // Return the official Supabase client
  return createBrowserSupabaseClient()
} 