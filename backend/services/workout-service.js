const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');
const { DatabaseError, NotFoundError, ConflictError } = require('../utils/errors');
const logger = require('../config/logger');
const { createConnectionString } = require('../config/supabase');
const { getSupabaseClientWithToken } = require('./supabase'); // Import centralized helper

// Error code for version conflict
const VERSION_CONFLICT_ERROR = 'P2034';

// Maximum retry attempts for version conflicts
const MAX_RETRY_ATTEMPTS = 3;

/**
 * Executes a series of database operations within a transaction.
 * @param {Function} callback - An async function that receives a connected 'pg' client and performs operations.
 * @returns {Promise<any>} The result returned by the callback function.
 * @throws {DatabaseError} If the transaction fails.
 */
async function executeTransaction(callback) {
  let pool;
  let client;
  try {
    const connectionString = createConnectionString('transactionPooler', true); // Use service role for transactions
    pool = new Pool({ connectionString });
    client = await pool.connect();

    await client.query('BEGIN');
    logger.debug('Database transaction started.');

    const result = await callback(client);

    await client.query('COMMIT');
    logger.debug('Database transaction committed.');
    return result;
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
      logger.error('Database transaction rolled back due to error.', { error: error.message });
    }
    logger.error(`Transaction error: ${error.message}`);
    // Re-throw specific known errors, wrap unknown errors
    if (error instanceof DatabaseError || error instanceof NotFoundError || error instanceof ConflictError) {
      throw error; // Re-throw the original custom error
    } else {
      throw new DatabaseError(`Database transaction failed: ${error.message}`); // Wrap unknown errors
    }
  } finally {
    if (client) {
      client.release();
    }
    if (pool) {
      await pool.end(); // Close the pool
    }
  }
}

/**
 * Stores a new workout plan in the database.
 * @param {string} userId - The ID of the user creating the plan.
 * @param {object} planData - The workout plan data with planName, exercises, researchInsights, reasoning.
 * @param {string} jwtToken - The user's JWT for RLS.
 * @returns {Promise<object>} The newly created workout plan record.
 * @throws {DatabaseError} If the database operation fails.
 */
async function storeWorkoutPlan(userId, planData, jwtToken) {
  const supabase = getSupabaseClientWithToken(jwtToken); // Use imported helper
  logger.debug(`Attempting to store workout plan for user: ${userId}`);
  try {
    // Map the planData structure to the database schema
    const insertData = {
      user_id: userId,
      name: planData.planName || 'Generated Workout Plan', // Required field
      description: `AI-generated workout plan for user`,
      plan_data: {
        exercises: planData.exercises || [],
        weeklySchedule: planData.weeklySchedule || {}, // Include weeklySchedule that test expects
        formattedPlan: planData.formattedPlan || '',
        explanations: planData.explanations || '',
        researchInsights: planData.researchInsights || [],
        reasoning: planData.reasoning || '',
        warnings: planData.warnings || [],
        errors: planData.errors || []
      },
      ai_generated: true,
      status: 'active',
      ai_reasoning: {
        reasoning: planData.reasoning || '',
        researchInsights: planData.researchInsights || []
      }
    };

    const { data, error } = await supabase
      .from('workout_plans')
      .insert(insertData)
      .select() // Return the inserted record
      .single();

    if (error) {
      logger.error(`Supabase error storing workout plan for user ${userId}: ${error.message}`);
      throw new DatabaseError(`Database error storing workout plan: ${error.message}`);
    }

    if (!data) {
        logger.error(`No data returned after inserting workout plan for user ${userId}.`);
        throw new DatabaseError('Failed to store workout plan, no data returned.');
    }

    logger.info(`Workout plan stored successfully for user: ${userId}, Plan ID: ${data.id}`);
    return data;
  } catch (error) {
    logger.error(`Error in storeWorkoutPlan for user ${userId}: ${error.message}`);
    // Rethrow specific errors or a generic one
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError(`Failed to store workout plan: ${error.message}`);
  }
}

/**
 * Retrieves workout plans for a user with optional filtering and pagination.
 * @param {string} userId - The ID of the user whose plans to retrieve.
 * @param {object} filters - Optional filters (e.g., { limit, offset, searchTerm }).
 * @param {string} jwtToken - The user's JWT for RLS.
 * @returns {Promise<Array<object>>} A list of workout plan records.
 * @throws {DatabaseError} If the database operation fails.
 */
