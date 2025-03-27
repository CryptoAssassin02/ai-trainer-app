/**
 * @fileoverview JWT utility functions for token generation and verification
 */

const jwt = require('jsonwebtoken');
const { env, logger } = require('../config');

/**
 * Generate a JWT token
 * 
 * @param {Object} payload - Data to encode in the token
 * @param {Object} options - JWT options
 * @param {string} options.expiresIn - Token expiration time (default: from config)
 * @param {string} options.subject - Token subject (typically user ID)
 * @returns {string} JWT token
 */
const generateToken = (payload, options = {}) => {
  try {
    const tokenOptions = {
      expiresIn: options.expiresIn || env.auth.jwtExpiresIn,
      ...(options.subject && { subject: options.subject }),
    };

    return jwt.sign(payload, env.auth.jwtSecret, tokenOptions);
  } catch (error) {
    logger.error('Error generating JWT token:', error);
    throw new Error('Failed to generate authentication token');
  }
};

/**
 * Generate a refresh token with longer expiration
 * 
 * @param {string} userId - User ID to encode in the token
 * @returns {string} Refresh token
 */
const generateRefreshToken = (userId) => {
  try {
    return jwt.sign(
      { type: 'refresh' },
      env.auth.jwtSecret,
      {
        expiresIn: env.auth.refreshTokenExpiresIn,
        subject: userId.toString()
      }
    );
  } catch (error) {
    logger.error('Error generating refresh token:', error);
    throw new Error('Failed to generate refresh token');
  }
};

/**
 * Verify a JWT token
 * 
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, env.auth.jwtSecret);
  } catch (error) {
    logger.warn('JWT verification failed:', error.message);
    
    // Provide more specific error messages
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    
    throw error;
  }
};

/**
 * Verify a refresh token
 * 
 * @param {string} token - Refresh token to verify
 * @returns {string} User ID from the token subject
 * @throws {Error} If token is invalid, expired, or not a refresh token
 */
const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, env.auth.jwtSecret);
    
    // Ensure it's a refresh token
    if (decoded.type !== 'refresh') {
      throw new Error('Not a refresh token');
    }
    
    return decoded.sub; // User ID from subject
  } catch (error) {
    logger.warn('Refresh token verification failed:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      throw new Error('Refresh token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid refresh token');
    }
    
    throw error;
  }
};

/**
 * Extract token from authorization header
 * 
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} Extracted token or null if format is invalid
 */
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.split(' ')[1];
};

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken,
  extractTokenFromHeader
}; 