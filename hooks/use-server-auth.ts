/**
 * Server-side compatible auth hook for use with Supabase SSR
 * This replaces the client-side AuthProvider when using middleware-based auth
 */

'use client'

import { createClient } from '@/utils/supabase/client'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'

interface ServerAuthState {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
}

export function useServerAuth(): ServerAuthState {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setUser(session?.user ?? null)
      } catch (error) {
        console.error('Error getting session:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  return {
    user,
    loading,
    isAuthenticated: !!user,
  }
}

// Compatibility export for existing code
export function useAuth() {
  return useServerAuth()
}
