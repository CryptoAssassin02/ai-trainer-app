/**
 * Error Recovery Hook
 * Provides error recovery utilities and retry mechanisms
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useNetworkStatus, isNetworkError } from '@/utils/error/network-detector';
import { useErrorHandler } from '@/utils/error/global-error-handler';

export interface ErrorRecoveryOptions {
  maxRetries?: number;
  retryDelay?: number;
  exponentialBackoff?: boolean;
  retryOnNetworkReconnect?: boolean;
  enableFallback?: boolean;
}

export interface ErrorRecoveryState {
  isLoading: boolean;
  error: Error | null;
  retryCount: number;
  canRetry: boolean;
  isRecovering: boolean;
}

export interface ErrorRecoveryActions {
  execute: () => Promise<void>;
  retry: () => Promise<void>;
  reset: () => void;
  clearError: () => void;
}

export function useErrorRecovery(
  operation: () => Promise<any>,
  options: ErrorRecoveryOptions = {}
): ErrorRecoveryState & ErrorRecoveryActions {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    exponentialBackoff = true,
    retryOnNetworkReconnect = true,
    enableFallback = true
  } = options;

  const [state, setState] = useState<ErrorRecoveryState>({
    isLoading: false,
    error: null,
    retryCount: 0,
    canRetry: true,
    isRecovering: false
  });

  const networkStatus = useNetworkStatus();
  const reportError = useErrorHandler();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const wasOfflineRef = useRef(false);

  // Track network status changes for auto-retry
  useEffect(() => {
    const wasOffline = wasOfflineRef.current;
    const isNowOnline = networkStatus.isOnline;
    

    
    // Always update ref to track current state for next change
    wasOfflineRef.current = !networkStatus.isOnline;
    
    if (retryOnNetworkReconnect && state.error && wasOffline && isNowOnline && isNetworkError(state.error)) {

      // Network came back online, force retry by calling it directly without canRetry check
      retryWithNetworkReconnect();
    }
  }, [networkStatus.isOnline, state.error, retryOnNetworkReconnect]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const execute = useCallback(async (): Promise<void> => {
    if (state.isLoading) return;

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      isRecovering: false
    }));

    try {
      await operation();
      
      // Success - reset retry count
      setState(prev => ({
        ...prev,
        isLoading: false,
        retryCount: 0,
        canRetry: true
      }));
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      
      // Report error for monitoring
      reportError(errorObj, {
        operation: operation.name || 'anonymous',
        retryCount: state.retryCount,
        networkStatus: networkStatus
      });

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorObj,
        canRetry: prev.retryCount < maxRetries && canRetryError(errorObj, networkStatus)
      }));
    }
  }, [operation, state.isLoading, state.retryCount, maxRetries, networkStatus, reportError]);

  // Special retry function for network reconnect that bypasses canRetry check
  const retryWithNetworkReconnect = useCallback(async (): Promise<void> => {
    if (state.isLoading || state.retryCount >= maxRetries) {
      return;
    }

    const currentRetryCount = state.retryCount;
    
    setState(prev => ({
      ...prev,
      isRecovering: true,
      retryCount: prev.retryCount + 1,
      canRetry: true // Re-enable retry capability
    }));

    // Use minimal delay for network reconnect
    const delay = process.env.NODE_ENV === 'test' ? 100 : 500;

    return new Promise<void>((resolve) => {
      timeoutRef.current = setTimeout(async () => {
        try {
          setState(prev => ({
            ...prev,
            isLoading: true,
            isRecovering: false,
            error: null
          }));

          const result = await operation();
          
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: null,
            canRetry: true
          }));
          resolve();
        } catch (error) {
          const errorObj = error instanceof Error ? error : new Error(String(error));

          
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: errorObj,
            canRetry: canRetryError(errorObj, networkStatus)
          }));
          resolve();
        }
      }, delay);
    });
  }, [operation, state.isLoading, state.retryCount, maxRetries, networkStatus]);

  const retry = useCallback(async (): Promise<void> => {
    if (!state.canRetry || state.isLoading || state.retryCount >= maxRetries) {
      return;
    }

    const currentRetryCount = state.retryCount;
    
    setState(prev => ({
      ...prev,
      isRecovering: true,
      retryCount: prev.retryCount + 1
    }));

    // Calculate delay for retry (use current retry count before increment)
    const delay = exponentialBackoff
      ? retryDelay * Math.pow(2, currentRetryCount)
      : retryDelay;

    // Add jitter to prevent thundering herd (skip in test environment)
    const jitteredDelay = process.env.NODE_ENV === 'test' ? delay : delay + Math.random() * 1000;

    return new Promise<void>((resolve) => {
      timeoutRef.current = setTimeout(async () => {
        try {
          setState(prev => ({
            ...prev,
            isLoading: true,
            isRecovering: false,
            error: null
          }));

          const result = await operation();
          
          // Success - keep retry count to show how many retries were made
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: null,
            canRetry: true
          }));
          resolve();
        } catch (error) {
          const errorObj = error instanceof Error ? error : new Error(String(error));
          
          reportError(errorObj, {
            operation: operation.name || 'anonymous',
            retryCount: state.retryCount + 1,
            networkStatus: networkStatus,
            isRetry: true
          });

          setState(prev => ({
            ...prev,
            isLoading: false,
            error: errorObj,
            isRecovering: false,
            canRetry: prev.retryCount < maxRetries && canRetryError(errorObj, networkStatus)
          }));
          resolve();
        }
      }, jitteredDelay);
    });
  }, [
    state.canRetry,
    state.isLoading,
    state.retryCount,
    maxRetries,
    exponentialBackoff,
    retryDelay,
    operation,
    networkStatus,
    reportError
  ]);

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    setState({
      isLoading: false,
      error: null,
      retryCount: 0,
      canRetry: true,
      isRecovering: false
    });
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null,
      canRetry: true
    }));
  }, []);

  return {
    ...state,
    execute,
    retry,
    reset,
    clearError
  };
}

// Helper function to determine if an error is retryable
function canRetryError(error: Error, networkStatus: any): boolean {
  const message = error.message.toLowerCase();
  
  // Don't retry authentication errors
  if (message.includes('unauthorized') || message.includes('forbidden')) {
    return false;
  }
  
  // Don't retry validation errors
  if (message.includes('validation') || message.includes('invalid')) {
    return false;
  }
  
  // Don't retry when offline
  if (!networkStatus.isOnline) {
    return false;
  }
  
  // Retry network errors
  if (isNetworkError(error)) {
    return true;
  }
  
  // Retry server errors
  if (message.includes('internal server error') || message.includes('service unavailable')) {
    return true;
  }
  
  // Retry timeout errors
  if (message.includes('timeout')) {
    return true;
  }
  
  // By default, allow retrying unless specifically excluded above
  return true;
}

// Hook for API operations with recovery
export function useApiOperation<T = any>(
  operation: () => Promise<T>,
  options: ErrorRecoveryOptions = {}
) {
  const recovery = useErrorRecovery(operation, options);
  const [data, setData] = useState<T | null>(null);
  
  const executeWithData = useCallback(async () => {
    try {
      const result = await operation();
      setData(result);
      return result;
    } catch (error) {
      setData(null);
      throw error;
    }
  }, [operation]);

  const enhancedRecovery = useErrorRecovery(executeWithData, options);

  return {
    ...enhancedRecovery,
    data,
    execute: enhancedRecovery.execute
  };
}

// Hook for mutation operations with optimistic updates
export function useOptimisticMutation<T = any, P = any>(
  mutationFn: (params: P) => Promise<T>,
  options: {
    onSuccess?: (data: T, params: P) => void;
    onError?: (error: Error, params: P) => void;
    optimisticUpdate?: (params: P) => T;
    rollback?: (params: P) => void;
    recovery?: ErrorRecoveryOptions;
  } = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [optimisticData, setOptimisticData] = useState<T | null>(null);
  
  const mutation = useCallback(async (params: P) => {
    // Apply optimistic update if provided
    if (options.optimisticUpdate) {
      const optimistic = options.optimisticUpdate(params);
      setOptimisticData(optimistic);
    }
    
    try {
      const result = await mutationFn(params);
      setData(result);
      setOptimisticData(null);
      options.onSuccess?.(result, params);
      return result;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      
      // Rollback optimistic update
      setOptimisticData(null);
      options.rollback?.(params);
      options.onError?.(errorObj, params);
      
      throw errorObj;
    }
  }, [mutationFn, options]);

  const recovery = useErrorRecovery(
    () => Promise.resolve(), // Placeholder since we handle execution in mutation
    options.recovery
  );

  return {
    ...recovery,
    data: optimisticData || data,
    mutate: mutation,
    isOptimistic: optimisticData !== null
  };
}