/**
 * API Error Display Tests
 * Tests for enhanced API error display component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ApiErrorDisplay } from '@/components/error/api-error-display';
import { APIError } from '@/lib/api/constants';

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});

// Mock window events
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();
Object.defineProperty(window, 'addEventListener', { value: mockAddEventListener });
Object.defineProperty(window, 'removeEventListener', { value: mockRemoveEventListener });

describe('ApiErrorDisplay', () => {
  const mockOnRetry = jest.fn();
  const mockOnDismiss = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (navigator as any).onLine = true;
  });

  test('renders nothing when no error is provided', () => {
    const { container } = render(<ApiErrorDisplay error={null} />);
    expect(container.firstChild).toBeNull();
  });

  test('renders error message for APIError', () => {
    const apiError = new APIError('API request failed', 500, 'INTERNAL_SERVER_ERROR');
    
    render(<ApiErrorDisplay error={apiError} />);
    
    expect(screen.getByText('Server Error')).toBeInTheDocument();
    expect(screen.getByText(/internal server error occurred/i)).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
    expect(screen.getByText('INTERNAL_SERVER_ERROR')).toBeInTheDocument();
  });

  test('renders error message for generic Error', () => {
    const genericError = new Error('Something went wrong');
    
    render(<ApiErrorDisplay error={genericError} />);
    
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  test('renders error message for ApiError interface', () => {
    const apiError = {
      message: 'Validation failed',
      status: 422,
      code: 'VALIDATION_ERROR',
      retryable: false
    };
    
    render(<ApiErrorDisplay error={apiError} />);
    
    expect(screen.getByText('Validation Error')).toBeInTheDocument();
    expect(screen.getByText(/data provided was invalid/i)).toBeInTheDocument();
    expect(screen.getByText('422')).toBeInTheDocument();
    expect(screen.getByText('VALIDATION_ERROR')).toBeInTheDocument();
  });

  test('detects and handles network errors', () => {
    const networkError = new Error('Failed to fetch');
    
    render(<ApiErrorDisplay error={networkError} />);
    
    expect(screen.getByText('Connection Error')).toBeInTheDocument();
    expect(screen.getByText(/unable to connect to the server/i)).toBeInTheDocument();
  });

  test('detects and handles offline state', () => {
    (navigator as any).onLine = false;
    const offlineError = new Error('Network request failed');
    
    render(<ApiErrorDisplay error={offlineError} />);
    
    expect(screen.getByText('Offline')).toBeInTheDocument();
    expect(screen.getByText(/appear to be offline/i)).toBeInTheDocument();
  });

  test('shows retry button for retryable errors', () => {
    const retryableError = new APIError('Server timeout', 504, 'GATEWAY_TIMEOUT');
    
    render(<ApiErrorDisplay error={retryableError} onRetry={mockOnRetry} />);
    
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  test('calls onRetry when retry button is clicked', () => {
    const retryableError = new APIError('Server error', 500);
    
    render(<ApiErrorDisplay error={retryableError} onRetry={mockOnRetry} />);
    
    fireEvent.click(screen.getByText('Retry'));
    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  test('shows dismiss button when onDismiss is provided', () => {
    const error = new Error('Test error');
    
    render(<ApiErrorDisplay error={error} onDismiss={mockOnDismiss} />);
    
    expect(screen.getByText('Dismiss')).toBeInTheDocument();
  });

  test('calls onDismiss when dismiss button is clicked', () => {
    const error = new Error('Test error');
    
    render(<ApiErrorDisplay error={error} onDismiss={mockOnDismiss} />);
    
    fireEvent.click(screen.getByText('Dismiss'));
    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  test('shows technical details when showDetails is true', () => {
    const error = new Error('Detailed error');
    error.stack = 'Error stack trace here';
    
    render(<ApiErrorDisplay error={error} showDetails={true} />);
    
    expect(screen.getByText('Technical Details')).toBeInTheDocument();
    
    // Click to expand details
    fireEvent.click(screen.getByText('Technical Details'));
    expect(screen.getAllByText('Detailed error')).toHaveLength(2); // Both in main message and technical details
    expect(screen.getByText(/Error stack trace here/)).toBeInTheDocument();
  });

  test('shows console log button in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    const error = new Error('Development error');
    
    render(<ApiErrorDisplay error={error} />);
    
    expect(screen.getByText('Log to Console')).toBeInTheDocument();
    
    process.env.NODE_ENV = originalEnv;
  });

  test('handles different HTTP status codes correctly', () => {
    const testCases = [
      { status: 400, title: 'Bad Request', message: /request was invalid/i },
      { status: 401, title: 'Authentication Required', message: /session has expired/i },
      { status: 403, title: 'Access Denied', message: /don't have permission/i },
      { status: 404, title: 'Not Found', message: /requested resource was not found/i },
      { status: 429, title: 'Rate Limited', message: /too many requests/i },
      { status: 500, title: 'Server Error', message: /internal server error/i },
      { status: 503, title: 'Service Unavailable', message: /temporarily unavailable/i }
    ];

    testCases.forEach(({ status, title, message }) => {
      const { unmount } = render(
        <ApiErrorDisplay error={new APIError('Test error', status)} />
      );
      
      expect(screen.getByText(title)).toBeInTheDocument();
      expect(screen.getByText(message)).toBeInTheDocument();
      
      unmount();
    });
  });

  test('monitors network status changes', async () => {
    const networkError = new Error('Failed to fetch');
    
    render(<ApiErrorDisplay error={networkError} />);
    
    // Simulate going offline
    act(() => {
      (navigator as any).onLine = false;
      // Trigger offline event
      const offlineEvent = new Event('offline');
      window.dispatchEvent(offlineEvent);
    });

    await waitFor(() => {
      expect(screen.getByText(/appear to be offline/i)).toBeInTheDocument();
    });

    // Simulate coming back online
    act(() => {
      (navigator as any).onLine = true;
      // Trigger online event
      const onlineEvent = new Event('online');
      window.dispatchEvent(onlineEvent);
    });

    await waitFor(() => {
      expect(screen.getByText(/unable to connect to the server/i)).toBeInTheDocument();
    });
  });

  test('implements auto-retry for network errors', async () => {
    const networkError = new Error('Failed to fetch');
    
    render(
      <ApiErrorDisplay 
        error={networkError} 
        onRetry={mockOnRetry}
        autoRetry={true}
        maxRetries={2}
      />
    );

    expect(screen.getByText(/retrying automatically/i)).toBeInTheDocument();
    
    // Wait for auto-retry
    await waitFor(() => {
      expect(mockOnRetry).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  test('stops auto-retry after max attempts', async () => {
    const networkError = new Error('Network failure');
    
    render(
      <ApiErrorDisplay 
        error={networkError} 
        onRetry={mockOnRetry}
        autoRetry={true}
        maxRetries={1}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/maximum retry attempts reached/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('disables retry for non-retryable errors', () => {
    const authError = new APIError('Unauthorized', 401);
    
    render(<ApiErrorDisplay error={authError} onRetry={mockOnRetry} />);
    
    expect(screen.queryByText('Retry')).not.toBeInTheDocument();
  });

  test('shows retry count and delay information', () => {
    const networkError = new Error('Failed to fetch');
    
    render(
      <ApiErrorDisplay 
        error={networkError} 
        autoRetry={true}
        maxRetries={3}
      />
    );

    expect(screen.getByText(/Attempt 1\/3/)).toBeInTheDocument();
  });

  test('handles context and timestamp information', () => {
    const errorWithContext = {
      message: 'Context error',
      timestamp: new Date('2025-01-01T12:00:00Z'),
      context: { userId: '123', action: 'save' }
    };
    
    render(<ApiErrorDisplay error={errorWithContext} showDetails={true} />);
    
    fireEvent.click(screen.getByText('Technical Details'));
    
    expect(screen.getByText(/Time:/)).toBeInTheDocument();
    expect(screen.getByText(/Context:/)).toBeInTheDocument();
  });

  test('cleans up event listeners on unmount', () => {
    const { unmount } = render(<ApiErrorDisplay error={new Error('Test')} />);
    
    unmount();
    
    expect(mockRemoveEventListener).toHaveBeenCalledWith('online', expect.any(Function));
    expect(mockRemoveEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
  });
});