/**
 * Global Error Handler
 * Centralized error handling with modern patterns and reporting
 */

import { toast } from 'sonner';
import { createNetworkDetector, isNetworkError, getNetworkErrorMessage } from './network-detector';

export interface GlobalErrorOptions {
  enableToasts?: boolean;
  enableConsoleLogging?: boolean;
  enableReporting?: boolean;
  reportingUrl?: string;
  maxToastsPerMinute?: number;
  enableAutoRetry?: boolean;
  retryDelays?: number[];
}

export interface ErrorReport {
  id: string;
  timestamp: Date;
  error: Error;
  context?: Record<string, any>;
  userAgent: string;
  url: string;
  userId?: string;
  sessionId?: string;
  fingerprint?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'network' | 'api' | 'client' | 'security' | 'performance' | 'unknown';
}

class GlobalErrorHandler {
  private options: Required<GlobalErrorOptions>;
  private toastCount = 0;
  private toastResetTimer?: NodeJS.Timeout;
  private reportQueue: ErrorReport[] = [];
  private isProcessingQueue = false;
  private networkDetector = createNetworkDetector();
  private recentToastFingerprints = new Set<string>();

  constructor(options: GlobalErrorOptions = {}) {
    this.options = {
      enableToasts: true,
      enableConsoleLogging: true,
      enableReporting: process.env.NODE_ENV === 'production',
      reportingUrl: '/api/errors/report',
      maxToastsPerMinute: 3,
      enableAutoRetry: true,
      retryDelays: [1000, 2000, 4000], // Exponential backoff
      ...options
    };

    this.initialize();
  }

  private initialize(): void {
    // Global error handler for unhandled errors
    window.addEventListener('error', this.handleGlobalError);
    
    // Global promise rejection handler
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
    
    // Console error override for better error tracking
    if (this.options.enableConsoleLogging) {
      this.overrideConsoleError();
    }
  }

  private handleGlobalError = (event: ErrorEvent): void => {
    const error = new Error(event.message);
    error.stack = `${event.filename}:${event.lineno}:${event.colno}`;
    
    this.handleError(error, {
      type: 'global_error',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  };

  private handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason));
    
    this.handleError(error, {
      type: 'unhandled_promise_rejection',
      reason: event.reason
    });
    
