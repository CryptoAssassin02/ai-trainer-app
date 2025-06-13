const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');
const { DatabaseError, NotFoundError, ValidationError } = require('../utils/errors');
const logger = require('../config/logger');
const { getSupabaseClientWithToken } = require('./supabase');

/**
 * Stores a new workout log in the database.
 * @param {string} userId - The ID of the user creating the log.
 * @param {object} logData - The workout log data.
 * @param {string} jwtToken - The user's JWT for RLS.
 * @returns {Promise<object>} The newly created workout log record.
 * @throws {DatabaseError} If the database operation fails.
 * @throws {ValidationError} If logData is invalid.
 */
async function storeWorkoutLog(userId, logData, jwtToken) {
  if (!logData || !logData.date || !logData.loggedExercises || logData.loggedExercises.length === 0) {
    throw new ValidationError('Invalid workout log data: date and loggedExercises are required.');
  }
  
  const supabase = getSupabaseClientWithToken(jwtToken);
  logger.debug(`Attempting to store workout log for user: ${userId}`);
  try {
    const { data, error } = await supabase
      .from('workout_logs')
      .insert({
        user_id: userId,
        ...logData // This should include plan_id, date, completed, exercises_completed, etc.
      })
      .select()
      .single();

    if (error) {
      logger.error(`Supabase error storing workout log for user ${userId}: ${error.message}`);
      throw new DatabaseError(`Database error storing workout log: ${error.message}`);
    }

    if (!data) {
      logger.error(`No data returned after inserting workout log for user ${userId}.`);
      throw new DatabaseError('Failed to store workout log, no data returned.');
    }

    logger.info(`Workout log stored successfully for user: ${userId}, Log ID: ${data.id}`);
    return data;
  } catch (error) {
    logger.error(`Error in storeWorkoutLog for user ${userId}: ${error.message}`);
    // Rethrow specific errors or a generic one
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError(`Failed to store workout log: ${error.message}`);
  }
}

/**
 * Retrieves workout logs for a user with optional filtering and pagination.
 * @param {string} userId - The ID of the user whose logs to retrieve.
 * @param {object} filters - Optional filters (e.g., { limit, offset, startDate, endDate, planId }).
 * @param {string} jwtToken - The user's JWT for RLS.
 * @returns {Promise<Array<object>>} A list of workout log records.
 * @throws {DatabaseError} If the database operation fails.
 */
async function retrieveWorkoutLogs(userId, filters = {}, jwtToken) {
  const supabase = getSupabaseClientWithToken(jwtToken);
  const { limit = 10, offset = 0, startDate, endDate, planId } = filters;
  logger.debug(`Retrieving workout logs for user: ${userId} with filters: ${JSON.stringify(filters)}`);

  try {
    let query = supabase
      .from('workout_logs')
      .select('*')
      .eq('user_id', userId);

    // Apply additional filters *before* ordering and pagination
    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }
    if (planId) {
      query = query.eq('plan_id', planId);
    }

    // Apply ordering and pagination *after* filters
    query = query.order('date', { ascending: false })
                 .range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      logger.error(`Supabase error retrieving workout logs for user ${userId}: ${error.message}`);
      throw new DatabaseError(`Database error retrieving workout logs: ${error.message}`);
    }

    logger.info(`Retrieved ${data?.length ?? 0} workout logs for user: ${userId}`);
    return data || [];
  } catch (error) {
    logger.error(`Error in retrieveWorkoutLogs for user ${userId}: ${error.message}`);
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError(`Failed to retrieve workout logs: ${error.message}`);
  }
}

/**
 * Retrieves a specific workout log by its ID.
 * @param {string} logId - The ID of the workout log.
 * @param {string} userId - The ID of the user requesting the log.
 * @param {string} jwtToken - The user's JWT for RLS.
 * @returns {Promise<object>} The workout log record.
 * @throws {NotFoundError} If the log is not found.
 * @throws {DatabaseError} If the database operation fails.
 */
