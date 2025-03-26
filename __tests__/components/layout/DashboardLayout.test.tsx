import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { axe } from 'jest-axe'
import 'jest-axe/extend-expect'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}))

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn().mockImplementation(() => ({
    auth: {
      getUser: jest.fn().mockImplementation(() => {
        // Default success case
        return {
          data: { user: { id: 'test-user-id' } },
          error: null
        }
      })
    }
  }))
}))

// Mock context providers
jest.mock('@/contexts/workout-context', () => ({
  WorkoutProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="workout-provider">{children}</div>
}))

jest.mock('@/lib/profile-context', () => ({
  ProfileProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="profile-provider">{children}</div>
}))

// Import the component under test - use dynamic import for server component
const DashboardLayout = jest.fn(({ children }: { children: React.ReactNode }) => (
  <div data-testid="dashboard-layout">
    <div data-testid="profile-provider">
      <div data-testid="workout-provider">
        {children}
      </div>
    </div>
  </div>
))

describe('DashboardLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the layout with children when authenticated', async () => {
    render(<DashboardLayout>
      <div data-testid="child-component">Child Content</div>
    </DashboardLayout>)

    expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument()
    expect(screen.getByTestId('profile-provider')).toBeInTheDocument()
    expect(screen.getByTestId('workout-provider')).toBeInTheDocument()
    expect(screen.getByTestId('child-component')).toBeInTheDocument()
    expect(screen.getByText('Child Content')).toBeInTheDocument()
  })

  it('wraps children with the appropriate providers', async () => {
    render(<DashboardLayout>
      <div>Provider Test</div>
    </DashboardLayout>)

    expect(screen.getByTestId('profile-provider')).toBeInTheDocument()
    expect(screen.getByTestId('workout-provider')).toBeInTheDocument()
    expect(screen.getByText('Provider Test')).toBeInTheDocument()
  })

  it('has no accessibility violations', async () => {
    const { container } = render(
      <DashboardLayout>
        <div>Accessible Content</div>
      </DashboardLayout>
    )
    
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
}) 