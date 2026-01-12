'use client'

import Link from 'next/link'
import { useTheme } from 'next-themes'
import { Sun, Moon, Sparkles } from 'lucide-react'
import { login, signup } from './actions'
import { useEffect, useState } from 'react'

interface LoginPageProps {
  searchParams: { error?: string; message?: string }
}

export default function Login({ searchParams }: LoginPageProps) {
  const { error, message } = searchParams
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  // Ensure component is mounted before rendering theme toggle
  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
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
                href="/auth/signup"
                className="text-foreground hover:text-cornflower-blue transition-colors duration-200 font-medium"
              >
                Sign Up
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
              Welcome back to <span className="text-cornflower-blue bg-gradient-to-r from-cornflower-blue to-blue-400 bg-clip-text text-transparent">trAIner</span>
            </h2>
            <p className="text-muted-foreground">
              Don't have an account?{' '}
              <Link
                href="/auth/signup"
                className="font-medium text-cornflower-blue hover:text-cornflower-blue/80 transition-colors"
              >
                Create one here
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

              {/* Official Supabase Server Actions Pattern */}
              <form className="space-y-6">
                <div className="space-y-4">
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
                      autoComplete="current-password"
                      required
                      className="block w-full px-4 py-3 rounded-lg border border-border bg-background/50 text-foreground placeholder-muted-foreground focus:border-cornflower-blue focus:outline-none focus:ring-2 focus:ring-cornflower-blue/20 transition-colors"
                      placeholder="Enter your password"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  <Link
                    href="/auth/reset-password"
                    className="text-sm font-medium text-cornflower-blue hover:text-cornflower-blue/80 transition-colors"
                  >
                    Forgot your password?
                  </Link>
                </div>

                <div className="space-y-3">
                  <button
                    formAction={login}
                    className="w-full bg-cornflower-blue hover:bg-cornflower-blue/90 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-cornflower-blue/20 focus:ring-offset-2"
                  >
                    Sign in
                  </button>
                  
                  <Link
                    href="/auth/signup"
                    className="w-full border border-cornflower-blue text-cornflower-blue hover:bg-cornflower-blue hover:text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cornflower-blue/20 focus:ring-offset-2 inline-flex items-center justify-center"
                  >
                    Create new account
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}