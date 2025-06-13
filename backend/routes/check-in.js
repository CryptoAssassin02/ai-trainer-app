/**
 * Routes for user check-in functionality
 * Defines API endpoints for progress tracking and metrics
 */
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { validateCheckIn, validateMetricsCalculation } = require('../middleware/validation');
const checkInController = require('../controllers/check-in');
const rateLimit = require('express-rate-limit');

// Rate limit for check-in creation (5 per hour) - disabled for tests
const checkInLimiter = process.env.NODE_ENV === 'test' ? 
  (req, res, next) => next() : // Skip rate limiting for tests
  rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour window
    max: 5, // 5 requests per window
    message: {
      status: 'error',
      message: 'Too many check-ins created. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
  });

/**
 * @route POST /v1/progress/check-in
 * @desc Create a new check-in record
 * @access Private
 */
router.post('/check-in', 
  authenticate, 
  checkInLimiter,
  validateCheckIn, 
  checkInController.recordCheckIn
);

/**
 * @route GET /v1/progress/check-ins
 * @desc Get filtered check-ins with pagination
 * @access Private
 */
router.get('/check-ins',
  authenticate,
  checkInController.getCheckIns
);

/**
 * @route GET /v1/progress/check-ins/:checkInId
 * @desc Get a specific check-in record
 * @access Private
 */
router.get('/check-ins/:checkInId',
  authenticate,
  checkInController.getCheckIn
);

/**
 * @route POST /v1/progress/metrics
 * @desc Calculate progress metrics
 * @access Private
 */
router.post('/metrics',
  authenticate,
  validateMetricsCalculation,
  checkInController.calculateMetrics
);

module.exports = router; 