async function retrieveWorkoutLog(logId, userId, jwtToken) {
  const supabase = getSupabaseClientWithToken(jwtToken);
  logger.debug(`Retrieving workout log ID: ${logId} for user: ${userId}`);

  try {
    const { data, error } = await supabase
      .from('workout_logs')
      .select('*')
      .eq('id', logId)
      .single();

    if (error) {
      // Handle specific errors like 'PGRST116' (resource not found) if Supabase provides them
      if (error.code === 'PGRST116' || error.message.includes('Results contain 0 rows')) {
        logger.warn(`Workout log ID: ${logId} not found for user: ${userId}.`);
        throw new NotFoundError(`Workout log with ID ${logId} not found.`);
      }
      logger.error(`Supabase error retrieving workout log ${logId} for user ${userId}: ${error.message}`);
      throw new DatabaseError(`Database error retrieving workout log: ${error.message}`);
    }

    if (!data) {
      logger.warn(`Workout log ID: ${logId} not found for user: ${userId} (no data returned).`);
      throw new NotFoundError(`Workout log with ID ${logId} not found.`);
    }

    logger.info(`Workout log ID: ${logId} retrieved successfully for user: ${userId}`);
    return data;
  } catch (error) {
    logger.error(`Error in retrieveWorkoutLog for log ${logId}, user ${userId}: ${error.message}`);
    if (error instanceof NotFoundError || error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError(`Failed to retrieve workout log: ${error.message}`);
  }
}

/**
 * Updates a workout log in the database.
 * @param {string} logId - The ID of the log to update.
 * @param {object} updates - The updates to apply to the log.
 * @param {string} userId - The ID of the user who owns the log.
 * @param {string} jwtToken - The user's JWT for RLS.
 * @param {function} retrieveFn - The function to use to retrieve the log before updating.
 * @returns {Promise<object>} The updated workout log.
 * @throws {NotFoundError} If the log is not found.
 * @throws {DatabaseError} If the database operation fails.
 */
async function updateWorkoutLog(logId, updates, userId, jwtToken, retrieveFn = retrieveWorkoutLog) {
  const supabase = getSupabaseClientWithToken(jwtToken);
  logger.debug(`Updating workout log ID: ${logId} for user: ${userId}`);

  try {
    // Verification using the provided retrieve function
    // Let this throw NotFoundError or DatabaseError if it fails
    await retrieveFn(logId, userId, jwtToken);

    // If retrieveFn didn't throw, proceed with update
    const { data, error } = await supabase
      .from('workout_logs')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', logId)
      .select()
      .single();

    if (error) {
      logger.error(`Supabase error updating workout log ${logId} for user ${userId}: ${error.message}`);
      throw new DatabaseError(`Database error updating workout log: ${error.message}`);
    }

    if (!data) {
      logger.error(`No data returned after updating workout log ${logId} for user ${userId}.`);
      throw new DatabaseError('Failed to update workout log, no data returned.');
    }

    logger.info(`Workout log ID: ${logId} updated successfully for user: ${userId}`);
    return data;
  } catch (error) {
    // Catch errors from the update process OR errors propagated from retrieveFn
    logger.error(`Error in updateWorkoutLog for log ${logId}, user ${userId}: ${error.message}`);
    // If it was already one of our specific errors, just re-throw it
    if (error instanceof NotFoundError || error instanceof DatabaseError) {
      throw error;
    }
    // Otherwise, wrap unexpected errors specifically from the update attempt
    throw new DatabaseError(`Unexpected error during workout log update: ${error.message}`);
  }
}

/**
 * Deletes a workout log from the database.
 * @param {string} logId - The ID of the log to delete.
 * @param {string} userId - The ID of the user who owns the log.
 * @param {string} jwtToken - The user's JWT for RLS.
 * @param {function} retrieveFn - The function to use to retrieve the log before deleting.
 * @returns {Promise<void>} Resolves when deletion is successful.
 * @throws {NotFoundError} If the log is not found (from retrieveFn).
 * @throws {DatabaseError} If the database operation fails.
 */
async function deleteWorkoutLog(logId, userId, jwtToken, retrieveFn = retrieveWorkoutLog) {
  const supabase = getSupabaseClientWithToken(jwtToken);
  logger.debug(`Attempting to delete workout log ID: ${logId} for user: ${userId}`);

  try {
    // Verification using the provided retrieve function
    // Let this throw NotFoundError or DatabaseError if it fails
    await retrieveFn(logId, userId, jwtToken);

    // If retrieveFn didn't throw, proceed with deletion
    // Corrected: Apply filter *before* delete
    const { error: deleteError } = await supabase
      .from('workout_logs')
      .eq('id', logId) // Filter first
      .delete(); // Then delete

    if (deleteError) {
      logger.error(`Supabase error deleting workout log ${logId} for user ${userId}: ${deleteError.message}`);
      throw new DatabaseError(`Database error deleting workout log: ${deleteError.message}`);
    }

    logger.info(`Workout log ID: ${logId} deleted successfully for user: ${userId}`);
  } catch (error) {
     // Catch errors from the delete process OR errors propagated from retrieveFn
    logger.error(`Error in deleteWorkoutLog for log ${logId}, user ${userId}: ${error.message}`);
     // If it was already one of our specific errors, just re-throw it
    if (error instanceof NotFoundError || error instanceof DatabaseError) {
      throw error;
    }
    // Otherwise, wrap unexpected errors specifically from the delete attempt
    throw new DatabaseError(`Unexpected error during workout log deletion: ${error.message}`);
  }
}

module.exports = {
  storeWorkoutLog,
  retrieveWorkoutLogs,
  retrieveWorkoutLog,
  updateWorkoutLog,
  deleteWorkoutLog
}; 