/**
 * @fileoverview Rate Limiting Middleware
 * Implements rate limiting for authentication endpoints
 */

const rateLimit = require('express-rate-limit');
const { logger } = require('../config');

// Create a limiter for authentication endpoints
const createAuthLimiter = (windowMs = 15 * 60 * 1000, maxAttempts = 5) => {
  return rateLimit({
    windowMs,
    max: maxAttempts,
    message: {
      status: 'error',
      message: 'Too many attempts. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED'
    },
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.originalUrl
      });
      
      res.status(429).json({
        status: 'error',
        message: 'Too many attempts. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED'
      });
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false // Disable the `X-RateLimit-*` headers
  });
};

// Create specific limiters for different auth endpoints
const authLimiters = {
  signup: createAuthLimiter(),
  login: createAuthLimiter(),
  refresh: createAuthLimiter(15 * 60 * 1000, 10) // Allow more refresh token attempts
};

module.exports = {
  authLimiters
}; 