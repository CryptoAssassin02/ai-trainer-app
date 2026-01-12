/**
 * Profile-Specific Error Boundary Integration
 * Phase 2.1.5 - Step 12.1: Integration with existing error boundary system
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

// ==========================================
// ERROR BOUNDARY INTERFACES
// ==========================================

interface ProfileErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
}

interface ProfileErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<ProfileErrorFallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  maxRetries?: number;
  enableRetry?: boolean;
  showErrorDetails?: boolean;
}

interface ProfileErrorFallbackProps {
  error: Error;
  errorInfo: ErrorInfo;
  errorId: string;
  retryCount: number;
  onRetry: () => void;
  onReset: () => void;
  canRetry: boolean;
  showDetails: boolean;
}

// ==========================================
// ERROR CLASSIFICATION
// ==========================================

type ProfileErrorType = 
  | 'validation_error'
  | 'api_error'
  | 'render_error'
  | 'chunk_load_error'
  | 'permission_error'
  | 'unknown_error';

interface ClassifiedError {
  type: ProfileErrorType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userMessage: string;
  technicalMessage: string;
  recoverable: boolean;
  retryable: boolean;
  reportable: boolean;
}

const classifyProfileError = (error: Error, errorInfo: ErrorInfo): ClassifiedError => {
  const errorMessage = error.message.toLowerCase();
  const stackTrace = error.stack?.toLowerCase() || '';
  const componentStack = (errorInfo.componentStack || '').toLowerCase();

  // Chunk loading errors (lazy loading failures)
  if (errorMessage.includes('loading chunk') || errorMessage.includes('loading css chunk')) {
    return {
      type: 'chunk_load_error',
      severity: 'medium',
      userMessage: 'Failed to load part of the application. Please refresh the page.',
      technicalMessage: `Chunk loading error: ${error.message}`,
      recoverable: true,
      retryable: true,
      reportable: false,
    };
  }

  // Form validation errors
  if (errorMessage.includes('validation') || stackTrace.includes('zod') || stackTrace.includes('react-hook-form')) {
    return {
      type: 'validation_error',
      severity: 'low',
      userMessage: 'There was an issue with the form data. Please check your inputs.',
      technicalMessage: `Validation error: ${error.message}`,
      recoverable: true,
      retryable: false,
      reportable: false,
    };
  }

  // API-related errors
  if (errorMessage.includes('fetch') || errorMessage.includes('network') || stackTrace.includes('api')) {
    return {
      type: 'api_error',
      severity: 'medium',
      userMessage: 'Unable to connect to the server. Please check your connection and try again.',
      technicalMessage: `API error: ${error.message}`,
      recoverable: true,
      retryable: true,
      reportable: true,
    };
  }

  // Permission/authentication errors
  if (errorMessage.includes('unauthorized') || errorMessage.includes('forbidden') || errorMessage.includes('permission')) {
    return {
      type: 'permission_error',
      severity: 'high',
      userMessage: 'You don\'t have permission to access this feature. Please log in again.',
      technicalMessage: `Permission error: ${error.message}`,
      recoverable: true,
      retryable: false,
      reportable: true,
    };
  }

  // Render errors in profile components
  if (componentStack.includes('profile') || componentStack.includes('form')) {
    return {
      type: 'render_error',
      severity: 'high',
      userMessage: 'There was an issue displaying the profile form. Please try refreshing the page.',
      technicalMessage: `Render error in profile component: ${error.message}`,
      recoverable: true,
      retryable: true,
      reportable: true,
    };
  }

  // Unknown errors
  return {
    type: 'unknown_error',
    severity: 'critical',
    userMessage: 'An unexpected error occurred. Please refresh the page or contact support.',
    technicalMessage: `Unknown error: ${error.message}`,
    recoverable: false,
    retryable: true,
    reportable: true,
  };
};

// ==========================================
// ERROR REPORTING
// ==========================================

const reportProfileError = async (
  error: Error,
  errorInfo: ErrorInfo,
  classification: ClassifiedError,
  errorId: string,
  userAgent: string,
  url: string
) => {
  if (!classification.reportable) return;

  try {
    // In a real application, this would send to your error reporting service
    // e.g., Sentry, LogRocket, Bugsnag, etc.
    
    const errorReport = {
      errorId,
      timestamp: new Date().toISOString(),
      classification,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      errorInfo: {
        componentStack: errorInfo.componentStack,
      },
      context: {
        userAgent,
        url,
        timestamp: Date.now(),
      },
      user: {
        // Add user context if available
        userId: localStorage.getItem('userId'),
        sessionId: localStorage.getItem('sessionId'),
      },
    };

    console.group('🚨 Profile Error Report');
    console.error('Error Report:', errorReport);
    console.groupEnd();

    // Example: Send to error reporting service
    // await fetch('/api/errors', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(errorReport),
    // });
  } catch (reportingError) {
    console.error('Failed to report error:', reportingError);
  }
};

// ==========================================
// DEFAULT ERROR FALLBACK COMPONENT
// ==========================================

const DefaultProfileErrorFallback: React.FC<ProfileErrorFallbackProps> = ({
  error,
  errorInfo,
  errorId,
  retryCount,
  onRetry,
  onReset,
  canRetry,
  showDetails,
}) => {
  const classification = classifyProfileError(error, errorInfo);
  
  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleReportBug = () => {
    const subject = encodeURIComponent(`Profile Error Report: ${error.name}`);
    const body = encodeURIComponent(`
Error ID: ${errorId}
Error Type: ${classification.type}
User Message: ${classification.userMessage}
Technical Message: ${classification.technicalMessage}

Please describe what you were doing when this error occurred:
[Add your description here]

Technical Details:
${error.stack}
`);
    
    window.open(`mailto:support@trainer-app.com?subject=${subject}&body=${body}`);
  };

  return (
    <div className="min-h-[400px] flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl border-red-200 bg-red-50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-red-600" />
            <div>
              <CardTitle className="text-red-900">
                Profile Error
              </CardTitle>
              <CardDescription className="text-red-700">
                {classification.userMessage}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Error Details */}
          {showDetails && (
            <Alert>
              <Bug className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div><strong>Error ID:</strong> {errorId}</div>
                  <div><strong>Type:</strong> {classification.type}</div>
                  <div><strong>Severity:</strong> {classification.severity}</div>
                  {retryCount > 0 && (
                    <div><strong>Retry Attempts:</strong> {retryCount}</div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Recovery Actions */}
          <div className="flex flex-wrap gap-3">
            {canRetry && classification.retryable && (
              <Button onClick={onRetry} className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            )}
            
            <Button variant="outline" onClick={onReset} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Reset Form
            </Button>
            
            <Button variant="outline" onClick={handleGoHome} className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Go to Dashboard
            </Button>
            
            {classification.reportable && (
              <Button variant="ghost" onClick={handleReportBug} className="flex items-center gap-2">
                <Bug className="h-4 w-4" />
                Report Bug
              </Button>
            )}
          </div>

          {/* Additional Guidance */}
          <div className="text-sm text-red-600 bg-red-100 p-3 rounded">
            <strong>What can you do?</strong>
            <ul className="list-disc list-inside mt-1 space-y-1">
              {classification.retryable && (
                <li>Try the action again - temporary issues often resolve themselves</li>
              )}
              <li>Check your internet connection</li>
              <li>Clear your browser cache and refresh the page</li>
              <li>Try using a different browser or device</li>
              {classification.severity === 'critical' && (
                <li>Contact support if the problem persists</li>
              )}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ==========================================
// PROFILE ERROR BOUNDARY COMPONENT
// ==========================================

export class ProfileErrorBoundary extends Component<
  ProfileErrorBoundaryProps,
  ProfileErrorBoundaryState
> {
  private errorId: string | null = null;

  constructor(props: ProfileErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ProfileErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.errorId = `profile-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.setState({
      errorInfo,
      errorId: this.errorId,
    });

    // Classify and report the error
    const classification = classifyProfileError(error, errorInfo);
    
    reportProfileError(
      error,
      errorInfo,
      classification,
      this.errorId,
      navigator.userAgent,
      window.location.href
    );

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to console for development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Profile Error Boundary');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Classification:', classification);
      console.groupEnd();
    }
  }

  handleRetry = () => {
    const { maxRetries = 3 } = this.props;
    
    if (this.state.retryCount >= maxRetries) {
      return;
    }

    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
    }));
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
    });
  };

  render() {
    if (this.state.hasError && this.state.error && this.state.errorInfo) {
      const {
        fallback: CustomFallback,
        maxRetries = 3,
        enableRetry = true,
        showErrorDetails = process.env.NODE_ENV === 'development',
      } = this.props;

      const classification = classifyProfileError(this.state.error, this.state.errorInfo);
      const canRetry = enableRetry && 
                      classification.retryable && 
                      this.state.retryCount < maxRetries;

      const fallbackProps: ProfileErrorFallbackProps = {
        error: this.state.error,
        errorInfo: this.state.errorInfo,
        errorId: this.state.errorId || 'unknown',
        retryCount: this.state.retryCount,
        onRetry: this.handleRetry,
        onReset: this.handleReset,
        canRetry,
        showDetails: showErrorDetails,
      };

      if (CustomFallback) {
        return <CustomFallback {...fallbackProps} />;
      }

      return <DefaultProfileErrorFallback {...fallbackProps} />;
    }

    return this.props.children;
  }
}

// ==========================================
// HOC FOR ERROR BOUNDARY INTEGRATION
// ==========================================

export const withProfileErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Partial<ProfileErrorBoundaryProps>
) => {
  const WrappedComponent = (props: P) => (
    <ProfileErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ProfileErrorBoundary>
  );

  WrappedComponent.displayName = `withProfileErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

// ==========================================
// HOOK FOR ERROR BOUNDARY CONTEXT
// ==========================================

export const useProfileErrorBoundary = () => {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    setError(error);
    // This will trigger the error boundary on the next render
    throw error;
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return {
    captureError,
    resetError,
    hasError: error !== null,
  };
};

// ==========================================
// EXPORTS
// ==========================================

export default ProfileErrorBoundary;
export type { ProfileErrorBoundaryProps, ProfileErrorFallbackProps, ClassifiedError };
export { classifyProfileError, reportProfileError };
