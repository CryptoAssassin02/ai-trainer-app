/**
 * @fileoverview JWT utility functions for token generation and verification
 */

const jwt = require('jsonwebtoken');
const { env, logger } = require('../config');
const { createSupabaseClient } = require('./supabase');

/**
 * Generate a JWT token
 * 
 * @param {string} userId - User ID to encode in the token
 * @param {string} role - User role for authorization
 * @param {Object} options - Additional JWT options
 * @returns {string} JWT token
 */
const generateToken = (userId, role, options = {}) => {
  try {
    const payload = {
      sub: userId,
      role
    };

    const tokenOptions = {
      expiresIn: env.auth.jwtExpiresIn,
      ...options
    };

    return jwt.sign(payload, env.auth.jwtSecret, tokenOptions);
  } catch (error) {
    logger.error('Error generating JWT token:', error);
    throw new Error('Failed to generate authentication token');
  }
};

/**
 * Store a refresh token in the database
 * 
 * @param {string} userId - User ID associated with the token
 * @param {string} token - Refresh token to store
 * @param {Date} expiresAt - Token expiration date
 * @returns {Promise<Object>} Stored token record
 */
const storeRefreshToken = async (userId, token, expiresAt) => {
  try {
    const supabase = createSupabaseClient();
    
    const { data, error } = await supabase
      .from('refresh_tokens')
      .insert({
        user_id: userId,
        token,
        expires_at: expiresAt,
        status: 'active'
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    logger.error('Error storing refresh token:', error);
    throw new Error('Failed to store refresh token');
  }
};

/**
 * Revoke a refresh token
 * 
 * @param {string} token - Token to revoke
 * @returns {Promise<void>}
 */
const revokeRefreshToken = async (token) => {
  try {
    const supabase = createSupabaseClient();
    
    // Check if token exists
    const { data: existingToken } = await supabase
      .from('refresh_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (!existingToken) {
      throw new Error('Token not found');
    }
    
    const { error } = await supabase
      .from('refresh_tokens')
      .update({
        status: 'revoked',
        revoked_at: new Date().toISOString()
      })
      .eq('token', token);
    
    if (error) throw error;
  } catch (error) {
    logger.error('Error revoking refresh token:', error);
    if (error.message === 'Token not found') {
      throw error;
    }
    throw new Error('Failed to revoke refresh token');
  }
};

/**
 * Check if a refresh token is valid
 * 
 * @param {string} token - Token to validate
 * @returns {Promise<boolean>} Whether the token is valid
 */
const isRefreshTokenValid = async (token) => {
  try {
    const supabase = createSupabaseClient();
    
    const { data, error } = await supabase
      .from('refresh_tokens')
      .select('*')
      .eq('token', token)
      .single();
    
    if (error || !data) return false;
    
    // Check token status and expiration
    if (data.status !== 'active') return false;
    if (new Date(data.expires_at) <= new Date()) return false;
    
    // Update last used timestamp
    await supabase
      .from('refresh_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('token', token);
    
    return true;
  } catch (error) {
    logger.error('Error validating refresh token:', error);
    return false;
  }
};

/**
 * Generate a refresh token with longer expiration
 * 
 * @param {string} userId - User ID to encode in the token
 * @returns {Promise<string>} Refresh token
 */
const generateRefreshToken = async (userId) => {
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration
    
    const token = jwt.sign(
      { 
        sub: userId,
        type: 'refresh'
      },
      env.auth.jwtSecret,
      {
        expiresIn: env.auth.refreshTokenExpiresIn
      }
    );
    
    // Store the token in the database
    await storeRefreshToken(userId, token, expiresAt);
    
    return token;
  } catch (error) {
    logger.error('Error generating refresh token:', error);
    if (error.message === 'Failed to store refresh token') {
      throw error;
    }
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
    
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    }
    throw new Error('Invalid token');
  }
};

/**
 * Verify a refresh token
 * 
 * @param {string} token - Refresh token to verify
 * @returns {Promise<string>} User ID from the token subject
 */
const verifyRefreshToken = async (token) => {
  try {
    const decoded = jwt.verify(token, env.auth.jwtSecret);
    
    // Ensure it's a refresh token
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid refresh token');
    }
    
    // Check if token is valid in the database
    const supabase = createSupabaseClient();
    const { data } = await supabase
      .from('refresh_tokens')
      .select('status')
      .eq('token', token)
      .single();
    
    if (!data) {
      throw new Error('Token not found');
    }
    
    if (data.status === 'revoked') {
      throw new Error('Token has been revoked');
    }
    
    if (data.status === 'expired') {
      throw new Error('Token has expired');
    }
    
    return decoded.sub; // User ID from subject
  } catch (error) {
    logger.warn('Refresh token verification failed:', error.message);
    throw error;
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
  return authHeader.split(' ')[1];
};

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken,
  revokeRefreshToken,
  isRefreshTokenValid,
  extractTokenFromHeader
}; 