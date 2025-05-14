/**
 * @fileoverview Nutrition routes
 * Handles all routes related to nutrition plans, dietary preferences, and meal logs
 */

const express = require('express');
const router = express.Router();
const nutritionController = require('../controllers/nutrition');
const { authenticate } = require('../middleware/auth');

// All nutrition routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/macros/calculate
 * @desc    Calculate macros and generate nutrition plan
 * @access  Private
 */
router.post('/calculate', nutritionController.calculateMacros);

/**
 * @route   GET /api/macros
 * @desc    Get user's nutrition plan
 * @access  Private
 */
router.get('/', nutritionController.getNutritionPlan);

/**
 * @route   GET /api/macros/preferences
 * @desc    Get user's dietary preferences
 * @access  Private
 */
router.get('/preferences', nutritionController.getDietaryPreferences);

/**
 * @route   POST /api/macros/preferences
 * @desc    Update user's dietary preferences
 * @access  Private
 */
router.post('/preferences', nutritionController.updateDietaryPreferences);

/**
 * @route   POST /api/macros/meal-log
 * @desc    Log a new meal
 * @access  Private
 */
router.post('/meal-log', nutritionController.logMeal);

/**
 * @route   GET /api/macros/meal-log
 * @desc    Get meal logs with optional date filtering
 * @access  Private
 */
router.get('/meal-log', nutritionController.getMealLogs);

/**
 * @route   GET /api/macros/:userId
 * @desc    Get nutrition plan for a specific user (admin only)
 * @access  Private/Admin
 */
// This route would require admin privileges, but for now let's leave it open
router.get('/:userId', nutritionController.getNutritionPlan);

module.exports = router; 