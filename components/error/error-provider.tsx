/**
 * Error Provider - Comprehensive Error Handling System
 * Modern error handling with React Router integration, toast notifications, and recovery mechanisms
 */

'use client';

import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ErrorBoundary } from './error-boundary';
import { ApiErrorDisplay } from './api-error-display';
import { toast } from 'sonner';

// Error types following 2025 best practices
export interface AppError {
  id: string;
  type: 'network' | 'validation' | 'authentication' | 'authorization' | 'server' | 'client' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details?: string;
  code?: string | number;
  timestamp: Date;
  context?: Record<string, any>;
  retryable?: boolean;
  recoverable?: boolean;
}

export interface ErrorContextValue {
  // Error state
  errors: AppError[];
  isOnline: boolean;
  
  // Error handling methods
  reportError: (error: Error | AppError, context?: Record<string, any>) => void;
  clearError: (errorId: string) => void;
  clearAllErrors: () => void;
  
  // Recovery methods
  retryLastAction: () => Promise<void>;
  resetToSafeState: () => void;
  
  // Network status
  handleNetworkChange: (isOnline: boolean) => void;
}

const ErrorContext = createContext<ErrorContextValue | null>(null);

export function useErrorHandler() {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useErrorHandler must be used within an ErrorProvider');
  }
  return context;
}

interface ErrorProviderProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: AppError; resetError: () => void }>;
}

