/**
 * @fileoverview Error handling utilities
 * Provides custom error classes and error formatting for API responses
 */

/**
 * Base API Error class
 * Extended by specific error types
 */
class ApiError extends Error {
  constructor(message, statusCode, details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.details = details;
    
    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 400 Bad Request - Invalid input data
 */
class ValidationError extends ApiError {
  constructor(message = 'Validation failed', details = null) {
    super(message, 400, details);
  }
}

/**
 * 401 Unauthorized - Authentication required or failed
 */
class AuthenticationError extends ApiError {
  constructor(message = 'Authentication required', details = null) {
    super(message, 401, details);
  }
}

/**
 * 403 Forbidden - Insufficient permissions
 */
class AuthorizationError extends ApiError {
  constructor(message = 'Insufficient permissions', details = null) {
    super(message, 403, details);
  }
}

/**
 * 404 Not Found - Resource not found
 */
class NotFoundError extends ApiError {
  constructor(message = 'Resource not found', details = null) {
    super(message, 404, details);
  }
}

/**
 * 409 Conflict - Resource conflict (e.g., duplicate entry)
 */
class ConflictError extends ApiError {
  constructor(message = 'Resource conflict', details = null) {
    super(message, 409, details);
  }
}

/**
 * 429 Too Many Requests - Rate limit exceeded
 */
class RateLimitError extends ApiError {
  constructor(message = 'Rate limit exceeded', details = null) {
    super(message, 429, details);
  }
}

/**
 * 500 Internal Server Error - Unexpected server error
 */
class InternalError extends ApiError {
  constructor(message = 'Internal server error', details = null) {
    super(message, 500, details);
  }
}

/**
 * 503 Service Unavailable - External service unavailable
 */
class ServiceUnavailableError extends ApiError {
  constructor(message = 'Service unavailable', details = null) {
    super(message, 503, details);
  }
}

/**
 * Format error response for API
 * 
 * @param {Error} error - Error object
 * @returns {Object} Formatted error response
 */
const formatErrorResponse = (error) => {
  // Default to 500 internal server error for unknown errors
  if (!(error instanceof ApiError)) {
    return {
      status: 'error',
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    };
  }
  
  // Format API error response
  const response = {
    status: 'error',
    message: error.message
  };
  
  // Add error details if available
  if (error.details) {
    if (Array.isArray(error.details)) {
      response.errors = error.details;
    } else {
      response.error = error.details;
    }
  }
  
  return response;
};

module.exports = {
  ApiError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  InternalError,
  ServiceUnavailableError,
  formatErrorResponse
}; 