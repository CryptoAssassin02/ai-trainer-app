/**
 * @fileoverview Authentication Controller
 * Handles user authentication operations with Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const { logger } = require('../config');
const { createSupabaseClient } = require('../config/supabase');
const jwt = require('../utils/jwt');
const { ValidationError, AuthenticationError, ConflictError, InternalError } = require('../utils/errors');

// In-memory rate limiting for login attempts
const loginAttempts = {};

// Constants
const MAX_LOGIN_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Clear login attempts for an IP after the rate limit window expires
 * 
 * @param {string} ip - IP address to clear
 */
const clearLoginAttempts = (ip) => {
  setTimeout(() => {
    delete loginAttempts[ip];
  }, RATE_LIMIT_WINDOW_MS);
};

/**
 * Check if an IP is rate limited for login attempts
 * 
 * @param {string} ip - IP address to check
 * @throws {RateLimitError} If rate limit is exceeded
 */
const checkLoginRateLimit = (ip) => {
  if (!loginAttempts[ip]) {
    loginAttempts[ip] = {
      count: 0,
      firstAttempt: Date.now()
    };
  }

  const attempts = loginAttempts[ip];
  
  // Reset if outside window
  if (Date.now() - attempts.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    attempts.count = 0;
    attempts.firstAttempt = Date.now();
  }
  
  if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
    logger.warn(`Rate limit exceeded for login attempts from IP: ${ip}`);
    throw new Error('Too many login attempts. Please try again later.');
  }
};

/**
 * Increment login attempt count for an IP
 * 
 * @param {string} ip - IP address to increment
 */
const incrementLoginAttempts = (ip) => {
  if (loginAttempts[ip]) {
    loginAttempts[ip].count += 1;
    
    // Start cleanup timer if reached max attempts
    if (loginAttempts[ip].count === MAX_LOGIN_ATTEMPTS) {
      clearLoginAttempts(ip);
    }
  }
};

/**
 * Register a new user
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} JSON response with user ID
 * @throws {ValidationError} If required fields are missing
 * @throws {ConflictError} If email already exists
 * @throws {InternalError} If registration fails
 */
