'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, Info, Bug } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Types
export interface ApiErrorDisplayProps {
  error: Error | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  autoRetry?: boolean;
  maxRetries?: number;
  showDetails?: boolean;
  context?: Record<string, unknown>;
}

// Helper function to parse error details
function parseErrorDetails(error: Error | null) {
  if (!error) {
    return {
      message: 'An unexpected error occurred',
      name: 'Error',
      stack: '',
      timestamp: new Date().toISOString()
    };
  }
  
  return {
    message: error.message || 'An unexpected error occurred',
    name: error.name || 'Error',
    stack: error.stack,
    timestamp: (error && 'timestamp' in error && (error as any).timestamp) ? 
      (error as any).timestamp : new Date().toISOString()
  };
}

// Main component
export function ApiErrorDisplay({
  error,
  onRetry,
  onDismiss,
  autoRetry = false,
  maxRetries = 3,
  showDetails = false,
  context
}: ApiErrorDisplayProps) {
  // All hooks must be called before any conditional returns
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [, forceRender] = useState({});

  // Parse error details (safe to do even if error is null)
  const errorDetails = error ? parseErrorDetails(error) : { message: '', name: '', stack: undefined };

  const isNetworkError = React.useMemo(() => {
    if (!error) return false;
    return errorDetails.message.includes('fetch') || 
           errorDetails.message.includes('network') || 
           errorDetails.message.includes('Failed to fetch') ||
           errorDetails.message.includes('NetworkError') ||
           errorDetails.message.includes('Network failure') ||
           errorDetails.message.toLowerCase().includes('network');
  }, [error, errorDetails.message]);

  const isOfflineError = React.useMemo(() => {
    if (!error) return false;
    return !isOnline || errorDetails.message.includes('offline');
  }, [error, isOnline, errorDetails.message]);

  const isRetryableError = React.useMemo(() => {
    if (!error) return false;
    // Non-retryable error codes
    const nonRetryableErrors = [401, 403, 404, 422];
    
    // Check if error message contains non-retryable status codes
    const hasNonRetryableCode = nonRetryableErrors.some(code => 
      errorDetails.message.includes(code.toString())
    );
    
    // Check for specific non-retryable error types
    const isAuthError = errorDetails.message.includes('Unauthorized') || 
                       errorDetails.message.includes('Forbidden') ||
                       errorDetails.message.includes('permission');
    
    const isValidationError = errorDetails.message.includes('validation') ||
                             errorDetails.name === 'ValidationError';
    
    return !hasNonRetryableCode && !isAuthError && !isValidationError;
  }, [error, errorDetails.message, errorDetails.name]);

  // Handle auto-retry logic - must be called before early return
  useEffect(() => {
    if (error && autoRetry && (isNetworkError || isOfflineError) && retryCount < maxRetries && onRetry) {
      const retryDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff
      const timer = setTimeout(() => {
        setIsRetrying(true);
        setRetryCount(prev => prev + 1);
        onRetry();
        setIsRetrying(false);
      }, retryDelay);

      return () => clearTimeout(timer);
    }
  }, [error, autoRetry, isNetworkError, isOfflineError, retryCount, maxRetries, onRetry]);

  // Monitor network status - must be called before early return
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setForceUpdate(prev => prev + 1);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setForceUpdate(prev => prev + 1);
    };

    if (typeof window !== 'undefined') {
      // Set initial state based on current navigator status
      setIsOnline(navigator.onLine);
      
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  // Force a re-render when forceUpdate changes - must be called before early return
  useEffect(() => {
    // This effect just ensures the component re-renders when forceUpdate changes
  }, [forceUpdate]);

  // Force update when navigator.onLine changes (for test environment) - must be called before early return
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof navigator !== 'undefined') {
        const currentNavigatorStatus = navigator.onLine;
        const currentStateStatus = isOnline;
        
        // If navigator.onLine doesn't match our state, force an update
        if (currentNavigatorStatus !== currentStateStatus) {
          setIsOnline(currentNavigatorStatus);
          forceRender({});
        }
      }
    }, 100); // Check every 100ms during active error display
    
    return () => clearInterval(interval);
  }, [isOnline]);

  // Return null if no error is provided - AFTER all hooks
  if (!error) {
    return null;
  }

  const getErrorTitle = () => {
    if (isOfflineError && !isOnline) return 'Offline';
    if (isOfflineError) return 'Connection Error';
    if (isNetworkError) return 'Connection Error';
    
    // Handle APIError instances with status codes
    if (error && 'status' in error) {
      const status = (error as any).status;
      switch (status) {
        case 400: return 'Bad Request';
        case 401: return 'Authentication Required';
        case 403: return 'Access Denied';
        case 404: return 'Not Found';
        case 422: return 'Validation Error';
        case 429: return 'Rate Limited';
        case 500: return 'Server Error';
        case 503: return 'Service Unavailable';
      }
    }
    
    // Handle by message content or error name
    if (errorDetails.message.includes('validation') || errorDetails.name === 'ValidationError') {
      return 'Validation Error';
    }
    if (errorDetails.message.includes('type') || errorDetails.name === 'TypeError') {
      return 'Type Error';
    }
    if (errorDetails.message.includes('permission') || errorDetails.message.includes('unauthorized')) {
      return 'Permission Error';
    }
    if (errorDetails.message.includes('rate limit') || errorDetails.message.includes('429')) {
      return 'Rate Limit Error';
    }
    if (errorDetails.message.includes('server') || errorDetails.message.includes('500')) {
      return 'Server Error';
    }
    return 'Error';
  };

  const getErrorMessage = () => {
    // Check both state and navigator.onLine for the most current status
    const currentlyOffline = !isOnline || (typeof navigator !== 'undefined' && !navigator.onLine);
    

    
    // For network errors, prioritize offline state detection  
    // Check the current offline state first for all network-related errors
    if (currentlyOffline && (isNetworkError || errorDetails.message.includes('Failed to fetch'))) {
      return 'You appear to be offline. Please check your internet connection and try again.';
    }
    
    // General offline state check
    if (currentlyOffline || (isOfflineError && currentlyOffline)) {
      return 'You appear to be offline. Please check your internet connection and try again.';
    }
    
    // Network errors when online
    if (isNetworkError || errorDetails.message.includes('Failed to fetch')) {
      return 'Unable to connect to the server. This could be due to a network issue or server maintenance.';
    }
    
    // Handle APIError instances with specific messages based on status
    if (error && 'status' in error) {
      const status = (error as any).status;
      switch (status) {
        case 500:
          return 'An internal server error occurred. Please try again later.';
        case 404:
          return 'The requested resource was not found.';
        case 403:
          return 'You don\'t have permission to access this resource.';
        case 401:
          return 'Your session has expired. Please sign in again.';
        case 400:
          return 'The request was invalid. Please check your input and try again.';
        case 422:
          return 'The data provided was invalid. Please check your input and try again.';
        case 429:
          return 'Too many requests. Please slow down and try again later.';
        case 503:
          return 'The service is temporarily unavailable. Please try again later.';
        default:
          return errorDetails.message;
      }
    }
    
    return errorDetails.message;
  };

  const getRetryDelay = () => {
    return Math.pow(2, retryCount);
  };

  const handleRetry = () => {
    if (onRetry && !isRetrying) {
      setIsRetrying(true);
      setRetryCount(prev => prev + 1);
      onRetry();
      setIsRetrying(false);
    }
  };

  const handleLogToConsole = () => {
    console.group('Error Details');
    console.error('Error:', error);
    console.log('Context:', context);
    console.log('Timestamp:', errorDetails.timestamp);
    console.groupEnd();
  };

  return (
    <Card className="border-destructive">
      <CardContent className="p-6">
        <Alert className="border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive" role="alert">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h5 className="mb-1 tracking-tight text-sm font-medium">
                  {getErrorTitle()}
                </h5>
                <div className="flex space-x-2">
                  {error && 'status' in error && (
                    <Badge variant="outline" className="text-xs">
                      {(error as any).status}
                    </Badge>
                  )}
                  {error && 'code' in error && (error as any).code && (
                    <Badge variant="outline" className="text-xs">
                      {(error as any).code}
                    </Badge>
                  )}
                </div>
              </div>
              <AlertDescription className="[&_p]:leading-relaxed mt-1 text-sm">
                {getErrorMessage()}
              </AlertDescription>
            </div>
          </div>

          {/* Auto-retry info */}
                        {autoRetry && (isNetworkError || isOfflineError) && retryCount < maxRetries && (
                <div className="mt-2 flex items-center space-x-2 text-xs text-muted-foreground">
                  <RefreshCw className="h-3 w-3" />
                  <span>
                    Retrying automatically in {getRetryDelay()}s... (Attempt {retryCount + 1}/{maxRetries})
                  </span>
                </div>
              )}

              {autoRetry && retryCount >= maxRetries && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Maximum retry attempts reached. Please try again later.
                </div>
              )}



          <div className="flex justify-between items-center mt-4">
            <div className="flex items-center space-x-2">
              {process.env.NODE_ENV === 'development' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogToConsole}
                  className="h-9"
                >
                  <Bug className="w-3 h-3 mr-1" />
                  Log to Console
                </Button>
              )}
              
              {showDetails && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const details = document.getElementById('technical-details');
                    if (details) {
                      details.style.display = details.style.display === 'none' ? 'block' : 'none';
                    }
                  }}
                >
                  <Info className="w-3 h-3 mr-1" />
                  Technical Details
                </Button>
              )}
            </div>
            
            <div className="flex space-x-2">
              {onRetry && isRetryableError && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className="h-9"
                >
                  <RefreshCw className={`w-3 h-3 mr-1 ${isRetrying ? 'animate-spin' : ''}`} />
                  {isRetrying ? 'Retrying...' : 'Retry'}
                </Button>
              )}
              
              {onDismiss && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onDismiss}
                  className="h-9"
                >
                  Dismiss
                </Button>
              )}
            </div>
          </div>

          {/* Technical details section */}
          {showDetails && (
            <div id="technical-details" className="mt-4 p-3 bg-muted/50 rounded-md text-xs font-mono" style={{ display: 'none' }}>
              <div className="space-y-2">
                <div>
                  <strong>Error:</strong> {errorDetails.name}
                </div>
                <div>
                  <strong>Message:</strong> {errorDetails.message}
                </div>
                <div>
                  <strong>Time:</strong> {new Date(errorDetails.timestamp).toLocaleString()}
                </div>
                {(context || (error && 'context' in error && (error as any).context)) && (
                  <div>
                    <strong>Context:</strong> {JSON.stringify(context || (error as any).context, null, 2)}
                  </div>
                )}
                {errorDetails.stack && (
                  <div>
                    <strong>Stack Trace:</strong>
                    <pre className="mt-1 whitespace-pre-wrap text-xs">{errorDetails.stack}</pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </Alert>
      </CardContent>
    </Card>
  );
}

// Legacy export for backwards compatibility
export function APIErrorDisplay(props: ApiErrorDisplayProps) {
  return <ApiErrorDisplay {...props} />;
}

// Default export
export default ApiErrorDisplay;