/**
 * @fileoverview Mobile analytics routes
 * Handles all routes related to mobile-optimized analytics, sync, and notifications
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const mobileAnalyticsController = require('../controllers/mobile-analytics');
const rateLimit = require('express-rate-limit');
const logger = require('../config/logger');

// Rate limit for mobile operations - disabled for tests
const mobileLimiter = process.env.NODE_ENV === 'test' ? 
  (req, res, next) => next() : // Skip rate limiting for tests
  rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour window
    max: 30, // 30 requests per window (higher for mobile)
    message: {
      status: 'error',
      message: 'Too many mobile operations. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
  });

// Rate limit for mobile sync - more restrictive
const syncLimiter = process.env.NODE_ENV === 'test' ? 
  (req, res, next) => next() : // Skip rate limiting for tests
  rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour window
    max: 12, // 12 syncs per hour
    message: {
      status: 'error',
      message: 'Too many sync operations. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
  });

// All mobile analytics routes require authentication
router.use(authenticate);

/**
 * @route GET /v1/mobile/overview
 * @desc Get mobile-optimized analytics overview
 * @access Private
 */
router.get('/overview', mobileLimiter, mobileAnalyticsController.getMobileOverview);

/**
 * @route POST /v1/mobile/sync
 * @desc Sync mobile data with server
 * @access Private
 */
router.post('/sync', syncLimiter, mobileAnalyticsController.syncMobileData);

/**
 * @route GET /v1/mobile/goals/:goalId/progress
 * @desc Get mobile-optimized goal progress
 * @access Private
 */
router.get('/goals/:goalId/progress', mobileLimiter, mobileAnalyticsController.getMobileGoalProgress);

/**
 * @route GET /v1/mobile/peer-comparison
 * @desc Get mobile-optimized peer comparison
 * @access Private
 */
router.get('/peer-comparison', mobileLimiter, mobileAnalyticsController.getMobilePeerComparison);

/**
 * @route GET /v1/mobile/notifications/preferences
 * @desc Get mobile notification preferences
 * @access Private
 */
router.get('/notifications/preferences', mobileAnalyticsController.getMobileNotificationPreferences);

/**
 * @route GET /v1/mobile/analytics
 * @desc Get mobile-optimized analytics (general endpoint)
 * @access Private
 */
router.get('/analytics', mobileLimiter, mobileAnalyticsController.getMobileOptimizedAnalytics);

module.exports = router; 