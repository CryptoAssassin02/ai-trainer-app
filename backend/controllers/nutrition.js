/**
 * @fileoverview Nutrition Controller
 * Handles HTTP requests related to nutrition plans and meal tracking
 */

const { logger } = require('../config');
const nutritionService = require('../services/nutrition-service');
const NutritionAgent = require('../agents/nutrition-agent');
const OpenAIService = require('../services/openai-service');
const { getSupabaseClient } = require('../services/supabase');
const { ValidationError, NotFoundError } = require('../utils/errors');

// Initialize OpenAI service
const openaiService = new OpenAIService();

// Initialize the NutritionAgent
const nutritionAgent = new NutritionAgent({
  openai: openaiService,
  supabase: getSupabaseClient(),
  logger: logger
});

/**
 * Calculate macros and generate a nutrition plan
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Generated nutrition plan or error response
 */
const calculateMacros = async (req, res, next) => {
  try {
    const userId = req.user && req.user.id;
    
    if (!userId) {
      logger.warn('Macro calculation request missing user ID');
      return res.status(400).json({
        status: 'error',
        message: 'User ID is required'
      });
    }
    
    // Extract required fields from request body
    const { goals, activityLevel } = req.body;
    
    if (!goals || !Array.isArray(goals) || goals.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'At least one fitness goal is required'
      });
    }
    
    if (!activityLevel) {
      return res.status(400).json({
        status: 'error',
        message: 'Activity level is required'
      });
    }
    
    logger.debug('Calculating macros and generating nutrition plan', { 
      userId,
      goals,
      activityLevel
    });
    
    // Process the request using the NutritionAgent
    const result = await nutritionAgent.process(userId, goals, activityLevel);
    
    // Save the nutrition plan to the database
    const savedPlan = await nutritionService.createOrUpdateNutritionPlan(result);
    
    return res.status(200).json({
      status: 'success',
      message: 'Nutrition plan generated successfully',
      data: savedPlan
    });
  } catch (error) {
    logger.error('Error calculating macros', { 
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    
    if (error instanceof ValidationError) {
      return res.status(400).json({
        status: 'error',
        message: error.message,
        details: error.details
      });
    }
    
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        status: 'error',
        message: error.message
      });
    }
    
    next(error);
  }
};

/**
 * Get nutrition plan by user ID
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} User's nutrition plan or error response
 */
const getNutritionPlan = async (req, res, next) => {
  try {
    const userId = req.params.userId || (req.user && req.user.id);
    
    if (!userId) {
      logger.warn('Nutrition plan request missing user ID');
      return res.status(400).json({
        status: 'error',
        message: 'User ID is required'
      });
    }
    
    logger.debug('Getting nutrition plan', { userId });
    const plan = await nutritionService.getNutritionPlanByUserId(userId);
    
    return res.status(200).json({
      status: 'success',
      data: plan
    });
  } catch (error) {
    logger.error('Error getting nutrition plan', { 
      error: error.message,
      stack: error.stack
    });
    
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        status: 'error',
        message: error.message
      });
    }
    
    next(error);
  }
};

/**
 * Get dietary preferences
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Dietary preferences or error response
 */
const getDietaryPreferences = async (req, res, next) => {
  try {
    const userId = req.user && req.user.id;
    
    if (!userId) {
      logger.warn('Dietary preferences request missing user ID');
      return res.status(400).json({
        status: 'error',
        message: 'User ID is required'
      });
    }
    
    logger.debug('Getting dietary preferences', { userId });
    const preferences = await nutritionService.getDietaryPreferences(userId);
    
    return res.status(200).json({
      status: 'success',
      data: preferences
    });
  } catch (error) {
    logger.error('Error getting dietary preferences', { 
      error: error.message,
      stack: error.stack
    });
    
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        status: 'error',
        message: error.message
      });
    }
    
    next(error);
  }
};

/**
 * Update dietary preferences
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Updated preferences or error response
 */
const updateDietaryPreferences = async (req, res, next) => {
  try {
    const userId = req.user && req.user.id;
    
    if (!userId) {
      logger.warn('Dietary preferences update request missing user ID');
      return res.status(400).json({
        status: 'error',
        message: 'User ID is required'
      });
    }
    
    // Add userId to preference data
    const preferenceData = {
      ...req.body,
      userId
    };
    
    logger.debug('Updating dietary preferences', { userId });
    const updatedPreferences = await nutritionService.createOrUpdateDietaryPreferences(preferenceData);
    
    return res.status(200).json({
      status: 'success',
      message: 'Dietary preferences updated successfully',
      data: updatedPreferences
    });
  } catch (error) {
    logger.error('Error updating dietary preferences', { 
      error: error.message,
      stack: error.stack
    });
    
    if (error instanceof ValidationError) {
      return res.status(400).json({
        status: 'error',
        message: error.message,
        details: error.details
      });
    }
    
    next(error);
  }
};

/**
 * Log a meal
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Created meal log or error response
 */
const logMeal = async (req, res, next) => {
  try {
    const userId = req.user && req.user.id;
    
    if (!userId) {
      logger.warn('Meal log request missing user ID');
      return res.status(400).json({
        status: 'error',
        message: 'User ID is required'
      });
    }
    
    // Add userId to meal log data
    const mealLogData = {
      ...req.body,
      userId
    };
    
    logger.debug('Logging meal', { 
      userId,
      mealName: mealLogData.mealName
    });
    
    const mealLog = await nutritionService.logMeal(mealLogData);
    
    return res.status(201).json({
      status: 'success',
      message: 'Meal logged successfully',
      data: mealLog
    });
  } catch (error) {
    logger.error('Error logging meal', { 
      error: error.message,
      stack: error.stack
    });
    
    if (error instanceof ValidationError) {
      return res.status(400).json({
        status: 'error',
        message: error.message,
        details: error.details
      });
    }
    
    next(error);
  }
};

/**
 * Get meal logs for a user
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Array of meal logs or error response
 */
const getMealLogs = async (req, res, next) => {
  try {
    const userId = req.user && req.user.id;
    
    if (!userId) {
      logger.warn('Meal logs request missing user ID');
      return res.status(400).json({
        status: 'error',
        message: 'User ID is required'
      });
    }
    
    // Extract query parameters for date filtering
    const { startDate, endDate } = req.query;
    
    logger.debug('Getting meal logs', { 
      userId,
      startDate,
      endDate
    });
    
    const mealLogs = await nutritionService.getMealLogs(userId, startDate, endDate);
    
    return res.status(200).json({
      status: 'success',
      data: mealLogs
    });
  } catch (error) {
    logger.error('Error getting meal logs', { 
      error: error.message,
      stack: error.stack
    });
    
    if (error instanceof ValidationError) {
      return res.status(400).json({
        status: 'error',
        message: error.message,
        details: error.details
      });
    }
    
    next(error);
  }
};

module.exports = {
  calculateMacros,
  getNutritionPlan,
  getDietaryPreferences,
  updateDietaryPreferences,
  logMeal,
  getMealLogs
}; 