    // Prevent default browser behavior
    event.preventDefault();
  };

  private overrideConsoleError(): void {
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      // Call original console.error
      originalConsoleError.apply(console, args);
      
      // If first argument is an Error, handle it
      if (args[0] instanceof Error) {
        this.handleError(args[0], {
          type: 'console_error',
          args: args.slice(1)
        });
      }
    };
  }

  public handleError(
    error: Error,
    context?: Record<string, any>,
    options?: Partial<GlobalErrorOptions>
  ): string {
    const errorId = this.generateErrorId();
    const severity = this.determineSeverity(error);
    const category = this.categorizeError(error);
    
    const errorReport: ErrorReport = {
      id: errorId,
      timestamp: new Date(),
      error,
      context,
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: this.getUserId(),
      sessionId: this.getSessionId(),
      fingerprint: this.generateFingerprint(error),
      severity,
      category
    };

    // Console logging
    if (this.options.enableConsoleLogging) {
      this.logError(errorReport);
    }

    // Toast notifications
    console.log('[DEBUG] Toast check:', {
      enableToasts: this.options.enableToasts,
      shouldShow: this.shouldShowToast(errorReport),
      toastCount: this.toastCount,
      maxToasts: this.options.maxToastsPerMinute,
      severity: errorReport.severity
    });
    if (this.options.enableToasts && this.shouldShowToast(errorReport)) {
      console.log('[DEBUG] Calling showErrorToast');
      this.showErrorToast(errorReport);
    }

    // Error reporting
    if (this.options.enableReporting) {
      this.queueErrorReport(errorReport);
    }

    return errorId;
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private determineSeverity(error: Error): ErrorReport['severity'] {
    const message = error.message.toLowerCase();
    
    if (message.includes('security') || message.includes('unauthorized')) {
      return 'critical';
    }
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'medium';
    }
    
    if (message.includes('chunk') || message.includes('loading')) {
      return 'low';
    }
    
    return 'medium';
  }

  private categorizeError(error: Error): ErrorReport['category'] {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';
    
    if (isNetworkError(error)) {
      return 'network';
    }
    
    if (message.includes('api') || message.includes('fetch') || message.includes('xhr')) {
      return 'api';
    }
    
    if (message.includes('unauthorized') || message.includes('forbidden')) {
      return 'security';
    }
    
    if (message.includes('chunk') || message.includes('loading') || message.includes('timeout')) {
      return 'performance';
    }
    
    if (stack.includes('react') || stack.includes('component')) {
      return 'client';
    }
    
    return 'unknown';
  }

  private getUserId(): string | undefined {
    try {
      const user = localStorage.getItem('user');
      if (user) {
        const userData = JSON.parse(user);
        return userData.id || userData.userId;
      }
    } catch {
      // Ignore localStorage errors
    }
    return undefined;
  }

  private getSessionId(): string {
    try {
      let sessionId = sessionStorage.getItem('sessionId');
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('sessionId', sessionId);
      }
      return sessionId;
    } catch {
      return `session_${Date.now()}_fallback`;
    }
  }

  private generateFingerprint(error: Error): string {
    const key = `${error.name}:${error.message}:${error.stack?.split('\n')[1] || ''}`;
    const encoded = btoa(key);
    // Use full encoded string but limit to reasonable length for storage
    return encoded.substr(0, 32);
  }

  private logError(report: ErrorReport): void {
    const style = this.getConsoleStyle(report.severity);
    
    console.group(`🚨 Global Error Handler [${report.severity.toUpperCase()}]`);
    console.error(`%c${report.error.message}`, style);
    console.log('Error ID:', report.id);
    console.log('Category:', report.category);
    console.log('Timestamp:', report.timestamp.toISOString());
    console.log('URL:', report.url);
    
    if (report.context) {
      console.log('Context:', report.context);
    }
    
    if (report.error.stack) {
      console.log('Stack Trace:', report.error.stack);
    }
    
    console.groupEnd();
  }

  private getConsoleStyle(severity: ErrorReport['severity']): string {
    switch (severity) {
      case 'critical': return 'color: #dc2626; font-weight: bold; font-size: 14px;';
      case 'high': return 'color: #ea580c; font-weight: bold;';
      case 'medium': return 'color: #d97706;';
      case 'low': return 'color: #65a30d;';
      default: return 'color: #6b7280;';
    }
  }

  private shouldShowToast(report: ErrorReport): boolean {
    // Don't show toasts for low severity errors
    if (report.severity === 'low') {
      return false;
    }
    
    // Rate limit toasts
    if (this.toastCount >= this.options.maxToastsPerMinute) {
      return false;
    }
    
    // Don't show duplicate toasts for same fingerprint (check both memory and storage)
    if (this.recentToastFingerprints.has(report.fingerprint!)) {
      return false;
    }
    
    const recentToasts = this.getRecentToasts();
    if (recentToasts.includes(report.fingerprint!)) {
      return false;
    }
    
    return true;
  }

  private showErrorToast(report: ErrorReport): void {
    this.toastCount++;
    this.recentToastFingerprints.add(report.fingerprint!);
    this.addRecentToast(report.fingerprint!);
    
    // Reset toast count after 1 minute
    if (!this.toastResetTimer) {
      this.toastResetTimer = setTimeout(() => {
        this.toastCount = 0;
        this.recentToastFingerprints.clear();
        this.toastResetTimer = undefined;
      }, 60000);
    }
    
    const networkStatus = this.networkDetector.getStatus();
    const isNetworkRelated = report.category === 'network' || isNetworkError(report.error);
    
    if (isNetworkRelated) {
      toast.warning('Connection Issue', {
        description: getNetworkErrorMessage(networkStatus),
        action: {
          label: 'Retry',
          onClick: () => window.location.reload()
        }
      });
    } else {
      const message = this.getUserFriendlyMessage(report);
      const variant = report.severity === 'critical' ? 'error' : 'warning';
      
      toast[variant](message.title, {
        description: message.description,
        action: {
          label: 'Report',
          onClick: () => this.openReportDialog(report)
        }
      });
    }
  }

  private getUserFriendlyMessage(report: ErrorReport): { title: string; description: string } {
    switch (report.category) {
      case 'api':
        return {
          title: 'Service Issue',
          description: 'We\'re having trouble connecting to our services. Please try again.'
        };
      case 'security':
        return {
          title: 'Access Denied',
          description: 'You don\'t have permission to perform this action.'
        };
      case 'performance':
        return {
          title: 'Loading Issue',
          description: 'Something is taking longer than expected. Please refresh the page.'
        };
      default:
        return {
          title: 'Something went wrong',
          description: 'An unexpected error occurred. Our team has been notified.'
        };
    }
  }

  private queueErrorReport(report: ErrorReport): void {
    this.reportQueue.push(report);
    
    if (!this.isProcessingQueue) {
      this.processReportQueue();
    }
  }

  private async processReportQueue(): Promise<void> {
    if (this.isProcessingQueue || this.reportQueue.length === 0) {
      return;
    }
    
    this.isProcessingQueue = true;
    
    while (this.reportQueue.length > 0) {
      const report = this.reportQueue.shift()!;
      
      try {
        await this.sendErrorReport(report);
      } catch (error) {
        console.error('Failed to send error report:', error);
        // Re-queue for retry later
        this.reportQueue.unshift(report);
        break;
      }
    }
    
    this.isProcessingQueue = false;
  }

  private async sendErrorReport(report: ErrorReport): Promise<void> {
    const payload = {
      ...report,
      error: {
        name: report.error.name,
        message: report.error.message,
        stack: report.error.stack
      }
    };
    
    const response = await fetch(this.options.reportingUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`Error reporting failed: ${response.statusText}`);
    }
  }

  private getRecentToasts(): string[] {
    try {
      const recent = sessionStorage.getItem('recentToasts');
      return recent ? JSON.parse(recent) : [];
    } catch {
      return [];
    }
  }

  private addRecentToast(fingerprint: string): void {
    try {
      const recent = this.getRecentToasts();
      recent.push(fingerprint);
      
      // Keep only last 10 fingerprints
      const trimmed = recent.slice(-10);
      sessionStorage.setItem('recentToasts', JSON.stringify(trimmed));
    } catch {
      // Ignore storage errors
    }
  }

  private openReportDialog(report: ErrorReport): void {
    // This would open a dialog for users to provide additional context
    console.log('Report dialog would open for:', report.id);
  }

  public destroy(): void {
    window.removeEventListener('error', this.handleGlobalError);
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
    
    if (this.toastResetTimer) {
      clearTimeout(this.toastResetTimer);
    }
    
    this.networkDetector.destroy();
  }
}

// Singleton instance
let globalErrorHandler: GlobalErrorHandler | null = null;

export function createGlobalErrorHandler(options?: GlobalErrorOptions): GlobalErrorHandler {
  if (globalErrorHandler) {
    globalErrorHandler.destroy();
  }
  
  globalErrorHandler = new GlobalErrorHandler(options);
  return globalErrorHandler;
}

export function getGlobalErrorHandler(): GlobalErrorHandler | null {
  return globalErrorHandler;
}

// React hook for error handling
export function useErrorHandler() {
  return React.useCallback((error: Error, context?: Record<string, any>) => {
    if (!globalErrorHandler) {
      globalErrorHandler = new GlobalErrorHandler();
    }
    
    return globalErrorHandler.handleError(error, context);
  }, []);
}

// Utility function for manual error reporting
export function reportError(error: Error, context?: Record<string, any>): string {
  if (!globalErrorHandler) {
    globalErrorHandler = new GlobalErrorHandler();
  }
  
  return globalErrorHandler.handleError(error, context);
}

import React from 'react';