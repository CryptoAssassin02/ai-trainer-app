import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { axe } from 'jest-axe'
import 'jest-axe/extend-expect'

// Mock component for testing
const AIGenerateButton = ({ 
  onClick,
  isLoading = false,
  disabled = false,
  loadingText = 'Generating...',
  children = 'Generate',
  variant = 'default',
  fullWidth = false,
  className = '',
  showSpinner = true
}: { 
  onClick: () => void
  isLoading?: boolean
  disabled?: boolean
  loadingText?: string
  children?: React.ReactNode
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive'
  fullWidth?: boolean
  className?: string
  showSpinner?: boolean
}) => {
  const baseClasses = `ai-generate-button ${variant} ${fullWidth ? 'w-full' : ''} ${className}`
  
  return (
    <button
      data-testid="ai-generate-button"
      className={baseClasses}
      onClick={onClick}
      disabled={disabled || isLoading}
      data-variant={variant}
      data-fullwidth={fullWidth}
    >
      {isLoading ? (
        <div data-testid="loading-state">
          {showSpinner && <div data-testid="spinner" className="spinner" />}
          <span data-testid="loading-text">{loadingText}</span>
        </div>
      ) : (
        <span data-testid="button-content">{children}</span>
      )}
    </button>
  )
}

describe('AIGenerateButton', () => {
  it('renders button with default text', () => {
    const mockOnClick = jest.fn()
    render(<AIGenerateButton onClick={mockOnClick} />)
    
    const button = screen.getByTestId('ai-generate-button')
    expect(button).toBeInTheDocument()
    expect(screen.getByTestId('button-content')).toHaveTextContent('Generate')
  })
  
  it('renders button with custom text', () => {
    const mockOnClick = jest.fn()
    render(<AIGenerateButton onClick={mockOnClick}>Create Workout Plan</AIGenerateButton>)
    
    expect(screen.getByTestId('button-content')).toHaveTextContent('Create Workout Plan')
  })
  
  it('calls onClick when clicked', () => {
    const mockOnClick = jest.fn()
    render(<AIGenerateButton onClick={mockOnClick} />)
    
    fireEvent.click(screen.getByTestId('ai-generate-button'))
    expect(mockOnClick).toHaveBeenCalledTimes(1)
  })
  
  it('is disabled when disabled prop is true', () => {
    const mockOnClick = jest.fn()
    render(<AIGenerateButton onClick={mockOnClick} disabled={true} />)
    
    const button = screen.getByTestId('ai-generate-button')
    expect(button).toBeDisabled()
    
    fireEvent.click(button)
    expect(mockOnClick).not.toHaveBeenCalled()
  })
  
  it('shows loading state when isLoading is true', () => {
    const mockOnClick = jest.fn()
    render(<AIGenerateButton onClick={mockOnClick} isLoading={true} />)
    
    expect(screen.getByTestId('loading-state')).toBeInTheDocument()
    expect(screen.getByTestId('loading-text')).toHaveTextContent('Generating...')
    expect(screen.getByTestId('spinner')).toBeInTheDocument()
    expect(screen.queryByTestId('button-content')).not.toBeInTheDocument()
  })
  
  it('shows custom loading text', () => {
    const mockOnClick = jest.fn()
    render(
      <AIGenerateButton 
        onClick={mockOnClick} 
        isLoading={true} 
        loadingText="Creating your workout plan..." 
      />
    )
    
    expect(screen.getByTestId('loading-text')).toHaveTextContent('Creating your workout plan...')
  })
  
  it('is disabled during loading state', () => {
    const mockOnClick = jest.fn()
    render(<AIGenerateButton onClick={mockOnClick} isLoading={true} />)
    
    const button = screen.getByTestId('ai-generate-button')
    expect(button).toBeDisabled()
    
    fireEvent.click(button)
    expect(mockOnClick).not.toHaveBeenCalled()
  })
  
  it('can hide spinner during loading state', () => {
    const mockOnClick = jest.fn()
    render(
      <AIGenerateButton 
        onClick={mockOnClick} 
        isLoading={true} 
        showSpinner={false}
      />
    )
    
    expect(screen.queryByTestId('spinner')).not.toBeInTheDocument()
    expect(screen.getByTestId('loading-text')).toBeInTheDocument()
  })
  
  it('applies variant styling', () => {
    const mockOnClick = jest.fn()
    render(<AIGenerateButton onClick={mockOnClick} variant="outline" />)
    
    const button = screen.getByTestId('ai-generate-button')
    expect(button).toHaveAttribute('data-variant', 'outline')
    expect(button.className).toContain('outline')
  })
  
  it('applies fullWidth styling', () => {
    const mockOnClick = jest.fn()
    render(<AIGenerateButton onClick={mockOnClick} fullWidth={true} />)
    
    const button = screen.getByTestId('ai-generate-button')
    expect(button).toHaveAttribute('data-fullwidth', 'true')
    expect(button.className).toContain('w-full')
  })
  
  it('applies custom className', () => {
    const mockOnClick = jest.fn()
    render(<AIGenerateButton onClick={mockOnClick} className="custom-class" />)
    
    const button = screen.getByTestId('ai-generate-button')
    expect(button.className).toContain('custom-class')
  })
  
  it('combines all styling props correctly', () => {
    const mockOnClick = jest.fn()
    render(
      <AIGenerateButton 
        onClick={mockOnClick} 
        variant="secondary" 
        fullWidth={true} 
        className="rounded-lg"
      />
    )
    
    const button = screen.getByTestId('ai-generate-button')
    expect(button.className).toContain('secondary')
    expect(button.className).toContain('w-full')
    expect(button.className).toContain('rounded-lg')
  })
  
  it('renders with complex children', () => {
    const mockOnClick = jest.fn()
    render(
      <AIGenerateButton onClick={mockOnClick}>
        <span data-testid="icon">🤖</span>
        <span data-testid="text">Generate with AI</span>
      </AIGenerateButton>
    )
    
    const buttonContent = screen.getByTestId('button-content')
    expect(buttonContent).toContainElement(screen.getByTestId('icon'))
    expect(buttonContent).toContainElement(screen.getByTestId('text'))
  })
  
  it('has no accessibility violations', async () => {
    const mockOnClick = jest.fn()
    const { container } = render(<AIGenerateButton onClick={mockOnClick} />)
    
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
  
  it('has no accessibility violations when loading', async () => {
    const mockOnClick = jest.fn()
    const { container } = render(<AIGenerateButton onClick={mockOnClick} isLoading={true} />)
    
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
}) 