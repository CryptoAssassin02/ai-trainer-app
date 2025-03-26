import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // For tests - artificial delay to support loading state tests
  if (typeof window !== 'undefined' && window.__SUPABASE_LOADING__) {
    return {
      auth: {
        signInWithPassword: () => new Promise(() => {
          // Never resolve to keep in loading state
          setTimeout(() => {}, 10000);
        })
      }
    }
  }
  
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
} 