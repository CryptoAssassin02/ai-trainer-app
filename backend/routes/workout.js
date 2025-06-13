const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  validateWorkoutGeneration,
  validateWorkoutAdjustment,
  validateWorkoutQuery
} = require('../middleware/validation');
const workoutController = require('../controllers/workout');
console.log('@@@ ROUTES/WORKOUT.JS: workoutController imported:', workoutController);
console.log('@@@ ROUTES/WORKOUT.JS: typeof workoutController.generateWorkoutPlan:', typeof workoutController.generateWorkoutPlan);
const rateLimit = require('express-rate-limit');
const logger = require('../config/logger');

// Rate limiter for plan generation (adjust windowMs and max as needed)
const planGenerationLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === 'test' ? 60 * 1000 : 60 * 60 * 1000, // 1 minute in test, 1 hour in production
  max: process.env.NODE_ENV === 'test' ? 100 : 10, // 100 requests per minute in test, 10 per hour in production
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

console.log('@@@ ROUTES/WORKOUT.JS: typeof authenticate:', typeof authenticate);
console.log('@@@ ROUTES/WORKOUT.JS: typeof planGenerationLimiter:', typeof planGenerationLimiter);
console.log('@@@ ROUTES/WORKOUT.JS: typeof validateWorkoutGeneration:', typeof validateWorkoutGeneration);

// Define workout plan routes

// POST / - Generate a new workout plan (relative to mount point /v1/workouts)
router.post('/',
  authenticate,              // Ensure user is logged in
  planGenerationLimiter,     // Apply rate limiting
  validateWorkoutGeneration, // Validate request body against workoutGenerationSchema
  workoutController.generateWorkoutPlan // Handle the request
);

console.log('@@@ ROUTES/WORKOUT.JS: typeof authenticate (for GET /):', typeof authenticate);
console.log('@@@ ROUTES/WORKOUT.JS: typeof validateWorkoutQuery:', typeof validateWorkoutQuery);
console.log('@@@ ROUTES/WORKOUT.JS: typeof workoutController.getWorkoutPlans:', typeof workoutController.getWorkoutPlans);

// GET / - Retrieve a list of workout plans for the user (relative to mount point /v1/workouts)
router.get('/',
  authenticate,              // Ensure user is logged in
  validateWorkoutQuery,      // Validate query parameters (limit, offset, searchTerm)
  workoutController.getWorkoutPlans // Handle the request
);

console.log('@@@ ROUTES/WORKOUT.JS: typeof authenticate (for GET /:planId):', typeof authenticate);
console.log('@@@ ROUTES/WORKOUT.JS: typeof workoutController.getWorkoutPlan (for GET /:planId):', typeof workoutController.getWorkoutPlan);

// GET /:planId - Retrieve a specific workout plan (relative to mount point /v1/workouts)
router.get('/:planId',
  authenticate,              // Ensure user is logged in
  // No specific body/query validation needed here, planId is in params
  workoutController.getWorkoutPlan // Handle the request
);

console.log('@@@ ROUTES/WORKOUT.JS: typeof authenticate (for POST /:planId):', typeof authenticate);
console.log('@@@ ROUTES/WORKOUT.JS: typeof validateWorkoutAdjustment:', typeof validateWorkoutAdjustment);
console.log('@@@ ROUTES/WORKOUT.JS: typeof workoutController.adjustWorkoutPlan (for POST /:planId):', typeof workoutController.adjustWorkoutPlan);

// POST /:planId - Adjust an existing workout plan using agent (relative to mount point /v1/workouts)
// Note: Using POST for adjustment as it invokes complex agent logic and changes state significantly.
// PUT or PATCH could be used for simpler direct updates to the plan record itself.
router.post('/:planId',
  authenticate,              // Ensure user is logged in
  // Consider if a different rate limit is needed for adjustments
  validateWorkoutAdjustment, // Validate request body against workoutAdjustmentSchema
  workoutController.adjustWorkoutPlan // Handle the request
);

console.log('@@@ ROUTES/WORKOUT.JS: typeof authenticate (for DELETE /:planId):', typeof authenticate);
console.log('@@@ ROUTES/WORKOUT.JS: typeof workoutController.deleteWorkoutPlan (for DELETE /:planId):', typeof workoutController.deleteWorkoutPlan);

// DELETE /:planId - Delete a specific workout plan (relative to mount point /v1/workouts)
router.delete('/:planId',
  authenticate,              // Ensure user is logged in
  // No specific body/query validation needed here
  workoutController.deleteWorkoutPlan // Handle the request
);

module.exports = router; 