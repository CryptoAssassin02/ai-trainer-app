/**
 * @fileoverview Profile routes
 * Handles all routes related to user profiles
 */

const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profile');
const { validate, validateProfile, validatePartialProfile, validateProfilePreferences } = require('../middleware/validation');
const { authenticate, requireAdmin } = require('../middleware/auth');

// All profile routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/', profileController.getProfile);

/**
 * @route   GET /api/profile/preferences
 * @desc    Get user profile preferences
 * @access  Private
 */
router.get('/preferences', profileController.getProfilePreferences);

/**
 * @route   PUT /api/profile/preferences
 * @desc    Update user profile preferences
 * @access  Private
 */
router.put('/preferences', validate(validateProfilePreferences), profileController.updateProfilePreferences);

/**
 * @route   GET /api/profile/:userId
 * @desc    Get user profile by userId (admin only)
 * @access  Private/Admin
 */
router.get('/:userId', requireAdmin, profileController.getProfile);

/**
 * @route   POST /api/profile
 * @desc    Create or update profile
 * @access  Private
 */
router.post('/', validate(validateProfile), profileController.createOrUpdateProfile);

/**
 * @route   PUT /api/profile
 * @desc    Update profile (partial update allowed)
 * @access  Private
 */
router.put('/', validate(validatePartialProfile), profileController.createOrUpdateProfile);

module.exports = router; 