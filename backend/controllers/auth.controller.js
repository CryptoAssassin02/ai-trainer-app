/**
 * @fileoverview Authentication Controller
 * Handles user authentication operations
 */

const { logger } = require('../config');
const supabaseService = require('../services/supabase');
const jwtUtils = require('../utils/jwt');
const { AuthenticationError, ValidationError, NotFoundError } = require('../utils/errors');

/**
 * Register a new user
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const register = async (req, res, next) => {
  try {
    const { email, password, name } = req.body;
    
    // Create user with Supabase Auth
    const { data: authData, error: authError } = await supabaseService.auth.signUp({
      email,
      password
    });
    
    if (authError) {
      logger.error('User registration failed', { error: authError.message });
      
      // Handle specific error cases
      if (authError.message.includes('already registered')) {
        throw new ValidationError('Email already registered', { field: 'email' });
      }
      
      throw new Error(authError.message);
    }
    
    // Get the new user's ID
    const userId = authData.user.id;
    
    // Create user profile in 'profiles' table
    const { error: profileError } = await supabaseService.client
      .from('profiles')
      .insert({
        id: userId,
        email,
        name,
        created_at: new Date().toISOString()
      });
    
    if (profileError) {
      logger.error('Failed to create user profile', { userId, error: profileError.message });
      throw new Error('User registration failed');
    }
    
    // Generate tokens for the user
    const accessToken = jwtUtils.generateToken({
      id: userId,
      email,
      role: 'user'
    });
    
    const refreshToken = jwtUtils.generateRefreshToken(userId);
    
    logger.info('User registered successfully', { userId });
    
    // Send success response with tokens
    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: {
        user: {
          id: userId,
          email,
          name
        },
        tokens: {
          accessToken,
          refreshToken
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    // Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabaseService.auth.signInWithPassword({
      email,
      password
    });
    
    if (authError) {
      logger.warn('Login failed', { email, error: authError.message });
      throw new AuthenticationError('Invalid email or password');
    }
    
    // Get user profile from DB
    const { data: profileData, error: profileError } = await supabaseService.client
      .from('profiles')
      .select('id, name, email, role')
      .eq('id', authData.user.id)
      .single();
    
    if (profileError || !profileData) {
      logger.error('Failed to fetch user profile', { userId: authData.user.id });
      throw new NotFoundError('User profile not found');
    }
    
    // Generate tokens for the user
    const accessToken = jwtUtils.generateToken({
      id: profileData.id,
      email: profileData.email,
      role: profileData.role || 'user'
    });
    
    const refreshToken = jwtUtils.generateRefreshToken(profileData.id);
    
    logger.info('User logged in successfully', { userId: profileData.id });
    
    // Send success response with tokens
    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: {
          id: profileData.id,
          email: profileData.email,
          name: profileData.name,
          role: profileData.role || 'user'
        },
        tokens: {
          accessToken,
          refreshToken
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user (revoke refresh token)
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const logout = async (req, res, next) => {
  try {
    // In a production implementation, you would also invalidate
    // the refresh token in a token blacklist or database
    
    logger.info('User logged out', { userId: req.user.id });
    
    res.status(200).json({
      status: 'success',
      message: 'Logout successful'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh access token using refresh token
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      throw new ValidationError('Refresh token is required');
    }
    
    // Verify the refresh token
    const userId = jwtUtils.verifyRefreshToken(refreshToken);
    
    // Get user profile from DB
    const { data: profileData, error: profileError } = await supabaseService.client
      .from('profiles')
      .select('id, email, role')
      .eq('id', userId)
      .single();
    
    if (profileError || !profileData) {
      logger.error('Failed to fetch user profile for token refresh', { userId });
      throw new NotFoundError('User not found');
    }
    
    // Generate new access token
    const accessToken = jwtUtils.generateToken({
      id: profileData.id,
      email: profileData.email,
      role: profileData.role || 'user'
    });
    
    logger.info('Access token refreshed', { userId });
    
    // Send success response with new access token
    res.status(200).json({
      status: 'success',
      message: 'Token refreshed successfully',
      data: {
        accessToken
      }
    });
  } catch (error) {
    // Do not expose detailed error messages for token operations
    if (error.message.includes('Token')) {
      next(new AuthenticationError('Invalid or expired token'));
    } else {
      next(error);
    }
  }
};

/**
 * Get current user profile
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const getCurrentUser = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Get user profile from DB
    const { data: profileData, error: profileError } = await supabaseService.client
      .from('profiles')
      .select('id, name, email, role, created_at, updated_at')
      .eq('id', userId)
      .single();
    
    if (profileError || !profileData) {
      logger.error('Failed to fetch user profile', { userId });
      throw new NotFoundError('User profile not found');
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        user: profileData
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user password
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    const email = req.user.email;
    
    if (!currentPassword || !newPassword) {
      throw new ValidationError('Current password and new password are required');
    }
    
    // Verify current password by attempting to sign in
    const { error: authError } = await supabaseService.auth.signInWithPassword({
      email,
      password: currentPassword
    });
    
    if (authError) {
      logger.warn('Password update failed - invalid current password', { userId });
      throw new ValidationError('Current password is incorrect', { field: 'currentPassword' });
    }
    
    // Update password
    const { error: updateError } = await supabaseService.auth.updateUser({
      password: newPassword
    });
    
    if (updateError) {
      logger.error('Failed to update password', { userId, error: updateError.message });
      throw new Error('Failed to update password');
    }
    
    logger.info('Password updated successfully', { userId });
    
    res.status(200).json({
      status: 'success',
      message: 'Password updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  logout,
  refreshToken,
  getCurrentUser,
  updatePassword
}; 