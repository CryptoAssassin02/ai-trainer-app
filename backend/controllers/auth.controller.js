/**
 * @fileoverview Authentication Controller
 * Handles user authentication operations
 */

const { logger } = require('../config');
const supabaseService = require('../services/supabase');
const jwtUtils = require('../utils/jwt');
const { AuthenticationError, ValidationError, NotFoundError, ConflictError } = require('../utils/errors');

/**
 * Register a new user
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const register = async (req, res, next) => {
  try {
    logger.debug('[RegisterController] Starting registration...');
    const { email, password, name } = req.body;
    
    // DEBUG: Check if required fields are present
    if (!email || !password || !name) {
        logger.error('[RegisterController] Missing required fields', { email: !!email, password: !!password, name: !!name });
        // Consider throwing ValidationError here if desired
    }

    logger.debug('[RegisterController] Calling Supabase signUp...');
    const { data: authData, error: authError } = await supabaseService.auth.signUp({
      email,
      password
    });
    logger.debug('[RegisterController] Supabase signUp response', { hasError: !!authError });
    
    if (authError) {
      logger.error('[RegisterController] Supabase signUp Error', { error: authError.message, stack: authError.stack });
      if (authError.message.includes('already registered')) {
        throw new ConflictError('User with this email already exists.');
      }
      throw new Error(authError.message);
    }
    
    const userId = authData?.user?.id;
    if (!userId) {
        logger.error('[RegisterController] Failed to get userId after signup', { authData });
        throw new Error('Signup failed: Could not retrieve user ID.');
    }
    logger.debug('[RegisterController] User ID obtained', { userId });

    logger.debug('[RegisterController] Inserting profile...');
    const { error: profileError } = await supabaseService.client
      .from('profiles')
      .insert({
        id: userId,
        email,
        name,
        created_at: new Date().toISOString()
      });
    logger.debug('[RegisterController] Profile insert response', { hasError: !!profileError });
    
    if (profileError) {
      logger.error('[RegisterController] Profile insert Error', { userId, error: profileError.message, stack: profileError.stack });
      throw new Error('User registration failed');
    }
    
    logger.debug('[RegisterController] Generating tokens...');
    const accessToken = jwtUtils.generateToken({ id: userId, email, role: 'user' });
    const refreshToken = jwtUtils.generateRefreshToken(userId);
    logger.debug('[RegisterController] Tokens generated');
    
    logger.info('User registered successfully', { userId });
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
    logger.error('[RegisterController] CATCH BLOCK', { error: error.message, stack: error.stack });
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
    logger.debug('[LoginController] Starting login...');
    const { email, password } = req.body;

    // DEBUG: Check fields
    if (!email || !password) {
        logger.error('[LoginController] Missing required fields', { email: !!email, password: !!password });
        // Consider throwing ValidationError
    }

    logger.debug('[LoginController] Calling Supabase signIn...');
    const { data: authData, error: authError } = await supabaseService.auth.signInWithPassword({
      email,
      password
    });
    logger.debug('[LoginController] Supabase signIn response', { hasError: !!authError });
    
    if (authError) {
      logger.warn('[LoginController] Supabase signIn Error', { email, error: authError.message, stack: authError.stack });
      throw new AuthenticationError('Invalid email or password');
    }
    
    const userId = authData?.user?.id;
    if (!userId) {
        logger.error('[LoginController] Failed to get userId after signin', { authData });
        throw new Error('Login failed: Could not retrieve user ID.');
    }
    logger.debug('[LoginController] User ID obtained', { userId });

    logger.debug('[LoginController] Fetching profile...');
    const { data: profileData, error: profileError } = await supabaseService.client
      .from('profiles')
      .select('id, name, email, role')
      .eq('id', userId)
      .single();
    logger.debug('[LoginController] Profile fetch response', { hasError: !!profileError, hasData: !!profileData });
    
    if (profileError || !profileData) {
      logger.error('[LoginController] Profile fetch Error', { userId, error: profileError?.message, stack: profileError?.stack });
      throw new NotFoundError('User profile not found');
    }
    
    logger.debug('[LoginController] Generating tokens...');
    const accessToken = jwtUtils.generateToken({
      id: profileData.id,
      email: profileData.email,
      role: profileData.role || 'user'
    });
    const refreshToken = jwtUtils.generateRefreshToken(profileData.id);
    logger.debug('[LoginController] Tokens generated');
    
    logger.info('User logged in successfully', { userId });
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
    logger.error('[LoginController] CATCH BLOCK', { error: error.message, stack: error.stack });
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