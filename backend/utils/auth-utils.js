/**
 * @fileoverview Authentication utilities for JWT validation and token handling
 */

const jwt = require('jsonwebtoken');
const { env, logger } = require('../config');

/**
 * Verify a JWT token
 * 
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
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

/**
 * Extract JWT token from Authorization header
 * 
 * @param {string} authHeader - Authorization header value
 * @returns {string} Extracted token
 */
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

module.exports = {
  verifyToken,
  extractTokenFromHeader
}; 