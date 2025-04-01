import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { axe } from 'jest-axe'
import 'jest-axe/extend-expect'
import userEvent from '@testing-library/user-event'
import { Input } from '@/components/ui/input'

describe('Input Component', () => {
  it('renders correctly with default props', () => {
    render(<Input data-testid="test-input" type="text" />)
    
    const input = screen.getByTestId('test-input')
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('type', 'text') // Default type
    expect(input).toHaveClass('flex', 'h-10', 'w-full', 'rounded-md') // Sample of default classes
  })

  it('renders with different input types', () => {
    const { rerender } = render(<Input type="password" data-testid="test-input" />)
    
    let input = screen.getByTestId('test-input')
    expect(input).toHaveAttribute('type', 'password')
    
    rerender(<Input type="email" data-testid="test-input" />)
    input = screen.getByTestId('test-input')
    expect(input).toHaveAttribute('type', 'email')
    
    rerender(<Input type="number" data-testid="test-input" />)
    input = screen.getByTestId('test-input')
    expect(input).toHaveAttribute('type', 'number')
    
    rerender(<Input type="date" data-testid="test-input" />)
    input = screen.getByTestId('test-input')
    expect(input).toHaveAttribute('type', 'date')
  })

  it('applies custom className correctly', () => {
    render(<Input className="custom-class" data-testid="test-input" />)
    
    const input = screen.getByTestId('test-input')
    expect(input).toHaveClass('custom-class')
    // Should also maintain default classes
    expect(input).toHaveClass('flex', 'h-10')
  })

  it('handles user input correctly', async () => {
    render(<Input data-testid="test-input" />)
    
    const input = screen.getByTestId('test-input')
    await userEvent.type(input, 'Hello World')
    
    expect(input).toHaveValue('Hello World')
  })

  it('properly handles number input', async () => {
    render(<Input type="number" data-testid="test-input" />)
    
    const input = screen.getByTestId('test-input')
    await userEvent.type(input, '123')
    
    expect(input).toHaveValue(123)
    
    // Clear and try non-numeric input
    await userEvent.clear(input)
    await userEvent.type(input, 'abc')
    
    // Browser should prevent non-numeric input for number type
    expect(input).not.toHaveValue('abc')
  })

  it('handles disabled state correctly', () => {
    render(<Input disabled data-testid="test-input" />)
    
    const input = screen.getByTestId('test-input')
    expect(input).toBeDisabled()
    expect(input).toHaveClass('disabled:opacity-50')
  })

  it('handles required attribute', () => {
    render(<Input required data-testid="test-input" />)
    
    const input = screen.getByTestId('test-input')
    expect(input).toBeRequired()
  })

  it('forwards ref correctly', () => {
    const ref = jest.fn()
    render(<Input ref={ref} />)
    
    expect(ref).toHaveBeenCalled()
    expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLInputElement)
  })

  it('applies focus styles on focus', async () => {
    render(<Input data-testid="test-input" />)
    
    const input = screen.getByTestId('test-input')
    
    // Check focus-related classes
    expect(input).toHaveClass('focus-visible:ring-2', 'focus-visible:ring-ring')
    
    // Set focus
    input.focus()
    expect(document.activeElement).toBe(input)
  })

  it('renders file input with correct styles', () => {
    render(<Input type="file" data-testid="test-input" />)
    
    const input = screen.getByTestId('test-input')
    expect(input).toHaveClass('file:border-0', 'file:bg-transparent')
  })

  it('handles placeholder text correctly', () => {
    render(<Input placeholder="Enter your name" data-testid="test-input" />)
    
    const input = screen.getByTestId('test-input')
    expect(input).toHaveAttribute('placeholder', 'Enter your name')
    expect(input).toHaveClass('placeholder:text-muted-foreground')
  })

  it('passes other props correctly', () => {
    render(
      <Input 
        data-testid="test-input"
        name="username"
        maxLength={50}
        autoComplete="off"
        aria-label="Username field"
      />
    )
    
    const input = screen.getByTestId('test-input')
    expect(input).toHaveAttribute('name', 'username')
    expect(input).toHaveAttribute('maxlength', '50')
    expect(input).toHaveAttribute('autocomplete', 'off')
    expect(input).toHaveAttribute('aria-label', 'Username field')
  })

  it('has no accessibility violations', async () => {
    const { container } = render(
      <>
        <label htmlFor="test-input">Email</label>
        <Input id="test-input" aria-describedby="email-hint" placeholder="Enter your email" />
        <div id="email-hint">We'll never share your email with anyone else.</div>
      </>
    )
    
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
}) 