const signup = async (req, res, next) => {
  try {
    const { email, password, name } = req.body;
    
    // Validate required fields
    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    const supabase = createSupabaseClient();

    // Create user with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) {
      logger.error('User signup failed', { error: error.message });
      
      // Handle specific error cases
      if (error.message.includes('already registered')) {
        throw new ConflictError('Email already registered');
      }
      
      throw new InternalError('User registration failed');
    }

    const userId = data.user.id;

    // Create user profile if it doesn't exist
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email,
          name
        })
        .single();

      if (profileError && !profileError.message.includes('duplicate')) {
        logger.error('Failed to create user profile', { userId, error: profileError });
        // Continue execution - user was created but profile creation failed
      }
    } catch (profileError) {
      logger.error('Profile creation error', { error: profileError });
      // Continue execution - user was created even if profile creation failed
    }

    logger.info('User registered successfully', { userId });

    // Return success response
    return res.status(201).json({
      status: 'success',
      message: 'Account created',
      userId
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login a user with email and password
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} JSON response with tokens
 * @throws {ValidationError} If required fields are missing
 * @throws {AuthenticationError} If credentials are invalid
 * @throws {RateLimitError} If too many failed attempts
 */
const login = async (req, res, next) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    
    // Check rate limiting
    checkLoginRateLimit(ip);
    
    const { email, password, rememberMe } = req.body;
    
    // Validate required fields
    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }
    
    const supabase = createSupabaseClient();
    
    // Authenticate with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      // Increment failed attempts count
      incrementLoginAttempts(ip);
      logger.warn('Login failed', { email, error: error.message });
      throw new AuthenticationError('Invalid credentials');
    }
    
    const userId = data.user.id;
    
    // Generate tokens
    const accessToken = jwt.generateToken({ id: userId, email }, { subject: userId });
    const refreshToken = jwt.generateRefreshToken(userId);
    
    // Store refresh token if needed
    if (rememberMe) {
      try {
        // Store refresh token in database for persistence
        await supabase
          .from('refresh_tokens')
          .insert({
            user_id: userId,
            token: refreshToken,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
          });
      } catch (tokenError) {
        logger.error('Failed to store refresh token', { userId, error: tokenError });
        // Continue execution - token generation worked but storage failed
      }
    }
    
    logger.info('User logged in successfully', { userId });
    
    // Return success response with tokens
    return res.status(200).json({
      status: 'success',
      message: 'Login successful',
      userId,
      jwtToken: accessToken,
      refreshToken: rememberMe ? refreshToken : undefined
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh an access token using a refresh token
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} JSON response with new access token
 * @throws {ValidationError} If refresh token is missing
 * @throws {AuthenticationError} If refresh token is invalid
 */
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    
    if (!token) {
      throw new ValidationError('Refresh token is required');
    }
    
    // Verify the refresh token
    let userId;
    try {
      userId = jwt.verifyRefreshToken(token);
    } catch (error) {
      logger.warn('Invalid refresh token', { error: error.message });
      throw new AuthenticationError('Invalid or expired refresh token');
    }
    
    const supabase = createSupabaseClient();
    
    // Check if token exists in database (if we're storing them)
    try {
      const { data, error } = await supabase
        .from('refresh_tokens')
        .select('*')
        .eq('user_id', userId)
        .eq('token', token)
        .gt('expires_at', new Date().toISOString())
        .single();
      
      if (error || !data) {
        logger.warn('Refresh token not found or expired in database', { userId });
        // Throw the specific error to be caught below
        throw new AuthenticationError('Invalid or expired refresh token'); 
      }
    } catch (dbError) {
      // Catch ANY error from the DB check (including the thrown AuthError)
      // and pass it to the central error handler via next()
      // Log only if it wasn't the specific AuthError we threw.
      if (!(dbError instanceof AuthenticationError)) { 
         logger.warn('Error checking refresh token in database', { error: dbError.message });
      }
      // Pass the caught error (AuthError or other) to next()
      return next(dbError); 
    }
    
    // Generate a new access token
    const accessToken = jwt.generateToken({ id: userId }, { subject: userId });
    
    logger.info('Token refreshed successfully', { userId });
    
    // Return the new access token
    return res.status(200).json({
      status: 'success',
      message: 'Token refreshed successfully',
      jwtToken: accessToken
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Validate a user's session token
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} JSON response indicating token validity
 */
const validateSession = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'No token provided'
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token
    try {
      const decoded = jwt.verifyToken(token);
      logger.info('Session validated successfully', { userId: decoded.sub });
      
      return res.status(200).json({
        status: 'success',
        message: 'Token is valid'
      });
    } catch (error) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid or expired token'
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Logout a user and invalidate their refresh token
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} JSON response confirming logout
 */
const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.cookies;
    let userId = null;
    
    // If we have the user ID from authenticated routes
    if (req.user && req.user.id) {
      userId = req.user.id;
    } 
    // Otherwise try to extract it from the refresh token
    else if (refreshToken) {
      try {
        userId = jwt.verifyRefreshToken(refreshToken);
      } catch (error) {
        // If token is invalid, just continue with logout
        logger.info('Invalid refresh token during logout, continuing anyway');
      }
    }
    
    // If we have a user ID, try to remove tokens from database
    if (userId) {
      const supabase = createSupabaseClient();
      
      try {
        // Remove refresh token from database
        await supabase
          .from('refresh_tokens')
          .delete()
          .eq('user_id', userId);
        
        if (refreshToken) {
          await supabase
            .from('refresh_tokens')
            .delete()
            .eq('token', refreshToken);
        }
      } catch (dbError) {
        // If the table doesn't exist or there's another error, log and continue
        logger.warn('Error removing refresh tokens from database', { error: dbError.message });
      }
      
      logger.info('User logged out', { userId });
    }
    
    // Return success response
    return res.status(200).json({
      status: 'success',
      message: 'Logout successful'
    });
  } catch (error) {
    next(error);
  }
};

// Export functions for testing internal rate limit state
const __test__clearLoginAttempts = () => {
  for (const ip in loginAttempts) {
    delete loginAttempts[ip];
  }
};

const __test__getLoginAttempts = (ip) => {
  return loginAttempts[ip];
};

module.exports = {
  signup,
  login,
  refreshToken,
  validateSession,
  logout,
  // Export test helpers
  __test__clearLoginAttempts,
  __test__getLoginAttempts
}; 