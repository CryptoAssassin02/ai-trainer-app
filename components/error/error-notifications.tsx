'use client';

import * as React from 'react';
// Define types locally since they're not exported from error-boundary
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ErrorCategory = 'network' | 'validation' | 'authentication' | 'authorization' | 'server' | 'client' | 'unknown' | 'ai' | 'data';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, AlertCircle, Info, RefreshCw, Bug, X, CheckCircle } from 'lucide-react';

// App Error interface (should be centralized in context but defined here for now)
export interface AppError {
  id: string;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  timestamp: number;
  details?: Record<string, any>;
  stack?: string;
  retryable?: boolean;
  dismissed?: boolean;
  source?: string;
  userId?: string;
  sessionId?: string;
}

interface ErrorNotificationProps {
  error: AppError;
  onDismiss: (errorId: string) => void;
  onRetry?: (errorId: string) => void;
  className?: string;
}

interface ErrorNotificationsProps {
  errors: AppError[];
  onDismiss: (errorId: string) => void;
  onDismissAll: () => void;
  onRetry?: (errorId: string) => void;
  maxVisible?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

// Get error icon based on severity
const getErrorIcon = (severity: ErrorSeverity) => {
  switch (severity) {
    case 'critical':
      return <AlertTriangle className="w-5 h-5 text-destructive" />;
    case 'high':
      return <AlertCircle className="w-5 h-5 text-destructive" />;
    case 'medium':
      return <AlertCircle className="w-5 h-5 text-yellow-600" />;
    case 'low':
      return <Info className="w-5 h-5 text-blue-600" />;
    default:
      return <AlertCircle className="w-5 h-5 text-gray-600" />;
  }
};

// Get error styling based on severity
const getErrorStyling = (severity: ErrorSeverity) => {
  switch (severity) {
    case 'critical':
      return 'border-destructive bg-destructive/5 text-destructive-foreground';
    case 'high':
      return 'border-destructive bg-destructive/5 text-destructive-foreground';
    case 'medium':
      return 'border-yellow-600 bg-yellow-50 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-100';
    case 'low':
      return 'border-blue-600 bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100';
    default:
      return 'border-gray-400 bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100';
  }
};

// Format error category for display
const formatErrorCategory = (category: ErrorCategory): string => {
  switch (category) {
    case 'network':
      return 'Network Error';
    case 'validation':
      return 'Validation Error';
    case 'authentication':
      return 'Authentication Error';
    case 'authorization':
      return 'Authorization Error';
    case 'server':
      return 'Server Error';
    case 'client':
      return 'Client Error';
    case 'ai':
      return 'AI Service Error';
    case 'data':
      return 'Data Error';
    default:
      return 'Unknown Error';
  }
};

// Get position classes for container
const getPositionClasses = (position: ErrorNotificationsProps['position'] = 'top-right') => {
  switch (position) {
    case 'top-right':
      return 'top-4 right-4';
    case 'top-left':
      return 'top-4 left-4';
    case 'bottom-right':
      return 'bottom-4 right-4';
    case 'bottom-left':
      return 'bottom-4 left-4';
    case 'top-center':
      return 'top-4 left-1/2 transform -translate-x-1/2';
    case 'bottom-center':
      return 'bottom-4 left-1/2 transform -translate-x-1/2';
    default:
      return 'top-4 right-4';
  }
};

// Individual Error Notification Component
export function ErrorNotification({ 
  error, 
  onDismiss, 
  onRetry, 
  className = '' 
}: ErrorNotificationProps) {
  const icon = getErrorIcon(error.severity);
  const styling = getErrorStyling(error.severity);
  
  const handleRetry = () => {
    if (onRetry && error.retryable) {
      onRetry(error.id);
    }
  };

  const handleDismiss = () => {
    onDismiss(error.id);
  };

  return (
    <Alert className={`${styling} ${className} relative animate-in slide-in-from-top-2 duration-300`}>
      <div className="flex items-start gap-3">
        {icon}
        <div className="flex-1 space-y-1">
          <AlertTitle className="text-sm font-semibold">
            {formatErrorCategory(error.category)}
          </AlertTitle>
          <AlertDescription className="text-sm">
            {error.message}
          </AlertDescription>
          
          {/* Error details in development */}
          {process.env.NODE_ENV === 'development' && error.details && (
            <details className="mt-2">
              <summary className="text-xs cursor-pointer opacity-70 hover:opacity-100">
                Technical Details
              </summary>
              <pre className="text-xs mt-1 p-2 bg-black/10 rounded overflow-x-auto">
                {JSON.stringify(error.details, null, 2)}
              </pre>
            </details>
          )}
          
          {/* Error timestamp */}
          <p className="text-xs opacity-70">
            {new Date(error.timestamp).toLocaleTimeString()}
          </p>
        </div>
        
        {/* Action buttons */}
        <div className="flex items-center gap-1">
          {error.retryable && onRetry && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRetry}
              className="h-8 w-8 p-0"
              title="Retry operation"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          )}
          
