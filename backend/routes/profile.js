/**
 * @fileoverview Profile routes
 * Handles all routes related to user profiles
 */

const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profile');
const { validate, validateProfile, validatePartialProfile, validateProfilePreferences } = require('../middleware/validation');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../utils/error-handlers');

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
router.put('/preferences', validate(validateProfilePreferences), asyncHandler(profileController.updateProfilePreferences));

/**
 * @route   GET /api/profile/:userId
 * @desc    Get user profile by userId (admin only)
 * @access  Private/Admin
 */
router.get('/:userId', requireAdmin, asyncHandler(profileController.getProfile));

/**
 * @route   POST /api/profile
 * @desc    Create or update profile
 * @access  Private
 */
router.post('/', validate(validateProfile), asyncHandler(profileController.createOrUpdateProfile));

/**
 * @route   PUT /api/profile
 * @desc    Update profile (partial update allowed)
 * @access  Private
 */
router.put('/', validate(validatePartialProfile), asyncHandler(profileController.createOrUpdateProfile));

module.exports = router; 