/**
 * @fileoverview Profile Controller
 * Handles HTTP requests related to user profiles
 */

const { logger } = require('../config');
const profileService = require('../services/profile-service');
const { ValidationError, NotFoundError, ConflictError } = require('../utils/errors');

/**
 * Get user profile
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Profile data or error response
 */
const getProfile = async (req, res, next) => {
  try {
    // Get user ID from either authenticated user or route params
    const userId = req.params.userId || (req.user && req.user.id);
    
    if (!userId) {
      logger.warn('Profile request missing user ID');
      return res.status(400).json({
        status: 'error',
        message: 'User ID is required'
      });
    }
    
    logger.debug('Getting profile for user', { userId });
    const profile = await profileService.getProfileByUserId(userId);
    
    return res.status(200).json({
      status: 'success',
      data: profile
    });
  } catch (error) {
    logger.error('Error getting user profile', { 
      error: error.message,
      stack: error.stack
    });
    
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        status: 'error',
        message: error.message
      });
    }
    
    if (error instanceof ValidationError) {
      return res.status(400).json({
        status: 'error',
        message: error.message,
        details: error.details
      });
    }
    
    next(error);
  }
};

/**
 * Create or update user profile
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Updated profile data or error response
 */
const createOrUpdateProfile = async (req, res, next) => {
  try {
    const userId = req.user && req.user.id;
    
    if (!userId) {
      logger.warn('Profile update request missing user ID');
      return res.status(400).json({
        status: 'error',
        message: 'User ID is required'
      });
    }
    
    // Add userId to profile data
    const profileData = {
      ...req.body,
      userId
    };
    
    // Check if profile exists
    try {
      const existingProfile = await profileService.getProfileByUserId(userId);
      
      // Update existing profile
      logger.debug('Updating existing profile', { userId });
      const updatedProfile = await profileService.updateProfile(userId, profileData);
      
      return res.status(200).json({
        status: 'success',
        message: 'Profile updated successfully',
        data: updatedProfile
      });
    } catch (error) {
      // If profile not found, create a new one
      if (error instanceof NotFoundError) {
        logger.debug('Creating new profile', { userId });
        const newProfile = await profileService.createProfile(profileData);
        
        return res.status(200).json({
          status: 'success',
          message: 'Profile updated successfully',
          data: newProfile
        });
      }
      
      // Re-throw any other errors
      throw error;
    }
  } catch (error) {
    logger.error('Error updating user profile', { 
      error: error.message,
      stack: error.stack
    });
    
    if (error instanceof ValidationError) {
      return res.status(400).json({
        status: 'error',
        message: error.message,
        details: error.details
      });
    }
    
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        status: 'error',
        message: error.message
      });
    }

    // Handle ConflictError specifically
    if (error instanceof ConflictError) {
      return res.status(409).json({
        status: 'error',
        message: error.message,
        // Use the error's code if available (like from ConcurrencyConflictError)
        // otherwise provide a default specific to profile conflicts
        errorCode: error.code || 'PROFILE_CONFLICT_ERROR' 
      });
    }
    
    next(error);
  }
};

/**
 * Get user profile preferences
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Profile preferences or error response
 */
const getProfilePreferences = async (req, res, next) => {
  try {
    const userId = req.user && req.user.id;
    
    if (!userId) {
      logger.warn('Profile preferences request missing user ID');
      return res.status(400).json({
        status: 'error',
        message: 'User ID is required'
      });
    }
    
    logger.debug('Getting profile preferences', { userId });
    const preferences = await profileService.getProfilePreferences(userId);
    
    return res.status(200).json({
      status: 'success',
      data: preferences
    });
  } catch (error) {
    logger.error('Error getting profile preferences', { 
      error: error.message,
      stack: error.stack
    });
    
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        status: 'error',
        message: error.message
      });
    }
    
    if (error instanceof ValidationError) {
      return res.status(400).json({
        status: 'error',
        message: error.message,
        details: error.details
      });
    }
    
    next(error);
  }
};

/**
 * Update user profile preferences
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Updated preferences or error response
 */
const updateProfilePreferences = async (req, res, next) => {
  try {
    const userId = req.user && req.user.id;
    
    if (!userId) {
      logger.warn('Profile preferences update request missing user ID');
      return res.status(400).json({
        status: 'error',
        message: 'User ID is required'
      });
    }
    
    const preferenceData = req.body;
    
    // Check if there is any data to update
    if (!preferenceData || Object.keys(preferenceData).length === 0) {
      logger.warn('Empty profile preferences update request', { userId });
      return res.status(400).json({
        status: 'error',
        message: 'Preference data is required'
      });
    }
    
    logger.debug('Updating profile preferences', { userId });
    const updatedPreferences = await profileService.updateProfilePreferences(userId, preferenceData);
    
    return res.status(200).json({
      status: 'success',
      message: 'Profile preferences updated successfully',
      data: updatedPreferences
    });
  } catch (error) {
    logger.error('Error updating profile preferences', { 
      error: error.message,
      stack: error.stack
    });
    
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        status: 'error',
        message: error.message
      });
    }
    
    if (error instanceof ValidationError) {
      return res.status(400).json({
        status: 'error',
        message: error.message,
        details: error.details
      });
    }
    
    next(error);
  }
};

module.exports = {
  getProfile,
  createOrUpdateProfile,
  getProfilePreferences,
  updateProfilePreferences
}; 