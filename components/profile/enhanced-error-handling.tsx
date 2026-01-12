/**
 * Enhanced Error Handling Components for Profile Management
 * Phase 2.1.5 - Step 12: Error Handling Integration
 */

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, RefreshCw, Wifi, WifiOff, Shield, Clock, ExclamationTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// ==========================================
// ERROR TYPES AND INTERFACES
// ==========================================

export interface ProfileError {
  id: string;
  type: 'validation' | 'authentication' | 'not_found' | 'conflict' | 'server' | 'network' | 'rate_limit';
  message: string;
  field?: string;
  code?: string;
  details?: Record<string, any>;
  timestamp: Date;
  retryable: boolean;
  retryAfter?: number;
  recoveryActions?: RecoveryAction[];
}

export interface RecoveryAction {
  id: string;
  label: string;
  action: () => void | Promise<void>;
  primary?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface ValidationFieldError {
  field: string;
  message: string;
  type: string;
  value?: any;
  suggestions?: string[];
}

export interface ErrorState {
  errors: ProfileError[];
  isOnline: boolean;
  retryCount: Record<string, number>;
  dismissedErrors: Set<string>;
}

type ErrorAction =
  | { type: 'ADD_ERROR'; payload: ProfileError }
  | { type: 'REMOVE_ERROR'; payload: string }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'SET_ONLINE_STATUS'; payload: boolean }
  | { type: 'INCREMENT_RETRY'; payload: string }
  | { type: 'DISMISS_ERROR'; payload: string }
  | { type: 'RESET_RETRY_COUNT'; payload: string };

// ==========================================
// ERROR CONTEXT
// ==========================================

interface ErrorContextValue extends ErrorState {
  addError: (error: Omit<ProfileError, 'id' | 'timestamp'>) => void;
  removeError: (id: string) => void;
  clearErrors: () => void;
  dismissError: (id: string) => void;
  retryOperation: (errorId: string, operation: () => Promise<void>) => Promise<void>;
  classifyError: (error: any) => ProfileError;
  getFieldErrors: (field: string) => ValidationFieldError[];
  hasActiveErrors: boolean;
  networkStatus: {
    isOnline: boolean;
    canRetry: boolean;
  };
}

const ErrorContext = createContext<ErrorContextValue | null>(null);

export const useProfileErrorHandling = () => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useProfileErrorHandling must be used within ErrorProvider');
  }
  return context;
};

// ==========================================
// ERROR REDUCER
// ==========================================

const errorReducer = (state: ErrorState, action: ErrorAction): ErrorState => {
  switch (action.type) {
    case 'ADD_ERROR':
      return {
        ...state,
        errors: [...state.errors.filter(e => e.id !== action.payload.id), action.payload],
      };
      
    case 'REMOVE_ERROR':
      return {
        ...state,
        errors: state.errors.filter(e => e.id !== action.payload),
        retryCount: { ...state.retryCount, [action.payload]: 0 },
      };
      
    case 'CLEAR_ERRORS':
      return {
        ...state,
        errors: [],
        retryCount: {},
        dismissedErrors: new Set(),
      };
      
    case 'SET_ONLINE_STATUS':
      return {
        ...state,
        isOnline: action.payload,
      };
      
    case 'INCREMENT_RETRY':
      return {
        ...state,
        retryCount: {
          ...state.retryCount,
          [action.payload]: (state.retryCount[action.payload] || 0) + 1,
        },
      };
      
    case 'DISMISS_ERROR':
      return {
        ...state,
        dismissedErrors: new Set([...state.dismissedErrors, action.payload]),
      };
      
    case 'RESET_RETRY_COUNT':
      return {
        ...state,
        retryCount: { ...state.retryCount, [action.payload]: 0 },
      };
      
    default:
      return state;
  }
};

// ==========================================
// ERROR PROVIDER
// ==========================================

interface ErrorProviderProps {
  children: React.ReactNode;
  maxRetries?: number;
  retryDelay?: number;
}