export function ErrorProvider({ children, fallback }: ErrorProviderProps) {
  const [errors, setErrors] = useState<AppError[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [lastAction, setLastAction] = useState<(() => Promise<void>) | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Connection restored', {
        description: 'You are back online. Previous actions may now succeed.',
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error('Connection lost', {
        description: 'Please check your internet connection.',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial state
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Generate unique error ID
  const generateErrorId = useCallback(() => {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Classify error type and severity
  const classifyError = useCallback((error: Error | AppError): AppError => {
    if ('type' in error && 'severity' in error) {
      return error as AppError;
    }

    const errorMessage = error.message.toLowerCase();
    let type: AppError['type'] = 'unknown';
    let severity: AppError['severity'] = 'medium';
    let retryable = false;
    let recoverable = true;

    // Network errors
    if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('connection')) {
      type = 'network';
      severity = 'high';
      retryable = true;
    }
    // Authentication errors
    else if (errorMessage.includes('unauthorized') || errorMessage.includes('auth') || errorMessage.includes('token')) {
      type = 'authentication';
      severity = 'high';
      recoverable = false; // Requires re-login
    }
    // Validation errors
    else if (errorMessage.includes('validation') || errorMessage.includes('invalid') || errorMessage.includes('required')) {
      type = 'validation';
      severity = 'low';
      retryable = false;
    }
    // Server errors
    else if (errorMessage.includes('500') || errorMessage.includes('server error') || errorMessage.includes('internal')) {
      type = 'server';
      severity = 'high';
      retryable = true;
    }
    // Client errors
    else if (errorMessage.includes('400') || errorMessage.includes('404') || errorMessage.includes('client')) {
      type = 'client';
      severity = 'medium';
      retryable = false;
    }

    return {
      id: generateErrorId(),
      type,
      severity,
      message: error.message,
      details: error.stack,
      timestamp: new Date(),
      retryable,
      recoverable,
    };
  }, [generateErrorId]);

  // Report error with classification and context
  const reportError = useCallback((error: Error | AppError, context?: Record<string, any>) => {
    const classifiedError = classifyError(error);
    
    // Add context
    if (context) {
      classifiedError.context = { 
        ...classifiedError.context, 
        ...context,
        pathname,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      };
    }

    // Add to error state
    setErrors(prev => [...prev, classifiedError]);

    // Show appropriate toast notification
    const toastMessage = classifiedError.message || 'An unexpected error occurred';
    const toastDescription = classifiedError.details ? 
      `Error ID: ${classifiedError.id}` : 
      'Please try again or contact support if the problem persists.';

    switch (classifiedError.severity) {
      case 'critical':
        toast.error('Critical Error', {
          description: toastMessage,
          duration: Infinity, // Stay until dismissed
        });
        break;
      case 'high':
        toast.error('Error', {
          description: toastMessage,
          duration: 8000,
        });
        break;
      case 'medium':
        toast.warning('Warning', {
          description: toastMessage,
          duration: 5000,
        });
        break;
      case 'low':
        toast.info('Notice', {
          description: toastMessage,
          duration: 3000,
        });
        break;
    }

    // Report to error tracking service in production
    if (process.env.NODE_ENV === 'production') {
      // TODO: Integrate with error tracking service (Sentry, LogRocket, etc.)
      console.error('Production Error:', classifiedError);
    }

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Handler - Error Reported');
      console.error('Error:', error);
      console.log('Classified Error:', classifiedError);
      console.log('Context:', context);
      console.groupEnd();
    }
  }, [classifyError, pathname]);

  // Clear specific error
  const clearError = useCallback((errorId: string) => {
    setErrors(prev => prev.filter(error => error.id !== errorId));
  }, []);

  // Clear all errors
  const clearAllErrors = useCallback(() => {
    setErrors([]);
  }, []);

  // Retry last action
  const retryLastAction = useCallback(async () => {
    if (lastAction) {
      try {
        await lastAction();
        toast.success('Action completed successfully');
      } catch (error) {
        reportError(error as Error, { action: 'retry' });
      }
    }
  }, [lastAction, reportError]);

  // Reset to safe state
  const resetToSafeState = useCallback(() => {
    clearAllErrors();
    router.push('/');
    toast.info('Redirected to dashboard', {
      description: 'The application has been reset to a safe state.',
    });
  }, [clearAllErrors, router]);

  // Handle network change
  const handleNetworkChange = useCallback((isOnline: boolean) => {
    setIsOnline(isOnline);
  }, []);

  // Context value
  const contextValue: ErrorContextValue = {
    errors,
    isOnline,
    reportError,
    clearError,
    clearAllErrors,
    retryLastAction,
    resetToSafeState,
    handleNetworkChange,
  };

  return (
    <ErrorContext.Provider value={contextValue}>
      <ErrorBoundary
        onError={(error, errorInfo) => {
          reportError(error, {
            componentStack: errorInfo.componentStack,
            source: 'react_error_boundary',
          });
        }}
        fallback={fallback ? React.createElement(fallback, { 
          error: errors[0] || { id: '', type: 'unknown', severity: 'medium', message: 'Unknown error', timestamp: new Date() } as AppError, 
          resetError: () => clearAllErrors() 
        }) : undefined}
      >
        {children}
      </ErrorBoundary>
    </ErrorContext.Provider>
  );
}

// Hook for handling async operations with error handling
export function useAsyncOperation() {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useAsyncOperation must be used within an ErrorProvider');
  }

  const executeAsync = useCallback(async <T,>(
    operation: () => Promise<T>,
    errorContext?: Record<string, any>
  ): Promise<T | null> => {
    try {
      return await operation();
    } catch (error) {
      context.reportError(error as Error, { ...errorContext, source: 'async_operation' });
      return null;
    }
  }, [context]);

  return { executeAsync };
}

// Hook for network-aware operations  
export function useNetworkAwareOperation() {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useNetworkAwareOperation must be used within an ErrorProvider');
  }

  const executeWhenOnline = useCallback(async <T,>(
    operation: () => Promise<T>,
    fallback?: () => T
  ): Promise<T | null> => {
    if (!context.isOnline) {
      toast.warning('Offline', {
        description: 'This action requires an internet connection.',
      });
      return fallback ? fallback() : null;
    }

    try {
      return await operation();
    } catch (error) {
      context.reportError(error as Error, { networkStatus: 'online' });
      return null;
    }
  }, [context]);

  return { executeWhenOnline, isOnline: context.isOnline };
}