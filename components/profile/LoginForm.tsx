import { useState } from 'react'
import { createClient } from '../../lib/supabase/client'
import { AuthError } from '@supabase/supabase-js'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [status, setStatus] = useState('')

  const supabase = createClient()

  const handleEmailBlur = () => {
    if (!email) {
      setEmailError('Email is required')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Please enter a valid email')
      return
    }
    setEmailError('')
  }

  const handlePasswordBlur = () => {
    if (!password) {
      setPasswordError('Password is required')
      return
    }
    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters')
      return
    }
    setPasswordError('')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setStatus('Signing in...')
    setEmailError('')
    setPasswordError('')

    try {
      const response = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (response && typeof response === 'object' && 'error' in response && response.error) {
        throw response.error
      }

      setStatus('Sign in successful!')
    } catch (error) {
      const message = error instanceof AuthError ? error.message : 'An error occurred'
      setStatus(message)
      if (message.toLowerCase().includes('email')) {
        setEmailError(message)
      } else if (message.toLowerCase().includes('password')) {
        setPasswordError(message)
      } else {
        setEmailError(message)
        setPasswordError(message)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[#121212] text-[#F5F5F5] p-6 rounded-lg shadow-lg"
      role="form"
      aria-busy={isLoading}
    >
      <div className="space-y-4">
        <div>
          <label className="block mb-2" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="w-full p-2 rounded bg-gray-800 focus:ring-2 focus:ring-[#3E9EFF]"
            aria-label="email input"
            aria-invalid={!!emailError}
            aria-describedby={emailError ? "email-error" : undefined}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={handleEmailBlur}
            disabled={isLoading}
          />
          {emailError && (
            <div id="email-error" role="alert" className="text-red-500 mt-1">
              {emailError}
            </div>
          )}
        </div>
        <div>
          <label className="block mb-2" htmlFor="password">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              className="w-full p-2 rounded bg-gray-800 focus:ring-2 focus:ring-[#3E9EFF]"
              aria-label="password input"
              aria-invalid={!!passwordError}
              aria-describedby={passwordError ? "password-error" : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={handlePasswordBlur}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400"
              aria-label="toggle password visibility"
              disabled={isLoading}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          {passwordError && (
            <div id="password-error" role="alert" className="text-red-500 mt-1">
              {passwordError}
            </div>
          )}
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="remember-me"
            className="mr-2"
            aria-label="remember me checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            disabled={isLoading}
          />
          <label htmlFor="remember-me">Remember me</label>
        </div>
        <button
          type="submit"
          className="w-full bg-[#3E9EFF] text-white p-2 rounded hover:bg-blue-600 disabled:opacity-50"
          disabled={isLoading}
          aria-disabled={isLoading}
        >
          {isLoading ? "Signing in..." : "Sign in"}
        </button>
        {status && (
          <div role="status" aria-live="polite" className="mt-2 text-center">
            {status}
          </div>
        )}
      </div>
    </form>
  )
} 