/**
 * Macros Routes
 * 
 * Routes for macro calculation, storage, and retrieval.
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { validateMacroCalculation } = require('../middleware/validation');
const macroController = require('../controllers/macros');
const rateLimit = require('express-rate-limit');

// Rate limiter for calculation operations (resource-intensive)
const calculationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per hour
  message: {
    status: 'error',
    message: 'Too many macro calculation requests. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter for standard operations
const standardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per 15 minutes
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