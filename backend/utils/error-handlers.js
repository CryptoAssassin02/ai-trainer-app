/**
 * @fileoverview Error handler utilities
 * Provides functions for handling errors in Express routes and middleware
 */

const { logger } = require('../config');
const { ApiError, formatErrorResponse } = require('./errors');

/**
 * Async handler wrapper for Express route handlers
 * Catches errors in async route handlers and forwards to Express error middleware
 * 
 * @param {Function} fn - Async route handler function
 * @returns {Function} Wrapped route handler that catches and forwards errors
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Formats and sends an error response
 * Utility for manually handling errors in route handlers
 * 
 * @param {Object} res - Express response object
 * @param {Error} error - Error to format and send
 */
const errorResponse = (res, error) => {
  // Get status code (default to 500)
  const statusCode = error.statusCode || 500;

  // Format and log the error
  const formattedError = formatErrorResponse(error);
  const logLevel = statusCode >= 500 ? 'error' : 'warn';
  
  logger[logLevel](`API Error Response [${statusCode}]`, {
    error: error.message,
    ...(error.details && { details: error.details }),
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });

  // Send the response
  res.status(statusCode).json(formattedError);
};

/**
 * Success response formatter
 * Utility for formatting successful API responses
 * 
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code (default 200)
 */
const successResponse = (res, data, message = 'Success', statusCode = 200) => {
  const response = {
    status: 'success',
    message
  };

  // Add data if provided and not null
  if (data !== undefined && data !== null) {
    response.data = data;
  }

  res.status(statusCode).json(response);
};

module.exports = {
  asyncHandler,
  errorResponse,
  successResponse
}; 