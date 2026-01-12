import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { axe } from 'jest-axe'
import 'jest-axe/extend-expect'
import {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent
} from '@/components/ui/card'

describe('Card Component', () => {
  it('renders Card component correctly', () => {
    render(<Card data-testid="card">Card Content</Card>)
    const card = screen.getByTestId('card')
    
    expect(card).toBeInTheDocument()
    expect(card).toHaveTextContent('Card Content')
    expect(card).toHaveClass('rounded-lg', 'border', 'bg-card', 'shadow-sm')
  })
  
  it('renders CardHeader component correctly', () => {
    render(<CardHeader data-testid="card-header">Header Content</CardHeader>)
    const header = screen.getByTestId('card-header')
    
    expect(header).toBeInTheDocument()
    expect(header).toHaveTextContent('Header Content')
    expect(header).toHaveClass('flex', 'flex-col', 'space-y-1.5', 'p-6')
  })
  
  it('renders CardTitle component correctly', () => {
    render(<CardTitle data-testid="card-title">Title Content</CardTitle>)
    const title = screen.getByTestId('card-title')
    
    expect(title).toBeInTheDocument()
    expect(title).toHaveTextContent('Title Content')
    expect(title).toHaveClass('text-2xl', 'font-semibold', 'leading-none', 'tracking-tight')
  })
  
  it('renders CardDescription component correctly', () => {
    render(<CardDescription data-testid="card-description">Description Content</CardDescription>)
    const description = screen.getByTestId('card-description')
    
    expect(description).toBeInTheDocument()
    expect(description).toHaveTextContent('Description Content')
    expect(description).toHaveClass('text-sm', 'text-muted-foreground')
  })
  
  it('renders CardContent component correctly', () => {
    render(<CardContent data-testid="card-content">Content</CardContent>)
    const content = screen.getByTestId('card-content')
    
    expect(content).toBeInTheDocument()
    expect(content).toHaveTextContent('Content')
    expect(content).toHaveClass('p-6', 'pt-0')
  })
  
  it('renders CardFooter component correctly', () => {
    render(<CardFooter data-testid="card-footer">Footer Content</CardFooter>)
    const footer = screen.getByTestId('card-footer')
    
    expect(footer).toBeInTheDocument()
    expect(footer).toHaveTextContent('Footer Content')
    expect(footer).toHaveClass('flex', 'items-center', 'p-6', 'pt-0')
  })
  
  it('applies custom className correctly to Card components', () => {
    render(
      <Card className="custom-card-class" data-testid="custom-card">
        <CardHeader className="custom-header-class" data-testid="custom-header">
          <CardTitle className="custom-title-class" data-testid="custom-title">Title</CardTitle>
          <CardDescription className="custom-desc-class" data-testid="custom-desc">Description</CardDescription>
        </CardHeader>
        <CardContent className="custom-content-class" data-testid="custom-content">Content</CardContent>
        <CardFooter className="custom-footer-class" data-testid="custom-footer">Footer</CardFooter>
      </Card>
    )
    
    expect(screen.getByTestId('custom-card')).toHaveClass('custom-card-class')
    expect(screen.getByTestId('custom-header')).toHaveClass('custom-header-class')
    expect(screen.getByTestId('custom-title')).toHaveClass('custom-title-class')
    expect(screen.getByTestId('custom-desc')).toHaveClass('custom-desc-class')
    expect(screen.getByTestId('custom-content')).toHaveClass('custom-content-class')
    expect(screen.getByTestId('custom-footer')).toHaveClass('custom-footer-class')
  })
  
  it('forwards refs correctly to Card components', () => {
    const cardRef = jest.fn()
    const headerRef = jest.fn()
    const titleRef = jest.fn()
    const descRef = jest.fn()
    const contentRef = jest.fn()
    const footerRef = jest.fn()
    
    render(
      <Card ref={cardRef}>
        <CardHeader ref={headerRef}>
          <CardTitle ref={titleRef}>Title</CardTitle>
          <CardDescription ref={descRef}>Description</CardDescription>
        </CardHeader>
        <CardContent ref={contentRef}>Content</CardContent>
        <CardFooter ref={footerRef}>Footer</CardFooter>
      </Card>
    )
    
    expect(cardRef).toHaveBeenCalled()
    expect(headerRef).toHaveBeenCalled()
    expect(titleRef).toHaveBeenCalled()
    expect(descRef).toHaveBeenCalled()
    expect(contentRef).toHaveBeenCalled()
    expect(footerRef).toHaveBeenCalled()
  })
  
  it('renders a complete card with all subcomponents', () => {
    render(
      <Card data-testid="complete-card">
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card Description</CardDescription>
        </CardHeader>
        <CardContent>Main content goes here</CardContent>
        <CardFooter>
          <button>Action Button</button>
        </CardFooter>
      </Card>
    )
    
    const card = screen.getByTestId('complete-card')
    expect(card).toBeInTheDocument()
    expect(screen.getByText('Card Title')).toBeInTheDocument()
    expect(screen.getByText('Card Description')).toBeInTheDocument()
    expect(screen.getByText('Main content goes here')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Action Button' })).toBeInTheDocument()
  })
  
  it('passes additional props to Card components', () => {
    render(
      <Card data-custom="card-data" aria-label="Card component" data-testid="props-card">
        Card with props
      </Card>
    )
    
    const card = screen.getByTestId('props-card')
    expect(card).toHaveAttribute('data-custom', 'card-data')
    expect(card).toHaveAttribute('aria-label', 'Card component')
  })
  
  it('has no accessibility violations', async () => {
    const { container } = render(
      <Card>
        <CardHeader>
          <CardTitle>Accessible Card</CardTitle>
          <CardDescription>This is an accessible card component</CardDescription>
        </CardHeader>
        <CardContent>Content with proper contrast and structure</CardContent>
        <CardFooter>
          <button>Action</button>
        </CardFooter>
      </Card>
    )
    
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
}) 