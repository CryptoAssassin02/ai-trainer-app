/**
 * @fileoverview Enhanced Error Middleware
 * Provides standardized error handling middleware for Express applications
 */

const { logger } = require('../config');
const { 
  ApiError, 
  AgentError, 
  NotFoundError, 
  ERROR_CODES, 
  formatErrorResponse 
} = require('../utils/errors');

/**
 * 404 handler for undefined routes
 * Must be placed after all routes are defined
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`Resource not found: ${req.originalUrl}`);
  next(error);
};

/**
 * Maps agent error codes to appropriate HTTP status codes
 * 
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
    [ERROR_CODES.CONCURRENCY_ERROR]: 409, // Conflict
  };
  
  return codeMapping[errorCode] || 500; // Default to 500 if no mapping found
};

/**
 * Global error handler middleware
 * Catches all errors and formats them into standardized API responses
 * 
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const globalErrorHandler = (err, req, res, next) => {
  // Already handled responses should just pass through
  if (res.headersSent) {
    return next(err);
  }

  // Handle AgentError specifically
  if (err instanceof AgentError) {
    // Map agent error code to HTTP status code
    const statusCode = mapAgentErrorToStatusCode(err.code);
    
    // Log with appropriate level based on operational status and severity
    const logLevel = !err.isOperational || statusCode >= 500 ? 'error' : 'warn';
    
    // Log the error with appropriate detail
    logger[logLevel](`${req.method} ${req.originalUrl} [AgentError]`, {
      statusCode,
      errorCode: err.code, 
      message: err.message,
      details: err.details,
      isOperational: err.isOperational,
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
  
  // Handle API errors
  let statusCode = err.statusCode || 500;
  
  // Determine logging level based on operational status and severity
  let logLevel = 'error';
  
  if (err.isOperational) {
    if (statusCode < 500) {
      logLevel = 'warn';
    }
  } else {
    // Non-operational errors are always logged as errors
    logLevel = 'error';
  }
  
  // Log the error with appropriate detail
  logger[logLevel](`${req.method} ${req.originalUrl}`, {
    statusCode,
    error: err.message,
    isOperational: err.isOperational,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    ...(err.details && { details: err.details })
  });
  
  // Format error response
  const errorResponse = formatErrorResponse(err);
  
  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * Specialized handler for uncaught exceptions and unhandled rejections
 * Logs the error and gracefully terminates the process
 * 
 * @param {Error} error - The uncaught error
 * @param {string} source - Source of the error ('uncaughtException' or 'unhandledRejection')
 */
const handleFatalError = (error, source) => {
  logger.fatal(`UNHANDLED ERROR (${source}): ${error.message}`, {
    error: error.message,
    stack: error.stack,
    source
  });
  
  // Allow existing requests to finish (within a timeout) then exit
  const server = global.server; // Assumes Express server is stored in global.server
  if (server) {
    server.close(() => {
      logger.fatal('Server closed due to unhandled error. Exiting process.');
      // Exit with error code
      process.exit(1);
    });
    
    // Force exit if graceful shutdown takes too long
    setTimeout(() => {
      logger.fatal('Graceful shutdown timed out. Forcing exit.');
      process.exit(1);
    }, 5000);
  } else {
    // No server reference, exit immediately
    logger.fatal('Exiting process due to unhandled error.');
    process.exit(1);
  }
};

module.exports = {
  notFoundHandler,
  globalErrorHandler,
  handleFatalError
}; 