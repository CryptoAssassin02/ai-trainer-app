/**
 * Fallback UI Components
 * Graceful fallback interfaces for error recovery and loading states
 */

'use client';

import React from 'react';
import { AlertTriangle, RefreshCw, Wifi, WifiOff, Loader2, Home, Settings, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export interface FallbackUIProps {
  title?: string;
  description?: string;
  variant?: 'error' | 'offline' | 'loading' | 'maintenance' | 'not-found';
  showRetry?: boolean;
  showHome?: boolean;
  onRetry?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function FallbackUI({
  title,
  description,
  variant = 'error',
  showRetry = true,
  showHome = true,
  onRetry,
  className = '',
  size = 'md'
}: FallbackUIProps) {
  const config = React.useMemo(() => {
    switch (variant) {
      case 'offline':
        return {
          icon: <AlertTriangle className="h-8 w-8 text-muted-foreground" />,
          title: title || 'You\'re offline',
          description: description || 'Check your internet connection and try again.',
          badge: 'Offline',
          badgeVariant: 'destructive' as const
        };
      case 'loading':
        return {
          icon: <AlertTriangle className="h-8 w-8 text-muted-foreground" />,
          title: title || 'Loading...',
          description: description || 'Please wait while we load your content.',
          badge: 'Loading',
          badgeVariant: 'default' as const
        };
      case 'maintenance':
        return {
          icon: <AlertTriangle className="h-8 w-8 text-muted-foreground" />,
          title: title || 'Under maintenance',
          description: description || 'We\'re temporarily unavailable for maintenance. Please try again shortly.',
          badge: 'Maintenance',
          badgeVariant: 'secondary' as const
        };
      case 'not-found':
        return {
          icon: <AlertTriangle className="h-8 w-8 text-muted-foreground" />,
          title: title || 'Not found',
          description: description || 'The page or resource you\'re looking for doesn\'t exist.',
          badge: '404',
          badgeVariant: 'outline' as const
        };
      default:
        return {
          icon: <AlertTriangle className="h-8 w-8 text-destructive" />,
          title: title || 'Something went wrong',
          description: description || 'An unexpected error occurred. Please try again.',
          badge: 'Error',
          badgeVariant: 'destructive' as const
        };
    }
  }, [variant, title, description]);

  const sizeConfig = React.useMemo(() => {
    switch (size) {
      case 'sm':
        return {
          container: 'p-4 max-w-sm',
          iconSize: 'h-6 w-6',
          titleSize: 'text-lg',
          spacing: 'space-y-2'
        };
      case 'lg':
        return {
          container: 'p-8 max-w-2xl',
          iconSize: 'h-12 w-12',
          titleSize: 'text-2xl',
          spacing: 'space-y-6'
        };
      default:
        return {
          container: 'p-6 max-w-lg',
          iconSize: 'h-8 w-8',
          titleSize: 'text-xl',
          spacing: 'space-y-4'
        };
    }
  }, [size]);

  return (
    <div className={`flex items-center justify-center min-h-[200px] ${className}`}>
      <Card className={sizeConfig.container}>
        <CardHeader className="text-center">
          <div className="flex items-center justify-between mb-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              {React.cloneElement(config.icon, { 
                className: `${sizeConfig.iconSize} ${config.icon.props.className}` 
              })}
            </div>
            <Badge variant={config.badgeVariant} className="absolute top-4 right-4">
              {config.badge}
            </Badge>
          </div>
          <CardTitle className={sizeConfig.titleSize}>
            {config.title}
          </CardTitle>
          <CardDescription className="text-center">
            {config.description}
          </CardDescription>
        </CardHeader>
        
        {(showRetry || showHome) && (
          <CardContent>
            <div className={`flex flex-col sm:flex-row gap-2 ${sizeConfig.spacing}`}>
              {showRetry && onRetry && variant !== 'loading' && (
                <Button onClick={onRetry} className="flex-1">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              )}
              {showHome && variant !== 'loading' && (
                <Button 
                  variant="outline" 
                  onClick={() => window.location.href = '/'}
                  className="flex-1"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </Button>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

// Specific fallback components for common scenarios
export function NetworkFallback({ onRetry }: { onRetry?: () => void }) {
  return (
    <FallbackUI
      variant="offline"
      title="Connection lost"
      description="Unable to connect to our servers. Please check your internet connection and try again."
      onRetry={onRetry}
    />
  );
}

export function LoadingFallback({ title, description }: { title?: string; description?: string }) {
  return (
    <FallbackUI
      variant="loading"
      title={title}
      description={description}
      showRetry={false}
      showHome={false}
    />
  );
}

export function MaintenanceFallback() {
  return (
    <FallbackUI
      variant="maintenance"
      title="Scheduled maintenance"
      description="We're performing scheduled maintenance to improve your experience. We'll be back shortly!"
      showRetry={false}
    />
  );
}

export function NotFoundFallback() {
  return (
    <FallbackUI
      variant="not-found"
      title="Page not found"
      description="The page you're looking for doesn't exist or has been moved."
      showRetry={false}
    />
  );
}

// Loading skeleton patterns
export function PageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-24" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      
      <div className="border rounded-lg">
        <div className="grid grid-cols-4 gap-4 p-4 border-b">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
        
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="grid grid-cols-4 gap-4 p-4 border-b last:border-b-0">
            {Array.from({ length: columns }).map((_, j) => (
              <Skeleton key={j} className="h-4 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="space-y-6 max-w-md">
      <div className="space-y-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
      
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-24 w-full" />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
      
      <div className="flex space-x-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}

// Progressive loading component
interface ProgressiveLoadingProps {
  isLoading: boolean;
  error?: Error | null;
  skeleton: React.ReactNode;
  children: React.ReactNode;
  onRetry?: () => void;
}

export function ProgressiveLoading({
  isLoading,
  error,
  skeleton,
  children,
  onRetry
}: ProgressiveLoadingProps) {
  if (error) {
    return (
      <FallbackUI
        variant="error"
        title="Failed to load"
        description={error.message}
        onRetry={onRetry}
      />
    );
  }
  
  if (isLoading) {
    return <>{skeleton}</>;
  }
  
  return <>{children}</>;
}

// Error boundary with custom fallback
interface ErrorBoundaryFallbackProps {
  error: Error;
  resetError: () => void;
  errorId: string;
  retryCount: number;
}

export function ErrorBoundaryFallback({
  error,
  resetError,
  errorId,
  retryCount
}: ErrorBoundaryFallbackProps) {
  const isNetworkError = error.message.includes('fetch') || error.message.includes('network');
  const isChunkError = error.message.includes('chunk') || error.message.includes('Loading chunk');
  
  let variant: FallbackUIProps['variant'] = 'error';
  let title = 'Something went wrong';
  let description = 'An unexpected error occurred. Please try again.';
  
  if (isNetworkError) {
    variant = 'offline';
    title = 'Connection problem';
    description = 'Unable to connect to our servers. Please check your internet connection.';
  } else if (isChunkError) {
    title = 'Loading issue';
    description = 'There was a problem loading the application. This page will refresh automatically.';
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="flex items-center justify-between mb-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <div className="absolute top-4 right-4 flex space-x-2">
              <Badge variant="destructive">Error</Badge>
              <Badge variant="outline" className="font-mono text-xs">
                #{errorId.slice(-6)}
              </Badge>
            </div>
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {retryCount > 0 && (
            <Alert>
              <AlertDescription>
                Retry attempt: {retryCount}/3
              </AlertDescription>
            </Alert>
          )}
          
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={resetError} className="flex-1">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/'}
              className="flex-1"
            >
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </div>
          
          {isChunkError && (
            <Button 
              variant="secondary"
              onClick={() => window.location.reload()}
              className="w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Page
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}