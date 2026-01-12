/**
 * @fileoverview Profile routes
 * Handles all routes related to user profiles
 */

const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profile');
const { validate, validateProfileCreation, validateProfileUpdate, validateProfilePreferences } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../utils/error-handlers');

// Content-type validation middleware for JSON-only endpoints
const requireJsonContentType = (req, res, next) => {
  if (req.method === 'PUT' || req.method === 'POST') {
    const contentType = req.get('Content-Type');
    if (!contentType || !contentType.includes('application/json')) {
      return res.status(400).json({
        status: 'error',
        message: 'Content-Type must be application/json'
      });
    }
  }
  next();
};

// All profile routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/', asyncHandler(profileController.getProfile));

/**
 * @route   GET /api/profile/preferences
 * @desc    Get user profile preferences
 * @access  Private
 */
router.get('/preferences', asyncHandler(profileController.getProfilePreferences));

/**
 * @route   PUT /api/profile/preferences
 * @desc    Update user profile preferences
 * @access  Private
 */
router.put('/preferences', requireJsonContentType, validateProfilePreferences, asyncHandler(profileController.updateProfilePreferences));

/**
 * @route   POST /api/profile
 * @desc    Create or update profile
 * @access  Private
 */
router.post('/', validateProfileCreation, asyncHandler(profileController.createOrUpdateProfile));

/**
 * @route   PUT /api/profile
 * @desc    Update profile (partial update allowed)
 * @access  Private
 */
router.put('/', validateProfileUpdate, asyncHandler(profileController.createOrUpdateProfile));

module.exports = router; 