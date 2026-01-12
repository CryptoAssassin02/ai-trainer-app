/**
 * React Query Configuration and Provider
 * Centralized data fetching, caching, and synchronization
 */

'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider, MutationCache, QueryCache } from '@tanstack/react-query';
// Conditional import for React Query Devtools in development
let ReactQueryDevtools: any = null;
if (process.env.NODE_ENV === 'development') {
  try {
    const devtools = require('@tanstack/react-query-devtools');
    ReactQueryDevtools = devtools.ReactQueryDevtools;
  } catch {
    // Devtools not installed, ignore
  }
}
import { toast } from '@/hooks/use-toast';
import { APIError } from './constants';

// Query key factories for consistent cache keys
export const queryKeys = {
  // Profile queries
  profile: ['profile'] as const,
  profileCompletion: ['profile', 'completion'] as const,
  profileInsights: ['profile', 'insights'] as const,
  notificationPreferences: ['profile', 'notifications'] as const,

  // Workout queries
  workoutPlans: (filters?: any) => ['workouts', 'plans', filters] as const,
  workoutPlan: (id: string) => ['workouts', 'plan', id] as const,
  workoutLogs: (filters?: any) => ['workouts', 'logs', filters] as const,
  workoutStats: (timeframe: string) => ['workouts', 'stats', timeframe] as const,
  exercises: (query: string, filters?: any) => ['exercises', 'search', query, filters] as const,

  // Analytics queries
  analyticsOverview: (timeframe: string) => ['analytics', 'overview', timeframe] as const,
  analyticsInsights: (options?: any) => ['analytics', 'insights', options] as const,
  analyticsPatterns: (type: string) => ['analytics', 'patterns', type] as const,
  analyticsTrends: (metrics: string[], timeframe: string) => ['analytics', 'trends', metrics, timeframe] as const,
  goalProgress: ['analytics', 'goals'] as const,
  comparativeAnalytics: (type: string, options?: any) => ['analytics', 'comparative', type, options] as const,

  // Check-in queries
  checkIns: (filters?: any) => ['checkins', filters] as const,
  currentCheckIn: ['checkins', 'current'] as const,

  // Auth queries
  authStatus: ['auth', 'status'] as const,
  session: ['auth', 'session'] as const,
} as const;

// Default query options
const defaultQueryOptions = {
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 10 * 60 * 1000, // 10 minutes (was cacheTime)
  retry: (failureCount: number, error: unknown) => {
    // Don't retry on authentication errors
    if (error instanceof APIError && error.status === 401) {
      return false;
    }
    
    // Don't retry on client errors (4xx)
    if (error instanceof APIError && error.status >= 400 && error.status < 500) {
      return false;
    }
    
    // Retry up to 3 times for other errors
    return failureCount < 3;
  },
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
};

// Error handler for global error handling
const handleQueryError = (error: unknown) => {
  console.error('Query error:', error);
  
  if (error instanceof APIError) {
    // Handle specific API errors
    switch (error.status) {
      case 401:
        // Redirect to login handled by API client
        break;
      case 403:
        toast({
          title: 'Access Denied',
          description: 'You do not have permission to access this resource.',
          variant: 'destructive',
        });
        break;
      case 429:
        toast({
          title: 'Rate Limit Exceeded',
          description: 'Please wait a moment before trying again.',
          variant: 'destructive',
        });
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        toast({
          title: 'Server Error',
          description: 'Our servers are experiencing issues. Please try again later.',
          variant: 'destructive',
        });
        break;
      default:
        if (error.retryable) {
          toast({
            title: 'Connection Error',
            description: 'Please check your internet connection and try again.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Error',
            description: error.message || 'An unexpected error occurred.',
            variant: 'destructive',
          });
        }
    }
  } else {
    // Handle non-API errors
    toast({
      title: 'Unexpected Error',
      description: 'Something went wrong. Please try again.',
      variant: 'destructive',
    });
  }
};