async function retrieveWorkoutPlans(userId, filters = {}, jwtToken) {
  const supabase = getSupabaseClientWithToken(jwtToken); // Use imported helper
  const { limit = 10, offset = 0, searchTerm } = filters;
  logger.debug(`Retrieving workout plans for user: ${userId} with filters: ${JSON.stringify(filters)}`);

  try {
    let query = supabase
      .from('workout_plans')
      .select('*') // Select specific columns if needed: 'id, plan_name, created_at'
      .eq('user_id', userId) // RLS should also enforce this, but explicit check is good
      .order('created_at', { ascending: false }) // Example ordering
      .range(offset, offset + limit - 1);

    // Example filtering (adjust column name 'plan_name' if needed)
    if (searchTerm) {
      // Use 'ilike' for case-insensitive partial matching on a text field
      // Ensure the column you are searching exists and is text-searchable
      // query = query.ilike('plan_name', `%${searchTerm}%`);
      // Or search within the JSONB 'plan' data if Supabase supports it well enough
      // query = query.textSearch('plan->>name', searchTerm); // Example, syntax might vary
      logger.warn(`Search term filtering is not fully implemented yet for column/field.`);
    }

    const { data, error } = await query;

    if (error) {
      logger.error(`Supabase error retrieving workout plans for user ${userId}: ${error.message}`);
      throw new DatabaseError(`Database error retrieving workout plans: ${error.message}`);
    }

    logger.info(`Retrieved ${data?.length ?? 0} workout plans for user: ${userId}`);
    return data || [];
  } catch (error) {
    logger.error(`Error in retrieveWorkoutPlans for user ${userId}: ${error.message}`);
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError(`Failed to retrieve workout plans: ${error.message}`);
  }
}

/**
 * Retrieves a specific workout plan by its ID.
 * @param {string} planId - The ID of the workout plan.
 * @param {string} userId - The ID of the user requesting the plan (for potential logging/validation).
 * @param {string} jwtToken - The user's JWT for RLS.
 * @returns {Promise<object>} The workout plan record.
 * @throws {NotFoundError} If the plan is not found.
 * @throws {DatabaseError} If the database operation fails.
 */
