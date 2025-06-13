/**
 * @fileoverview Authentication Middleware
 * Provides middleware functions for JWT authentication and ownership-based authorization
 */

const { env, logger } = require('../config');
const jwtUtils = require('../utils/jwt');
const supabaseService = require('../services/supabase');
const { NotFoundError, AuthenticationError } = require('../utils/errors');

/**
 * Middleware to verify JWT token from Authorization header
 * Attaches the user data to the request object if token is valid
 */
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  // Check if authorization header exists
  if (!authHeader) {
    logger.warn('Authentication failed: No authorization header', { url: req.originalUrl });
    return res.status(401).json({
      status: 'error',
      message: 'Authentication required',
      error: 'No authorization token provided'
    });
  }
  
  // Check if authorization header has correct format
  if (!authHeader.startsWith('Bearer ')) {
    logger.warn('Authentication failed: Invalid authorization format', { url: req.originalUrl });
    return res.status(401).json({
      status: 'error',
      message: 'Authentication failed',
      error: 'Invalid authorization format. Use "Bearer [token]"'
    });
  }
  
  // Extract token from header
  const token = authHeader.split(' ')[1];
  
  try {
    const supabase = supabaseService.getSupabaseClient(); // Get Supabase client instance
    
    // Verify the token and fetch user data using Supabase
    const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !supabaseUser) {
      logger.warn('Supabase authentication failed or user not found', { 
        error: authError ? authError.message : 'No user returned', 
        status: authError ? authError.status : null,
        url: req.originalUrl 
      });
      // Provide a more specific error message if token is expired
      if (authError && (authError.message.includes('token is expired') || authError.message.includes('JWT expired'))) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication failed: Token has expired',
          error: 'Token has expired',
          code: 'TOKEN_EXPIRED'
        });
      }
      return res.status(401).json({
        status: 'error',
        message: 'Authentication failed: Invalid or expired token',
        error: authError ? authError.message : 'Invalid token or user not found'
      });
    }
    
    // Attach user data to request
    // Populate req.user with essential, non-sensitive user details from supabaseUser
    req.user = { 
      id: supabaseUser.id, 
      email: supabaseUser.email, 
      role: supabaseUser.role || 'authenticated', // Default to 'authenticated' for logged-in users
      ...supabaseUser.app_metadata, // Include app_metadata which might contain roles, etc.
      ...supabaseUser.user_metadata // Include user_metadata which contains name, etc.
    };
    req.tokenString = token; // Attach the validated token string to the request object
    
    logger.debug('Authentication successful via Supabase', { 
      userId: supabaseUser.id,
      url: req.originalUrl
    });
    
    next();
  } catch (error) {
    // This catch block might be redundant if supabase.auth.getUser handles all its errors gracefully
    // and returns them in authError. However, keeping it for unexpected issues.
    logger.error('Unexpected error during Supabase authentication', { 
      error: error.message,
      url: req.originalUrl
    });
    
    return res.status(500).json({ // Changed to 500 as this implies an unexpected server error
      status: 'error',
      message: 'Authentication failed due to an unexpected server error',
      error: error.message
    });
  }
};

/**
 * Middleware factory to check if user owns the resource
 * 
 * @param {Function} getResourceOwnerId - Async function that extracts resource owner ID from request
 * @returns {Function} Express middleware
 */
const requireOwnership = (getResourceOwnerId) => {
  return async (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required',
          error: 'User not authenticated'
        });
      }
      
      const userId = req.user.id;
      
      // Get the resource owner ID
      const resourceOwnerId = await getResourceOwnerId(req);
      
      // Check if user is the owner
      if (userId === resourceOwnerId) {
        return next();
      }
      
      // Log ownership verification failure
      logger.warn('Authorization failed: User does not own resource', {
        userId,
        resourceOwnerId,
        url: req.originalUrl
      });
      
      return res.status(403).json({
        status: 'error',
        message: 'Authorization failed',
        error: 'Resource access denied'
      });
    } catch (error) {
      logger.error('Error in ownership verification', {
        error: error.message,
        url: req.originalUrl
      });
      
      return res.status(500).json({
        status: 'error',
        message: 'Server error',
        error: 'Failed to verify resource ownership'
      });
    }
  };
};

/**
 * Optional authentication middleware
 * Verifies token if present but allows request to proceed even without a token
 * Attaches user data to request if token is valid, otherwise sets req.user to null
 */
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  // Default to null user
  req.user = null;
  
  // If no auth header, or not Bearer type, continue without attempting authentication
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  
  // Extract token from header
  const token = authHeader.split(' ')[1];
  
  try {
    const supabase = supabaseService.getSupabaseClient(); // Get Supabase client instance
    
    // Attempt to verify the token and fetch user data using Supabase
    const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !supabaseUser) {
      // Log the reason for failure but proceed with req.user = null
      logger.debug('Optional authentication: Supabase token verification failed or user not found', { 
        error: authError ? authError.message : 'No user returned', 
        status: authError ? authError.status : null,
        url: req.originalUrl 
      });
      return next(); // Proceed with req.user = null
    }
    
    // Attach user data to request if token is valid
    req.user = { 
      id: supabaseUser.id, 
      email: supabaseUser.email, 
      role: supabaseUser.role || 'authenticated', // Default to 'authenticated' for logged-in users
      ...supabaseUser.app_metadata, // Include app_metadata
      ...supabaseUser.user_metadata // Include user_metadata
    };
    req.tokenString = token; // Attach the validated token string to the request object for optionalAuth as well
    
    logger.debug('Optional authentication successful via Supabase', { 
      userId: supabaseUser.id,
      url: req.originalUrl
    });

  } catch (error) {
    // Catch any unexpected errors during the process
    logger.debug('Optional authentication: Unexpected error during Supabase token verification', { 
      error: error.message,
      url: req.originalUrl
    });
    // req.user remains null, proceed
  }
  
  next();
};

// Add authenticate.optional as an alias to optionalAuth for backward compatibility
authenticate.optional = optionalAuth;

module.exports = {
  authenticate,
  requireOwnership,
  optionalAuth,
}; 