/**
 * Network Detector Utility
 * Enhanced network status detection with modern browser APIs
 */

export interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

export interface NetworkDetectorOptions {
  pingUrl?: string;
  pingInterval?: number;
  slowConnectionThreshold?: number;
  enableHeartbeat?: boolean;
}

class NetworkDetector {
  private listeners: Set<(status: NetworkStatus) => void> = new Set();
  private currentStatus: NetworkStatus = { isOnline: true, isSlowConnection: false };
  private heartbeatInterval?: NodeJS.Timeout;
  private options: Required<NetworkDetectorOptions>;

  constructor(options: NetworkDetectorOptions = {}) {
    this.options = {
      pingUrl: '/api/health',
      pingInterval: 30000, // 30 seconds
      slowConnectionThreshold: 1000, // 1 second RTT
      enableHeartbeat: true,
      ...options
    };

    this.initialize();
  }

  private initialize(): void {
    // Initial status
    this.updateNetworkStatus();

    // Browser online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }

    // Network Information API for connection quality
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      // Check if addEventListener exists before calling it
      if (connection && typeof connection.addEventListener === 'function') {
        connection.addEventListener('change', this.handleConnectionChange);
      }
    }

    // Start heartbeat if enabled
    if (this.options.enableHeartbeat) {
      this.startHeartbeat();
    }
  }

  private handleOnline = (): void => {
    this.updateNetworkStatus();
    this.notifyListeners();
  };

  private handleOffline = (): void => {
    this.currentStatus = {
      ...this.currentStatus,
      isOnline: false
    };
    this.notifyListeners();
  };

  private handleConnectionChange = (): void => {
    this.updateNetworkStatus();
    this.notifyListeners();
  };

  private updateNetworkStatus(): void {
    const isOnline = navigator.onLine;
    let isSlowConnection = false;
    let effectiveType: string | undefined;
    let downlink: number | undefined;
    let rtt: number | undefined;
    let saveData: boolean | undefined;

    // Use Network Information API if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      effectiveType = connection?.effectiveType;
      downlink = connection?.downlink;
      rtt = connection?.rtt;
      saveData = connection?.saveData;

      // Determine if connection is slow
      isSlowConnection = 
        effectiveType === 'slow-2g' || 
        effectiveType === '2g' ||
        (rtt && rtt > this.options.slowConnectionThreshold) ||
        (downlink && downlink < 0.5) ||
        saveData === true;
    }

    this.currentStatus = {
      isOnline,
      isSlowConnection,
      effectiveType,
      downlink,
      rtt,
      saveData
    };
  }

  private async performHeartbeat(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(this.options.pingUrl, {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache'
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      const isReachable = await this.performHeartbeat();
      
      if (isReachable !== this.currentStatus.isOnline) {
        this.currentStatus = {
          ...this.currentStatus,
          isOnline: isReachable
        };
        this.notifyListeners();
      }
    }, this.options.pingInterval);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.currentStatus);
      } catch (error) {
        console.error('Network detector listener error:', error);
      }
    });
  }

  public getStatus(): NetworkStatus {
    return { ...this.currentStatus };
  }

  public subscribe(listener: (status: NetworkStatus) => void): () => void {
    this.listeners.add(listener);
    
    // Immediately notify with current status
    listener(this.currentStatus);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  public destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
    
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection && typeof connection.removeEventListener === 'function') {
        connection.removeEventListener('change', this.handleConnectionChange);
      }
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.listeners.clear();
  }
}

// Singleton instance
let networkDetector: NetworkDetector | null = null;

// For testing - get the global detector
export function getNetworkDetector(): NetworkDetector | null {
  return networkDetector;
}

// For testing - reset the global detector
export function resetNetworkDetector(): void {
  if (networkDetector) {
    networkDetector.destroy();
    networkDetector = null;
  }
}

export function createNetworkDetector(options?: NetworkDetectorOptions): NetworkDetector {
  if (networkDetector) {
    networkDetector.destroy();
  }
  
  networkDetector = new NetworkDetector(options);
  return networkDetector;
}

// React hook for network status
export function useNetworkStatus(options?: NetworkDetectorOptions): NetworkStatus {
  const [status, setStatus] = React.useState<NetworkStatus>(() => {
    // Initialize with actual network status
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    return { 
      isOnline, 
      isSlowConnection: false 
    };
  });

  React.useEffect(() => {
    if (!networkDetector) {
      networkDetector = new NetworkDetector(options);
    }

    // Get current status immediately
    setStatus(networkDetector.getStatus());
    
    const unsubscribe = networkDetector.subscribe(setStatus);
    return unsubscribe;
  }, []);

  return status;
}

// Utility functions
export function isNetworkError(error: Error): boolean {
  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();
  
  // Check error name types
  if (name === 'typeerror' && message.includes('fetch')) {
    return true;
  }
  
  // Check for DOMException types
  if (error instanceof DOMException) {
    return error.name === 'AbortError' || 
           error.name === 'NetworkError' ||
           error.name === 'TimeoutError';
  }
  
  // Check for specific network-related error messages
  const networkPatterns = [
    'network',
    'fetch',
    'failed to fetch',
    'networkerror',
    'connection',
    'aborted',
    'timeout',
    'enotfound',
    'econnrefused',
    'getaddrinfo',
    'dns',
    'abort',
    'unreachable'
  ];
  
  const hasNetworkPattern = networkPatterns.some(pattern => 
    message.includes(pattern)
  );
  
  // Check error cause chain
  if (error.cause && error.cause instanceof Error) {
    return isNetworkError(error.cause);
  }
  
  return hasNetworkPattern;
}

export function getNetworkErrorMessage(input: NetworkStatus | Error): string {
  // Handle Error input
  if (input instanceof Error) {
    const message = input.message.toLowerCase();
    
    if (message.includes('timeout')) {
      return 'Your request timed out. This may be due to a slow connection. Please try again.';
    }
    
    if (message.includes('enotfound') || message.includes('dns') || message.includes('getaddrinfo')) {
      return 'Unable to reach the server. Please check the server address and try to resolve the connection.';
    }
    
    if (message.includes('abort') || message.includes('aborted')) {
      return 'The request was aborted. Please try again.';
    }
    
    if (message.includes('econnrefused') || message.includes('connection refused')) {
      return 'Connection was refused by the server. Please try again later.';
    }
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'A network error occurred. Please check your connection and try again.';
    }
    
    return 'A network error occurred. Please try again.';
  }
  
  // Handle NetworkStatus input
  const status = input as NetworkStatus;
  if (!status.isOnline) {
    return 'You appear to be offline. Please check your internet connection.';
  }
  
  if (status.isSlowConnection) {
    return 'Your connection appears to be slow. Some features may be delayed.';
  }
  
  return 'Network connection is available.';
}

export function shouldRetryRequest(error: Error, status: NetworkStatus): boolean {
  if (!status.isOnline) {
    return false; // Don't retry when offline
  }
  
  return isNetworkError(error) || error.name === 'AbortError';
}

// Import React for the hook
import React from 'react';