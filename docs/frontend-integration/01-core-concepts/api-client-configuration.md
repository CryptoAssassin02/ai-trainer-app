# API Client Configuration Guide for trAIner API

## Overview

This document provides a comprehensive guide for configuring and integrating with the trAIner AI Fitness App API. It covers client initialization, authentication patterns, request/response handling, versioning strategy, error management, and performance optimization to ensure smooth integration and backward compatibility.

## Table of Contents

- [Client Setup & Initialization](#client-setup--initialization)
- [Authentication Integration](#authentication-integration)
- [Request/Response Interceptors](#requestresponse-interceptors)
- [API Versioning Strategy](#api-versioning-strategy)
- [Error Handling & Retry Logic](#error-handling--retry-logic)
- [Performance Configuration](#performance-configuration)
- [Environment Management](#environment-management)
- [Debugging & Monitoring](#debugging--monitoring)
- [Implementation Checklist](#implementation-checklist)

## Client Setup & Initialization

### Basic Client Configuration

```javascript
import { TrainerAPIClient } from '@trainer/api-client';

const client = new TrainerAPIClient({
  baseURL: process.env.REACT_APP_API_URL || 'https://api.trainer-app.com',
  version: 'v1',
  timeout: 15000,
  retries: 3,
  retryDelay: 1000,
  maxRetryDelay: 5000,
  retryCondition: (error) => {
    const retryableStatuses = [408, 429, 500, 502, 503, 504];
    return retryableStatuses.includes(error.response?.status) || !navigator.onLine;
  }
});
```

### Advanced Configuration Options

```javascript
const client = new TrainerAPIClient({
  // Core Configuration
  baseURL: 'https://api.trainer-app.com',
  version: 'v1',
  timeout: 15000,
  
  // Authentication
  auth: {
    tokenStorage: 'localStorage', // 'localStorage' | 'sessionStorage' | 'memory'
    tokenKey: 'trainer_jwt_token',
    refreshTokenKey: 'trainer_refresh_token',
    autoRefresh: true,
    refreshEndpoint: '/v1/auth/refresh'
  },
  
  // Request Configuration
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Client-Version': '1.0.0'
  },
  
  // Performance
  compression: true,
  deduplicateRequests: true,
  cache: {
    enabled: true,
    ttl: 300000, // 5 minutes
    maxSize: 100
  },
  
  // Development
  debug: process.env.NODE_ENV === 'development',
  validateStatus: (status) => status >= 200 && status < 300
});
```

### Framework-Specific Setup

#### React Integration
```javascript
// contexts/ApiContext.js
import React, { createContext, useContext } from 'react';
import { TrainerAPIClient } from '@trainer/api-client';

const ApiContext = createContext();

export const ApiProvider = ({ children }) => {
  const client = new TrainerAPIClient({
    baseURL: process.env.REACT_APP_API_URL,
    version: 'v1'
  });
  
  return (
    <ApiContext.Provider value={client}>
      {children}
    </ApiContext.Provider>
  );
};

export const useApi = () => {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error('useApi must be used within ApiProvider');
  }
  return context;
};
```

#### Vue.js Integration
```javascript
// plugins/api.js
import { TrainerAPIClient } from '@trainer/api-client';

export default {
  install(app, options) {
    const client = new TrainerAPIClient(options);
    app.config.globalProperties.$api = client;
    app.provide('api', client);
  }
};
```

## Authentication Integration

### Token Management

```javascript
class AuthenticationHandler {
  constructor(client) {
    this.client = client;
    this.tokenStorage = localStorage; // configurable
  }
  
  setTokens(accessToken, refreshToken) {
    this.tokenStorage.setItem('trainer_jwt_token', accessToken);
    if (refreshToken) {
      this.tokenStorage.setItem('trainer_refresh_token', refreshToken);
    }
  }
  
  getAccessToken() {
    return this.tokenStorage.getItem('trainer_jwt_token');
  }
  
  getRefreshToken() {
    return this.tokenStorage.getItem('trainer_refresh_token');
  }
  
  clearTokens() {
    this.tokenStorage.removeItem('trainer_jwt_token');
    this.tokenStorage.removeItem('trainer_refresh_token');
  }
  
  async refreshAccessToken() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    
    try {
      const response = await this.client.post('/v1/auth/refresh', {
        refresh_token: refreshToken
      });
      
      const { jwtToken, refreshToken: newRefreshToken } = response.data;
      this.setTokens(jwtToken, newRefreshToken);
      
      return jwtToken;
    } catch (error) {
      this.clearTokens();
      throw error;
    }
  }
}
```

### Authentication Flow Implementation

```javascript
// Complete authentication integration
client.auth = new AuthenticationHandler(client);

// Login flow
async function login(email, password) {
  try {
    const response = await client.post('/v1/auth/login', {
      email,
      password,
      rememberMe: true
    });
    
    const { jwtToken, refreshToken, user } = response.data;
    client.auth.setTokens(jwtToken, refreshToken);
    
    return { user, success: true };
  } catch (error) {
    throw new AuthenticationError(error.message, error.response?.status);
  }
}

// Logout flow
async function logout() {
  try {
    await client.post('/v1/auth/logout');
  } finally {
    client.auth.clearTokens();
  }
}
```

## Request/Response Interceptors

### Request Interceptors

```javascript
// Authentication Interceptor
client.interceptors.request.use(
  (config) => {
    const token = client.auth.getAccessToken();
    if (token && !config.skipAuth) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Logging Interceptor (Development)
if (process.env.NODE_ENV === 'development') {
  client.interceptors.request.use(
    (config) => {
      console.group(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
      console.log('Headers:', config.headers);
      console.log('Data:', config.data);
      console.groupEnd();
      return config;
    },
    (error) => {
      console.error('Request Error:', error);
      return Promise.reject(error);
    }
  );
}

// Version Header Interceptor
client.interceptors.request.use(
  (config) => {
    config.headers['X-API-Version'] = client.version;
    config.headers['X-Client-Timestamp'] = new Date().toISOString();
    return config;
  }
);
```

### Response Interceptors

```javascript
// Authentication Refresh Interceptor
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const newToken = await client.auth.refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return client.request(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// Response Logging Interceptor (Development)
if (process.env.NODE_ENV === 'development') {
  client.interceptors.response.use(
    (response) => {
      console.group(`✅ API Response: ${response.status} ${response.config.url}`);
      console.log('Data:', response.data);
      console.log('Headers:', response.headers);
      console.groupEnd();
      return response;
    },
    (error) => {
      console.group(`❌ API Error: ${error.response?.status} ${error.config?.url}`);
      console.log('Error:', error.response?.data || error.message);
      console.groupEnd();
      return Promise.reject(error);
    }
  );
}

// Deprecation Warning Interceptor
client.interceptors.response.use(
  (response) => {
    const deprecated = response.headers['x-api-deprecated'];
    const sunset = response.headers['sunset'];
    
    if (deprecated === 'true') {
      console.warn(`⚠️ API Deprecation Warning: This endpoint is deprecated.`);
      if (sunset) {
        console.warn(`Sunset date: ${sunset}`);
      }
    }
    
    return response;
  }
);
```

## API Versioning Strategy

### URL-Based Versioning
We use URL-based versioning with the version number included in the base path:
- Current Version: `https://api.trainer-app.com/v1`
- Format: `/v{major_version}`

### Version Numbering
- **Major versions** (`v1`, `v2`): Breaking changes that require client updates
- **Minor versions**: Handled through feature flags and backward-compatible additions
- **Patch versions**: Bug fixes and security updates (transparent to clients)

## Version Lifecycle

### 1. Active Version
- Full support for all features
- Active development and enhancements
- Performance optimizations
- Security updates

### 2. Deprecated Version
- Announcement period: 6 months before sunset
- Limited to security updates and critical bug fixes
- Warning headers in API responses: `Sunset: Sat, 1 Jun 2025 00:00:00 GMT`
- Migration guides provided

### 3. Sunset Version
- Read-only access for 3 months
- No new features or non-critical fixes
- Clear error messages with migration information

## Breaking Change Definition

A breaking change includes:
- Removing an endpoint
- Removing or renaming a required field
- Changing field data types
- Modifying authentication methods
- Changing error response formats
- Altering rate limits significantly

## Non-Breaking Changes

The following are considered backward-compatible:
- Adding new endpoints
- Adding optional fields to requests
- Adding fields to responses
- Increasing rate limits
- Adding new error codes (with same format)
- Performance improvements

## Version Migration

### Migration Timeline
1. **Announcement** (T-6 months): New version announced with changelog
2. **Beta Release** (T-4 months): New version available for testing
3. **General Availability** (T-2 months): New version fully supported
4. **Deprecation Warning** (T=0): Old version marked deprecated
5. **Sunset** (T+6 months): Old version enters read-only mode
6. **Removal** (T+9 months): Old version removed

### Migration Support
- Comprehensive migration guides
- API diff documentation
- Client SDK updates
- Migration scripts for common patterns
- Support channel for migration questions

## API Response Headers

### Version Information Headers
```http
X-API-Version: 1.0
X-API-Deprecated: false
X-API-Sunset: (if applicable)
X-API-Latest-Version: 1.0
```

### Deprecation Warning Headers
```http
Warning: 299 - "This API version is deprecated. Please migrate to v2"
Sunset: Sat, 1 Jun 2025 00:00:00 GMT
Link: <https://docs.trainer-app.com/api/migration/v1-to-v2>; rel="migration"
```

## Client Best Practices

### Version Specification
- Always specify the API version explicitly
- Don't rely on version redirects
- Monitor deprecation headers

### SDK Usage
```javascript
// Good - Explicit version
const client = new TrainerAPI({ version: 'v1' });

// Bad - Implicit version
const client = new TrainerAPI();
```

### Header Monitoring
```javascript
// Monitor for deprecation warnings
response.headers.get('X-API-Deprecated');
response.headers.get('Warning');
response.headers.get('Sunset');
```

## Error Handling & Retry Logic

### Error Classification and Handling

```javascript
class APIError extends Error {
  constructor(message, status, code, retryable = false) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.code = code;
    this.retryable = retryable;
  }
}

const classifyError = (error) => {
  const status = error.response?.status;
  const code = error.response?.data?.code;
  
  if (!navigator.onLine) {
    return new APIError('Network unavailable', 0, 'NETWORK_ERROR', true);
  }
  
  switch (status) {
    case 400:
      return new APIError('Validation error', 400, code, false);
    case 401:
      return new APIError('Authentication required', 401, code, false);
    case 403:
      return new APIError('Forbidden', 403, code, false);
    case 404:
      return new APIError('Resource not found', 404, code, false);
    case 429:
      return new APIError('Rate limit exceeded', 429, code, true);
    case 500:
    case 502:
    case 503:
    case 504:
      return new APIError('Server error', status, code, true);
    default:
      return new APIError('Unknown error', status, code, true);
  }
};
```

### Exponential Backoff Implementation

```javascript
class RetryHandler {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.baseDelay = options.baseDelay || 1000;
    this.maxDelay = options.maxDelay || 30000;
    this.backoffFactor = options.backoffFactor || 2;
  }
  
  async executeWithRetry(operation, context = {}) {
    let lastError;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = classifyError(error);
        
        if (attempt === this.maxRetries || !lastError.retryable) {
          throw lastError;
        }
        
        const delay = Math.min(
          this.baseDelay * Math.pow(this.backoffFactor, attempt),
          this.maxDelay
        );
        
        console.log(`Retry attempt ${attempt + 1}/${this.maxRetries} after ${delay}ms`);
        await this.delay(delay);
      }
    }
    
    throw lastError;
  }
  
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Integration with API client
client.retryHandler = new RetryHandler();
```

### Circuit Breaker Pattern

```javascript
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.threshold = threshold;
    this.timeout = timeout;
    this.failures = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }
  
  async execute(operation) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }
  
  onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}
```

## Feature Flags for Minor Changes

Minor features within a major version use feature flags:

```http
X-Feature-Flags: enhanced-ai-insights,batch-operations
```

Clients can opt into new features:
```http
Accept-Features: enhanced-ai-insights
```

## Performance Configuration

### Request Deduplication

```javascript
class RequestDeduplicator {
  constructor() {
    this.pendingRequests = new Map();
  }
  
  async dedupe(key, requestFn) {
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }
    
    const promise = requestFn().finally(() => {
      this.pendingRequests.delete(key);
    });
    
    this.pendingRequests.set(key, promise);
    return promise;
  }
  
  generateKey(config) {
    return `${config.method}:${config.url}:${JSON.stringify(config.params)}`;
  }
}

// Integration
client.deduplicator = new RequestDeduplicator();
```

### Response Caching

```javascript
class ResponseCache {
  constructor(options = {}) {
    this.cache = new Map();
    this.defaultTTL = options.ttl || 300000; // 5 minutes
    this.maxSize = options.maxSize || 100;
  }
  
  set(key, value, ttl = this.defaultTTL) {
    // Implement LRU eviction if needed
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    const expiry = Date.now() + ttl;
    this.cache.set(key, { value, expiry });
  }
  
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }
  
  invalidate(pattern) {
    const keys = Array.from(this.cache.keys());
    const regex = new RegExp(pattern);
    
    keys.forEach(key => {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    });
  }
}
```

### Request Compression

```javascript
// Automatic compression for large payloads
client.interceptors.request.use(
  (config) => {
    if (config.data && JSON.stringify(config.data).length > 1024) {
      config.headers['Content-Encoding'] = 'gzip';
      // Implement compression if supported by environment
    }
    return config;
  }
);
```

## Environment Management

### Environment-Specific Configuration

```javascript
const environments = {
  development: {
    baseURL: 'http://localhost:8000',
    debug: true,
    timeout: 30000,
    retries: 1
  },
  staging: {
    baseURL: 'https://staging-api.trainer-app.com',
    debug: true,
    timeout: 15000,
    retries: 2
  },
  production: {
    baseURL: 'https://api.trainer-app.com',
    debug: false,
    timeout: 10000,
    retries: 3
  }
};

const config = environments[process.env.NODE_ENV] || environments.development;
const client = new TrainerAPIClient(config);
```

### Environment Variable Management

```javascript
// .env.example
// REACT_APP_API_URL=https://api.trainer-app.com
// REACT_APP_API_VERSION=v1
// REACT_APP_API_TIMEOUT=15000
// REACT_APP_DEBUG_API=false

const apiConfig = {
  baseURL: process.env.REACT_APP_API_URL,
  version: process.env.REACT_APP_API_VERSION || 'v1',
  timeout: parseInt(process.env.REACT_APP_API_TIMEOUT) || 15000,
  debug: process.env.REACT_APP_DEBUG_API === 'true'
};
```

### Feature Flag Environment Integration

```javascript
// Environment-based feature flags
const getFeatureFlags = () => {
  const env = process.env.NODE_ENV;
  const baseFlags = ['workout-generation', 'nutrition-tracking'];
  
  switch (env) {
    case 'development':
      return [...baseFlags, 'debug-mode', 'experimental-features'];
    case 'staging':
      return [...baseFlags, 'beta-features'];
    case 'production':
      return baseFlags;
    default:
      return baseFlags;
  }
};
```

## Debugging & Monitoring

### Request/Response Logging

```javascript
class APILogger {
  constructor(options = {}) {
    this.enabled = options.enabled || false;
    this.level = options.level || 'info'; // 'debug', 'info', 'warn', 'error'
    this.persistLogs = options.persistLogs || false;
    this.logs = [];
  }
  
  log(level, message, data = {}) {
    if (!this.enabled) return;
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data
    };
    
    console[level](`[API ${level.toUpperCase()}]`, message, data);
    
    if (this.persistLogs) {
      this.logs.push(logEntry);
      // Limit log history
      if (this.logs.length > 1000) {
        this.logs = this.logs.slice(-500);
      }
    }
  }
  
  debug(message, data) { this.log('debug', message, data); }
  info(message, data) { this.log('info', message, data); }
  warn(message, data) { this.log('warn', message, data); }
  error(message, data) { this.log('error', message, data); }
  
  export() {
    return this.logs;
  }
}

// Integration
client.logger = new APILogger({
  enabled: process.env.NODE_ENV === 'development',
  persistLogs: true
});
```

### Performance Monitoring

```javascript
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
  }
  
  startTimer(key) {
    this.metrics.set(key, { startTime: performance.now() });
  }
  
  endTimer(key, metadata = {}) {
    const metric = this.metrics.get(key);
    if (!metric) return;
    
    const duration = performance.now() - metric.startTime;
    metric.duration = duration;
    metric.metadata = metadata;
    
    console.log(`⏱️ ${key}: ${duration.toFixed(2)}ms`, metadata);
    
    // Report to analytics service if needed
    this.reportMetric(key, duration, metadata);
  }
  
  reportMetric(key, duration, metadata) {
    // Send to your analytics/monitoring service
    if (window.gtag) {
      window.gtag('event', 'api_performance', {
        event_category: 'API',
        event_label: key,
        value: Math.round(duration),
        custom_map: metadata
      });
    }
  }
}

// Integration with interceptors
client.performance = new PerformanceMonitor();

client.interceptors.request.use(
  (config) => {
    const key = `${config.method?.toUpperCase()} ${config.url}`;
    client.performance.startTimer(key);
    config.metadata = { key };
    return config;
  }
);

client.interceptors.response.use(
  (response) => {
    const key = response.config.metadata?.key;
    if (key) {
      client.performance.endTimer(key, {
        status: response.status,
        cached: response.headers['x-from-cache'] === 'true'
      });
    }
    return response;
  },
  (error) => {
    const key = error.config?.metadata?.key;
    if (key) {
      client.performance.endTimer(key, {
        status: error.response?.status || 0,
        error: true
      });
    }
    return Promise.reject(error);
  }
);
```

### Error Tracking Integration

```javascript
// Sentry integration example
import * as Sentry from '@sentry/browser';

client.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only report non-4xx errors (except 401, which might indicate auth issues)
    if (error.response?.status >= 500 || error.response?.status === 401) {
      Sentry.captureException(error, {
        tags: {
          api_endpoint: error.config?.url,
          api_method: error.config?.method,
          api_status: error.response?.status
        },
        extra: {
          request_data: error.config?.data,
          response_data: error.response?.data
        }
      });
    }
    
    return Promise.reject(error);
  }
);
```

## Version Documentation

Each API version maintains:
- Complete OpenAPI specification
- Changelog from previous versions
- Migration guide
- Deprecated feature list
- Known limitations

## Rate Limiting by Version

Different versions may have different rate limits:
- Latest version: Standard limits
- Deprecated version: Reduced limits (75% of standard)
- Near-sunset version: Minimal limits (50% of standard)

## Backward Compatibility Contract

We commit to:
1. **6-month deprecation notice** for any breaking change
2. **9-month total support** after deprecation announcement
3. **Clear migration paths** with documentation and tools
4. **Gradual feature rollout** using feature flags
5. **Transparent communication** through multiple channels

## Communication Channels

Version changes are communicated through:
- API response headers
- Developer dashboard notifications
- Email notifications to registered developers
- API documentation site
- GitHub releases
- Developer blog

## Emergency Deprecation

In rare cases (security vulnerabilities), emergency deprecation may occur:
- Immediate notification to all consumers
- 30-day migration window (minimum)
- Priority support for migration
- Detailed security advisory

## Version Support Matrix

| Version | Status | Support Level | Sunset Date |
|---------|--------|--------------|-------------|
| v1      | Active | Full         | N/A         |
| v2      | Planning | N/A        | N/A         |

## Implementation Checklist

### Client Setup
- [ ] API client configured with proper base URL and version
- [ ] Authentication handler implemented
- [ ] Request/response interceptors configured
- [ ] Error handling and retry logic implemented
- [ ] Performance monitoring enabled
- [ ] Debug logging configured for development

### Version Management
- [ ] Version included in all API URLs
- [ ] Deprecation headers monitored
- [ ] Version documentation maintained
- [ ] Migration guides prepared
- [ ] Client SDKs support version selection
- [ ] Monitoring for version usage metrics
- [ ] Automated deprecation notices
- [ ] Version-specific rate limiting

### Production Readiness
- [ ] Environment-specific configuration
- [ ] Error tracking integration
- [ ] Performance metrics collection
- [ ] Circuit breaker implementation
- [ ] Request deduplication enabled
- [ ] Response caching configured
- [ ] Security headers validated
- [ ] Rate limiting compliance verified 