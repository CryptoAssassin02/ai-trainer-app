/**
 * @fileoverview Rate Limiting Middleware
 * Implements comprehensive rate limiting for API endpoints
 */

const rateLimit = require('express-rate-limit');
const { logger } = require('../config');

/**
 * Create a standard rate limiter with customizable options
 * 
 * @param {Object} options - Rate limiter options
 * @returns {Function} Express middleware rate limiter
 */
const createRateLimiter = (options = {}) => {
  const defaultOptions = {
    windowMs: 60 * 1000, // 1 minute window by default
    max: 60, // 60 requests per minute by default
    message: {
      status: 'error',
      message: 'Too many requests. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    keyGenerator: (req) => {
      // Default key generator uses IP and user ID if available for more precise limiting
      const userId = req.user?.id || 'anonymous';
      return `${req.ip}_${userId}`;
    }
  };

  // Merge default options with provided options
  const finalOptions = { ...defaultOptions, ...options };

  // Create the limiter with provided options
  return rateLimit({
    ...finalOptions,
    // Override the built-in handler to include logging
    handler: (req, res) => {
      const path = req.originalUrl || req.url;
      const ip = req.ip || req.headers['x-forwarded-for'];
      const userAgent = req.headers['user-agent'] || 'unknown';
      const userId = req.user?.id || 'anonymous';
      
      logger.warn('Rate limit exceeded', {
        ip,
        userId,
        path,
        userAgent,
        method: req.method,
        windowMs: finalOptions.windowMs,
        limit: finalOptions.max
      });
      
      res.status(429).json(finalOptions.message);
    }
  });
};

// Create a limiter for authentication endpoints (more restrictive)
const createAuthLimiter = (windowMs = 15 * 60 * 1000, maxAttempts = 5) => {
  return createRateLimiter({
    windowMs,
    max: maxAttempts,
    message: {
      status: 'error',
      message: 'Too many authentication attempts. Please try again later.',
      code: 'AUTH_RATE_LIMIT_EXCEEDED'
    },
    // For auth endpoints, only use IP as the user ID isn't known yet
    keyGenerator: (req) => req.ip || req.headers['x-forwarded-for'] || 'unknown'
  });
};

/**
 * Creates a specialized limiter for API endpoints
 * 
 * @param {number} maxRequests - Maximum requests in the time window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Function} Express middleware rate limiter
 */
const createApiLimiter = (maxRequests = 100, windowMs = 60 * 1000) => {
  return createRateLimiter({
    windowMs,
    max: maxRequests,
    message: {
      status: 'error',
      message: 'API rate limit exceeded. Please try again later.',
      code: 'API_RATE_LIMIT_EXCEEDED'
    }
  });
};

/**
 * Creates a specialized limiter for workout generation endpoints (more expensive operations)
 * 
 * @param {number} maxRequests - Maximum requests in the time window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Function} Express middleware rate limiter
 */
const createWorkoutGenLimiter = (maxRequests = 10, windowMs = 60 * 60 * 1000) => {
  return createRateLimiter({
    windowMs,
    max: maxRequests,
    message: {
      status: 'error',
      message: 'Workout generation rate limit exceeded. Please try again later.',
      code: 'WORKOUT_GEN_LIMIT_EXCEEDED'
    }
  });
};

/**
 * Creates a specialized limiter for AI operations that are expensive
 * 
 * @param {number} maxRequests - Maximum requests in the time window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Function} Express middleware rate limiter
 */
const createAiOperationLimiter = (maxRequests = 20, windowMs = 60 * 60 * 1000) => {
  return createRateLimiter({
    windowMs,
    max: maxRequests,
    message: {
      status: 'error',
      message: 'AI operation rate limit exceeded. Please try again later.',
      code: 'AI_OPERATION_LIMIT_EXCEEDED'
    }
  });
};

// Create specific limiters for different auth endpoints
const authLimiters = {
  signup: createAuthLimiter(60 * 60 * 1000, 10), // 10 signups per hour
  login: createAuthLimiter(15 * 60 * 1000, 5),   // 5 login attempts per 15 minutes
  refresh: createAuthLimiter(15 * 60 * 1000, 10), // 10 refresh attempts per 15 minutes
  passwordReset: createAuthLimiter(60 * 60 * 1000, 3) // 3 password reset requests per hour
};

// Create specific limiters for API endpoints
const apiLimiters = {
  standard: createApiLimiter(100, 60 * 1000),     // 100 requests per minute for standard endpoints
  workoutGen: createWorkoutGenLimiter(10, 60 * 60 * 1000), // 10 workout generations per hour
  aiOperations: createAiOperationLimiter(20, 60 * 60 * 1000) // 20 AI operations per hour
};

// Export all rate limiters
module.exports = {
  createRateLimiter,
  createAuthLimiter,
  createApiLimiter,
  createWorkoutGenLimiter,
  createAiOperationLimiter,
  authLimiters,
  apiLimiters
}; 