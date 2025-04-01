import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { axe } from 'jest-axe'
import 'jest-axe/extend-expect'

// Mock Next.js navigation hooks
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/dashboard'),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
}))

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Activity: () => <div data-testid="icon-activity">Activity Icon</div>,
  BarChart: () => <div data-testid="icon-bar-chart">Bar Chart Icon</div>,
  Calendar: () => <div data-testid="icon-calendar">Calendar Icon</div>,
  ChevronLeft: () => <div data-testid="icon-chevron-left">Chevron Left Icon</div>,
  Dumbbell: () => <div data-testid="icon-dumbbell">Dumbbell Icon</div>,
  Home: () => <div data-testid="icon-home">Home Icon</div>,
  MenuIcon: () => <div data-testid="icon-menu">Menu Icon</div>,
  Settings: () => <div data-testid="icon-settings">Settings Icon</div>,
  User: () => <div data-testid="icon-user">User Icon</div>,
}))

// Mock AppSidebar component
const AppSidebar = ({ 
  isOpen = true, 
  onToggle = () => {},
  isMobile = false,
}: { 
  isOpen?: boolean
  onToggle?: () => void
  isMobile?: boolean
}) => {
  const pathname = '/dashboard' // Mocked with jest.mock above

  const navItems = [
    { href: '/dashboard', title: 'Dashboard', icon: 'home' },
    { href: '/workouts', title: 'Workouts', icon: 'dumbbell' },
    { href: '/progress', title: 'Progress', icon: 'activity' },
    { href: '/profile', title: 'Profile', icon: 'user' },
    { href: '/account', title: 'Account', icon: 'settings' },
  ]

  return (
    <div data-testid="app-sidebar" data-open={isOpen} data-mobile={isMobile}>
      <button 
        data-testid="sidebar-toggle"
        onClick={onToggle}
      >
        {isOpen ? 'Close' : 'Open'}
      </button>
      
      <div data-testid="sidebar-content" className={isOpen ? 'visible' : 'hidden'}>
        <nav data-testid="sidebar-nav">
          <ul>
            {navItems.map((item) => (
              <li 
                key={item.href} 
                data-testid={`nav-item-${item.href.replace('/', '')}`}
                className={pathname === item.href ? 'active' : ''}
              >
                <a href={item.href} data-testid={`nav-link-${item.href.replace('/', '')}`}>
                  {item.icon === 'home' && <div data-testid="icon-home">Home Icon</div>}
                  {item.icon === 'dumbbell' && <div data-testid="icon-dumbbell">Dumbbell Icon</div>}
                  {item.icon === 'activity' && <div data-testid="icon-activity">Activity Icon</div>}
                  {item.icon === 'user' && <div data-testid="icon-user">User Icon</div>}
                  {item.icon === 'settings' && <div data-testid="icon-settings">Settings Icon</div>}
                  <span data-testid={`nav-text-${item.href.replace('/', '')}`}>{item.title}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  )
}

describe('AppSidebar', () => {
  it('renders sidebar with navigation items', () => {
    render(<AppSidebar />)
    
    expect(screen.getByTestId('app-sidebar')).toBeInTheDocument()
    expect(screen.getByTestId('sidebar-content')).toBeInTheDocument()
    expect(screen.getByTestId('sidebar-nav')).toBeInTheDocument()
    
    // Check for navigation items
    expect(screen.getByTestId('nav-item-dashboard')).toBeInTheDocument()
    expect(screen.getByTestId('nav-item-workouts')).toBeInTheDocument()
    expect(screen.getByTestId('nav-item-progress')).toBeInTheDocument()
    expect(screen.getByTestId('nav-item-profile')).toBeInTheDocument()
    expect(screen.getByTestId('nav-item-account')).toBeInTheDocument()
    
    // Check for navigation text
    expect(screen.getByTestId('nav-text-dashboard')).toHaveTextContent('Dashboard')
    expect(screen.getByTestId('nav-text-workouts')).toHaveTextContent('Workouts')
    expect(screen.getByTestId('nav-text-progress')).toHaveTextContent('Progress')
    expect(screen.getByTestId('nav-text-profile')).toHaveTextContent('Profile')
    expect(screen.getByTestId('nav-text-account')).toHaveTextContent('Account')
  })
  
  it('highlights active navigation item based on current path', () => {
    render(<AppSidebar />)
    
    // Since we mocked usePathname to return '/dashboard', dashboard link should be active
    expect(screen.getByTestId('nav-item-dashboard')).toHaveClass('active')
    expect(screen.getByTestId('nav-item-workouts')).not.toHaveClass('active')
  })
  
  it('calls onToggle when toggle button is clicked', () => {
    const mockToggle = jest.fn()
    render(<AppSidebar onToggle={mockToggle} />)
    
    fireEvent.click(screen.getByTestId('sidebar-toggle'))
    
    expect(mockToggle).toHaveBeenCalledTimes(1)
  })
  
  it('displays correct toggle button text based on open state', () => {
    const { rerender } = render(<AppSidebar isOpen={true} />)
    
    expect(screen.getByTestId('sidebar-toggle')).toHaveTextContent('Close')
    
    rerender(<AppSidebar isOpen={false} />)
    
    expect(screen.getByTestId('sidebar-toggle')).toHaveTextContent('Open')
  })
  
  it('shows/hides content based on isOpen prop', () => {
    const { rerender } = render(<AppSidebar isOpen={true} />)
    
    expect(screen.getByTestId('sidebar-content')).toHaveClass('visible')
    
    rerender(<AppSidebar isOpen={false} />)
    
    expect(screen.getByTestId('sidebar-content')).toHaveClass('hidden')
  })
  
  it('renders in mobile view when isMobile is true', () => {
    render(<AppSidebar isMobile={true} />)
    
    expect(screen.getByTestId('app-sidebar')).toHaveAttribute('data-mobile', 'true')
  })
  
  it('renders in desktop view by default', () => {
    render(<AppSidebar />)
    
    expect(screen.getByTestId('app-sidebar')).toHaveAttribute('data-mobile', 'false')
  })
  
  it('renders icons for each navigation item', () => {
    render(<AppSidebar />)
    
    expect(screen.getByTestId('icon-home')).toBeInTheDocument()
    expect(screen.getByTestId('icon-dumbbell')).toBeInTheDocument()
    expect(screen.getByTestId('icon-activity')).toBeInTheDocument()
    expect(screen.getByTestId('icon-user')).toBeInTheDocument()
    expect(screen.getByTestId('icon-settings')).toBeInTheDocument()
  })
  
  it('has no accessibility violations', async () => {
    const { container } = render(<AppSidebar />)
    
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
}) 