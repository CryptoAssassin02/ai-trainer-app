/**
 * @fileoverview Authentication Middleware
 * Provides middleware functions for JWT authentication and role-based authorization
 */

const { env, logger } = require('../config');
const jwtUtils = require('../utils/jwt');

/**
 * Middleware to verify JWT token from Authorization header
 * Attaches the user data to the request object if token is valid
 */
const authenticate = (req, res, next) => {
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
    // Verify token and attach user data to request
    const decoded = jwtUtils.verifyToken(token);
    req.user = decoded;
    logger.debug('Authentication successful', { 
      userId: decoded.id || decoded.sub,
      url: req.originalUrl
    });
    
    next();
  } catch (error) {
    logger.error('Authentication failed: Invalid token', { 
      error: error.message,
      url: req.originalUrl
    });
    
    return res.status(401).json({
      status: 'error',
      message: 'Authentication failed',
      error: error.message
    });
  }
};

/**
 * Middleware factory to check if user has required role(s)
 * 
 * @param {string|string[]} roles - Required role(s) for access
 * @returns {Function} Express middleware
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required',
        error: 'User not authenticated'
      });
    }
    
    // Convert single role to array for consistent processing
    const requiredRoles = Array.isArray(roles) ? roles : [roles];
    const userRole = req.user.role;
    
    // Check if user has any of the required roles
    if (requiredRoles.includes(userRole)) {
      return next();
    }
    
    // Log access denial
    logger.warn('Authorization failed: Insufficient permissions', {
      userId: req.user.id || req.user.sub,
      userRole,
      requiredRoles,
      url: req.originalUrl
    });
    
    return res.status(403).json({
      status: 'error',
      message: 'Authorization failed',
      error: 'Insufficient permissions'
    });
  };
};

/**
 * Middleware to check if user is an admin
 * Shorthand for requireRole('admin')
 */
const requireAdmin = (req, res, next) => {
  // Check if user is authenticated
  if (!req.user) {
    return res.status(401).json({
      status: 'error',
      message: 'Authentication required',
      error: 'User not authenticated'
    });
  }
  
  // Check if user is an admin
  if (req.user.role === 'admin') {
    return next();
  }
  
  // Log access denial
  logger.warn('Authorization failed: Admin access required', {
    userId: req.user.id || req.user.sub,
    userRole: req.user.role,
    url: req.originalUrl
  });
  
  return res.status(403).json({
    status: 'error',
    message: 'Authorization failed',
    error: 'Admin access required'
  });
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
      
      const userId = req.user.id || req.user.sub;
      
      // Admins can bypass ownership check if configured
      if (req.user.role === 'admin' && env.auth.adminBypassOwnership) {
        logger.debug('Admin bypass for ownership check', { userId, url: req.originalUrl });
        return next();
      }
      
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
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  // Default to null user
  req.user = null;
  
  // If no auth header, continue without authentication
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  
  // Extract token from header
  const token = authHeader.split(' ')[1];
  
  try {
    // Verify token and attach user data to request
    const decoded = jwtUtils.verifyToken(token);
    req.user = decoded;
    logger.debug('Optional authentication successful', { 
      userId: decoded.id || decoded.sub,
      url: req.originalUrl
    });
  } catch (error) {
    // Log but continue with null user
    logger.debug('Optional authentication failed', { 
      error: error.message,
      url: req.originalUrl
    });
  }
  
  next();
};

module.exports = {
  authenticate,
  requireRole,
  requireAdmin,
  requireOwnership,
  optionalAuth
}; 