          {process.env.NODE_ENV === 'development' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                console.group('🐛 Error Details');
                console.error('Error:', error);
                console.groupEnd();
              }}
              className="h-8 w-8 p-0"
              title="Debug error"
            >
              <Bug className="w-4 h-4" />
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-8 w-8 p-0"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Alert>
  );
}

// Error Notifications Container Component
export function ErrorNotifications({ 
  errors, 
  onDismiss, 
  onDismissAll, 
  onRetry,
  maxVisible = 5,
  position = 'top-right' 
}: ErrorNotificationsProps) {
  const visibleErrors = errors
    .filter(error => !error.dismissed)
    .slice(0, maxVisible);
    
  const hiddenCount = errors.filter(error => !error.dismissed).length - visibleErrors.length;

  if (visibleErrors.length === 0) {
    return null;
  }

  const positionClasses = getPositionClasses(position);

  return (
    <div className={`fixed ${positionClasses} z-50 max-w-sm space-y-2`}>
      {/* Dismiss all button for multiple errors */}
      {visibleErrors.length > 1 && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={onDismissAll}
            className="text-xs"
          >
            Dismiss All ({visibleErrors.length})
          </Button>
        </div>
      )}
      
      {/* Error notifications */}
      {visibleErrors.map((error) => (
        <ErrorNotification
          key={error.id}
          error={error}
          onDismiss={onDismiss}
          onRetry={onRetry}
        />
      ))}
      
      {/* Hidden errors indicator */}
      {hiddenCount > 0 && (
        <Alert className="border-gray-300 bg-gray-50 text-gray-700 dark:bg-gray-900 dark:text-gray-300">
          <Info className="w-4 h-4" />
          <AlertDescription className="text-sm">
            {hiddenCount} more error{hiddenCount > 1 ? 's' : ''} hidden
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// Toast-style notification for quick errors
export function ErrorToast({ 
  error, 
  onDismiss, 
  autoHideDuration = 5000 
}: { 
  error: AppError; 
  onDismiss: (errorId: string) => void; 
  autoHideDuration?: number;
}) {
  React.useEffect(() => {
    if (autoHideDuration > 0) {
      const timer = setTimeout(() => {
        onDismiss(error.id);
      }, autoHideDuration);
      
      return () => clearTimeout(timer);
    }
  }, [error.id, onDismiss, autoHideDuration]);

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
      <ErrorNotification 
        error={error} 
        onDismiss={onDismiss}
        className="shadow-lg"
      />
    </div>
  );
}

// Success notification for completed error recoveries
export function SuccessNotification({ 
  message, 
  onDismiss,
  autoHideDuration = 3000 
}: { 
  message: string; 
  onDismiss: () => void; 
  autoHideDuration?: number;
}) {
  React.useEffect(() => {
    if (autoHideDuration > 0) {
      const timer = setTimeout(onDismiss, autoHideDuration);
      return () => clearTimeout(timer);
    }
  }, [onDismiss, autoHideDuration]);

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
      <Alert className="border-green-600 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100 shadow-lg">
        <CheckCircle className="w-5 h-5 text-green-600" />
        <AlertDescription className="text-sm font-medium">
          {message}
        </AlertDescription>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="absolute top-2 right-2 h-6 w-6 p-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </Alert>
    </div>
  );
}

export default ErrorNotifications;


