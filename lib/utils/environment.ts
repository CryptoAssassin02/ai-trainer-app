/**
 * Environment Detection and Configuration Utilities
 * Provides environment-aware configuration for rate limiting and API behavior
 */

import { RATE_LIMITS } from '../api/constants';

// ✅ Environment detection utility
export const getEnvironment = (): 'production' | 'test' | 'development' => {
  if (process.env.NODE_ENV === 'test') return 'test';
  if (process.env.NODE_ENV === 'production') return 'production';
  return 'development';
};

// ✅ Environment-aware rate limit configuration
export const getRateLimitConfig = (operation: keyof typeof RATE_LIMITS) => {
  const env = getEnvironment();
  const envKey = env.toUpperCase() as keyof typeof RATE_LIMITS[typeof operation];
  return RATE_LIMITS[operation][envKey];
};

// ✅ Environment-specific API behavior flags
export const getEnvironmentConfig = () => {
  const env = getEnvironment();
  
  return {
    environment: env,
    isDevelopment: env === 'development',
    isTest: env === 'test',
    isProduction: env === 'production',
    
    // Rate limiting configuration
    rateLimiting: {
      workoutGeneration: getRateLimitConfig('WORKOUT_GENERATION'),
    },
    
    // Logging configuration
    logging: {
      enableDebugLogs: env !== 'production',
      enableErrorReporting: env === 'production',
      logApiRequests: env === 'development',
    },
    
    // API behavior configuration
    api: {
      enableRetries: env === 'production',
      maxRetries: env === 'production' ? 3 : 1,
      enableCaching: env === 'production',
      strictValidation: env !== 'development',
    },
    
    // AI operation configuration
    ai: {
      enableFallbacks: env === 'production',
      enableProgressTracking: true,
      enableReasoningDisplay: env !== 'production', // Hide in production for performance
      timeoutMultiplier: env === 'development' ? 1.5 : 1.0, // Longer timeouts in dev
    },
  };
};

// ✅ Rate limit helper functions
export const isRateLimited = (
  operation: keyof typeof RATE_LIMITS,
  requestCount: number,
  windowStart: number
): boolean => {
  const config = getRateLimitConfig(operation);
  const now = Date.now();
  const windowElapsed = now - windowStart;
  
  // If window has expired, reset
  if (windowElapsed >= config.windowMs) {
    return false;
  }
  
  // Check if request count exceeds limit
  return requestCount >= config.requests;
};

export const getRateLimitResetTime = (
  operation: keyof typeof RATE_LIMITS,
  windowStart: number
): number => {
  const config = getRateLimitConfig(operation);
  return windowStart + config.windowMs;
};

export const getRateLimitStatus = (
  operation: keyof typeof RATE_LIMITS,
  requestCount: number,
  windowStart: number
) => {
  const config = getRateLimitConfig(operation);
  const now = Date.now();
  const windowElapsed = now - windowStart;
  const isLimited = isRateLimited(operation, requestCount, windowStart);
  
  return {
    isLimited,
    requestCount,
    requestLimit: config.requests,
    windowMs: config.windowMs,
    windowElapsed,
    resetTime: getRateLimitResetTime(operation, windowStart),
    remainingRequests: Math.max(0, config.requests - requestCount),
    resetInMs: Math.max(0, config.windowMs - windowElapsed),
  };
};

// ✅ Environment-specific error handling
export const shouldRetryError = (error: any, attempt: number): boolean => {
  const config = getEnvironmentConfig();
  
  // Don't retry if retries are disabled
  if (!config.api.enableRetries) {
    return false;
  }
  
  // Don't retry if max attempts exceeded
  if (attempt >= config.api.maxRetries) {
    return false;
  }
  
  // Don't retry client errors (4xx)
  const status = error.response?.status || error.status;
  if (status >= 400 && status < 500) {
    return false;
  }
  
  // Retry server errors (5xx) and network errors
  if (status >= 500 || !status) {
    return true;
  }
  
  return false;
};

// ✅ Environment-specific timeout calculation
export const getTimeoutForOperation = (
  baseTimeout: number,
  operation?: string
): number => {
  const config = getEnvironmentConfig();
  
  // Apply environment-specific multiplier
  let timeout = baseTimeout * config.ai.timeoutMultiplier;
  
  // Add extra time for AI operations in development
  if (config.isDevelopment && operation?.includes('ai')) {
    timeout *= 1.2;
  }
  
  return Math.round(timeout);
};

// ✅ Development helper functions
export const logEnvironmentInfo = () => {
  if (getEnvironment() === 'development') {
    const config = getEnvironmentConfig();
    console.log('🌍 Environment Configuration:', {
      environment: config.environment,
      rateLimits: config.rateLimiting,
      apiConfig: config.api,
      aiConfig: config.ai,
    });
  }
};

// ✅ Environment-aware feature flags
export const getFeatureFlags = () => {
  const env = getEnvironment();
  
  return {
    // AI features
    enableAIReasoningDisplay: env !== 'production',
    enableAIProgressTracking: true,
    enableAIFallbacks: env === 'production',
    
    // Debug features
    enableDebugMode: env === 'development',
    enablePerformanceMetrics: env !== 'production',
    enableDetailedErrorMessages: env !== 'production',
    
    // API features
    enableRequestCaching: env === 'production',
    enableRequestDeduplication: true,
    enableRetryMechanism: env === 'production',
    
    // UI features
    enableLoadingAnimations: true,
    enableProgressIndicators: true,
    enableErrorRecovery: true,
  };
};
