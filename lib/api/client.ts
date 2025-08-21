/**
 * API Client Configuration for trAIner App
 * Comprehensive Axios-based client with interceptors, automatic token refresh, and timeout management
 */

import axios, { AxiosInstance, AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import type { ApiResponse, ApiErrorResponse } from './types';
import { API_TIMEOUTS, APIError, API_ENDPOINTS } from './constants';

// Import type extensions
import './types';

// API_TIMEOUTS imported from constants.ts

// APIError imported from constants.ts

// Performance monitoring
class PerformanceMonitor {
  private metrics = new Map<string, { startTime: number }>();

  startTimer(key: string) {
    this.metrics.set(key, { startTime: performance.now() });
  }

  endTimer(key: string, metadata: any = {}) {
    const metric = this.metrics.get(key);
    if (!metric) return;

    const duration = performance.now() - metric.startTime;
    console.log(`⏱️ ${key}: ${duration.toFixed(2)}ms`, metadata);
    this.metrics.delete(key);

    // Report to analytics if available
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'api_performance', {
        event_category: 'API',
        event_label: key,
        value: Math.round(duration),
      });
    }
  }
}

// Request deduplication
class RequestDeduplicator {
  private pendingRequests = new Map<string, Promise<any>>();

  async dedupe<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }

    const promise = requestFn().finally(() => {
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  generateKey(config: AxiosRequestConfig): string {
    return `${config.method}:${config.url}:${JSON.stringify(config.params)}`;
  }
}

// Error classification helper
const classifyError = (error: AxiosError): APIError => {
  const status = error.response?.status || 0;
  const errorData = error.response?.data as any;
  const message = errorData?.message || error.message;
  const code = errorData?.code;

  // Network/connection errors
  if (!navigator.onLine || error.code === 'ENOTFOUND') {
    return new APIError('Network unavailable', 0, 'NETWORK_ERROR', true);
  }

  // Timeout errors
  if (error.code === 'ECONNABORTED') {
    return new APIError('Request timeout', 0, 'TIMEOUT_ERROR', true);
  }

  // HTTP status based classification
  switch (status) {
    case 400:
      return new APIError(message || 'Bad Request', 400, code, false);
    case 401:
      return new APIError(message || 'Unauthorized', 401, code, false);
    case 403:
      return new APIError(message || 'Forbidden', 403, code, false);
    case 404:
      return new APIError(message || 'Not Found', 404, code, false);
    case 429:
      return new APIError(message || 'Rate limit exceeded', 429, code, true);
    case 500:
    case 502:
    case 503:
    case 504:
      return new APIError(message || 'Server error', status, code, true);
    default:
      return new APIError(message || 'Unknown error', status, code, true);
  }
};

// Main API Client class
export class APIClient {
  private instance: AxiosInstance;
  private performance: PerformanceMonitor;
  private deduplicator: RequestDeduplicator;
  private refreshing: Promise<string> | null = null;

  constructor() {
    this.performance = new PerformanceMonitor();
    this.deduplicator = new RequestDeduplicator();
    
    const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/v1';
    console.log('🌐 API Client baseURL:', baseURL);
    this.instance = axios.create({
      baseURL: baseURL,
      timeout: API_TIMEOUTS.standardOperations,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Client-Version': '1.0.0',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    console.log('🔧 Setting up API interceptors...');
    // Request interceptor for authentication and performance monitoring
    this.instance.interceptors.request.use(
      async (config) => {
        // Add performance tracking
        const key = `${config.method?.toUpperCase()} ${config.url}`;
        this.performance.startTimer(key);
        config.metadata = { key };

        // Add timestamp for debugging
        config.headers['X-Client-Timestamp'] = new Date().toISOString();

        console.log('🔑 API CLIENT INTERCEPTOR CALLED!!! 🔑');
        console.log('🔑 Config skipAuth:', config.skipAuth);

        // Add authentication token from storage (check both sessionStorage and localStorage)
        if (!config.skipAuth) {
          console.log('🔑 Proceeding with auth token attachment...');
          try {
            console.log('🔑 Getting JWT token from storage for API request...');
            // Check sessionStorage first (session-only tokens), then localStorage (persistent tokens)
            let authToken = sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token');
            console.log('🔑 Token retrieved from storage:', authToken ? 'Found' : 'Missing');
            
            if (authToken) {
              config.headers.Authorization = `Bearer ${authToken}`;
              console.log('✅ Authorization header added:', `Bearer ${authToken.substring(0, 50)}...`);
            } else {
              console.warn('⚠️ No auth token found in storage');
            }
          } catch (error) {
            console.error('❌ Failed to get auth token for API request:', error);
            console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack');
            // Don't throw - let the request proceed without auth
          }
        }

        // Development logging
        if (process.env.NODE_ENV === 'development') {
          console.group(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
          console.log('Headers:', config.headers);
          if (config.data) console.log('Data:', config.data);
          console.groupEnd();
        }

        return config;
      },
      (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling and monitoring
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        // End performance tracking
        const key = response.config.metadata?.key;
        if (key) {
          this.performance.endTimer(key, {
            status: response.status,
            cached: response.headers['x-from-cache'] === 'true',
          });
        }

        // Check for deprecation warnings
        const deprecated = response.headers['x-api-deprecated'];
        const sunset = response.headers['sunset'];
        
        if (deprecated === 'true') {
          console.warn(`⚠️ API Deprecation Warning: This endpoint is deprecated.`);
          if (sunset) {
            console.warn(`Sunset date: ${sunset}`);
          }
        }

        // Development logging
        if (process.env.NODE_ENV === 'development') {
          console.group(`✅ API Response: ${response.status} ${response.config.url}`);
          console.log('Data:', response.data);
          console.groupEnd();
        }

        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config!;
        
        // End performance tracking
        const key = originalRequest.metadata?.key;
        if (key) {
          this.performance.endTimer(key, {
            status: error.response?.status || 0,
            error: true,
          });
        }

        // Handle 401 errors with automatic token refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newToken = await this.refreshAccessToken();
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.instance(originalRequest);
          } catch (refreshError) {
            // Refresh failed, redirect to login
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
            return Promise.reject(refreshError);
          }
        }

        // Development logging
        if (process.env.NODE_ENV === 'development') {
          console.group(`❌ API Error: ${error.response?.status} ${error.config?.url}`);
          console.log('Error:', error.response?.data || error.message);
          console.groupEnd();
        }

        // Classify and throw the error
        const apiError = classifyError(error);
        return Promise.reject(apiError);
      }
    );
  }

  private async refreshAccessToken(): Promise<string> {
    // Prevent multiple concurrent refresh attempts
    if (this.refreshing) {
      return this.refreshing;
    }

    this.refreshing = (async () => {
      try {
        // Check both storage types for refresh token
        const refreshToken = sessionStorage.getItem('refresh_token') || localStorage.getItem('refresh_token');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await this.instance.post('/auth/refresh', { 
          refreshToken 
        }, { 
          skipAuth: true // Don't attach current token for refresh
        });
        
        const newToken = response.data.jwtToken;
        if (!newToken) {
          throw new Error('Failed to refresh session');
        }

        // Update stored token in the same storage type where it was found
        const isRemembered = localStorage.getItem('remember_me') === 'true';
        if (isRemembered) {
          localStorage.setItem('auth_token', newToken);
          if (response.data.refreshToken) {
            localStorage.setItem('refresh_token', response.data.refreshToken);
          }
        } else {
          sessionStorage.setItem('auth_token', newToken);
          if (response.data.refreshToken) {
            sessionStorage.setItem('refresh_token', response.data.refreshToken);
          }
        }

        return newToken;
      } finally {
        this.refreshing = null;
      }
    })();

    return this.refreshing;
  }

  // REMOVED: withTimeout method - causes JWT interceptor bypass

  // Standard HTTP methods - always use main instance to preserve JWT interceptors
  async get<T>(url: string, config?: AxiosRequestConfig & { timeout?: number }): Promise<T> {
    const response = await this.instance.get(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig & { timeout?: number }): Promise<T> {
    const response = await this.instance.post(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig & { timeout?: number }): Promise<T> {
    console.log(`🚀 [API CLIENT] PUT request to: ${url}`);
    console.log(`🚀 [API CLIENT] PUT data:`, data);
    console.log(`🚀 [API CLIENT] PUT config:`, config);
    try {
      const response = await this.instance.put(url, data, config);
      console.log(`✅ [API CLIENT] PUT response:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`❌ [API CLIENT] PUT error:`, error);
      throw error;
    }
  }

  async delete<T>(url: string, config?: AxiosRequestConfig & { timeout?: number }): Promise<T> {
    const response = await this.instance.delete(url, config);
    return response.data;
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig & { timeout?: number }): Promise<T> {
    const response = await this.instance.patch(url, data, config);
    return response.data;
  }

  // Specialized methods for different operation types
  async workoutOperation<T>(url: string, data?: any, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'POST'): Promise<T> {
    const config = { timeout: API_TIMEOUTS.workoutGeneration };
    
    switch (method) {
      case 'GET':
        return this.get<T>(url, config);
      case 'POST':
        return this.post<T>(url, data, config);
      case 'PUT':
        return this.put<T>(url, data, config);
      case 'DELETE':
        return this.delete<T>(url, config);
      default:
        return this.post<T>(url, data, config);
    }
  }

  async analyticsOperation<T>(url: string, data?: any, method: 'GET' | 'POST' = 'GET'): Promise<T> {
    const config = { timeout: API_TIMEOUTS.analyticsInsights };
    return method === 'GET' ? this.get<T>(url, config) : this.post<T>(url, data, config);
  }

  async fileOperation<T>(url: string, formData: FormData): Promise<T> {
    const response = await this.instance.post(url, formData, {
      timeout: API_TIMEOUTS.fileOperations,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // Request deduplication wrapper
  async dedupedRequest<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    return this.deduplicator.dedupe(key, requestFn);
  }

  // Health check method
  async checkHealth(): Promise<boolean> {
    try {
      await this.get('/health', { skipAuth: true } as any);
      return true;
    } catch {
      return false;
    }
  }

  // Get the underlying Axios instance for advanced usage
  get client(): AxiosInstance {
    return this.instance;
  }
}

// Create singleton instance
export const apiClient = new APIClient();

// Re-export constants for service consumption
export { API_ENDPOINTS, API_TIMEOUTS } from './constants';