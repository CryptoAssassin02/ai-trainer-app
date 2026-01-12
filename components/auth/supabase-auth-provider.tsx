'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { createClient } from '@/utils/supabase/client'
import { type User as SupabaseUser } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import type { UserProfile } from '@/lib/api/types'

// Re-export types for compatibility with existing code
export type User = {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  created_at?: string;
  updated_at?: string;
};

export type Session = {
  access_token: string;
  refresh_token?: string;
  user: {
    id: string;
    email: string;
  };
};

export interface AuthContextType {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<void>
  signUp: (name: string, email: string, password: string) => Promise<{ requiresEmailVerification: boolean }>
}

// Helper function to convert Supabase user to our User type
const mapSupabaseUser = (supabaseUser: SupabaseUser): User => ({
  id: supabaseUser.id,
  email: supabaseUser.email || '',
  name: supabaseUser.user_metadata?.name || supabaseUser.user_metadata?.full_name,
  avatarUrl: supabaseUser.user_metadata?.avatar_url,
  created_at: supabaseUser.created_at,
  updated_at: supabaseUser.updated_at,
});

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.error('Error getting session:', error)
        }
        setUser(session?.user ? mapSupabaseUser(session.user) : null)
        
        // Store JWT token for custom backend API compatibility
        if (session?.access_token) {
          sessionStorage.setItem('auth_token', session.access_token)
          sessionStorage.setItem('user_id', session.user.id)
          sessionStorage.setItem('user_email', session.user.email || '')
          console.log('✅ [SUPABASE AUTH] Stored JWT token for backend API')
        } else {
          sessionStorage.removeItem('auth_token')
          sessionStorage.removeItem('user_id')
          sessionStorage.removeItem('user_email')
          console.log('🧹 [SUPABASE AUTH] Cleared JWT tokens')
        }
      } catch (error) {
        console.error('Session error:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email)
        setUser(session?.user ? mapSupabaseUser(session.user) : null)
        setLoading(false)
        
        // Store/clear JWT token for custom backend API compatibility
        if (session?.access_token) {
          sessionStorage.setItem('auth_token', session.access_token)
          sessionStorage.setItem('user_id', session.user.id)
          sessionStorage.setItem('user_email', session.user.email || '')
          console.log('✅ [SUPABASE AUTH] Stored JWT token for backend API')
        } else {
          // Clear tokens on sign out
          sessionStorage.removeItem('auth_token')
          sessionStorage.removeItem('user_id')
          sessionStorage.removeItem('user_email')
          localStorage.removeItem('auth_token')
          localStorage.removeItem('user_id')
          localStorage.removeItem('user_email')
          console.log('🧹 [SUPABASE AUTH] Cleared all auth tokens')
        }
        
        // Handle auth events
        if (event === 'SIGNED_IN') {
          router.refresh()
        } else if (event === 'SIGNED_OUT') {
          // Use replace instead of push to avoid navigation history issues
          // and don't call refresh immediately to prevent RSC fetch conflicts
          router.replace('/login')
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase.auth, router])

  const signOut = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Sign out error:', error)
      }
    } catch (error) {
      console.error('Sign out error:', error)
    }
    // Loading will be set to false by auth state change listener
  }

  const refreshSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession()
      if (error) {
        console.error('Refresh session error:', error)
      }
      setUser(session?.user ? mapSupabaseUser(session.user) : null)
    } catch (error) {
      console.error('Refresh session error:', error)
    }
  }

  const signIn = async (email: string, password: string, rememberMe = false) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        throw error
      }
      
      // User state will be updated by the auth state change listener
      // JWT token will be stored by the auth state change listener
    } catch (error) {
      console.error('Sign in error:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (name: string, email: string, password: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
            full_name: name,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      
      if (error) {
        throw error
      }
      
      // Return whether email verification is required
      return {
        requiresEmailVerification: Boolean(!data.session && data.user && !data.user.email_confirmed_at)
      }
    } catch (error) {
      console.error('Sign up error:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated: !!user,
    signOut,
    refreshSession,
    signIn,
    signUp,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within a SupabaseAuthProvider')
  }
  return context
}