import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import '@testing-library/jest-dom'
import 'jest-axe/extend-expect'

describe('Tabs Component', () => {
  const renderTabs = () => {
    return render(
      <Tabs defaultValue="tab1">
        <TabsList aria-label="Manage profile tabs">
          <TabsTrigger value="tab1">Profile</TabsTrigger>
          <TabsTrigger value="tab2">Account</TabsTrigger>
          <TabsTrigger value="tab3" disabled>Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Profile content</TabsContent>
        <TabsContent value="tab2">Account content</TabsContent>
        <TabsContent value="tab3">Settings content</TabsContent>
      </Tabs>
    )
  }

  it('renders tabs with proper structure', () => {
    renderTabs()
    
    // Check tabs are rendered
    expect(screen.getByRole('tablist')).toBeInTheDocument()
    expect(screen.getAllByRole('tab')).toHaveLength(3)
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1) // Only active tab panel is visible
  })

  it('shows the first tab content by default when using defaultValue', () => {
    renderTabs()
    
    // First tab should be active
    expect(screen.getByRole('tab', { name: /profile/i })).toHaveAttribute('data-state', 'active')
    expect(screen.getByText('Profile content')).toBeInTheDocument()
    expect(screen.queryByText('Account content')).not.toBeInTheDocument()
  })

  it('changes tab content when clicking a different tab', async () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList aria-label="Manage profile tabs">
          <TabsTrigger value="tab1">Profile</TabsTrigger>
          <TabsTrigger value="tab2">Account</TabsTrigger>
          <TabsTrigger value="tab3" disabled>Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Profile content</TabsContent>
        <TabsContent value="tab2">Account content</TabsContent>
        <TabsContent value="tab3">Settings content</TabsContent>
      </Tabs>
    )
    
    // Setup user event
    const user = userEvent.setup()
    
    // Initial state - Profile content should be visible
    expect(screen.getByText('Profile content')).toBeInTheDocument()
    
    // Click the Account tab
    await user.click(screen.getByRole('tab', { name: /account/i }))
    
    // Account content should now be visible, and Profile content should not
    expect(screen.getByText('Account content')).toBeInTheDocument()
    expect(screen.queryByText('Profile content')).not.toBeInTheDocument()
  })

  it('does not change tab when clicking a disabled tab', () => {
    renderTabs()
    
    // First tab starts as active
    expect(screen.getByRole('tab', { name: /profile/i })).toHaveAttribute('data-state', 'active')
    
    // Try to click disabled tab
    fireEvent.click(screen.getByRole('tab', { name: /settings/i }))
    
    // First tab should still be active
    expect(screen.getByRole('tab', { name: /profile/i })).toHaveAttribute('data-state', 'active')
    expect(screen.queryByText('Settings content')).not.toBeInTheDocument()
  })

  it('applies custom classNames correctly', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList className="custom-list-class">
          <TabsTrigger className="custom-trigger-class" value="tab1">Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent className="custom-content-class" value="tab1">Content 1</TabsContent>
      </Tabs>
    )
    
    expect(screen.getByRole('tablist')).toHaveClass('custom-list-class')
    expect(screen.getByRole('tab')).toHaveClass('custom-trigger-class')
    expect(screen.getByRole('tabpanel')).toHaveClass('custom-content-class')
  })

  it('forwards refs correctly', () => {
    const listRef = jest.fn()
    const triggerRef = jest.fn()
    const contentRef = jest.fn()
    
    render(
      <Tabs defaultValue="tab1">
        <TabsList ref={listRef}>
          <TabsTrigger ref={triggerRef} value="tab1">Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent ref={contentRef} value="tab1">Content 1</TabsContent>
      </Tabs>
    )
    
    // The refs should have been called during rendering
    expect(listRef).toHaveBeenCalled()
    expect(triggerRef).toHaveBeenCalled()
    expect(contentRef).toHaveBeenCalled()
  })

  it('passes additional props to underlying elements', () => {
    render(
      <Tabs defaultValue="tab1" data-testid="tabs-root">
        <TabsList data-testid="tabs-list">
          <TabsTrigger data-testid="tabs-trigger" value="tab1">Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent data-testid="tabs-content" value="tab1">Content 1</TabsContent>
      </Tabs>
    )
    
    expect(screen.getByTestId('tabs-root')).toBeInTheDocument()
    expect(screen.getByTestId('tabs-list')).toBeInTheDocument()
    expect(screen.getByTestId('tabs-trigger')).toBeInTheDocument()
    expect(screen.getByTestId('tabs-content')).toBeInTheDocument()
  })

  it('has proper keyboard navigation', async () => {
    renderTabs()
    
    const firstTab = screen.getByRole('tab', { name: /profile/i })
    const secondTab = screen.getByRole('tab', { name: /account/i })
    
    // Focus on first tab
    firstTab.focus()
    expect(document.activeElement).toBe(firstTab)
    
    // Press arrow right to move to next tab
    fireEvent.keyDown(firstTab, { key: 'ArrowRight' })
    
    // Use waitFor to ensure the focus has been moved
    await waitFor(() => {
      expect(document.activeElement).toBe(secondTab)
    })
  })

  it('has no accessibility violations', async () => {
    const { container } = renderTabs()
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
}) 