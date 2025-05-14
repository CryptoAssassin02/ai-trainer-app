const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  validateWorkoutGeneration,
  validateWorkoutAdjustment,
  validateWorkoutQuery
} = require('../middleware/validation');
const workoutController = require('../controllers/workout');
const rateLimit = require('express-rate-limit');
const logger = require('../config/logger');

// Rate limiter for plan generation (adjust windowMs and max as needed)
const planGenerationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 10, // Limit each IP to 10 requests per windowMs
  message: {
      status: 'error',
      message: 'Too many workout plan generation requests from this IP, please try again after an hour'
  },
  handler: (req, res, next, options) => {
      logger.warn(`Rate limit exceeded for workout generation`, { ip: req.ip });
      res.status(options.statusCode).send(options.message);
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Define workout plan routes

// POST / - Generate a new workout plan (relative to mount point /v1/workouts)
router.post('/',
  authenticate,              // Ensure user is logged in
  planGenerationLimiter,     // Apply rate limiting
  validateWorkoutGeneration, // Validate request body against workoutGenerationSchema
  workoutController.generateWorkoutPlan // Handle the request
);

// GET / - Retrieve a list of workout plans for the user (relative to mount point /v1/workouts)
router.get('/',
  authenticate,              // Ensure user is logged in
  validateWorkoutQuery,      // Validate query parameters (limit, offset, searchTerm)
  workoutController.getWorkoutPlans // Handle the request
);

// GET /:planId - Retrieve a specific workout plan (relative to mount point /v1/workouts)
router.get('/:planId',
  authenticate,              // Ensure user is logged in
  // No specific body/query validation needed here, planId is in params
  workoutController.getWorkoutPlan // Handle the request
);

// POST /:planId - Adjust an existing workout plan using agent (relative to mount point /v1/workouts)
// Note: Using POST for adjustment as it invokes complex agent logic and changes state significantly.
// PUT or PATCH could be used for simpler direct updates to the plan record itself.
router.post('/:planId',
  authenticate,              // Ensure user is logged in
  // Consider if a different rate limit is needed for adjustments
  validateWorkoutAdjustment, // Validate request body against workoutAdjustmentSchema
  workoutController.adjustWorkoutPlan // Handle the request
);

// DELETE /:planId - Delete a specific workout plan (relative to mount point /v1/workouts)
router.delete('/:planId',
  authenticate,              // Ensure user is logged in
  // No specific body/query validation needed here
  workoutController.deleteWorkoutPlan // Handle the request
);

module.exports = router; 