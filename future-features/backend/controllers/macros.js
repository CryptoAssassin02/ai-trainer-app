/**
 * Macro Controller
 * 
 * Handles HTTP requests for macro calculations, storage, and retrieval.
 */

const macroService = require('../services/macro-service');
const logger = require('../config/logger');
const { BadRequestError, NotFoundError, DatabaseError } = require('../utils/errors');

/**
 * Calculate macros based on user data and store them
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function calculateMacros(req, res) {
  try {
    const userId = req.user.id;
    const jwtToken = req.headers.authorization.split(' ')[1];
    
    // Add userId to the request body for tracking
    const userData = {
      ...req.body,
      userId
    };
    
    // Calculate macros using the service
    const macros = await macroService.calculateMacros(userData, req.body.useExternalApi);
    
    // Store macros in database
    const planId = await macroService.storeMacros(userId, macros, jwtToken);
    
    // Return success response
    res.status(201).json({
      status: 'success',
      data: {
        id: planId,
        ...macros
      },
      message: 'Macros calculated and stored successfully'
    });
  } catch (error) {
    logger.error('Error in calculateMacros controller', { error: error.message, userId: req.user?.id });
    
    if (error instanceof BadRequestError) {
      return res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
    
    return res.status(500).json({
      status: 'error',
      message: 'Failed to calculate macros. Please try again later.'
    });
  }
}

/**
 * Store custom macro plan
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function storeMacros(req, res) {
  try {
    const userId = req.user.id;
    const jwtToken = req.headers.authorization.split(' ')[1];
    const macroData = req.body;
    
    // Store macros in database
    const planId = await macroService.storeMacros(userId, macroData, jwtToken);
    
    // Return success response
    res.status(201).json({
      status: 'success',
      data: {
        id: planId
      },
      message: 'Custom macro plan stored successfully'
    });
  } catch (error) {
    logger.error('Error in storeMacros controller', { error: error.message, userId: req.user?.id });
    
    if (error instanceof BadRequestError) {
      return res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
    
    if (error instanceof DatabaseError) {
      return res.status(500).json({
        status: 'error',
        message: 'Database error occurred while storing macros'
      });
    }
    
    return res.status(500).json({
      status: 'error',
      message: 'Failed to store macros. Please try again later.'
    });
  }
}

/**
 * Get paginated list of user's macro plans
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getMacros(req, res) {
  try {
    const userId = req.user.id;
    const jwtToken = req.headers.authorization.split(' ')[1];
    
    // Extract filter parameters from query
    const filters = {
      page: parseInt(req.query.page) || 1,
      pageSize: parseInt(req.query.pageSize) || 10,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      status: req.query.status
    };
    
    // Retrieve macros from database
    const macros = await macroService.retrieveMacros(userId, filters, jwtToken);
    
    // Return success response
    res.status(200).json({
      status: 'success',
      data: macros.data,
      pagination: macros.pagination,
      message: 'Macro plans retrieved successfully'
    });
  } catch (error) {
    logger.error('Error in getMacros controller', { error: error.message, userId: req.user?.id });
    
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        status: 'error',
        message: error.message
      });
    }
    
    if (error instanceof DatabaseError) {
      return res.status(500).json({
        status: 'error',
        message: 'Database error occurred while retrieving macros'
      });
    }
    
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve macros. Please try again later.'
    });
  }
}

/**
 * Get the latest macro plan for the user
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getLatestMacros(req, res) {
  try {
    const userId = req.user.id;
    const jwtToken = req.headers.authorization.split(' ')[1];
    
    // Retrieve latest macros from database
    const macros = await macroService.retrieveLatestMacros(userId, jwtToken);
    
    // Return success response
    res.status(200).json({
      status: 'success',
      data: macros,
      message: 'Latest macro plan retrieved successfully'
    });
  } catch (error) {
    logger.error('Error in getLatestMacros controller', { error: error.message, userId: req.user?.id });
    
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        status: 'error',
        message: error.message
      });
    }
    
    if (error instanceof DatabaseError) {
      return res.status(500).json({
        status: 'error',
        message: 'Database error occurred while retrieving latest macros'
      });
    }
    
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve latest macros. Please try again later.'
    });
  }
}

/**
 * Update an existing macro plan
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function updateMacros(req, res) {
  try {
    const userId = req.user.id;
    const planId = req.params.planId;
    const jwtToken = req.headers.authorization.split(' ')[1];
    const updates = req.body;
    const currentVersion = req.body.version || 1;
    
    // Update macro plan
    await macroService.updateMacroPlan(planId, updates, currentVersion, jwtToken);
    
    // Return success response
    res.status(200).json({
      status: 'success',
      message: 'Macro plan updated successfully'
    });
  } catch (error) {
    logger.error('Error in updateMacros controller', { 
      error: error.message, 
      userId: req.user?.id,
      planId: req.params.planId
    });
    
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        status: 'error',
        message: error.message
      });
    }
    
    if (error instanceof BadRequestError) {
      return res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
    
    if (error instanceof DatabaseError) {
      return res.status(500).json({
        status: 'error',
        message: 'Database error occurred while updating macros'
      });
    }
    
    return res.status(500).json({
      status: 'error',
      message: 'Failed to update macros. Please try again later.'
    });
  }
}

module.exports = {
  calculateMacros,
  storeMacros,
  getMacros,
  getLatestMacros,
  updateMacros
}; 