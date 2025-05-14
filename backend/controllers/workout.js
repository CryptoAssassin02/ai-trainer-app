const workoutService = require('../services/workout-service');
const { WorkoutGenerationAgent, PlanAdjustmentAgent } = require('../agents'); // Assuming agents are exported from index
const logger = require('../config/logger');
const { NotFoundError, DatabaseError, ApplicationError } = require('../utils/errors');

/**
 * Generates a new workout plan using an agent and stores it.
 */
async function generateWorkoutPlan(req, res) {
  const userId = req.user?.id;
  const jwtToken = req.headers.authorization?.split(' ')[1];

  if (!userId || !jwtToken) {
    logger.warn('generateWorkoutPlan called without userId or jwtToken in request context.');
    return res.status(401).json({ status: 'error', message: 'Authentication required.' });
  }

  logger.info(`Generating workout plan for user: ${userId}`);

  try {
    // 1. Generate plan using the WorkoutGenerationAgent
    // The agent should ideally fetch necessary profile info itself or receive it validated
    const generationInput = { ...req.body, userId }; // Pass validated body and userId
    const generatedPlanData = await WorkoutGenerationAgent.process(generationInput);

    if (!generatedPlanData) {
        logger.error('WorkoutGenerationAgent returned no data.');
        throw new ApplicationError('Workout plan generation failed.');
    }

    // 2. Store the generated plan in the database
    const savedPlan = await workoutService.storeWorkoutPlan(userId, generatedPlanData, jwtToken);

    logger.info(`Workout plan successfully generated and stored for user ${userId}, Plan ID: ${savedPlan.id}`);
    return res.status(201).json({ status: 'success', data: savedPlan });

  } catch (error) {
    logger.error(`Error generating workout plan for user ${userId}: ${error.message}`, { error });
    if (error instanceof ApplicationError) {
      return res.status(500).json({ status: 'error', message: error.message });
    }
    // Handle other potential errors (e.g., from service or agent)
    return res.status(500).json({ status: 'error', message: 'Failed to generate workout plan due to an internal error.' });
  }
}

/**
 * Retrieves a list of workout plans for the authenticated user.
 */
async function getWorkoutPlans(req, res) {
  const userId = req.user?.id;
  const jwtToken = req.headers.authorization?.split(' ')[1];
  const filters = req.query; // Contains validated limit, offset, searchTerm from middleware

  if (!userId || !jwtToken) {
    logger.warn('getWorkoutPlans called without userId or jwtToken in request context.');
    return res.status(401).json({ status: 'error', message: 'Authentication required.' });
  }

  logger.info(`Fetching workout plans for user: ${userId} with filters: ${JSON.stringify(filters)}`);

  try {
    const plans = await workoutService.retrieveWorkoutPlans(userId, filters, jwtToken);
    logger.info(`Found ${plans.length} plans for user ${userId}`);
    return res.status(200).json({ status: 'success', data: plans });

  } catch (error) {
    logger.error(`Error retrieving workout plans for user ${userId}: ${error.message}`, { error });
     if (error instanceof DatabaseError) {
         return res.status(500).json({ status: 'error', message: 'Failed to retrieve workout plans due to a database issue.' });
     }
    return res.status(500).json({ status: 'error', message: 'Failed to retrieve workout plans due to an internal error.' });
  }
}

/**
 * Retrieves a specific workout plan by ID for the authenticated user.
 */
async function getWorkoutPlan(req, res) {
  const userId = req.user?.id;
  const jwtToken = req.headers.authorization?.split(' ')[1];
  const { planId } = req.params;

  if (!userId || !jwtToken) {
     logger.warn('getWorkoutPlan called without userId or jwtToken in request context.');
    return res.status(401).json({ status: 'error', message: 'Authentication required.' });
  }

  if (!planId) {
    return res.status(400).json({ status: 'error', message: 'Plan ID is required.' });
  }

  logger.info(`Fetching workout plan ID: ${planId} for user: ${userId}`);

  try {
    const plan = await workoutService.retrieveWorkoutPlan(planId, userId, jwtToken);
    logger.info(`Plan ${planId} retrieved successfully for user ${userId}`);
    return res.status(200).json({ status: 'success', data: plan });

  } catch (error) {
    logger.error(`Error retrieving workout plan ${planId} for user ${userId}: ${error.message}`, { error });
    if (error instanceof NotFoundError) {
      return res.status(404).json({ status: 'error', message: error.message });
    } else if (error instanceof DatabaseError) {
        return res.status(500).json({ status: 'error', message: 'Failed to retrieve workout plan due to a database issue.' });
    }
    return res.status(500).json({ status: 'error', message: 'Failed to retrieve workout plan due to an internal error.' });
  }
}