async function retrieveWorkoutPlan(planId, userId, jwtToken) {
  const supabase = getSupabaseClientWithToken(jwtToken); // Use imported helper
  logger.debug(`Retrieving workout plan ID: ${planId} for user: ${userId}`);

  try {
    const { data, error } = await supabase
      .from('workout_plans')
      .select('*')
      .eq('id', planId)
      // .eq('user_id', userId) // RLS handles this, but can be explicit if needed
      .single(); // Expect only one record

    if (error) {
        // Handle specific errors like 'PGRST116' (resource not found) if Supabase provides them
        if (error.code === 'PGRST116' || error.message.includes('Results contain 0 rows')) {
            logger.warn(`Workout plan ID: ${planId} not found for user: ${userId}.`);
            throw new NotFoundError(`Workout plan with ID ${planId} not found.`);
        }
        logger.error(`Supabase error retrieving workout plan ${planId} for user ${userId}: ${error.message}`);
        throw new DatabaseError(`Database error retrieving workout plan: ${error.message}`);
    }

    if (!data) {
      logger.warn(`Workout plan ID: ${planId} not found for user: ${userId} (no data returned).`);
      throw new NotFoundError(`Workout plan with ID ${planId} not found.`);
    }

    // Optional: Double-check ownership if RLS might be misconfigured (should not be needed with proper RLS)
    // if (data.user_id !== userId) {
    //   logger.error(`User ${userId} attempted to access plan ${planId} owned by ${data.user_id}. RLS might be misconfigured.`);
    //   throw new NotFoundError(`Workout plan with ID ${planId} not found.`); // Treat as not found for security
    // }

    logger.info(`Workout plan ID: ${planId} retrieved successfully for user: ${userId}`);
    return data;
  } catch (error) {
    logger.error(`Error in retrieveWorkoutPlan for plan ${planId}, user ${userId}: ${error.message}`);
    if (error instanceof DatabaseError || error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError(`Failed to retrieve workout plan: ${error.message}`);
  }
}

/**
 * Updates an existing workout plan with optimistic concurrency control.
 * @param {string} planId - The ID of the plan to update.
 * @param {object} updates - An object containing the fields to update.
 * @param {string} userId - The ID of the user making the update.
 * @param {string} jwtToken - The user's JWT for RLS.
 * @returns {Promise<object>} The updated workout plan record.
 * @throws {NotFoundError} If the plan is not found.
 * @throws {ConflictError} If maximum retry attempts are exceeded.
 * @throws {DatabaseError} If the database operation fails.
 */
async function updateWorkoutPlan(planId, updates, userId, jwtToken) {
  let retryCount = 0;
  
  while (retryCount <= MAX_RETRY_ATTEMPTS) {
    try {
      // Attempt the transaction
      const result = await executeTransaction(async (pgClient) => {
        logger.debug(`Attempting to update workout plan ID: ${planId} for user: ${userId}. Attempt ${retryCount + 1}.`);
        
        // Fetch the current plan to get its version
        const selectQuery = `
          SELECT * FROM workout_plans
          WHERE id = $1 AND user_id = $2;
        `;
        
        const { rows: planRows, rowCount } = await pgClient.query(selectQuery, [planId, userId]);
        
        if (rowCount === 0) {
          logger.warn(`Workout plan ID: ${planId} not found for update by user: ${userId}.`);
          throw new NotFoundError(`Workout plan with ID ${planId} not found.`);
        }
        
        const currentPlan = planRows[0];
        const currentVersion = currentPlan.version || 1;
        
        // Prepare the update with incremented version
        const updatesWithTimestamp = { 
          ...updates, 
          updated_at: new Date().toISOString(),
          version: currentVersion + 1
        };
        
        // Convert any object fields to JSON strings if necessary
        if (updatesWithTimestamp.plan_data && typeof updatesWithTimestamp.plan_data === 'object') {
          updatesWithTimestamp.plan_data = JSON.stringify(updatesWithTimestamp.plan_data);
        }
        
        // Create SQL query parts dynamically based on the update fields
        const updateFields = [];
        const queryParams = [];
        let paramIndex = 1;
        
        // Add each field from updates to the SQL query
        for (const [key, value] of Object.entries(updatesWithTimestamp)) {
          if (key !== 'id' && key !== 'user_id') { // Skip id and user_id
            updateFields.push(`${key} = $${paramIndex}`);
            queryParams.push(value);
            paramIndex++;
          }
        }
        
        // Add conditions for the WHERE clause
        queryParams.push(planId);
        queryParams.push(userId);
        queryParams.push(currentVersion);
        
        // Construct the final update query
        const updateQuery = `
          UPDATE workout_plans
          SET ${updateFields.join(', ')}
          WHERE id = $${paramIndex++} AND user_id = $${paramIndex++} AND version = $${paramIndex++}
          RETURNING *;
        `;
        
        const { rows: updatedRows, rowCount: updateCount } = await pgClient.query(updateQuery, queryParams);
        
        // Check if update was successful (should have affected 1 row)
        if (updateCount === 0) {
          // Check if this was due to a version conflict
          const checkQuery = `
            SELECT version FROM workout_plans 
            WHERE id = $1 AND user_id = $2;
          `;
          
          const { rows: checkRows } = await pgClient.query(checkQuery, [planId, userId]);
          
          if (checkRows.length > 0 && checkRows[0].version !== currentVersion) {
            // It's a version conflict - another update happened
            // Incrementing retryCount here is technically redundant as the loop does it, but harmless.
            // logger.info(`Concurrent update detected for plan ${planId}. Plan version is now ${checkRows[0].version}, our version was ${currentVersion}. Retrying (attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS})...`);
            
            // Let the while loop retry after the transaction completes (by throwing specific error)
            throw new Error(`VERSION_CONFLICT: Retrying attempt ${retryCount + 1}`); // Throw original conflict error
          } else {
            // It's not a version conflict, the update just failed
            logger.error(`Update failed for plan ${planId} (user ${userId}) but it wasn't a version conflict.`);
            throw new DatabaseError('Failed to update workout plan due to unknown error.');
          }
        }
        
        logger.info(`Workout plan ID: ${planId} updated successfully for user: ${userId} on attempt ${retryCount + 1}.`);
        return updatedRows[0]; // Success, return result from transaction
      });
      // If executeTransaction succeeded, return the result immediately
      return result;
    } catch (error) {
      // --- Revised Catch Block --- 
      // Check if it's the DatabaseError wrapper AND the original message included VERSION_CONFLICT
      if (error instanceof DatabaseError && error.message && error.message.includes('VERSION_CONFLICT:')) {
         logger.info(`[updateWorkoutPlan] Caught version conflict error (${error.message}), continuing retry loop.`);
         retryCount++; // Increment retry count here
         if (retryCount > MAX_RETRY_ATTEMPTS) {
             logger.warn(`Maximum retry attempts (${MAX_RETRY_ATTEMPTS}) exceeded for concurrent workout plan update for plan ${planId}.`);
             throw new ConflictError(`Maximum retry attempts exceeded for concurrent workout plan update for plan ${planId}`);
         }
         // If retries are left, the loop will continue
         continue; 
      }
      
      // If it's not a version conflict we can handle, or some other error from executeTransaction itself,
      // or an error from the callback that wasn't version conflict, rethrow it.
      logger.error(`[updateWorkoutPlan] Caught non-retryable error in attempt ${retryCount + 1}: ${error.message}`);
      // Handle specific errors like NotFoundError
      if (error instanceof NotFoundError || error instanceof ConflictError) {
          throw error;
      }
      // Throw others as generic DatabaseError or rethrow original if not DatabaseError already
      // Ensure we don't lose the original error message if it wasn't a DatabaseError
      throw error; // Rethrow the caught error directly
    }
  }
  
  // This line should only be reached if max retries are exceeded without throwing ConflictError above
  logger.error(`UpdateWorkoutPlan loop completed without success or specific error for plan ${planId}.`);
  throw new DatabaseError('Workout plan update failed after multiple retries.');
}

/**
 * Removes a workout plan from the database.
 * @param {string} planId - The ID of the plan to remove.
 * @param {string} userId - The ID of the user requesting deletion.
 * @param {string} jwtToken - The user's JWT for RLS.
 * @returns {Promise<void>} Resolves when deletion is successful.
 * @throws {NotFoundError} If the plan is not found.
 * @throws {DatabaseError} If the database operation fails.
 */
async function removeWorkoutPlan(planId, userId, jwtToken) {
  const supabase = getSupabaseClientWithToken(jwtToken); // Use imported helper
  logger.debug(`Attempting to remove workout plan ID: ${planId} for user: ${userId}`);

  try {
    // First, verify the plan exists and belongs to the user (via RLS-enabled select)
    // This helps return 404 correctly if the item doesn't exist, as DELETE might not error clearly.
    await retrieveWorkoutPlan(planId, userId, jwtToken);

    // If retrieveWorkoutPlan didn't throw, proceed with deletion
    const { error } = await supabase
      .from('workout_plans')
      .delete()
      .eq('id', planId);
      // .eq('user_id', userId); // RLS handles this

    if (error) {
      logger.error(`Supabase error removing workout plan ${planId} for user ${userId}: ${error.message}`);
      throw new DatabaseError(`Database error removing workout plan: ${error.message}`);
    }

    // Supabase delete might not return data or specific error on non-existent row if RLS hides it
    // The check above with retrieveWorkoutPlan helps ensure we know it existed first.

    logger.info(`Workout plan ID: ${planId} removed successfully for user: ${userId}`);
  } catch (error) {
    logger.error(`Error in removeWorkoutPlan for plan ${planId}, user ${userId}: ${error.message}`);
    if (error instanceof DatabaseError || error instanceof NotFoundError) {
      throw error;
    }
    // If retrieveWorkoutPlan failed, its error (like NotFoundError) is thrown here
    throw new DatabaseError(`Failed to remove workout plan: ${error.message}`);
  }
}

module.exports = {
  executeTransaction,
  storeWorkoutPlan,
  retrieveWorkoutPlans,
  retrieveWorkoutPlan,
  updateWorkoutPlan,
  removeWorkoutPlan,
}; 