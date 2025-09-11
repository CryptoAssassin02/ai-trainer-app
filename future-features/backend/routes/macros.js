/**
 * Macros Routes
 * 
 * Routes for macro calculation, storage, and retrieval.
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../backend/middleware/auth');
const { validateMacroCalculation } = require('../../../backend/middleware/validation');
const macroController = require('../controllers/macros');
const rateLimit = require('express-rate-limit');

// Rate limiter for calculation operations (resource-intensive)
const calculationLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === 'test' ? 60 * 1000 : 60 * 60 * 1000, // 1 minute in test, 1 hour in production
  max: process.env.NODE_ENV === 'test' ? 100 : 5, // 100 requests per minute in test, 5 per hour in production
  message: {
    status: 'error',
    message: 'Too many macro calculation requests. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter for standard operations
const standardLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === 'test' ? 60 * 1000 : 15 * 60 * 1000, // 1 minute in test, 15 minutes in production
  max: process.env.NODE_ENV === 'test' ? 100 : 20, // 100 requests per minute in test, 20 per 15 minutes in production
  message: {
    status: 'error',
    message: 'Too many requests. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Calculate and store macros
router.post(
  '/calculate',
  authenticate,
  calculationLimiter,
  validateMacroCalculation,
  macroController.calculateMacros
);

// Store custom macro plan
router.post(
  '/',
  authenticate,
  standardLimiter,
  macroController.storeMacros
);

// Get paginated list of macro plans
router.get(
  '/',
  authenticate,
  standardLimiter,
  macroController.getMacros
);

// Get latest macro plan
router.get(
  '/latest',
  authenticate,
  standardLimiter,
  macroController.getLatestMacros
);

// Update an existing macro plan
router.put(
  '/:planId',
  authenticate,
  standardLimiter,
  macroController.updateMacros
);

module.exports = router; 