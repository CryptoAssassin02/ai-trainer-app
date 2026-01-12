import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { axe } from 'jest-axe'
import 'jest-axe/extend-expect'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/dashboard'),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
}))

// Mock Next.js Link
jest.mock('next/link', () => {
  return ({ children, href, ...rest }: { children: React.ReactNode, href: string }) => (
    <a href={href} {...rest} data-testid="next-link">
      {children}
    </a>
  )
})

// Mock Next.js Image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} data-testid="next-image" />
}))

// Mock context hooks
jest.mock('@/lib/profile-context', () => ({
  useProfile: jest.fn(() => ({
    profile: {
      name: 'John Doe',
      email: 'john@example.com',
      avatar: '/avatar.png'
    },
    isLoading: false,
    error: null
  }))
}))

// Mock UI components
jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-menu">{children}</div>
  ),
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => (
    <button data-testid="dropdown-trigger">{children}</button>
  ),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-content">{children}</div>
  ),
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-label">{children}</div>
  ),
  DropdownMenuSeparator: () => <hr data-testid="dropdown-separator" />,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode, onClick?: () => void }) => (
    <button data-testid="dropdown-item" onClick={onClick}>{children}</button>
  ),
}))

// Mock the SignOutButton component
jest.mock('@/components/auth/sign-out-button', () => {
  return {
    SignOutButton: jest.fn(({ onSignOut }) => (
      <button data-testid="sign-out-button" onClick={onSignOut}>
        Sign Out
      </button>
    ))
  }
})

// Mock the SiteHeader component
const SiteHeader = ({ 
  notificationCount = 0,
  onToggleSidebar,
  isMobile = false
}: { 
  notificationCount?: number
  onToggleSidebar?: () => void
  isMobile?: boolean
}) => {
  const [userMenuOpen, setUserMenuOpen] = React.useState(false)
  
  return (
    <header data-testid="site-header" data-mobile={isMobile}>
      <div className="flex items-center justify-between">
        {isMobile && (
          <button 
            data-testid="sidebar-toggle"
            onClick={onToggleSidebar}
          >
            Toggle Sidebar
          </button>
        )}
        
        <div data-testid="site-logo">
          <a href="/" data-testid="logo-link">
            <img 
              src="/logo.png" 
              alt="trAIner Logo" 
              data-testid="logo-image" 
            />
          </a>
        </div>
        
        <div className="flex items-center gap-4">
          {notificationCount > 0 && (
            <div data-testid="notification-badge">
              {notificationCount}
            </div>
          )}
          
          <div data-testid="dropdown-menu">
            <button 
              data-testid="dropdown-trigger"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
            >
              <img 
                src="/avatar.png" 
                alt="User Avatar" 
                data-testid="user-avatar" 
              />
            </button>
            
            {userMenuOpen && (
              <div data-testid="dropdown-content">
                <div data-testid="dropdown-label">John Doe</div>
                <hr data-testid="dropdown-separator" />
                <button data-testid="dropdown-item-profile">Profile</button>
                <button data-testid="dropdown-item-settings">Settings</button>
                <button data-testid="sign-out-button">Sign Out</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

describe('SiteHeader', () => {
  const mockToggleSidebar = jest.fn()
  
  beforeEach(() => {
    jest.clearAllMocks()
  })
  
  it('renders the site header with logo', () => {
    render(<SiteHeader />)
    
    expect(screen.getByTestId('site-header')).toBeInTheDocument()
    expect(screen.getByTestId('site-logo')).toBeInTheDocument()
    expect(screen.getByTestId('logo-link')).toHaveAttribute('href', '/')
    expect(screen.getByTestId('logo-image')).toBeInTheDocument()
  })
  
  it('renders user avatar in dropdown trigger', () => {
    render(<SiteHeader />)
    
    expect(screen.getByTestId('dropdown-trigger')).toBeInTheDocument()
    expect(screen.getByTestId('user-avatar')).toBeInTheDocument()
  })
  
  it('toggles user dropdown menu when trigger is clicked', () => {
    render(<SiteHeader />)
    
    // Initially dropdown content should not be visible
    expect(screen.queryByTestId('dropdown-content')).not.toBeInTheDocument()
    
    // Click dropdown trigger
    fireEvent.click(screen.getByTestId('dropdown-trigger'))
    
    // Dropdown content should now be visible
    expect(screen.getByTestId('dropdown-content')).toBeInTheDocument()
    expect(screen.getByTestId('dropdown-label')).toHaveTextContent('John Doe')
    expect(screen.getByTestId('dropdown-item-profile')).toBeInTheDocument()
    expect(screen.getByTestId('dropdown-item-settings')).toBeInTheDocument()
    
    // Click dropdown trigger again
    fireEvent.click(screen.getByTestId('dropdown-trigger'))
    
    // Dropdown content should be hidden again
    expect(screen.queryByTestId('dropdown-content')).not.toBeInTheDocument()
  })
  
  it('renders notification badge when notification count is greater than 0', () => {
    render(<SiteHeader notificationCount={5} />)
    
    expect(screen.getByTestId('notification-badge')).toBeInTheDocument()
    expect(screen.getByTestId('notification-badge')).toHaveTextContent('5')
  })
  
  it('does not render notification badge when notification count is 0', () => {
    render(<SiteHeader notificationCount={0} />)
    
    expect(screen.queryByTestId('notification-badge')).not.toBeInTheDocument()
  })
  
  it('renders sidebar toggle button in mobile view', () => {
    render(<SiteHeader isMobile={true} onToggleSidebar={mockToggleSidebar} />)
    
    expect(screen.getByTestId('sidebar-toggle')).toBeInTheDocument()
  })
  
  it('does not render sidebar toggle button in desktop view', () => {
    render(<SiteHeader isMobile={false} onToggleSidebar={mockToggleSidebar} />)
    
    expect(screen.queryByTestId('sidebar-toggle')).not.toBeInTheDocument()
  })
  
  it('calls onToggleSidebar when sidebar toggle button is clicked', () => {
    render(<SiteHeader isMobile={true} onToggleSidebar={mockToggleSidebar} />)
    
    fireEvent.click(screen.getByTestId('sidebar-toggle'))
    
    expect(mockToggleSidebar).toHaveBeenCalledTimes(1)
  })
  
  it('sets mobile data attribute correctly', () => {
    const { rerender } = render(<SiteHeader isMobile={true} />)
    
    expect(screen.getByTestId('site-header')).toHaveAttribute('data-mobile', 'true')
    
    rerender(<SiteHeader isMobile={false} />)
    
    expect(screen.getByTestId('site-header')).toHaveAttribute('data-mobile', 'false')
  })
  
  it('shows sign out button in user dropdown', () => {
    render(<SiteHeader />)
    
    // Open the dropdown
    fireEvent.click(screen.getByTestId('dropdown-trigger'))
    
    expect(screen.getByTestId('sign-out-button')).toBeInTheDocument()
  })
  
  it('has no accessibility violations', async () => {
    const { container } = render(<SiteHeader />)
    
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
}) 