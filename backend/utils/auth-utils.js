/**
 * @fileoverview Authentication utilities for JWT validation and token handling
 */

const jwt = require('jsonwebtoken');
const { env, logger } = require('../config');

/* Marked for removal - Phase 2 Auth Refactor
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'default-secret-for-tests');
  } catch (error) {
    logger.warn('JWT verification failed:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    }
    throw new Error('Invalid token');
  }
};
*/

/* Marked for removal - Phase 2 Auth Refactor - Duplicate
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Invalid Authorization header');
  }
  const token = authHeader.split(' ')[1];
  if (!token) {
    throw new Error('Invalid Authorization header');
  }
  return token;
};
*/

module.exports = {
  // verifyToken, // Commented out
  // extractTokenFromHeader // Commented out
}; 