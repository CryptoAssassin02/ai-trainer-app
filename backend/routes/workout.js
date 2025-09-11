const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  validateWorkoutGeneration,
  validateWorkoutAdjustment,
  validateWorkoutQuery
} = require('../middleware/validation');
const workoutController = require('../controllers/workout');
const workoutChunkedController = require('../controllers/workout-chunked');
const logger = require('../config/logger');
const rateLimit = require('express-rate-limit');

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
  standardHeaders: true,
  legacyHeaders: false,
});

// Define workout plan routes

// POST /structure - Generate high-level workout program structure
router.post('/structure',
  authenticate,              // Ensure user is logged in
  planGenerationLimiter,     // Apply rate limiting
  validateWorkoutGeneration, // Validate request body
  workoutChunkedController.generateWorkoutStructure // Handle the request
);

// POST /:planId/mesocycles/:mesocycleNumber - Generate detailed exercises for specific mesocycle
router.post('/:planId/mesocycles/:mesocycleNumber',
  authenticate,              // Ensure user is logged in
  planGenerationLimiter,     // Apply rate limiting
  validateWorkoutGeneration, // Validate request body
  workoutChunkedController.generateMesocycleDetails // Handle the request
);

// GET /:planId/status - Get generation status for a workout plan
router.get('/:planId/status',
  authenticate,              // Ensure user is logged in
  workoutChunkedController.getGenerationStatus // Handle the request
);

// Legacy Routes

// POST / - Generate a new workout plan (legacy endpoint)
router.post('/',
  authenticate,              
  planGenerationLimiter,     
  validateWorkoutGeneration, 
  workoutController.generateWorkoutPlan 
);

// GET / - Retrieve a list of workout plans for the user
router.get('/',
  authenticate,              
  validateWorkoutQuery,      
  workoutController.getWorkoutPlans 
);

// GET /:planId - Retrieve a specific workout plan
router.get('/:planId',
  authenticate,              
  workoutController.getWorkoutPlan 
);

// POST /:planId - Adjust an existing workout plan using agent
router.post('/:planId',
  authenticate,              
  validateWorkoutAdjustment, 
  workoutController.adjustWorkoutPlan 
);

// DELETE /:planId - Delete a specific workout plan
router.delete('/:planId',
  authenticate,              
  workoutController.deleteWorkoutPlan 
);

module.exports = router;