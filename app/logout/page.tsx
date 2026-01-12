'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/supabase-auth-provider'

export default function LogoutPage() {
  const router = useRouter()
  const { signOut } = useAuth()

  useEffect(() => {
    async function logout() {
      try {
        await signOut()
        // Don't redirect here - let the auth provider handle it to avoid double redirects
      } catch (error) {
        console.error('Logout error:', error)
        // Only redirect on error, since auth provider won't handle failed logout
        router.push('/login')
      }
    }
    logout()
  }, [router, signOut])

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Effects - consistent with landing page */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-background/50" />
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(100,149,237,0.1),transparent_50%)]" />
      </div>

      {/* Content */}
      <div className="relative flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-cornflower-blue/10 border border-cornflower-blue/20 mb-6">
            <div className="w-4 h-4 border-2 border-cornflower-blue border-t-transparent rounded-full animate-spin mr-2" />
            <span className="text-sm font-medium text-cornflower-blue">Signing Out</span>
          </div>
          
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
            Logging out...
          </h1>
          
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            You will be redirected to the login page momentarily.
          </p>
        </div>
      </div>
    </div>
  )
}