export const ProfileErrorProvider: React.FC<ErrorProviderProps> = ({
  children,
  maxRetries = 3,
  retryDelay = 1000,
}) => {
  const [state, dispatch] = useReducer(errorReducer, {
    errors: [],
    isOnline: navigator.onLine,
    retryCount: {},
    dismissedErrors: new Set(),
  });

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => dispatch({ type: 'SET_ONLINE_STATUS', payload: true });
    const handleOffline = () => dispatch({ type: 'SET_ONLINE_STATUS', payload: false });

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const addError = useCallback((error: Omit<ProfileError, 'id' | 'timestamp'>) => {
    const fullError: ProfileError = {
      ...error,
      id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    dispatch({ type: 'ADD_ERROR', payload: fullError });

    // Show toast notification for important errors
    if (error.type !== 'validation') {
      toast.error(error.message, {
        description: error.details?.description,
        action: error.retryable ? {
          label: 'Retry',
          onClick: () => {
            // Retry logic would be handled by the component using this
          },
        } : undefined,
      });
    }
  }, []);

  const removeError = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_ERROR', payload: id });
  }, []);

  const clearErrors = useCallback(() => {
    dispatch({ type: 'CLEAR_ERRORS' });
  }, []);

  const dismissError = useCallback((id: string) => {
    dispatch({ type: 'DISMISS_ERROR', payload: id });
  }, []);

  const retryOperation = useCallback(async (errorId: string, operation: () => Promise<void>) => {
    const currentRetryCount = state.retryCount[errorId] || 0;
    
    if (currentRetryCount >= maxRetries) {
      toast.error('Maximum retry attempts reached', {
        description: 'Please try again later or contact support.',
      });
      return;
    }

    dispatch({ type: 'INCREMENT_RETRY', payload: errorId });

    try {
      // Add delay between retries
      if (currentRetryCount > 0) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, currentRetryCount)));
      }

      await operation();
      
      // Success - remove error and reset retry count
      removeError(errorId);
      dispatch({ type: 'RESET_RETRY_COUNT', payload: errorId });
      
      toast.success('Operation completed successfully');
    } catch (error) {
      // Add new error for failed retry
      addError(classifyError(error));
    }
  }, [state.retryCount, maxRetries, retryDelay, removeError, addError]);

  const classifyError = useCallback((error: any): ProfileError => {
    const baseError = {
      retryable: true,
      recoveryActions: [] as RecoveryAction[],
    };

    // Network errors
    if (!navigator.onLine || error.name === 'NetworkError') {
      return {
        ...baseError,
        type: 'network' as const,
        message: 'Network connection lost. Please check your internet connection.',
        code: 'NETWORK_ERROR',
        retryable: true,
        recoveryActions: [
          {
            id: 'check-connection',
            label: 'Check Connection',
            action: () => window.location.reload(),
            icon: RefreshCw,
          },
        ],
      };
    }

    // HTTP response errors
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      switch (status) {
        case 400:
          return {
            ...baseError,
            type: 'validation' as const,
            message: data.message || 'Please check your input and try again.',
            code: 'VALIDATION_ERROR',
            details: { errors: data.errors },
            retryable: false,
          };

        case 401:
          return {
            ...baseError,
            type: 'authentication' as const,
            message: 'Please log in to continue.',
            code: 'AUTH_ERROR',
            retryable: false,
            recoveryActions: [
              {
                id: 'login',
                label: 'Log In',
                action: () => window.location.href = '/login',
                primary: true,
              },
            ],
          };

        case 404:
          return {
            ...baseError,
            type: 'not_found' as const,
            message: 'The requested resource was not found.',
            code: 'NOT_FOUND',
            retryable: false,
          };

        case 409:
          return {
            ...baseError,
            type: 'conflict' as const,
            message: 'A conflict occurred. Your changes may have been overwritten.',
            code: 'CONFLICT_ERROR',
            details: data.conflictData,
            retryable: true,
            recoveryActions: [
              {
                id: 'refresh',
                label: 'Refresh Data',
                action: () => window.location.reload(),
                icon: RefreshCw,
              },
            ],
          };

        case 429:
          return {
            ...baseError,
            type: 'rate_limit' as const,
            message: 'Too many requests. Please wait before trying again.',
            code: 'RATE_LIMIT',
            retryable: true,
            retryAfter: data.retryAfter || 60,
          };

        case 500:
        default:
          return {
            ...baseError,
            type: 'server' as const,
            message: 'An unexpected error occurred. Please try again.',
            code: 'SERVER_ERROR',
            retryable: true,
          };
      }
    }

    // Generic error
    return {
      ...baseError,
      type: 'server' as const,
      message: error.message || 'An unexpected error occurred.',
      code: 'UNKNOWN_ERROR',
      retryable: true,
    };
  }, []);

  const getFieldErrors = useCallback((field: string): ValidationFieldError[] => {
    return state.errors
      .filter(error => error.type === 'validation' && error.field === field)
      .map(error => ({
        field,
        message: error.message,
        type: error.code || 'validation',
        value: error.details?.value,
        suggestions: getFieldSuggestions(field, error),
      }));
  }, [state.errors]);

  const getFieldSuggestions = (field: string, error: ProfileError): string[] => {
    const suggestions: Record<string, string[]> = {
      name: [
        'Use your full legal name',
        'Avoid special characters except hyphens and apostrophes',
        'Name must be between 2-100 characters',
      ],
      age: [
        'Age must be between 13-120 years',
        'Enter your current age',
        'Use whole numbers only',
      ],
      weight: [
        'Enter a realistic weight for your height',
        'Use decimal points if needed (e.g., 70.5)',
        'Weight should match your selected unit system',
      ],
      height: [
        'For metric: enter height in centimeters',
        'For imperial: enter feet and inches separately',
        'Ensure height matches your unit preference',
      ],
      medicalConditions: [
        'Describe conditions that may affect exercise',
        'Use clear, descriptive language',
        'Separate multiple conditions clearly',
      ],
    };

    return suggestions[field] || ['Please check your input and try again'];
  };

  const hasActiveErrors = state.errors.filter(e => !state.dismissedErrors.has(e.id)).length > 0;

  const networkStatus = {
    isOnline: state.isOnline,
    canRetry: state.isOnline && state.errors.some(e => e.retryable),
  };

  const value: ErrorContextValue = {
    ...state,
    addError,
    removeError,
    clearErrors,
    dismissError,
    retryOperation,
    classifyError,
    getFieldErrors,
    hasActiveErrors,
    networkStatus,
  };

  return <ErrorContext.Provider value={value}>{children}</ErrorContext.Provider>;
};

