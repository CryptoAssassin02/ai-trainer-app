import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { axe } from 'jest-axe'
import '@testing-library/jest-dom'
import 'jest-axe/extend-expect'
import * as z from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'

// Create a mock component using useFormField for testing the hook
const TestFormFieldConsumer = () => {
  const { formItemId, formDescriptionId, formMessageId, error } = useFormField()
  return (
    <div>
      <span data-testid="form-item-id">{formItemId}</span>
      <span data-testid="form-description-id">{formDescriptionId}</span>
      <span data-testid="form-message-id">{formMessageId}</span>
      <span data-testid="form-error">{error ? 'has-error' : 'no-error'}</span>
    </div>
  )
}

describe('Form Component', () => {
  // Define a form schema for testing
  const formSchema = z.object({
    username: z.string().min(2, {
      message: "Username must be at least 2 characters.",
    }),
    email: z.string().email({
      message: "Please enter a valid email address.",
    }),
  })

  // Create a test form component
  const TestForm = ({ onSubmit = jest.fn() }) => {
    const form = useForm<z.infer<typeof formSchema>>({
      resolver: zodResolver(formSchema),
      defaultValues: {
        username: "",
        email: "",
      },
    })

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8" data-testid="test-form" role="form">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input placeholder="Enter username" {...field} />
                </FormControl>
                <FormDescription>
                  This is your public display name.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="Enter email" {...field} />
                </FormControl>
                <FormDescription>
                  We'll never share your email.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <button type="submit">Submit</button>
        </form>
      </Form>
    )
  }

  it('renders the form correctly', () => {
    render(<TestForm />)
    
    expect(screen.getByTestId('test-form')).toBeInTheDocument()
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByText("This is your public display name.")).toBeInTheDocument()
    expect(screen.getByText("We'll never share your email.")).toBeInTheDocument()
  })

  it('displays validation errors when form is submitted with invalid data', async () => {
    render(<TestForm />)
    
    // Submit the form without filling in fields
    fireEvent.click(screen.getByRole('button', { name: /submit/i }))
    
    // Check if validation errors are displayed
    await waitFor(() => {
      expect(screen.getByText("Username must be at least 2 characters.")).toBeInTheDocument()
      expect(screen.getByText("Please enter a valid email address.")).toBeInTheDocument()
    })
  })

  it('calls onSubmit when form is valid', async () => {
    const mockSubmit = jest.fn()
    render(<TestForm onSubmit={mockSubmit} />)
    
    // Fill in the form with valid data
    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'testuser' }
    })
    
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' }
    })
    
    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /submit/i }))
    
    // Check if onSubmit was called with correct data
    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith(
        {
          username: 'testuser',
          email: 'test@example.com'
        },
        expect.anything()
      )
    })
  })

  it('applies error styles to FormLabel when validation fails', async () => {
    render(<TestForm />)
    
    // Submit the form without filling in fields
    fireEvent.click(screen.getByRole('button', { name: /submit/i }))
    
    // Check if FormLabel has error class
    await waitFor(() => {
      const usernameLabel = screen.getByText('Username')
      expect(usernameLabel).toHaveClass('text-destructive')
    })
  })

  it('correctly applies aria attributes for accessibility', async () => {
    render(<TestForm />)
    
    // Submit the form to trigger validation errors
    fireEvent.click(screen.getByRole('button', { name: /submit/i }))
    
    // Check for proper aria attributes
    await waitFor(() => {
      const usernameInput = screen.getByLabelText(/username/i)
      expect(usernameInput).toHaveAttribute('aria-invalid', 'true')
      
      // Should have aria-describedby pointing to both description and error message
      const describedBy = usernameInput.getAttribute('aria-describedby')
      expect(describedBy).toContain('description')
      expect(describedBy).toContain('message')
    })
  })

  it('renders FormControl component correctly', () => {
    // Create component that manages its own form state 
    const TestFormControl = () => {
      const form = useForm()
      return (
        <Form {...form}>
          <form>
            <FormField
              control={form.control}
              name="test"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input data-testid="test-input" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </form>
        </Form>
      )
    }
    
    render(<TestFormControl />)
    
    const input = screen.getByTestId('test-input')
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('id') // Should have generated an ID
  })

  it('applies custom className to FormItem, FormLabel, FormDescription, and FormMessage', () => {
    // Create component with custom class names
    const TestFormCustomClasses = () => {
      const form = useForm()
      return (
        <Form {...form}>
          <form>
            <FormField
              control={form.control}
              name="test"
              render={() => (
                <FormItem className="custom-item-class" data-testid="form-item">
                  <FormLabel className="custom-label-class" data-testid="form-label">Test</FormLabel>
                  <FormControl>
                    <Input />
                  </FormControl>
                  <FormDescription className="custom-desc-class" data-testid="form-desc">Description</FormDescription>
                  <FormMessage className="custom-msg-class" data-testid="form-msg">Message</FormMessage>
                </FormItem>
              )}
            />
          </form>
        </Form>
      )
    }
    
    render(<TestFormCustomClasses />)
    
    expect(screen.getByTestId('form-item')).toHaveClass('custom-item-class')
    expect(screen.getByTestId('form-label')).toHaveClass('custom-label-class')
    expect(screen.getByTestId('form-desc')).toHaveClass('custom-desc-class')
    expect(screen.getByTestId('form-msg')).toHaveClass('custom-msg-class')
  })

  it('has no accessibility violations', async () => {
    const { container } = render(<TestForm />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('throws error when useFormField is used outside of FormField', () => {
    // Mock console.error to prevent React error logging in test output
    const originalConsoleError = console.error
    console.error = jest.fn()
    
    expect(() => {
      render(<TestFormFieldConsumer />)
    }).toThrow(/Cannot destructure property 'getFieldState'/)
    
    // Restore console.error
    console.error = originalConsoleError
  })

  it('shows form message when there is an error', async () => {
    render(<TestForm />)
    
    // Submit the form to trigger validation errors
    fireEvent.click(screen.getByRole('button', { name: /submit/i }))
    
    // Wait for error messages
    await waitFor(() => {
      expect(screen.getByText("Username must be at least 2 characters.")).toBeInTheDocument()
    })
  })

  it('does not show form message when there is no error or children', () => {
    // Component that manages its own form state
    const TestFormNoMessage = () => {
      const form = useForm()
      return (
        <Form {...form}>
          <form>
            <FormField
              control={form.control}
              name="test"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  {/* FormMessage with no children or errors should not render */}
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      )
    }
    
    render(<TestFormNoMessage />)
    
    // There should be no elements with the FormMessage classes
    const formMessages = document.querySelectorAll('.text-destructive')
    expect(formMessages.length).toBe(0)
  })
}) 