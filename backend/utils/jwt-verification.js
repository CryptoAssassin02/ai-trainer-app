/**
 * @fileoverview JWT verification utilities that delegate to the jwt module
 * This module provides a simplified interface for JWT verification with 
 * consistent error handling.
 */

const jwt = require('./jwt');
const { AuthenticationError, ApplicationError } = require('./errors');
const logger = require('../config/logger');

/* Marked for removal - Phase 2 Auth Refactor
function verifyToken(token) {
  try {
    return jwt.verifyToken(token);
  } catch (error) {
    // Pass through all AuthenticationErrors (like expired tokens, invalid signatures, etc.)
    if (error instanceof AuthenticationError) {
      throw error;
    }

    // Log and wrap any other unexpected errors
    logger.error('Unexpected error during token verification', { 
      error: error.message,
      stack: error.stack
    });
    throw new ApplicationError('An unexpected error occurred during token verification');
  }
}
*/

module.exports = {
  // verifyToken // Commented out
}; 