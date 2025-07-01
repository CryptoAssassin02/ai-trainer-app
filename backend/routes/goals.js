/**
 * @fileoverview Goal management and prediction routes
 * Handles all routes related to goal creation, tracking, and prediction
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const analyticsController = require('../controllers/analytics');
const rateLimit = require('express-rate-limit');
const logger = require('../config/logger');

// Rate limit for goal operations - disabled for tests
const goalLimiter = process.env.NODE_ENV === 'test' ? 
  (req, res, next) => next() : // Skip rate limiting for tests
  rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour window
    max: 10, // 10 requests per window
    message: {
      status: 'error',
      message: 'Too many goal operations. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
  });

// All goal routes require authentication
router.use(authenticate);

/**
 * @route GET /v1/goals
 * @desc Get user's goals
 * @access Private
 */
router.get('/', analyticsController.getUserGoals);

/**
 * @route POST /v1/goals
 * @desc Create a new goal
 * @access Private
 */
router.post('/', goalLimiter, analyticsController.createGoal);

/**
 * @route GET /v1/goals/:goalId/progress
 * @desc Get progress for a specific goal
 * @access Private
 */
router.get('/:goalId/progress', analyticsController.getGoalProgress);

/**
 * @route PUT /v1/goals/:goalId
 * @desc Update a specific goal
 * @access Private
 */
router.put('/:goalId', goalLimiter, analyticsController.updateGoal);

/**
 * @route POST /v1/goals/:goalId/predict
 * @desc Predict goal achievement likelihood
 * @access Private
 */
router.post('/:goalId/predict', goalLimiter, analyticsController.predictGoalAchievement);

module.exports = router; 