/**
 * Adjusts an existing workout plan using an agent based on user feedback.
 * Differentiates from a simple DB update.
 */
async function adjustWorkoutPlan(req, res) {
  const userId = req.user?.id;
  const jwtToken = req.headers.authorization?.split(' ')[1];
  const { planId } = req.params;
  const adjustmentData = req.body; // Contains validated 'adjustments' object

  if (!userId || !jwtToken) {
    logger.warn('adjustWorkoutPlan called without userId or jwtToken in request context.');
    return res.status(401).json({ status: 'error', message: 'Authentication required.' });
  }

   if (!planId) {
    return res.status(400).json({ status: 'error', message: 'Plan ID is required.' });
  }

  logger.info(`Adjusting workout plan ID: ${planId} for user: ${userId}`);

  try {
    // 1. Retrieve the current plan to provide context to the adjustment agent
    const currentPlanRecord = await workoutService.retrieveWorkoutPlan(planId, userId, jwtToken);

    // 2. Call the PlanAdjustmentAgent to process the feedback and generate the new plan data
    const agentInput = {
        plan: currentPlanRecord, // Pass the full plan record including updated_at
        userFeedback: adjustmentData.adjustments // Pass the validated feedback
    };
    const adjustedPlanData = await PlanAdjustmentAgent.process(agentInput);

    if (!adjustedPlanData) {
        logger.error(`PlanAdjustmentAgent returned no data for plan ${planId}.`);
        throw new ApplicationError('Workout plan adjustment failed.');
    }

    // 3. Update the plan in the database with the adjusted data
    //    We only update the 'plan' field (and updated_at) based on the agent's output
    const updates = { plan: adjustedPlanData };
    const updatedPlan = await workoutService.updateWorkoutPlan(planId, updates, userId, jwtToken);

    logger.info(`Workout plan ${planId} adjusted and updated successfully for user ${userId}`);
    return res.status(200).json({ status: 'success', data: updatedPlan });

  } catch (error) {
    logger.error(`Error adjusting workout plan ${planId} for user ${userId}: ${error.message}`, { error });
    if (error instanceof NotFoundError) {
      return res.status(404).json({ status: 'error', message: error.message });
    } else if (error instanceof ApplicationError) {
      return res.status(500).json({ status: 'error', message: error.message });
    } else if (error instanceof DatabaseError) {
        return res.status(500).json({ status: 'error', message: 'Failed to adjust workout plan due to a database issue.' });
    }
    return res.status(500).json({ status: 'error', message: 'Failed to adjust workout plan due to an internal error.' });
  }
}

/**
 * Deletes a specific workout plan by ID for the authenticated user.
 */
async function deleteWorkoutPlan(req, res) {
  const userId = req.user?.id;
  const jwtToken = req.headers.authorization?.split(' ')[1];
  const { planId } = req.params;

  if (!userId || !jwtToken) {
     logger.warn('deleteWorkoutPlan called without userId or jwtToken in request context.');
    return res.status(401).json({ status: 'error', message: 'Authentication required.' });
  }

   if (!planId) {
    return res.status(400).json({ status: 'error', message: 'Plan ID is required.' });
  }

  logger.info(`Deleting workout plan ID: ${planId} for user: ${userId}`);

  try {
    await workoutService.removeWorkoutPlan(planId, userId, jwtToken);
    logger.info(`Plan ${planId} deleted successfully for user ${userId}`);
    // Return 204 No Content on successful deletion
    return res.status(204).send();

  } catch (error) {
    logger.error(`Error deleting workout plan ${planId} for user ${userId}: ${error.message}`, { error });
    if (error instanceof NotFoundError) {
      return res.status(404).json({ status: 'error', message: error.message });
    } else if (error instanceof DatabaseError) {
        return res.status(500).json({ status: 'error', message: 'Failed to delete workout plan due to a database issue.' });
    }
    return res.status(500).json({ status: 'error', message: 'Failed to delete workout plan due to an internal error.' });
  }
}


module.exports = {
  generateWorkoutPlan,
  getWorkoutPlans,
  getWorkoutPlan,
  adjustWorkoutPlan, // Using this name for the agent-based adjustment
  deleteWorkoutPlan,
}; 