'use client'

import { FormEvent, useState, useEffect } from 'react'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { Sun, Moon, Sparkles, Loader2 } from 'lucide-react'
import { useAuth } from '@/components/auth/supabase-auth-provider'
import { useRedirectIfAuthenticated } from '@/hooks/use-auth-redirect'

export default function SignUp() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const { signUp, loading } = useAuth()
  const { theme, setTheme } = useTheme()

  // Redirect if already authenticated
  useRedirectIfAuthenticated('/')

  // Ensure component is mounted before rendering theme toggle
  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setMessage(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    try {
      const result = await signUp(name, email, password)
      
      if (result.requiresEmailVerification) {
        setMessage('Check your email for the confirmation link before signing in')
      } else {
        // User is automatically logged in, AuthProvider will handle redirect
      }
    } catch (error) {
      console.error('Sign up failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.'
      setError(errorMessage)
    }
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Effects - consistent with landing page */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-background/50"></div>
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(100,149,237,0.1),transparent_50%)]"></div>
      </div>
      
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex-shrink-0">
              <Link href="/" className="text-2xl font-bold text-cornflower-blue hover:text-cornflower-blue/80 transition-colors">
                trAIner
              </Link>
            </div>

            {/* Theme Toggle */}
            <div className="flex items-center space-x-4">
              <Link
                href="/login"
                className="text-foreground hover:text-cornflower-blue transition-colors duration-200 font-medium"
              >
                Sign In
              </Link>
              {mounted && (
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors duration-200"
                  aria-label="Toggle theme"
                >
                  {theme === 'dark' ? (
                    <Sun className="h-5 w-5 text-cornflower-blue" />
                  ) : (
                    <Moon className="h-5 w-5 text-cornflower-blue" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-cornflower-blue/10 rounded-2xl mb-6">
              <Sparkles className="w-8 h-8 text-cornflower-blue" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Join <span className="text-cornflower-blue bg-gradient-to-r from-cornflower-blue to-blue-400 bg-clip-text text-transparent">trAIner</span> today
            </h2>
            <p className="text-muted-foreground">
              Already have an account?{' '}
              <Link
                href="/login"
                className="font-medium text-cornflower-blue hover:text-cornflower-blue/80 transition-colors"
              >
                Sign in here
              </Link>
            </p>
          </div>

          {/* Form Card */}
          <div className="relative bg-card/50 backdrop-blur-sm rounded-2xl p-8 border border-border/50 hover:border-cornflower-blue/30 transition-all duration-300 hover:shadow-lg hover:shadow-cornflower-blue/10">
            {/* Subtle background effect */}
            <div className="absolute inset-0 opacity-5 pointer-events-none">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(100,149,237,0.1),transparent_50%)]"></div>
            </div>
            
            <div className="relative">
              {error && (
                <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                  <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-red-600 dark:text-red-400">Error</h3>
                      <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {message && (
                <div className="mb-6 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-green-600 dark:text-green-400">Success</h3>
                      <p className="text-sm text-green-600/80 dark:text-green-400/80 mt-1">{message}</p>
                    </div>
                  </div>
                </div>
              )}

              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-foreground mb-2"
                    >
                      Full Name
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="block w-full px-4 py-3 rounded-lg border border-border bg-background/50 text-foreground placeholder-muted-foreground focus:border-cornflower-blue focus:outline-none focus:ring-2 focus:ring-cornflower-blue/20 transition-colors"
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-foreground mb-2"
                    >
                      Email address
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full px-4 py-3 rounded-lg border border-border bg-background/50 text-foreground placeholder-muted-foreground focus:border-cornflower-blue focus:outline-none focus:ring-2 focus:ring-cornflower-blue/20 transition-colors"
                      placeholder="Enter your email"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-foreground mb-2"
                    >
                      Password
                    </label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full px-4 py-3 rounded-lg border border-border bg-background/50 text-foreground placeholder-muted-foreground focus:border-cornflower-blue focus:outline-none focus:ring-2 focus:ring-cornflower-blue/20 transition-colors"
                      placeholder="Create a password"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="confirm-password"
                      className="block text-sm font-medium text-foreground mb-2"
                    >
                      Confirm Password
                    </label>
                    <input
                      id="confirm-password"
                      name="confirm-password"
                      type="password"
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="block w-full px-4 py-3 rounded-lg border border-border bg-background/50 text-foreground placeholder-muted-foreground focus:border-cornflower-blue focus:outline-none focus:ring-2 focus:ring-cornflower-blue/20 transition-colors"
                      placeholder="Confirm your password"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-cornflower-blue hover:bg-cornflower-blue/90 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-cornflower-blue/20 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  disabled={loading}
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{loading ? 'Creating account...' : 'Create account'}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 