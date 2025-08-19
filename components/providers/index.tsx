'use client'

import { ThemeProvider } from "@/components/ui/theme-provider"

import { AuthContextProvider } from "@/providers/auth-provider"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState, useEffect, ReactNode } from "react"
import dynamic from 'next/dynamic'
import { ErrorBoundary } from "@/components/error/error-boundary"
import { ErrorProvider } from "@/components/error/error-provider"
import { ToastProvider } from "@/components/ui/toast-provider"
import { createGlobalErrorHandler } from "@/utils/error/global-error-handler"

const DynamicWorkoutProvider = dynamic(
  () => import('@/contexts/workout-context').then((mod) => mod.WorkoutProvider),
  { 
    ssr: false,
    loading: () => <>{/* Loading workout provider... */}</>
  }
);

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          // Don't retry on 4xx errors
          if (error && typeof error === 'object' && 'status' in error) {
            const status = (error as any).status;
            if (status >= 400 && status < 500) {
              return false;
            }
          }
          // Retry up to 3 times for other errors
          return failureCount < 3;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
      mutations: {
        retry: false, // Don't retry mutations by default
      },
    },
  }))

  // Initialize global error handler only on client side
  useEffect(() => {
    // Only initialize on client side
    if (typeof window !== 'undefined') {
      const errorHandler = createGlobalErrorHandler({
        enableToasts: true,
        enableConsoleLogging: true,
        enableReporting: process.env.NODE_ENV === 'production',
        reportingUrl: '/api/errors/report',
        maxToastsPerMinute: 5,
        enableAutoRetry: true,
      });

      return () => {
        errorHandler.destroy();
      };
    }
  }, []);

  // ALL PROVIDERS WORKING EXCEPT DynamicWorkoutProvider
  // DynamicWorkoutProvider is causing SSR issues and preventing rendering
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        disableTransitionOnChange
      >
        <ToastProvider />
        <AuthContextProvider>

          {/* TODO: Fix WorkoutProvider SSR issues */}
          {children}
        </AuthContextProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
} 