const workoutLogService = require('../services/workout-log-service');
const logger = require('../config/logger');
const { NotFoundError, DatabaseError, ApplicationError } = require('../utils/errors');

/**
 * Creates a new workout log entry.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function createWorkoutLog(req, res) {
  const userId = req.user?.id;
  const jwtToken = req.headers.authorization?.split(' ')[1];

  if (!userId || !jwtToken) {
    logger.warn('createWorkoutLog called without userId or jwtToken in request context.');
    return res.status(401).json({ status: 'error', message: 'Authentication required.' });
  }

  logger.info(`Creating workout log for user: ${userId}`);

  try {
    const logData = req.body;
    const savedLog = await workoutLogService.storeWorkoutLog(userId, logData, jwtToken);
    
    logger.info(`Workout log created successfully, ID: ${savedLog.id}`);
    return res.status(201).json({
      status: 'success',
      data: savedLog,
      message: 'Workout log saved successfully.'
    });
  } catch (error) {
    logger.error(`Error creating workout log for user ${userId}: ${error.message}`, { error });
    
    if (error instanceof DatabaseError) {
      return res.status(500).json({ 
        status: 'error', 
        message: 'Failed to save workout log due to a database issue.' 
      });
    }
    
    return res.status(500).json({ 
      status: 'error', 
      message: 'Failed to save workout log due to an internal error.' 
    });
  }
}

/**
 * Retrieves a list of workout logs for the authenticated user with optional filtering.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getWorkoutLogs(req, res) {
  const userId = req.user?.id;
  const jwtToken = req.headers.authorization?.split(' ')[1];
  const filters = req.query; // Contains validated limit, offset, startDate, endDate, planId from middleware

  if (!userId || !jwtToken) {
    logger.warn('getWorkoutLogs called without userId or jwtToken in request context.');
    return res.status(401).json({ status: 'error', message: 'Authentication required.' });
  }

  logger.info(`Fetching workout logs for user: ${userId} with filters: ${JSON.stringify(filters)}`);

  try {
    const logs = await workoutLogService.retrieveWorkoutLogs(userId, filters, jwtToken);
    logger.info(`Found ${logs.length} workout logs for user ${userId}`);
    
    return res.status(200).json({
      status: 'success',
      data: logs,
      message: 'Workout logs retrieved successfully.'
    });
  } catch (error) {
    logger.error(`Error retrieving workout logs for user ${userId}: ${error.message}`, { error });
    
    if (error instanceof DatabaseError) {
      return res.status(500).json({ 
        status: 'error', 
        message: 'Failed to retrieve workout logs due to a database issue.' 
      });
    }
    
    return res.status(500).json({ 
      status: 'error', 
      message: 'Failed to retrieve workout logs due to an internal error.' 
    });
  }
}

/**
 * Retrieves a specific workout log by ID for the authenticated user.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getWorkoutLog(req, res) {
  const userId = req.user?.id;
  const jwtToken = req.headers.authorization?.split(' ')[1];
  const { logId } = req.params;

  if (!userId || !jwtToken) {
    logger.warn('getWorkoutLog called without userId or jwtToken in request context.');
    return res.status(401).json({ status: 'error', message: 'Authentication required.' });
  }

  if (!logId) {
    return res.status(400).json({ status: 'error', message: 'Log ID is required.' });
  }

  logger.info(`Fetching workout log ID: ${logId} for user: ${userId}`);

  try {
    const log = await workoutLogService.retrieveWorkoutLog(logId, userId, jwtToken);
    logger.info(`Log ${logId} retrieved successfully for user ${userId}`);
    
    return res.status(200).json({
      status: 'success',
      data: log,
      message: 'Workout log retrieved successfully.'
    });
  } catch (error) {
    logger.error(`Error retrieving workout log ${logId} for user ${userId}: ${error.message}`, { error });
    
    if (error instanceof NotFoundError) {
      return res.status(404).json({ status: 'error', message: error.message });
    } else if (error instanceof DatabaseError) {
      return res.status(500).json({ 
        status: 'error', 
        message: 'Failed to retrieve workout log due to a database issue.' 
      });
    }
    
    return res.status(500).json({ 
      status: 'error', 
      message: 'Failed to retrieve workout log due to an internal error.' 
    });
  }
}

/**
 * Updates an existing workout log.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function updateWorkoutLog(req, res) {
  const userId = req.user?.id;
  const jwtToken = req.headers.authorization?.split(' ')[1];
  const { logId } = req.params;
  
  if (!userId || !jwtToken) {
    logger.warn('updateWorkoutLog called without userId or jwtToken in request context.');
    return res.status(401).json({ status: 'error', message: 'Authentication required.' });
  }

  if (!logId) {
    return res.status(400).json({ status: 'error', message: 'Log ID is required.' });
  }

  logger.info(`Updating workout log ID: ${logId} for user: ${userId}`);

  try {
    const updates = req.body;
    const updatedLog = await workoutLogService.updateWorkoutLog(logId, updates, userId, jwtToken);
    
    logger.info(`Workout log ${logId} updated successfully for user ${userId}`);
    return res.status(200).json({
      status: 'success',
      data: updatedLog,
      message: 'Workout log updated successfully.'
    });
  } catch (error) {
    logger.error(`Error updating workout log ${logId} for user ${userId}: ${error.message}`, { error });
    
    if (error instanceof NotFoundError) {
      return res.status(404).json({ status: 'error', message: error.message });
    } else if (error instanceof DatabaseError) {
      return res.status(500).json({ 
        status: 'error', 
        message: 'Failed to update workout log due to a database issue.' 
      });
    }
    
    return res.status(500).json({ 
      status: 'error', 
      message: 'Failed to update workout log due to an internal error.' 
    });
  }
}

/**
 * Deletes a workout log.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function deleteWorkoutLog(req, res) {
  const userId = req.user?.id;
  const jwtToken = req.headers.authorization?.split(' ')[1];
  const { logId } = req.params;

  if (!userId || !jwtToken) {
    logger.warn('deleteWorkoutLog called without userId or jwtToken in request context.');
    return res.status(401).json({ status: 'error', message: 'Authentication required.' });
  }

  if (!logId) {
    return res.status(400).json({ status: 'error', message: 'Log ID is required.' });
  }

  logger.info(`Deleting workout log ID: ${logId} for user: ${userId}`);

  try {
    await workoutLogService.deleteWorkoutLog(logId, userId, jwtToken);
    
    logger.info(`Workout log ${logId} deleted successfully for user ${userId}`);
    return res.status(200).json({
      status: 'success',
      message: 'Workout log deleted successfully.'
    });
  } catch (error) {
    logger.error(`Error deleting workout log ${logId} for user ${userId}: ${error.message}`, { error });
    
    if (error instanceof NotFoundError) {
      return res.status(404).json({ status: 'error', message: error.message });
    } else if (error instanceof DatabaseError) {
      return res.status(500).json({ 
        status: 'error', 
        message: 'Failed to delete workout log due to a database issue.' 
      });
    }
    
    return res.status(500).json({ 
      status: 'error', 
      message: 'Failed to delete workout log due to an internal error.' 
    });
  }
}

// Export controller functions
module.exports = {
  createWorkoutLog,
  logWorkout: createWorkoutLog,
  getWorkoutLogs,
  getWorkoutLog,
  updateWorkoutLog,
  deleteWorkoutLog
}; 