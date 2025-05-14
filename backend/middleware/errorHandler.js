/**
 * @fileoverview Global Error Handler Middleware
 * Provides standardized error handling for the application
 */

const { logger } = require('../config');
const { ApiError, AgentError, ERROR_CODES, formatErrorResponse } = require('../utils/errors');

/**
 * Not Found handler for undefined routes
 */
const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: 'Resource not found',
    error: `Route not found: ${req.method} ${req.originalUrl}`
  });
};

/**
 * Maps agent error codes to appropriate HTTP status codes
 * @param {string} errorCode - The agent error code
 * @returns {number} HTTP status code
 */
const mapAgentErrorToStatusCode = (errorCode) => {
  const codeMapping = {
    [ERROR_CODES.VALIDATION_ERROR]: 400, // Bad Request
    [ERROR_CODES.PROCESSING_ERROR]: 500, // Internal Server Error
    [ERROR_CODES.EXTERNAL_SERVICE_ERROR]: 502, // Bad Gateway
    [ERROR_CODES.RESOURCE_ERROR]: 404, // Not Found
    [ERROR_CODES.MEMORY_SYSTEM_ERROR]: 500, // Internal Server Error
    [ERROR_CODES.CONFIGURATION_ERROR]: 500, // Internal Server Error
  };
  
  return codeMapping[errorCode] || 500; // Default to 500 if no mapping found
};

/**
 * Global error handler middleware
 * Catches all errors and formats them into standardized API responses
 */
const errorHandler = (err, req, res, next) => {
  // Handle AgentError specifically
  if (err instanceof AgentError) {
    // Map agent error code to HTTP status code
    const statusCode = mapAgentErrorToStatusCode(err.code);
    
    // Adjust logging based on status code
    let logLevel = statusCode >= 500 ? 'error' : 'warn';
    
    // Log the error with appropriate detail
    logger[logLevel](`${req.method} ${req.originalUrl} [AgentError]`, {
      statusCode,
      errorCode: err.code, 
      message: err.message,
      details: err.details,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      originalError: process.env.NODE_ENV === 'development' && err.originalError ? {
        message: err.originalError.message,
        name: err.originalError.name
      } : undefined
    });
    
    // Format response for AgentError
    const response = {
      status: 'error',
      message: err.message,
      errorCode: err.code,
      details: err.details
    };
    
    // Send error response
    return res.status(statusCode).json(response);
  }
  
  // Handle other errors as before
  let statusCode = err.statusCode || 500;
  let logLevel = 'error';
  
  // Adjust logging based on error type
  if (statusCode >= 500) {
    logLevel = 'error';
  } else if (statusCode >= 400) {
    logLevel = 'warn';
  }
  
  // Log the error with appropriate detail
  logger[logLevel](`${req.method} ${req.originalUrl}`, {
    statusCode,
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    ...(err.details && { details: err.details })
  });
  
  // Format error response
  const errorResponse = formatErrorResponse(err);
  
  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * Supabase error handler
 * Convert Supabase errors to ApiError format or AgentError when appropriate
 */
const supabaseErrorHandler = (err) => {
  // Default error to be returned if no specific match
  let apiError = new ApiError('Database operation failed', 500, err.message);
  
  // Handle different Supabase error types and map to appropriate error type
  if (err.code === 'PGRST301') {
    // Resource not found
    apiError = new AgentError('Resource not found', ERROR_CODES.RESOURCE_ERROR, { code: err.code }, err);
  } else if (err.code === 'PGRST204') {
    // No content - not actually an error but sometimes needs handling
    return null;
  } else if (err.code === '23505') {
    // Unique violation
    apiError = new ApiError('Resource already exists', 409, err.message);
  } else if (err.code === '23503') {
    // Foreign key violation
    apiError = new AgentError('Related resource not found', ERROR_CODES.VALIDATION_ERROR, { code: err.code }, err);
  } else if (err.code === '23502') {
    // Not null violation
    apiError = new AgentError('Missing required field', ERROR_CODES.VALIDATION_ERROR, { code: err.code }, err);
  } else if (err.code === '23514') {
    // Check violation
    apiError = new AgentError('Validation constraint failed', ERROR_CODES.VALIDATION_ERROR, { code: err.code }, err);
  } else if (err.code === '42601') {
    // Syntax error
    apiError = new AgentError('Invalid query syntax', ERROR_CODES.EXTERNAL_SERVICE_ERROR, { code: err.code }, err);
  } else if (err.code === '42501') {
    // Insufficient privilege
    apiError = new ApiError('Insufficient database permissions', 403, err.message);
  } else {
    // For other database errors, use EXTERNAL_SERVICE_ERROR
    apiError = new AgentError('Database operation failed', ERROR_CODES.EXTERNAL_SERVICE_ERROR, { code: err.code }, err);
  }
  
  return apiError;
};

module.exports = {
  notFoundHandler,
  errorHandler,
  supabaseErrorHandler
}; 