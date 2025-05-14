/**
 * @fileoverview Routes for notification preferences
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { validateNotificationPreferences } = require('../middleware/validation');
const notificationController = require('../controllers/notifications');
const rateLimit = require('express-rate-limit');

// Rate limiter for notification preference updates (10 updates per hour per user)
const preferencesLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, 
  keyGenerator: (req) => req.user.id,
  message: {
    status: 'error',
    message: 'Too many preference updates. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * @route POST /v1/notifications/preferences
 * @desc Update notification preferences
 * @access Private
 */
router.post(
  '/v1/notifications/preferences',
  authenticate,
  preferencesLimiter,
  validateNotificationPreferences,
  notificationController.updatePreferences
);

/**
 * @route GET /v1/notifications/preferences
 * @desc Get notification preferences
 * @access Private
 */
router.get(
  '/v1/notifications/preferences',
  authenticate,
  notificationController.getPreferences
);

/**
 * @route POST /v1/notifications/test
 * @desc Send a test notification (mock for MVP)
 * @access Private
 */
router.post(
  '/v1/notifications/test',
  authenticate,
  preferencesLimiter,
  notificationController.testNotification
);

module.exports = router; 