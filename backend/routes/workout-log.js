/**
 * @fileoverview Workout Log Routes
 * Handles routes for tracking and managing workout logs
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  validateWorkoutLog,
  validateWorkoutLogUpdate,
  validateWorkoutLogQuery
} = require('../middleware/validation');
const workoutLogController = require('../controllers/workout-log');
const rateLimit = require('express-rate-limit');
const logger = require('../config/logger');

// Rate limiter for create/update operations
const logOperationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 20, // Limit each IP to 20 requests per hour
  message: {
    status: 'error',
    message: 'Too many workout log operations from this IP, please try again after an hour'
  },
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded for workout log operations`, { ip: req.ip });
    res.status(options.statusCode).send(options.message);
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Define workout log routes

// POST /v1/workouts/log - Create a new workout log
router.post('/workouts/log',
  authenticate,              // Ensure user is logged in
  logOperationLimiter,       // Apply rate limiting
  validateWorkoutLog,        // Validate request body against workoutLogSchema
  workoutLogController.logWorkout // Handle the request
);

// GET /v1/workouts/log - Retrieve a list of workout logs with filtering
router.get('/workouts/log',
  authenticate,              // Ensure user is logged in
  validateWorkoutLogQuery,   // Validate query parameters
  workoutLogController.getWorkoutLogs // Handle the request
);

// GET /v1/workouts/log/:logId - Retrieve a specific workout log
router.get('/workouts/log/:logId',
  authenticate,              // Ensure user is logged in
  workoutLogController.getWorkoutLog // Handle the request
);

// PATCH /v1/workouts/log/:logId - Update a workout log
router.patch('/workouts/log/:logId',
  authenticate,              // Ensure user is logged in
  logOperationLimiter,       // Apply rate limiting
  validateWorkoutLogUpdate,  // Validate request body against workoutLogUpdateSchema
  workoutLogController.updateWorkoutLog // Handle the request
);

// DELETE /v1/workouts/log/:logId - Delete a workout log
router.delete('/workouts/log/:logId',
  authenticate,              // Ensure user is logged in
  workoutLogController.deleteWorkoutLog // Handle the request
);

module.exports = router; 