// ==========================================
// ERROR DISPLAY COMPONENTS
// ==========================================

interface ErrorDisplayProps {
  error: ProfileError;
  onDismiss?: () => void;
  onRetry?: () => void;
  compact?: boolean;
}

export const ProfileErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onDismiss,
  onRetry,
  compact = false,
}) => {
  const getErrorIcon = () => {
    switch (error.type) {
      case 'validation':
        return ExclamationTriangle;
      case 'authentication':
        return Shield;
      case 'network':
        return WifiOff;
      case 'rate_limit':
        return Clock;
      default:
        return AlertTriangle;
    }
  };

  const getErrorVariant = (): 'default' | 'destructive' => {
    return error.type === 'validation' ? 'default' : 'destructive';
  };

  const Icon = getErrorIcon();

  if (compact) {
    return (
      <Alert variant={getErrorVariant()} className="mb-4">
        <Icon className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>{error.message}</span>
          <div className="flex gap-2">
            {error.retryable && onRetry && (
              <Button size="sm" variant="outline" onClick={onRetry}>
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            )}
            {onDismiss && (
              <Button size="sm" variant="ghost" onClick={onDismiss}>
                ×
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="mb-4 border-red-200 bg-red-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-red-600" />
            <CardTitle className="text-red-900">
              {error.type === 'validation' ? 'Validation Error' : 'Error'}
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {error.code}
            </Badge>
          </div>
          {onDismiss && (
            <Button size="sm" variant="ghost" onClick={onDismiss}>
              ×
            </Button>
          )}
        </div>
        <CardDescription className="text-red-700">
          {error.message}
        </CardDescription>
      </CardHeader>
      
      {(error.details?.errors || error.recoveryActions?.length) && (
        <CardContent className="pt-0">
          {error.details?.errors && (
            <div className="mb-4">
              <h4 className="font-medium text-red-900 mb-2">Details:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                {error.details.errors.map((err: any, index: number) => (
                  <li key={index}>
                    <strong>{err.field}:</strong> {err.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {error.recoveryActions && error.recoveryActions.length > 0 && (
            <div className="flex gap-2">
              {error.recoveryActions.map((action) => {
                const ActionIcon = action.icon;
                return (
                  <Button
                    key={action.id}
                    size="sm"
                    variant={action.primary ? "default" : "outline"}
                    onClick={action.action}
                  >
                    {ActionIcon && <ActionIcon className="h-3 w-3 mr-1" />}
                    {action.label}
                  </Button>
                );
              })}
              {error.retryable && onRetry && (
                <Button size="sm" variant="outline" onClick={onRetry}>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

// ==========================================
// FIELD ERROR COMPONENT
// ==========================================

interface FieldErrorDisplayProps {
  field: string;
  compact?: boolean;
  showSuggestions?: boolean;
}

export const FieldErrorDisplay: React.FC<FieldErrorDisplayProps> = ({
  field,
  compact = false,
  showSuggestions = true,
}) => {
  const { getFieldErrors } = useProfileErrorHandling();
  const fieldErrors = getFieldErrors(field);

  if (fieldErrors.length === 0) return null;

  return (
    <div className="mt-1">
      {fieldErrors.map((error, index) => (
        <div key={index} className={compact ? "text-sm" : "text-sm"}>
          <div className="text-red-600 font-medium mb-1">
            {error.message}
          </div>
          {showSuggestions && error.suggestions && (
            <div className="text-red-500 text-xs">
              <span className="font-medium">Suggestions:</span>
              <ul className="list-disc list-inside ml-2 mt-1">
                {error.suggestions.map((suggestion, suggestionIndex) => (
                  <li key={suggestionIndex}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// ==========================================
// NETWORK STATUS COMPONENT
// ==========================================

export const NetworkStatusIndicator: React.FC = () => {
  const { networkStatus } = useProfileErrorHandling();

  if (networkStatus.isOnline) return null;

  return (
    <Alert variant="destructive" className="mb-4">
      <WifiOff className="h-4 w-4" />
      <AlertTitle>Connection Lost</AlertTitle>
      <AlertDescription>
        You're currently offline. Some features may not work properly.
        Changes will be saved when your connection is restored.
      </AlertDescription>
    </Alert>
  );
};

// ==========================================
// ERROR SUMMARY COMPONENT
// ==========================================

export const ErrorSummary: React.FC<{ className?: string }> = ({ className }) => {
  const { errors, dismissedErrors, clearErrors, hasActiveErrors } = useProfileErrorHandling();
  
  const activeErrors = errors.filter(e => !dismissedErrors.has(e.id));
  
  if (!hasActiveErrors) return null;

  const errorCounts = activeErrors.reduce((acc, error) => {
    acc[error.type] = (acc[error.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card className={`border-yellow-200 bg-yellow-50 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-yellow-900 flex items-center gap-2">
            <ExclamationTriangle className="h-5 w-5" />
            {activeErrors.length} Issue{activeErrors.length > 1 ? 's' : ''} Found
          </CardTitle>
          <Button size="sm" variant="outline" onClick={clearErrors}>
            Clear All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex gap-2 flex-wrap">
          {Object.entries(errorCounts).map(([type, count]) => (
            <Badge key={type} variant="outline" className="text-xs">
              {count} {type.replace('_', ' ')}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
