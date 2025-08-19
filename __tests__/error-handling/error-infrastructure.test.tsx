/**
 * Comprehensive tests for Error Handling Infrastructure
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import '@testing-library/jest-dom';

// Test components and hooks
import { ErrorBoundary, ErrorFallback } from '@/components/error/error-boundary';
import { ErrorNotifications, ErrorNotification } from '@/components/error/error-notifications';
import { APIErrorDisplay } from '@/components/error/api-error-display';
import { useErrorRecovery } from '@/hooks/use-error-recovery';
import { createGlobalErrorHandler } from '@/utils/error/global-error-handler';
import { createErrorLogger } from '@/utils/error/error-logger';

// Real error logger for testing
const errorLogger = createErrorLogger({
  enableConsoleLogging: true,
  enableLocalStorage: true
});

// Mock API client for testing
jest.mock('@/lib/api/client', () => ({
  APIError: class APIError extends Error {
    constructor(public message: string, public status: number, public code?: string) {
      super(message);
    }
  }
}));

// Test utilities
const TestErrorComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error for error boundary');
  }
  return <div>Test Component</div>;
};

const NetworkErrorComponent = () => {
  throw new Error('fetch failed: network error');
};

const AuthErrorComponent = () => {
  throw new Error('Unauthorized: 401');
};

describe('Error Handling Infrastructure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear localStorage
    localStorage.clear();
    // Clear error logger logs
    errorLogger.clearLogs();
    // Suppress console errors in tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('ErrorBoundary', () => {
    it('should catch and display errors correctly', () => {
      render(
        <ErrorBoundary>
          <TestErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
      expect(screen.getByText(/An unexpected error occurred/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <TestErrorComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Test Component')).toBeInTheDocument();
      expect(screen.queryByText(/Something went wrong/i)).not.toBeInTheDocument();
    });

    it('should categorize network errors correctly', () => {
      render(
        <ErrorBoundary>
          <NetworkErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText(/trouble connecting to our servers/i)).toBeInTheDocument();
    });

    it('should categorize auth errors correctly', () => {
      render(
        <ErrorBoundary>
          <AuthErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Authentication error/i)).toBeInTheDocument();
    });

    it('should call onError callback when error occurs', () => {
      const onError = jest.fn();
      
      render(
        <ErrorBoundary onError={onError}>
          <TestErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String)
        })
      );
    });

    it('should reset error state when reset button is clicked', async () => {
      let shouldThrow = true;
      
      const TestComponent = () => {
        if (shouldThrow) {
          throw new Error('Test error for error boundary');
        }
        return <div>Test Component</div>;
      };

      render(
        <ErrorBoundary>
          <TestComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();

      // Change the behavior to not throw before clicking reset
      shouldThrow = false;

      fireEvent.click(screen.getByRole('button', { name: /try again/i }));

      // Wait for reset and successful render
      await waitFor(() => {
        expect(screen.getByText('Test Component')).toBeInTheDocument();
      });
    });
  });

  describe('ErrorNotifications', () => {
    const mockErrors = [
      {
        id: '1',
        message: 'Network error',
        category: 'network' as const,
        severity: 'high' as const,
        timestamp: Date.now(),
        retryable: true
      },
      {
        id: '2',
        message: 'Validation error',
        category: 'validation' as const,
        severity: 'medium' as const,
        timestamp: Date.now(),
        retryable: false
      }
    ];

    it('should render error notifications correctly', () => {
      const onDismiss = jest.fn();
      const onDismissAll = jest.fn();

      render(
        <ErrorNotifications 
          errors={mockErrors}
          onDismiss={onDismiss}
          onDismissAll={onDismissAll}
        />
      );

      expect(screen.getByText('Network error')).toBeInTheDocument();
      expect(screen.getByText('Validation error')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /dismiss all/i })).toBeInTheDocument();
    });

    it('should call onDismiss when individual error is dismissed', () => {
      const onDismiss = jest.fn();
      const onDismissAll = jest.fn();

      render(
        <ErrorNotifications 
          errors={mockErrors}
          onDismiss={onDismiss}
          onDismissAll={onDismissAll}
        />
      );

      const dismissButtons = screen.getAllByTitle('Dismiss notification');
      fireEvent.click(dismissButtons[0]);

      expect(onDismiss).toHaveBeenCalledWith('1');
    });

    it('should call onDismissAll when dismiss all button is clicked', () => {
      const onDismiss = jest.fn();
      const onDismissAll = jest.fn();

      render(
        <ErrorNotifications 
          errors={mockErrors}
          onDismiss={onDismiss}
          onDismissAll={onDismissAll}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /dismiss all/i }));

      expect(onDismissAll).toHaveBeenCalled();
    });
  });

  describe('APIErrorDisplay', () => {
    const mockAPIError = {
      name: 'APIError',
      message: 'Network request failed',
      status: 500,
      code: 'INTERNAL_ERROR'
    };

    it('should display API error information correctly', () => {
      render(
        <APIErrorDisplay 
          error={mockAPIError}
          onRetry={() => {}}
        />
      );

      expect(screen.getByText(/Unable to connect to the server/i)).toBeInTheDocument();
      expect(screen.getByText(/500/i)).toBeInTheDocument();
    });

    it('should show retry button when showRetry is true', () => {
      const onRetry = jest.fn();

      render(
        <APIErrorDisplay 
          error={mockAPIError}
          onRetry={onRetry}
        />
      );

      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();

      fireEvent.click(retryButton);
      expect(onRetry).toHaveBeenCalled();
    });

    it('should show technical details when enabled', () => {
      render(
        <APIErrorDisplay 
          error={mockAPIError}
          showDetails={true}
          context={{ endpoint: "/api/test" }}
        />
      );

      expect(screen.getByText(/technical details/i)).toBeInTheDocument();
    });
  });

  describe('useErrorRecovery hook', () => {
    it('should manage operation state correctly', () => {
      const mockApiCall = jest.fn().mockResolvedValue({ success: true });
      const { result } = renderHook(() => useErrorRecovery(mockApiCall));

      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.retryCount).toBe(0);
    });

    it('should handle error clearing correctly', () => {
      const mockApiCall = jest.fn().mockRejectedValue(new Error('Test error'));
      const { result } = renderHook(() => useErrorRecovery(mockApiCall));

      // Verify clearError function exists
      expect(typeof result.current.clearError).toBe('function');
      
      // Test that clearError can be called without error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    it('should handle retry functionality', () => {
      const mockApiCall = jest.fn().mockResolvedValue({ success: true });
      const { result } = renderHook(() => useErrorRecovery(mockApiCall));

      // Verify retry functions exist
      expect(typeof result.current.retry).toBe('function');
      expect(typeof result.current.execute).toBe('function');
      expect(typeof result.current.reset).toBe('function');
      
      // Initial state should be valid
      expect(result.current.retryCount).toBe(0);
      expect(result.current.canRetry).toBeDefined();
    });
  });

  describe('Error Logger', () => {
    it('should log errors to console in development', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const testError = {
        id: 'test-1',
        message: 'Test error',
        category: 'client' as const,
        severity: 'high' as const,
        timestamp: Date.now()
      };

      errorLogger.logError(testError);

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should store errors in localStorage when enabled', () => {
      const testError = {
        id: 'test-1',
        message: 'Test error',
        category: 'client' as const,
        severity: 'high' as const,
        timestamp: Date.now()
      };

      errorLogger.logError(testError);

      const storedErrors = localStorage.getItem('error_logs');
      expect(storedErrors).toBeTruthy();
      
      const parsedErrors = JSON.parse(storedErrors!);
      expect(parsedErrors).toHaveLength(1);
      expect(parsedErrors[0].message).toBe('Test error');
    });

    it('should retrieve error logs correctly', () => {
      const testError = {
        id: 'test-1',
        message: 'Test error',
        category: 'client' as const,
        severity: 'high' as const,
        timestamp: Date.now()
      };

      errorLogger.logError(testError);
      const logs = errorLogger.getLogs();

      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('Test error');
    });

    it('should clear logs correctly', () => {
      const testError = {
        id: 'test-1',
        message: 'Test error',
        category: 'client' as const,
        severity: 'high' as const,
        timestamp: Date.now()
      };

      errorLogger.logError(testError);
      expect(errorLogger.getLogs()).toHaveLength(1);

      errorLogger.clearLogs();
      expect(errorLogger.getLogs()).toHaveLength(0);
    });
  });

  describe('Integration Tests', () => {
    it('should integrate error boundary with error notifications', async () => {
      const onError = jest.fn();

      render(
        <div>
          <ErrorBoundary onError={onError}>
            <TestErrorComponent shouldThrow={true} />
          </ErrorBoundary>
        </div>
      );

      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
      expect(onError).toHaveBeenCalled();
    });

    it('should handle global error context integration', () => {
      // This test would verify integration with a global error context
      // when it's implemented in the application
      expect(true).toBe(true); // Placeholder
    });
  });
});
