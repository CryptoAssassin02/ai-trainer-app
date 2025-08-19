/**
 * Error Boundary Component Validation Tests
 * Tests error handling components and API error display
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '@/components/error/error-boundary';
import { APIErrorDisplay } from '@/components/error/api-error-display';
import { APIError } from '@/lib/api/client';

// Component that throws an error for testing
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('Error Boundary Validation', () => {
  // Suppress console.error for these tests
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  describe('1. Error Boundary Component', () => {
    test('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
    });

    test('should catch and display errors', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Try again')).toBeInTheDocument();
    });

    test('should allow error recovery', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      // Click try again button
      fireEvent.click(screen.getByText('Try again'));

      // Re-render with no error
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
    });
  });

  describe('2. API Error Display Component', () => {
    test('should display network errors correctly', () => {
      const networkError = new APIError('Network error', 0, 'NETWORK_ERROR', true);
      
      render(
        <APIErrorDisplay 
          error={networkError} 
          onRetry={() => {}} 
          showRetry={true}
        />
      );

      expect(screen.getByText(/network error/i)).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    test('should display server errors correctly', () => {
      const serverError = new APIError('Server error', 500, 'SERVER_ERROR', false);
      
      render(
        <APIErrorDisplay 
          error={serverError} 
          onRetry={() => {}} 
          showRetry={false}
        />
      );

      expect(screen.getByText(/server error/i)).toBeInTheDocument();
      expect(screen.queryByText('Retry')).not.toBeInTheDocument();
    });

    test('should handle authentication errors', () => {
      const authError = new APIError('Unauthorized', 401, 'AUTH_ERROR', false);
      
      render(
        <APIErrorDisplay 
          error={authError} 
          onRetry={() => {}} 
        />
      );

      expect(screen.getByText(/unauthorized/i)).toBeInTheDocument();
    });

    test('should call onRetry when retry button is clicked', () => {
      const mockRetry = jest.fn();
      const error = new APIError('Network error', 0, 'NETWORK_ERROR', true);
      
      render(
        <APIErrorDisplay 
          error={error} 
          onRetry={mockRetry} 
          showRetry={true}
        />
      );

      fireEvent.click(screen.getByText('Retry'));
      expect(mockRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('3. Error Recovery Patterns', () => {
    test('should provide different recovery options based on error type', () => {
      const networkError = new APIError('Network error', 0, 'NETWORK_ERROR', true);
      
      render(
        <APIErrorDisplay 
          error={networkError} 
          onRetry={() => {}} 
          showRetry={true}
        />
      );

      // Network errors should show retry option
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    test('should handle unknown errors gracefully', () => {
      const unknownError = new Error('Unknown error');
      
      render(
        <APIErrorDisplay 
          error={unknownError} 
          onRetry={() => {}} 
        />
      );

      expect(screen.getByText(/unknown error/i)).toBeInTheDocument();
    });
  });
});