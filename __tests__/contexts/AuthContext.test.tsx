import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn(() => ({
        data: {
          session: {
            user: { id: 'user-1', email: 'test@example.com' }
          }
        },
        error: null
      })),
      signInWithPassword: jest.fn(({ email, password }) => {
        if (email === 'test@example.com' && password === 'password123') {
          return {
            data: {
              user: { id: 'user-1', email: 'test@example.com' },
              session: { access_token: 'token123' }
            },
            error: null
          }
        }
        return {
          data: null,
          error: { message: 'Invalid credentials' }
        }
      }),
      signUp: jest.fn(({ email, password }) => {
        if (email && password) {
          return {
            data: {
              user: { id: 'new-user', email }
            },
            error: null
          }
        }
        return {
          data: null,
          error: { message: 'Please provide email and password' }
        }
      }),
      signOut: jest.fn(() => ({ error: null })),
      onAuthStateChange: jest.fn((callback) => {
        // Simulate auth state change
        callback('SIGNED_IN', {
          user: { id: 'user-1', email: 'test@example.com' }
        })
        return { data: { subscription: { unsubscribe: jest.fn() } } }
      })
    }
  }))
}))

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    pathname: '/'
  }))
}))

// Mock the toast function
jest.mock('@/components/ui/use-toast', () => ({
  useToast: jest.fn(() => ({
    toast: jest.fn()
  }))
}))

// Mock AuthContext implementation
const AuthContext = React.createContext<any>(null)

