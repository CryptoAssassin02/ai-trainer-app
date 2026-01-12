import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import 'jest-axe/extend-expect'
import '@testing-library/jest-dom'
import userEvent from '@testing-library/user-event'
import { act } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import SignUp from '../../../app/auth/signup/page'

// Add TypeScript declaration for our test flag
declare global {
  var __SUPABASE_ERROR__: boolean;
  var __SUPABASE_LOADING__: boolean;
}

// Ensure proper jest-axe setup with Jest
expect.extend(toHaveNoViolations)

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
}))

// Mock Supabase client using relative path with extension
jest.mock('../../../lib/supabase/browser.ts', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signUp: jest.fn().mockImplementation(({ email, password }) => {
        // For error test case, simulate error
        if (global.__SUPABASE_ERROR__) {
          return Promise.resolve({
            data: { user: null, session: null },
            error: new Error('User already registered')
          })
        }
        // Simulate loading to test loading state
        if (global.__SUPABASE_LOADING__) {
          return new Promise(resolve => {
            setTimeout(() => {
              resolve({
                data: { user: { id: 'test-user-id' }, session: null },
                error: null
              });
            }, 100);
          });
        }
        // For regular case, return success
        return Promise.resolve({
          data: { user: { id: 'test-user-id' }, session: null },
          error: null
        })
      })
    }
  }))
}))

describe('SignUp Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.__SUPABASE_ERROR__ = false
    global.__SUPABASE_LOADING__ = false
  })

  it('renders signup form correctly', () => {
    render(<SignUp />)
    
    expect(screen.getByRole('heading', { name: /create your account/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
    expect(screen.getByText(/sign in to your account/i)).toBeInTheDocument()
  })

  it('validates matching passwords', async () => {
    render(<SignUp />)
    
    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/^password$/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const submitButton = screen.getByRole('button', { name: /create account/i })
    
    await act(async () => {
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.change(confirmPasswordInput, { target: { value: 'different123' } })
      fireEvent.click(submitButton)
    })
    
    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument()
  })

  it('disables button during form submission', async () => {
    // Set loading flag to make the auth call take longer
    global.__SUPABASE_LOADING__ = true
    
    render(<SignUp />)
    
    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/^password$/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const submitButton = screen.getByRole('button', { name: /create account/i })
    
    // Submit the form
    await act(async () => {
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } })
      fireEvent.click(submitButton)
    })
    
    // Check that the button is disabled during submission
    expect(submitButton).toBeDisabled()
    
    // Clean up
    global.__SUPABASE_LOADING__ = false
  })

  it('handles successful account creation', async () => {
    render(<SignUp />)
    
    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/^password$/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const submitButton = screen.getByRole('button', { name: /create account/i })
    
    await act(async () => {
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } })
      fireEvent.click(submitButton)
    })
    
    expect(await screen.findByText(/check your email for the confirmation link/i)).toBeInTheDocument()
  })

  it('handles Supabase auth errors', async () => {
    // Set global flag to trigger error in the mock
    global.__SUPABASE_ERROR__ = true
    
    render(<SignUp />)
    
    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/^password$/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const submitButton = screen.getByRole('button', { name: /create account/i })
    
    await act(async () => {
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } })
      fireEvent.click(submitButton)
    })
    
    // Wait for error message
    expect(await screen.findByText(/user already registered/i)).toBeInTheDocument()
    
    // Clean up global flag
    global.__SUPABASE_ERROR__ = false
  })

  it('maintains form input values after failed submission', async () => {
    // Set global flag to trigger error in the mock
    global.__SUPABASE_ERROR__ = true
    
    render(<SignUp />)
    
    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/^password$/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const submitButton = screen.getByRole('button', { name: /create account/i })
    
    await act(async () => {
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } })
      fireEvent.click(submitButton)
    })
    
    await waitFor(() => {
      expect(emailInput).toHaveValue('test@example.com')
      expect(passwordInput).toHaveValue('password123')
      expect(confirmPasswordInput).toHaveValue('password123')
    })
    
    // Clean up global flag
    global.__SUPABASE_ERROR__ = false
  })

  it('includes a link to the login page', () => {
    render(<SignUp />)
    
    const loginLink = screen.getByRole('link', { name: /sign in to your account/i })
    expect(loginLink).toHaveAttribute('href', '/login')
  })

  describe('Accessibility', () => {
    it('has no accessibility violations', async () => {
      const { container } = render(<SignUp />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('provides clear error messages', async () => {
      global.__SUPABASE_ERROR__ = true
      
      render(<SignUp />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })
      
      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
        fireEvent.change(passwordInput, { target: { value: 'password123' } })
        fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } })
        fireEvent.click(submitButton)
      })
      
      const errorMessage = await screen.findByText(/user already registered/i)
      expect(errorMessage).toBeInTheDocument()
      
      global.__SUPABASE_ERROR__ = false
    })

    it('provides success feedback after form submission', async () => {
      render(<SignUp />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })
      
      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
        fireEvent.change(passwordInput, { target: { value: 'password123' } })
        fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } })
        fireEvent.click(submitButton)
      })
      
      const successMessage = await screen.findByText(/check your email for the confirmation link/i)
      expect(successMessage).toBeInTheDocument()
    })
  })
}) 