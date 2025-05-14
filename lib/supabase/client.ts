import { createBrowserClient } from '@supabase/ssr'
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

// Original implementation - directly use env vars
const createBrowserSupabaseClient = () => createBrowserClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export function createClient(): SupabaseClient<Database> {
  if (typeof window !== 'undefined' && window.__SUPABASE_LOADING__) {
    return createLoadingClient() as unknown as SupabaseClient<Database>;
  }
  // Directly return the client created with env vars
  return createBrowserSupabaseClient()
} 