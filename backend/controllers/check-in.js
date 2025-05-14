/**
 * Controller for managing user check-in functionality
 * Handles requests related to user progress tracking, check-ins, and metrics
 */
const checkInService = require('../services/check-in-service');
const logger = require('../config/logger');
const { BadRequestError, NotFoundError, DatabaseError } = require('../utils/errors');

/**
 * Records a new check-in for a user
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with the created check-in or error
 */
async function recordCheckIn(req, res) {
  try {
    // Extract user ID and token from authenticated request
    const userId = req.user.id;
    const jwtToken = req.headers.authorization.split(' ')[1];
    const checkInData = req.body;

    logger.info('Recording check-in', { userId });
    
    const result = await checkInService.storeCheckIn(userId, checkInData, jwtToken);
    
    return res.status(201).json({
      status: 'success',
      data: result,
      message: 'Check-in recorded successfully'
    });
  } catch (error) {
    logger.error('Failed to record check-in', { error: error.message, stack: error.stack });
    
    if (error instanceof BadRequestError) {
      return res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
    
    if (error instanceof DatabaseError) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to save check-in to database'
      });
    }
    
    return res.status(500).json({
      status: 'error',
      message: 'An unexpected error occurred while recording check-in'
    });
  }
}

/**
 * Retrieves check-ins for a user with optional filtering
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with filtered check-ins or error
 */
async function getCheckIns(req, res) {
  try {
    const userId = req.user.id;
    const jwtToken = req.headers.authorization.split(' ')[1];
    
    // Extract filter parameters
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      limit: req.query.limit ? parseInt(req.query.limit) : 10,
      offset: req.query.offset ? parseInt(req.query.offset) : 0
    };
    
    logger.info('Retrieving check-ins', { userId, filters });
    
    const result = await checkInService.retrieveCheckIns(userId, filters, jwtToken);
    
    return res.status(200).json({
      status: 'success',
      data: result.data,
      pagination: result.pagination,
      message: 'Check-ins retrieved successfully'
    });
  } catch (error) {
    logger.error('Failed to retrieve check-ins', { error: error.message, stack: error.stack });
    
    if (error instanceof BadRequestError) {
      return res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
    
    return res.status(500).json({
      status: 'error',
      message: 'An unexpected error occurred while retrieving check-ins'
    });
  }
}

/**
 * Retrieves a specific check-in record by ID
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with the requested check-in or error
 */
async function getCheckIn(req, res) {
  try {
    const userId = req.user.id;
    const checkInId = req.params.checkInId;
    const jwtToken = req.headers.authorization.split(' ')[1];
    
    if (!checkInId) {
      return res.status(400).json({
        status: 'error',
        message: 'Check-in ID is required'
      });
    }
    
    logger.info('Retrieving check-in', { userId, checkInId });
    
    const result = await checkInService.retrieveCheckIn(checkInId, userId, jwtToken);
    
    return res.status(200).json({
      status: 'success',
      data: result,
      message: 'Check-in retrieved successfully'
    });
  } catch (error) {
    logger.error('Failed to retrieve check-in', { error: error.message, stack: error.stack });
    
    if (error instanceof BadRequestError) {
      return res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
    
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        status: 'error',
        message: error.message
      });
    }
    
    return res.status(500).json({
      status: 'error',
      message: 'An unexpected error occurred while retrieving check-in'
    });
  }
}

/**
 * Calculates progress metrics based on user check-in data
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with calculated metrics or error
 */
async function calculateMetrics(req, res) {
  try {
    const userId = req.user.id;
    const jwtToken = req.headers.authorization.split(' ')[1];
    const dateRange = {
      startDate: req.body.startDate,
      endDate: req.body.endDate
    };
    
    logger.info('Calculating metrics', { userId, dateRange });
    
    const result = await checkInService.computeMetrics(userId, dateRange, jwtToken);
    
    return res.status(200).json({
      status: 'success',
      data: result.data,
      message: result.message
    });
  } catch (error) {
    logger.error('Failed to calculate metrics', { error: error.message, stack: error.stack });
    
    if (error instanceof BadRequestError) {
      return res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
    
    return res.status(500).json({
      status: 'error',
      message: 'An unexpected error occurred while calculating metrics'
    });
  }
}

module.exports = {
  recordCheckIn,
  getCheckIns,
  getCheckIn,
  calculateMetrics
}; 