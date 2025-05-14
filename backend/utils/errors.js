/**
 * @fileoverview Error handling utilities
 * Provides custom error classes and error formatting for API responses
 */

/**
 * Base API Error class
 * Extended by specific error types
 */
class ApiError extends Error {
  constructor(message, statusCode, details = null, isOperational = true) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational; // Flag to distinguish between operational vs programming errors
    
    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Standardized Error Codes for Agent Errors
 */
const ERROR_CODES = {
  VALIDATION_ERROR: 'AGENT_VALIDATION_ERROR',       // Input validation failed
  PROCESSING_ERROR: 'AGENT_PROCESSING_ERROR',     // General error during agent processing
  EXTERNAL_SERVICE_ERROR: 'AGENT_EXTERNAL_SERVICE_ERROR', // Error calling external API (OpenAI, Perplexity)
  RESOURCE_ERROR: 'AGENT_RESOURCE_ERROR',         // Missing dependency or resource (e.g., model not loaded)
  MEMORY_SYSTEM_ERROR: 'AGENT_MEMORY_SYSTEM_ERROR', // Error interacting with the memory system
  CONFIGURATION_ERROR: 'AGENT_CONFIGURATION_ERROR',   // Incorrect agent configuration
  CONCURRENCY_ERROR: 'AGENT_CONCURRENCY_ERROR'     // Concurrent modification conflicts
};

/**
 * Agent Error class
 * Used for agent-specific errors
 * Extends the standard Error class and adds support for categorization codes.
 */
class AgentError extends Error {
  /**
   * Create a new AgentError
   * @param {string} message - Error message
   * @param {string} code - Error code from ERROR_CODES
   * @param {object|null} details - Additional error details
   * @param {Error|null} originalError - Original error that caused this error
   * @param {boolean} isOperational - Whether this is an operational error
   */
  constructor(message, code = ERROR_CODES.PROCESSING_ERROR, details = null, originalError = null, isOperational = true) {
    super(message);
    this.name = 'AgentError';
    this.code = code;
    this.details = details;
    this.originalError = originalError;
    this.isOperational = isOperational;
    
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
    
    // Append original error stack if available
    if (originalError && originalError.stack) {
      this.stack = `${this.stack}\nCaused by: ${originalError.stack}`;
    }
  }
}

/**
 * 400 Bad Request - Invalid input data
 */
class ValidationError extends ApiError {
  constructor(message = 'Validation failed', details = null) {
    super(message, 400, details);
    
    // Add error code for agents to use
    this.code = 'VALIDATION_ERROR';
    
    // Ensure errors is properly formatted as an array of {field, message} objects
    if (details) {
      // If details is already an array, ensure each item has field and message
      if (Array.isArray(details)) {
        this.errors = details.map(item => {
          if (typeof item === 'object' && item !== null) {
            return {
              field: item.field || 'unknown',
              message: item.message || String(item)
            };
          } else {
            return { field: 'unknown', message: String(item) };
          }
        });
      } 
      // If details is a single object with field, create an array with it
      else if (typeof details === 'object' && details !== null && details.field) {
        this.errors = [{
          field: details.field, 
          message: details.message || message
        }];
      } 
      // For string or other primitive details, create a generic error
      else {
        this.errors = [{ field: 'unknown', message: String(details) }];
      }
    } else {
      // No details provided, create a generic error with the message
      this.errors = [{ field: 'unknown', message }];
    }
  }
}

/**
 * 400 Bad Request - General invalid request (can be used if ValidationError is too specific)
 */
class BadRequestError extends ApiError {
  constructor(message = 'Bad Request', details = null) {
    super(message, 400, details);
    this.code = 'BAD_REQUEST'; // Add a simple code
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
 * 409 Conflict - Specifically for concurrency conflicts
 * Used when a resource was modified by another process during an update operation
 */
class ConcurrencyConflictError extends ApiError {
  constructor(message = 'Resource was modified by another process', details = null) {
    super(message, 409, details, true);
    this.code = ERROR_CODES.CONCURRENCY_ERROR;
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
 * 500 Internal Server Error due to database issues
 */
class DatabaseError extends ApiError {
  constructor(message = 'Database operation failed', details = null) {
    super(message, 500, details);
    this.code = 'DATABASE_ERROR';
  }
}

/**
 * 500 Internal Server Error - Generic application error
 */
class ApplicationError extends ApiError {
  constructor(message = 'Application error', details = null) {
    super(message, 500, details);
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
  // Base response structure
  const response = {
    status: 'error',
    message: error.message
  };

  // Handle specific ApiError types first if they need custom formatting
  if (error instanceof ValidationError) {
    // Case 3: ValidationError with errors array
    return {
      status: 'error',
      message: error.message,
      errors: error.errors,
      errorCode: 'VALIDATION_ERROR'
    };
  }
  
  if (error instanceof ConcurrencyConflictError) {
    // Case 4 & 5: ConcurrencyConflictError with/without details
    const formatted = {
      status: 'error',
      message: error.message,
      errorCode: ERROR_CODES.CONCURRENCY_ERROR
    };
    if (error.details) {
      formatted.details = error.details;
    }
    return formatted;
  }

  // Handle generic errors (Non-ApiError)
  if (!(error instanceof ApiError)) {
    if (process.env.NODE_ENV === 'production') {
      // Case 6: Generic error in production
      if (error.isOperational) {
        // Operational errors show message
        return {
          status: 'error',
          message: error.message
        };
      } else {
        // Non-operational errors hide details
        return {
          status: 'error',
          message: 'Internal server error'
          // Intentionally omit error details in production for non-operational errors
        };
      }
    } else {
      // Case 7: Generic error in development - Use errorDetails and errorCode
      return {
        status: 'error',
        message: error.message,
        errorDetails: error.message, // Use errorDetails for generic errors in dev
        errorCode: error.code || 'INTERNAL_SERVER_ERROR' // Include errorCode
      };
    }
  }

  // Default case for other ApiError types
  if (error instanceof ApiError) {
      if (error.details) {
          response.details = error.details; // Use details for ApiError
      }
      // Optionally add errorCode if the specific ApiError subclass sets it
      if (error.code) {
          response.errorCode = error.code;
      }
  }

  return response;
};

module.exports = {
  ApiError,
  AgentError,
  ERROR_CODES, // Export the error codes
  BadRequestError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  ConcurrencyConflictError, // Export the new error class
  RateLimitError,
  DatabaseError,
  ApplicationError,
  InternalError,
  ServiceUnavailableError,
  formatErrorResponse
}; 