// Mutation success handler
const handleMutationSuccess = (data: unknown, variables: unknown, context: unknown, meta?: Record<string, any>) => {
  if (meta?.successMessage) {
    toast({
      title: 'Success',
      description: meta.successMessage,
      variant: 'default',
    });
  }
};

// Create query client with configuration
function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: defaultQueryOptions,
      mutations: {
        retry: (failureCount: number, error: unknown) => {
          // Don't retry mutations on client errors
          if (error instanceof APIError && error.status >= 400 && error.status < 500) {
            return false;
          }
          return failureCount < 2; // Retry up to 2 times
        },
        onError: handleQueryError,
        onSuccess: handleMutationSuccess,
      },
    },
    queryCache: new QueryCache({
      onError: (error, query) => {
        // Only show error toasts for queries that are actively being used
        if (query.state.data !== undefined) {
          handleQueryError(error);
        }
      },
    }),
    mutationCache: new MutationCache({
      onError: handleQueryError,
    }),
  });
}

// React Query Provider component
interface ReactQueryProviderProps {
  children: React.ReactNode;
}

export function ReactQueryProvider({ children }: ReactQueryProviderProps) {
  // Create query client with singleton pattern
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && ReactQueryDevtools && (
        <ReactQueryDevtools 
          initialIsOpen={false}
          position="bottom-right"
          buttonPosition="bottom-right"
        />
      )}
    </QueryClientProvider>
  );
}

// Utility functions for cache management
export const queryUtils = {
  /**
   * Invalidate queries by key pattern
   */
  invalidateQueries: (queryClient: QueryClient, queryKey: readonly unknown[]) => {
    return queryClient.invalidateQueries({ queryKey });
  },

  /**
   * Prefetch query data
   */
  prefetchQuery: async (queryClient: QueryClient, queryKey: readonly unknown[], queryFn: () => Promise<unknown>) => {
    return queryClient.prefetchQuery({
      queryKey,
      queryFn,
      staleTime: defaultQueryOptions.staleTime,
    });
  },

  /**
   * Set query data in cache
   */
  setQueryData: (queryClient: QueryClient, queryKey: readonly unknown[], data: unknown) => {
    return queryClient.setQueryData(queryKey, data);
  },

  /**
   * Get cached query data
   */
  getQueryData: (queryClient: QueryClient, queryKey: readonly unknown[]) => {
    return queryClient.getQueryData(queryKey);
  },

  /**
   * Remove queries from cache
   */
  removeQueries: (queryClient: QueryClient, queryKey: readonly unknown[]) => {
    return queryClient.removeQueries({ queryKey });
  },

  /**
   * Cancel ongoing queries
   */
  cancelQueries: (queryClient: QueryClient, queryKey: readonly unknown[]) => {
    return queryClient.cancelQueries({ queryKey });
  },

  /**
   * Reset all queries to initial state
   */
  resetQueries: (queryClient: QueryClient) => {
    return queryClient.resetQueries();
  },

  /**
   * Clear all cache data
   */
  clear: (queryClient: QueryClient) => {
    return queryClient.clear();
  },

  /**
   * Optimistic update helper
   */
  optimisticUpdate: async function <T>(
    queryClient: QueryClient,
    queryKey: readonly unknown[],
    updater: (old: T | undefined) => T,
    mutation: () => Promise<T>
  ): Promise<{ previousValue: T | undefined }> {
    // Cancel any outgoing refetches
    await queryClient.cancelQueries({ queryKey });

    // Snapshot previous value
    const previousValue = queryClient.getQueryData<T>(queryKey);

    // Optimistically update
    queryClient.setQueryData(queryKey, updater);

    // Return context for rollback
    return { previousValue };
  },

  /**
   * Rollback optimistic update
   */
  rollbackOptimisticUpdate: function <T>(
    queryClient: QueryClient,
    queryKey: readonly unknown[],
    previousValue: T | undefined
  ): void {
    queryClient.setQueryData(queryKey, previousValue);
  },
};

// Export the query client type for use in components
export type { QueryClient } from '@tanstack/react-query';

