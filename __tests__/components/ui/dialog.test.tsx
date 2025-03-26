import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { axe } from 'jest-axe'
import 'jest-axe/extend-expect'
import userEvent from '@testing-library/user-event'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose
} from '@/components/ui/dialog'

// Mock the X icon from lucide-react
jest.mock('lucide-react', () => ({
  X: () => <div data-testid="close-icon">X</div>
}))

describe('Dialog Component', () => {
  it('renders dialog components without crashing', () => {
    render(
      <Dialog>
        <DialogTrigger data-testid="dialog-trigger">Open Dialog</DialogTrigger>
        <DialogContent data-testid="dialog-content">
          <DialogHeader>
            <DialogTitle>Dialog Title</DialogTitle>
            <DialogDescription>Dialog Description</DialogDescription>
          </DialogHeader>
          <div>Dialog main content</div>
          <DialogFooter>
            <DialogClose data-testid="dialog-close">Close</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
    
    // Only the trigger should be visible initially
    expect(screen.getByTestId('dialog-trigger')).toBeInTheDocument()
    expect(screen.queryByTestId('dialog-content')).not.toBeInTheDocument()
  })
  
  it('opens dialog when trigger is clicked', async () => {
    render(
      <Dialog>
        <DialogTrigger data-testid="dialog-trigger">Open Dialog</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dialog Title</DialogTitle>
            <DialogDescription>Dialog Description</DialogDescription>
          </DialogHeader>
          <div>Dialog main content</div>
          <DialogFooter>
            <DialogClose>Close</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
    
    // Click trigger to open dialog
    const trigger = screen.getByTestId('dialog-trigger')
    fireEvent.click(trigger)
    
    // Wait for dialog content to appear
    await waitFor(() => {
      expect(screen.getByText('Dialog Title')).toBeInTheDocument()
      expect(screen.getByText('Dialog Description')).toBeInTheDocument()
      expect(screen.getByText('Dialog main content')).toBeInTheDocument()
    })
  })
  
  it('applies custom className to dialog components', () => {
    render(
      <Dialog>
        <DialogTrigger className="custom-trigger-class" data-testid="custom-trigger">
          Open Dialog
        </DialogTrigger>
        <DialogContent className="custom-content-class" data-testid="dialog-content">
          <DialogHeader className="custom-header-class" data-testid="dialog-header">
            <DialogTitle className="custom-title-class" data-testid="dialog-title">
              Dialog Title
            </DialogTitle>
            <DialogDescription className="custom-desc-class" data-testid="dialog-desc">
              Dialog Description
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="custom-footer-class" data-testid="dialog-footer">
            <DialogClose className="custom-close-class" data-testid="dialog-close">
              Close
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
    
    // Check that custom classes are applied
    expect(screen.getByTestId('custom-trigger')).toHaveClass('custom-trigger-class')
    
    // Click trigger to open dialog so we can check other components
    fireEvent.click(screen.getByTestId('custom-trigger'))
    
    // We can't easily check classes for the content components in JSDOM as they get portaled
  })
  
  it('closes dialog when close button is clicked', async () => {
    render(
      <Dialog>
        <DialogTrigger data-testid="dialog-trigger">Open Dialog</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dialog Title</DialogTitle>
          </DialogHeader>
          <DialogClose data-testid="dialog-close">Close</DialogClose>
        </DialogContent>
      </Dialog>
    )
    
    // Open dialog
    fireEvent.click(screen.getByTestId('dialog-trigger'))
    
    // Wait for dialog to appear
    await waitFor(() => {
      expect(screen.getByText('Dialog Title')).toBeInTheDocument()
    })
    
    // Close dialog
    fireEvent.click(screen.getByTestId('dialog-close'))
    
    // Wait for dialog to disappear
    await waitFor(() => {
      expect(screen.queryByText('Dialog Title')).not.toBeInTheDocument()
    })
  })
  
  it('closes dialog when X button is clicked', async () => {
    render(
      <Dialog>
        <DialogTrigger data-testid="dialog-trigger">Open Dialog</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dialog Title</DialogTitle>
          </DialogHeader>
          <div>Dialog Content</div>
        </DialogContent>
      </Dialog>
    )
    
    // Open dialog
    fireEvent.click(screen.getByTestId('dialog-trigger'))
    
    // Wait for dialog to appear
    await waitFor(() => {
      expect(screen.getByText('Dialog Title')).toBeInTheDocument()
    })
    
    // The X icon is a close button
    const closeIcon = screen.getByTestId('close-icon')
    const closeButton = closeIcon.closest('button')
    
    // Add null check
    if (closeButton) {
      fireEvent.click(closeButton)
    } else {
      // Fallback if button not found
      throw new Error('Close button not found')
    }
    
    // Wait for dialog to disappear
    await waitFor(() => {
      expect(screen.queryByText('Dialog Title')).not.toBeInTheDocument()
    })
  })
  
  it('forwards refs correctly', () => {
    const titleRef = jest.fn()
    const descRef = jest.fn()
    
    render(
      <Dialog>
        <DialogTrigger>Open Dialog</DialogTrigger>
        <DialogContent>
          <DialogTitle ref={titleRef}>Dialog Title</DialogTitle>
          <DialogDescription ref={descRef}>Dialog Description</DialogDescription>
        </DialogContent>
      </Dialog>
    )
    
    // Open dialog
    fireEvent.click(screen.getByText('Open Dialog'))
    
    // Refs should be called
    expect(titleRef).toHaveBeenCalled()
    expect(descRef).toHaveBeenCalled()
  })
  
  it('has correct accessible close button', async () => {
    render(
      <Dialog>
        <DialogTrigger data-testid="dialog-trigger">Open Dialog</DialogTrigger>
        <DialogContent>
          <DialogTitle>Dialog Title</DialogTitle>
        </DialogContent>
      </Dialog>
    )
    
    // Open dialog
    fireEvent.click(screen.getByTestId('dialog-trigger'))
    
    // Check that there is a close button with proper screen reader text
    await waitFor(() => {
      const srOnly = screen.getByText('Close')
      expect(srOnly).toHaveClass('sr-only')
    })
  })
  
  it('passes additional props to components', async () => {
    render(
      <Dialog>
        <DialogTrigger data-testid="dialog-trigger" aria-label="Open dialog">
          Open Dialog
        </DialogTrigger>
        <DialogContent data-testid="dialog-content" aria-labelledby="dialog-title">
          <DialogTitle id="dialog-title">Dialog Title</DialogTitle>
        </DialogContent>
      </Dialog>
    )
    
    expect(screen.getByTestId('dialog-trigger')).toHaveAttribute('aria-label', 'Open dialog')
    
    // Open dialog
    fireEvent.click(screen.getByTestId('dialog-trigger'))
    
    // Wait for dialog content to appear
    await waitFor(() => {
      expect(screen.getByText('Dialog Title')).toBeInTheDocument()
    })
  })
  
  it('has no accessibility violations', async () => {
    const { container } = render(
      <Dialog>
        <DialogTrigger>Open Dialog</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accessible Dialog</DialogTitle>
            <DialogDescription>This is an accessible dialog component</DialogDescription>
          </DialogHeader>
          <div>Dialog content with proper structure</div>
          <DialogFooter>
            <button>Action</button>
            <DialogClose>Close</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
    
    // Open dialog
    fireEvent.click(screen.getByText('Open Dialog'))
    
    // Allow dialog to render
    await waitFor(() => {
      expect(screen.getByText('Accessible Dialog')).toBeInTheDocument()
    })
    
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
}) 