/**
 * Error Logger
 * Handles logging errors to console and localStorage
 */

export interface ErrorLogEntry {
  id: string;
  message: string;
  category: 'client' | 'server' | 'network' | 'validation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  stack?: string;
  context?: Record<string, any>;
}

export interface ErrorLoggerOptions {
  enableConsoleLogging?: boolean;
  enableLocalStorage?: boolean;
  storageKey?: string;
  maxStoredErrors?: number;
}

export class ErrorLogger {
  private options: Required<ErrorLoggerOptions>;
  private logs: ErrorLogEntry[] = [];

  constructor(options: ErrorLoggerOptions = {}) {
    this.options = {
      enableConsoleLogging: process.env.NODE_ENV === 'development',
      enableLocalStorage: true,
      storageKey: 'error_logs',
      maxStoredErrors: 100,
      ...options
    };

    // Load existing logs from localStorage
    if (this.options.enableLocalStorage) {
      this.loadLogsFromStorage();
    }
  }

  logError(error: ErrorLogEntry): void {
    // Add to in-memory logs
    this.logs.unshift(error); // Add to beginning for chronological order
    
    // Limit stored errors
    if (this.logs.length > this.options.maxStoredErrors) {
      this.logs = this.logs.slice(0, this.options.maxStoredErrors);
    }

    // Console logging
    if (this.options.enableConsoleLogging) {
      console.error(`[${error.severity.toUpperCase()}] ${error.category}: ${error.message}`, {
        id: error.id,
        timestamp: new Date(error.timestamp).toISOString(),
        stack: error.stack,
        context: error.context
      });
    }

    // Storage persistence
    if (this.options.enableLocalStorage) {
      this.saveLogsToStorage();
    }
  }

  getLogs(): ErrorLogEntry[] {
    return [...this.logs]; // Return copy to prevent mutations
  }

  clearLogs(): void {
    this.logs = [];
    
    if (this.options.enableLocalStorage) {
      try {
        localStorage.removeItem(this.options.storageKey);
      } catch (error) {
        console.warn('Failed to clear error logs from localStorage:', error);
      }
    }
  }

  getLogsByCategory(category: ErrorLogEntry['category']): ErrorLogEntry[] {
    return this.logs.filter(log => log.category === category);
  }

  getLogsBySeverity(severity: ErrorLogEntry['severity']): ErrorLogEntry[] {
    return this.logs.filter(log => log.severity === severity);
  }

  private loadLogsFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.options.storageKey);
      if (stored) {
        const parsedLogs = JSON.parse(stored);
        if (Array.isArray(parsedLogs)) {
          this.logs = parsedLogs;
        }
      }
    } catch (error) {
      console.warn('Failed to load error logs from localStorage:', error);
    }
  }

  private saveLogsToStorage(): void {
    try {
      localStorage.setItem(this.options.storageKey, JSON.stringify(this.logs));
    } catch (error) {
      console.warn('Failed to save error logs to localStorage:', error);
    }
  }
}

// Singleton instance
let errorLoggerInstance: ErrorLogger | null = null;

export function createErrorLogger(options?: ErrorLoggerOptions): ErrorLogger {
  errorLoggerInstance = new ErrorLogger(options);
  return errorLoggerInstance;
}

export function getErrorLogger(): ErrorLogger {
  if (!errorLoggerInstance) {
    errorLoggerInstance = new ErrorLogger();
  }
  return errorLoggerInstance;
}

// Default export for convenience
export default getErrorLogger;