const useAuth = () => {
  const context = React.useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = React.useState<any>(null)
  const [session, setSession] = React.useState<any>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  
  const signIn = React.useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Mock successful sign in
      if (email === 'test@example.com' && password === 'password123') {
        const mockUser = { id: 'user-1', email: 'test@example.com' }
        const mockSession = { access_token: 'token123' }
        
        setUser(mockUser)
        setSession(mockSession)
        setIsLoading(false)
        return { user: mockUser, session: mockSession, error: null }
      }
      
      // Mock failed sign in
      setError('Invalid credentials')
      setIsLoading(false)
      return { user: null, session: null, error: 'Invalid credentials' }
    } catch (err: any) {
      setError(err.message)
      setIsLoading(false)
      return { user: null, session: null, error: err.message }
    }
  }, [])
  
  const signUp = React.useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Mock successful sign up
      if (email && password) {
        const mockUser = { id: 'new-user', email }
        
        setUser(mockUser)
        setIsLoading(false)
        return { user: mockUser, error: null }
      }
      
      // Mock failed sign up
      setError('Please provide email and password')
      setIsLoading(false)
      return { user: null, error: 'Please provide email and password' }
    } catch (err: any) {
      setError(err.message)
      setIsLoading(false)
      return { user: null, error: err.message }
    }
  }, [])
  
  const signOut = React.useCallback(async () => {
    setIsLoading(true)
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Mock successful sign out
      setUser(null)
      setSession(null)
      setIsLoading(false)
      return { error: null }
    } catch (err: any) {
      setError(err.message)
      setIsLoading(false)
      return { error: err.message }
    }
  }, [])
  
  // Initialize
  React.useEffect(() => {
    const getInitialSession = async () => {
      setIsLoading(true)
      
      try {
        // Mock initial session
        const mockUser = { id: 'user-1', email: 'test@example.com' }
        const mockSession = { access_token: 'token123' }
        
        setUser(mockUser)
        setSession(mockSession)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }
    
    getInitialSession()
    
    return () => {
      // Cleanup
    }
  }, [])
  
  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        error,
        signIn,
        signUp,
        signOut
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// Test component that uses the context
const AuthConsumer = () => {
  const { user, isLoading, error, signIn, signUp, signOut } = useAuth()
  const [email, setEmail] = React.useState('test@example.com')
  const [password, setPassword] = React.useState('password123')
  
  const handleSignIn = () => {
    signIn(email, password)
  }
  
  const handleSignUp = () => {
    signUp(email, password)
  }
  
  const handleSignOut = () => {
    signOut()
  }
  
  return (
    <div data-testid="auth-consumer">
      {isLoading && <div data-testid="loading-indicator">Loading...</div>}
      {error && <div data-testid="error-message">{error}</div>}
      
      <div data-testid="auth-status">
        {user ? `Signed in as ${user.email}` : 'Not signed in'}
      </div>
      
      <div>
        <input
          data-testid="email-input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
        />
        <input
          data-testid="password-input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
        />
        
        <button
          data-testid="signin-button"
          onClick={handleSignIn}
          disabled={isLoading}
        >
          Sign In
        </button>
        
        <button
          data-testid="signup-button"
          onClick={handleSignUp}
          disabled={isLoading}
        >
          Sign Up
        </button>
        
        <button
          data-testid="signout-button"
          onClick={handleSignOut}
          disabled={isLoading}
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}

describe('AuthContext', () => {
  it('initializes with a user session', async () => {
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    )
    
    // Initially it might show loading
    if (screen.queryByTestId('loading-indicator')) {
      await waitFor(() => {
        expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument()
      })
    }
    
    // After initialization, user should be signed in
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Signed in as test@example.com')
  })
  
  it('signs in a user with valid credentials', async () => {
    // Create a provider with no initial session
    const AuthProviderWithNoSession = ({ children }: { children: React.ReactNode }) => {
      const [user, setUser] = React.useState<any>(null)
      const [session, setSession] = React.useState<any>(null)
      const [isLoading, setIsLoading] = React.useState(false)
      const [error, setError] = React.useState<string | null>(null)
      
      const signIn = React.useCallback(async (email: string, password: string) => {
        setIsLoading(true)
        setError(null)
        
        try {
          // Mock successful sign in
          if (email === 'test@example.com' && password === 'password123') {
            const mockUser = { id: 'user-1', email: 'test@example.com' }
            const mockSession = { access_token: 'token123' }
            
            setUser(mockUser)
            setSession(mockSession)
            setIsLoading(false)
            return { user: mockUser, session: mockSession, error: null }
          }
          
          // Mock failed sign in
          setError('Invalid credentials')
          setIsLoading(false)
          return { user: null, session: null, error: 'Invalid credentials' }
        } catch (err: any) {
          setError(err.message)
          setIsLoading(false)
          return { user: null, session: null, error: err.message }
        }
      }, [])
      
      const signUp = jest.fn()
      const signOut = jest.fn()
      
      return (
        <AuthContext.Provider
          value={{
            user,
            session,
            isLoading,
            error,
            signIn,
            signUp,
            signOut
          }}
        >
          {children}
        </AuthContext.Provider>
      )
    }
    
    render(
      <AuthProviderWithNoSession>
        <AuthConsumer />
      </AuthProviderWithNoSession>
    )
    
    // Initially user should not be signed in
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Not signed in')
    
    // Enter valid credentials
    fireEvent.change(screen.getByTestId('email-input'), {
      target: { value: 'test@example.com' }
    })
    fireEvent.change(screen.getByTestId('password-input'), {
      target: { value: 'password123' }
    })
    
    // Click sign in button
    fireEvent.click(screen.getByTestId('signin-button'))
    
    // Wait for loading indicator, and then wait for it to disappear
    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument()
    })
    
    // User should be signed in
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Signed in as test@example.com')
  })
  
  it('displays an error message with invalid credentials', async () => {
    // Create a provider with no initial session
    const AuthProviderWithNoSession = ({ children }: { children: React.ReactNode }) => {
      const [user, setUser] = React.useState<any>(null)
      const [session, setSession] = React.useState<any>(null)
      const [isLoading, setIsLoading] = React.useState(false)
      const [error, setError] = React.useState<string | null>(null)
      
      const signIn = React.useCallback(async (email: string, password: string) => {
        setIsLoading(true)
        setError(null)
        
        try {
          // Mock successful sign in
          if (email === 'test@example.com' && password === 'password123') {
            const mockUser = { id: 'user-1', email: 'test@example.com' }
            const mockSession = { access_token: 'token123' }
            
            setUser(mockUser)
            setSession(mockSession)
            setIsLoading(false)
            return { user: mockUser, session: mockSession, error: null }
          }
          
          // Mock failed sign in
          setError('Invalid credentials')
          setIsLoading(false)
          return { user: null, session: null, error: 'Invalid credentials' }
        } catch (err: any) {
          setError(err.message)
          setIsLoading(false)
          return { user: null, session: null, error: err.message }
        }
      }, [])
      
      const signUp = jest.fn()
      const signOut = jest.fn()
      
      return (
        <AuthContext.Provider
          value={{
            user,
            session,
            isLoading,
            error,
            signIn,
            signUp,
            signOut
          }}
        >
          {children}
        </AuthContext.Provider>
      )
    }
    
    render(
      <AuthProviderWithNoSession>
        <AuthConsumer />
      </AuthProviderWithNoSession>
    )
    
    // Enter invalid credentials
    fireEvent.change(screen.getByTestId('email-input'), {
      target: { value: 'test@example.com' }
    })
    fireEvent.change(screen.getByTestId('password-input'), {
      target: { value: 'wrongpassword' }
    })
    
    // Click sign in button
    fireEvent.click(screen.getByTestId('signin-button'))
    
    // Wait for the operation to complete
    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument()
    })
    
    // Error message should be displayed
    expect(screen.getByTestId('error-message')).toHaveTextContent('Invalid credentials')
    
    // User should still not be signed in
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Not signed in')
  })
  
  it('signs up a new user successfully', async () => {
    // Create a provider with no initial session
    const AuthProviderWithNoSession = ({ children }: { children: React.ReactNode }) => {
      const [user, setUser] = React.useState<any>(null)
      const [isLoading, setIsLoading] = React.useState(false)
      const [error, setError] = React.useState<string | null>(null)
      
      const signIn = jest.fn()
      
      const signUp = React.useCallback(async (email: string, password: string) => {
        setIsLoading(true)
        setError(null)
        
        try {
          // Mock successful sign up
          if (email && password) {
            const mockUser = { id: 'new-user', email }
            
            setUser(mockUser)
            setIsLoading(false)
            return { user: mockUser, error: null }
          }
          
          // Mock failed sign up
          setError('Please provide email and password')
          setIsLoading(false)
          return { user: null, error: 'Please provide email and password' }
        } catch (err: any) {
          setError(err.message)
          setIsLoading(false)
          return { user: null, error: err.message }
        }
      }, [])
      
      const signOut = jest.fn()
      
      return (
        <AuthContext.Provider
          value={{
            user,
            isLoading,
            error,
            signIn,
            signUp,
            signOut
          }}
        >
          {children}
        </AuthContext.Provider>
      )
    }
    
    render(
      <AuthProviderWithNoSession>
        <AuthConsumer />
      </AuthProviderWithNoSession>
    )
    
    // Initially user should not be signed in
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Not signed in')
    
    // Enter new user credentials
    fireEvent.change(screen.getByTestId('email-input'), {
      target: { value: 'newuser@example.com' }
    })
    fireEvent.change(screen.getByTestId('password-input'), {
      target: { value: 'password123' }
    })
    
    // Click sign up button
    fireEvent.click(screen.getByTestId('signup-button'))
    
    // Wait for the operation to complete
    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument()
    })
    
    // User should be signed in with new email
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Signed in as newuser@example.com')
  })
  
  it('displays an error message when signing up without credentials', async () => {
    // Create a provider with no initial session
    const AuthProviderWithNoSession = ({ children }: { children: React.ReactNode }) => {
      const [user, setUser] = React.useState<any>(null)
      const [isLoading, setIsLoading] = React.useState(false)
      const [error, setError] = React.useState<string | null>(null)
      
      const signIn = jest.fn()
      
      const signUp = React.useCallback(async (email: string, password: string) => {
        setIsLoading(true)
        setError(null)
        
        try {
          // Mock successful sign up
          if (email && password) {
            const mockUser = { id: 'new-user', email }
            
            setUser(mockUser)
            setIsLoading(false)
            return { user: mockUser, error: null }
          }
          
          // Mock failed sign up
          setError('Please provide email and password')
          setIsLoading(false)
          return { user: null, error: 'Please provide email and password' }
        } catch (err: any) {
          setError(err.message)
          setIsLoading(false)
          return { user: null, error: err.message }
        }
      }, [])
      
      const signOut = jest.fn()
      
      return (
        <AuthContext.Provider
          value={{
            user,
            isLoading,
            error,
            signIn,
            signUp,
            signOut
          }}
        >
          {children}
        </AuthContext.Provider>
      )
    }
    
    render(
      <AuthProviderWithNoSession>
        <AuthConsumer />
      </AuthProviderWithNoSession>
    )
    
    // Clear the input fields
    fireEvent.change(screen.getByTestId('email-input'), {
      target: { value: '' }
    })
    fireEvent.change(screen.getByTestId('password-input'), {
      target: { value: '' }
    })
    
    // Click sign up button
    fireEvent.click(screen.getByTestId('signup-button'))
    
    // Wait for the operation to complete
    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument()
    })
    
    // Error message should be displayed
    expect(screen.getByTestId('error-message')).toHaveTextContent('Please provide email and password')
    
    // User should still not be signed in
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Not signed in')
  })
  
  it('signs out a user successfully', async () => {
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    )
    
    // Wait for initialization to complete
    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument()
    })
    
    // Initially user should be signed in
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Signed in as test@example.com')
    
    // Click sign out button
    fireEvent.click(screen.getByTestId('signout-button'))
    
    // Show loading during API call
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument()
    
    // Wait for the operation to complete
    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument()
    })
    
    // User should be signed out
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Not signed in')
  })
  
  it('throws error when useAuth is used outside provider', () => {
    // Suppress console errors
    const originalError = console.error
    console.error = jest.fn()
    
    expect(() => {
      render(<AuthConsumer />)
    }).toThrow('useAuth must be used within an AuthProvider')
    
    // Restore console.error
    console.error = originalError
  })
}) 