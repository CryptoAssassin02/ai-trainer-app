/**
 * Error Boundary Components
 * Comprehensive error handling for React components and API errors
 */

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
}

// Error reporting function
const reportError = (error: Error, errorInfo: ErrorInfo, errorId: string) => {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.group('🚨 Error Boundary Caught Error');
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
    console.error('Error ID:', errorId);
    console.groupEnd();
  }

  // Report to error tracking service in production
  if (process.env.NODE_ENV === 'production') {
    try {
      // Send error report to backend
      fetch('/api/errors/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name
          },
          errorInfo: {
            componentStack: errorInfo.componentStack
          },
          errorId,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        })
      }).catch(reportingError => {
        console.error('Failed to report error:', reportingError);
      });
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  }
};

// Generate unique error ID
const generateErrorId = () => {
  return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Main Error Boundary Component
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = generateErrorId();
    
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorId = this.state.errorId || generateErrorId();
    
    this.setState({
      errorInfo,
    });

    // Report the error
    reportError(error, errorInfo, errorId);

    // Call custom error handler
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetOnPropsChange, resetKeys } = this.props;
    const { hasError } = this.state;

    if (hasError && resetOnPropsChange) {
      // Reset if any resetKeys changed
      if (resetKeys && prevProps.resetKeys) {
        const hasResetKeyChanged = resetKeys.some((key, idx) => 
          key !== prevProps.resetKeys?.[idx]
        );
        
        if (hasResetKeyChanged) {
          this.resetErrorBoundary();
        }
      }
    }
  }

  resetErrorBoundary = () => {
    // Clear any pending reset timeout
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  // Auto-reset after a delay (useful for transient errors)
  scheduleReset = (delay: number = 5000) => {
    this.resetTimeoutId = window.setTimeout(() => {
      this.resetErrorBoundary();
    }, delay);
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          errorId={this.state.errorId}
          resetError={this.resetErrorBoundary}
          scheduleReset={this.scheduleReset}
        />
      );
    }

    return this.props.children;
  }
}

// Error Fallback Component
interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  resetError: () => void;
  scheduleReset: (delay?: number) => void;
}

export function ErrorFallback({ 
  error, 
  errorInfo, 
  errorId, 
  resetError,
  scheduleReset 
}: ErrorFallbackProps) {
  const isNetworkError = error?.message.includes('fetch') || error?.message.includes('network');
  const isChunkError = error?.message.includes('chunk') || error?.message.includes('Loading chunk');
  const isAuthError = error?.message.includes('Unauthorized') || 
                     error?.message.includes('401') || 
                     error?.message.includes('Authentication') ||
                     error?.message.includes('auth');

  // Auto-retry for chunk loading errors
  React.useEffect(() => {
    if (isChunkError) {
      scheduleReset(2000); // Auto-retry after 2 seconds for chunk errors
    }
  }, [isChunkError, scheduleReset]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <CardTitle className="text-xl">Something went wrong</CardTitle>
          <CardDescription>
            {isAuthError ? (
              "Authentication error. Please log in again to continue."
            ) : isNetworkError ? (
              "We're having trouble connecting to our servers. Please check your internet connection."
            ) : isChunkError ? (
              "We're updating the app. This page will reload automatically."
            ) : (
              "An unexpected error occurred. Our team has been notified."
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Error details in development */}
          {process.env.NODE_ENV === 'development' && error && (
            <Alert variant="destructive">
              <Bug className="h-4 w-4" />
              <AlertTitle>Development Error Details</AlertTitle>
              <AlertDescription className="mt-2">
                <details className="cursor-pointer">
                  <summary className="font-medium">Error Message</summary>
                  <pre className="mt-2 text-xs whitespace-pre-wrap break-words">
                    {error.message}
                  </pre>
                </details>
                {error.stack && (
                  <details className="cursor-pointer mt-2">
                    <summary className="font-medium">Stack Trace</summary>
                    <pre className="mt-2 text-xs whitespace-pre-wrap break-words">
                      {error.stack}
                    </pre>
                  </details>
                )}
                {errorInfo?.componentStack && (
                  <details className="cursor-pointer mt-2">
                    <summary className="font-medium">Component Stack</summary>
                    <pre className="mt-2 text-xs whitespace-pre-wrap break-words">
                      {errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Error ID for support */}
          {errorId && (
            <Alert>
              <AlertDescription className="text-xs">
                Error ID: <code className="bg-muted px-1 rounded">{errorId}</code>
                <br />
                Please include this ID when contacting support.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row gap-2">
          <Button onClick={resetError} className="w-full sm:w-auto">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/'}
            className="w-full sm:w-auto"
          >
            <Home className="w-4 h-4 mr-2" />
            Go Home
          </Button>

          {/* Reload page for chunk errors */}
          {isChunkError && (
            <Button 
              variant="secondary"
              onClick={() => window.location.reload()}
              className="w-full sm:w-auto"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reload Page
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

// Higher-order component for easier usage
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// Hook for manual error reporting
export function useErrorHandler() {
  return React.useCallback((error: Error, errorInfo?: Partial<ErrorInfo>) => {
    const errorId = generateErrorId();
    
    // Create mock error info if not provided
    const mockErrorInfo: ErrorInfo = {
      componentStack: errorInfo?.componentStack || 'Manual error report',
    };

    reportError(error, mockErrorInfo, errorId);

    // Optionally show a toast or alert
    console.error('Manual error report:', { error, errorInfo, errorId });
  }, []);
}

// Component for testing error boundaries
export function ErrorThrower({ shouldThrow = false }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error thrown by ErrorThrower component');
  }

  return null;
}