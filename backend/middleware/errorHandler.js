/**
 * @fileoverview Global Error Handler Middleware
 * Provides standardized error handling for the application
 */

const { logger } = require('../config');
const { ApiError, formatErrorResponse } = require('../utils/errors');

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
 * Global error handler middleware
 * Catches all errors and formats them into standardized API responses
 */
const errorHandler = (err, req, res, next) => {
  // Set default status code and log level
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
 * Convert Supabase errors to ApiError format
 */
const supabaseErrorHandler = (err) => {
  // Default error to be returned if no specific match
  let apiError = new ApiError('Database operation failed', 500, err.message);
  
  // Handle different Supabase error types
  if (err.code === 'PGRST301') {
    // Resource not found
    apiError = new ApiError('Resource not found', 404, err.message);
  } else if (err.code === 'PGRST204') {
    // No content - not actually an error but sometimes needs handling
    return null;
  } else if (err.code === '23505') {
    // Unique violation
    apiError = new ApiError('Resource already exists', 409, err.message);
  } else if (err.code === '23503') {
    // Foreign key violation
    apiError = new ApiError('Related resource not found', 400, err.message);
  } else if (err.code === '23502') {
    // Not null violation
    apiError = new ApiError('Missing required field', 400, err.message);
  } else if (err.code === '23514') {
    // Check violation
    apiError = new ApiError('Validation constraint failed', 400, err.message);
  } else if (err.code === '42601') {
    // Syntax error
    apiError = new ApiError('Invalid query syntax', 500, err.message);
  } else if (err.code === '42501') {
    // Insufficient privilege
    apiError = new ApiError('Insufficient database permissions', 403, err.message);
  }
  
  return apiError;
};

module.exports = {
  notFoundHandler,
  errorHandler,
  supabaseErrorHandler
}; 