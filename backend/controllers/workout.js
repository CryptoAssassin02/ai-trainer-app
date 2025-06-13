const workoutService = require('../services/workout-service');
const { WorkoutGenerationAgent, PlanAdjustmentAgent, ResearchAgent } = require('../agents'); // Import ResearchAgent
const logger = require('../config/logger');
const { NotFoundError, DatabaseError, ApplicationError } = require('../utils/errors');
const { getSupabaseClientWithToken } = require('../services/supabase'); // Import RLS client helper
const AgentMemorySystem = require('../agents/memory/core'); // Import Memory System
const OpenAIService = require('../services/openai-service'); // Assuming this is how openaiService is accessed
const { PerplexityService } = require('../services/perplexity-service'); // Import Perplexity service with named export
const { getProfileByUserId } = require('../services/profile-service'); // Import profile service
const { isValidUUID } = require('../agents/memory/validators'); // Import UUID validator

// Instantiate services
const openaiService = new OpenAIService();
const perplexityService = new PerplexityService();

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
    const supabaseRLSClient = getSupabaseClientWithToken(jwtToken);
    
    // Fetch the user's full profile from the database
    let userProfile;
    try {
      userProfile = await getProfileByUserId(userId, jwtToken);
    } catch (profileError) {
      if (profileError instanceof NotFoundError) {
        return res.status(400).json({ 
          status: 'error', 
          message: 'User profile not found. Please complete your profile before generating a workout plan.' 
        });
      }
      throw profileError;
    }

    // If fitnessLevel is not in the profile but is in the request body, use it from the request
    if (!userProfile.experienceLevel && req.body.fitnessLevel) {
      userProfile.experienceLevel = req.body.fitnessLevel;
    }
    // Map experienceLevel to fitnessLevel for agent compatibility
    userProfile.fitnessLevel = userProfile.experienceLevel;

    // Ensure agent compatibility: add user_id field (snake_case) for WorkoutGenerationAgent
    // The profile service returns userId (camelCase) but the agent expects user_id (snake_case)
    userProfile.user_id = userProfile.userId || userId;

    const userScopedMemorySystem = new AgentMemorySystem({
        supabase: supabaseRLSClient,
        openai: openaiService, // Agents using memory for embeddings might need openai
        logger
    });

    // Step 1: Use Research Agent to gather research data
    const researchAgent = new ResearchAgent({
        perplexityService,
        supabaseClient: supabaseRLSClient,
        memorySystem: userScopedMemorySystem,
        logger
    });

    // Prepare research context
    const researchContext = {
      userProfile,
      goals: req.body.goals || userProfile.goals || ['general_fitness'],
      equipment: req.body.equipment || userProfile.equipment || ['none'],
      restrictions: req.body.restrictions || [],
      exerciseTypes: req.body.exerciseTypes || ['strength']
    };

    logger.info('Calling Research Agent to gather exercise research...');
    const researchResult = await researchAgent.process(researchContext);

    if (!researchResult || !researchResult.success) {
      logger.error('Research Agent failed to gather research data', { result: researchResult });
      throw new ApplicationError(researchResult?.error?.message || 'Failed to gather exercise research.');
    }

    // Step 2: Use Workout Generation Agent with research data
    const generationAgent = new WorkoutGenerationAgent({
        openaiService,
        supabaseClient: supabaseRLSClient,
        memorySystem: userScopedMemorySystem,
        logger
    });

    // Prepare generation context with research data
    const generationContext = {
      userProfile,
      goals: researchContext.goals,
      researchData: researchResult.data // Pass the research data from Research Agent
    };

    logger.info('Calling Workout Generation Agent to create personalized plan...');
    const generatedPlanResult = await generationAgent.process(generationContext);

    // Assuming the agent's process method returns an object with a data property for the plan
    if (!generatedPlanResult || generatedPlanResult.status !== 'success') {
        logger.error('WorkoutGenerationAgent returned no data or failed.', { result: generatedPlanResult });
        throw new ApplicationError(generatedPlanResult?.data?.errors?.[0] || 'Workout plan generation failed.');
    }

    // Extract plan data from the correct structure - generatedPlanResult.data contains the actual plan data
    const planDataForStorage = {
      planName: generatedPlanResult.data.planName,
      weeklySchedule: generatedPlanResult.data.weeklySchedule, // Include weeklySchedule that test expects
      exercises: generatedPlanResult.data.exercises,
      formattedPlan: generatedPlanResult.data.formattedPlan,
      explanations: generatedPlanResult.data.explanations,
      researchInsights: generatedPlanResult.data.researchInsights,
      reasoning: generatedPlanResult.data.reasoning,
      warnings: generatedPlanResult.data.warnings,
      errors: generatedPlanResult.data.errors
    };

    const savedPlan = await workoutService.storeWorkoutPlan(userId, planDataForStorage, jwtToken);

    logger.info(`Workout plan successfully generated and stored for user ${userId}, Plan ID: ${savedPlan.id}`);
    return res.status(201).json({ status: 'success', data: savedPlan });

  } catch (error) {
    logger.error(`Error generating workout plan for user ${userId}: ${error.message}`, { error });
    
    if (error instanceof ApplicationError || error instanceof NotFoundError || error instanceof DatabaseError) {
      return res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
    }
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

  // Validate UUID format before making database call
  if (!isValidUUID(planId)) {
    return res.status(404).json({ status: 'error', message: 'Workout plan not found.' });
  }

  logger.info(`Fetching workout plan ID: ${planId} for user: ${userId}`);

  try {
    const plan = await workoutService.retrieveWorkoutPlan(planId, userId, jwtToken);
    
    // Format the response to match expected API structure
    const formattedResponse = {
      id: plan.id,
      name: plan.name,
      description: plan.description,
      planData: plan.plan_data, // Extract plan_data from database and present as planData
      aiGenerated: plan.ai_generated,
      status: plan.status,
      createdAt: plan.created_at,
      updatedAt: plan.updated_at,
      version: plan.version
    };
    
    logger.info(`Plan ${planId} retrieved successfully for user ${userId}`);
    return res.status(200).json({ status: 'success', data: formattedResponse });

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

  // Validate UUID format before making database call
  if (!isValidUUID(planId)) {
    return res.status(404).json({ status: 'error', message: 'Workout plan not found.' });
  }

  logger.info(`Adjusting workout plan ID: ${planId} for user: ${userId}`);

  try {
    const supabaseRLSClient = getSupabaseClientWithToken(jwtToken);
    const userScopedMemorySystem = new AgentMemorySystem({
        supabase: supabaseRLSClient,
        openai: openaiService,
        logger
    });

    // 1. Retrieve the current plan to provide context to the adjustment agent
    const currentPlanRecord = await workoutService.retrieveWorkoutPlan(planId, userId, jwtToken);

    const adjustmentAgent = new PlanAdjustmentAgent({
        openaiService,
        supabaseClient: supabaseRLSClient,
        memorySystem: userScopedMemorySystem,
        logger
    });

    // 2. Call the PlanAdjustmentAgent to process the feedback and generate the new plan data
    // Ensure the plan object has the required planId property for the agent
    const planForAgent = {
        ...currentPlanRecord,
        planId: currentPlanRecord.id || planId // Add planId property that the agent expects
    };

    // Extract feedback string from the adjustments object according to API spec
    let feedbackString = '';
    if (adjustmentData.adjustments) {
        if (typeof adjustmentData.adjustments === 'string') {
            feedbackString = adjustmentData.adjustments;
        } else if (adjustmentData.adjustments.notesOrPreferences) {
            feedbackString = adjustmentData.adjustments.notesOrPreferences;
        } else {
            // Handle other adjustment types by creating a descriptive feedback string
            const adjustmentParts = [];
            if (adjustmentData.adjustments.exercisesToAdd?.length > 0) {
                adjustmentParts.push(`Add exercises: ${adjustmentData.adjustments.exercisesToAdd.join(', ')}`);
            }
            if (adjustmentData.adjustments.exercisesToRemove?.length > 0) {
                adjustmentParts.push(`Remove exercises: ${adjustmentData.adjustments.exercisesToRemove.join(', ')}`);
            }
            feedbackString = adjustmentParts.join('. ') || 'General plan adjustment requested';
        }
    }

    if (!feedbackString.trim()) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'No valid feedback provided for plan adjustment.' 
        });
    }

    const agentInput = {
        plan: planForAgent, 
        feedback: feedbackString, // Pass the extracted feedback string
        userProfile: {
            ...req.user,
            user_id: req.user.id || userId // Ensure user_id is available for the agent
        }
    };
    // The agent's process method now needs to be called on the instance
    const adjustedPlanResult = await adjustmentAgent.process(agentInput);

    if (!adjustedPlanResult || adjustedPlanResult.status !== 'success' || !adjustedPlanResult.adjustedPlan) {
        logger.error(`PlanAdjustmentAgent returned no data or failed for plan ${planId}.`, { result: adjustedPlanResult });
        throw new ApplicationError(adjustedPlanResult?.errors?.[0]?.message || 'Workout plan adjustment failed.');
    }
    // The actual plan data is expected to be in adjustedPlanResult.adjustedPlan
    const adjustedPlanForStorage = adjustedPlanResult.adjustedPlan;

    // 3. Update the workout plan in the database with the adjusted data
    const updates = { plan_data: adjustedPlanResult.adjustedPlan }; // Use correct column name
    const updatedPlan = await workoutService.updateWorkoutPlan(planId, updates, userId, jwtToken);

    logger.info(`Workout plan ${planId} adjusted and updated successfully for user ${userId}`);
    // Return the full agent result which includes explanations, etc.
    return res.status(200).json({ status: 'success', data: adjustedPlanResult });

  } catch (error) {
    logger.error(`Error adjusting workout plan ${planId} for user ${userId}: ${error.message}`, { error });
    if (error instanceof NotFoundError || error instanceof ApplicationError || error instanceof DatabaseError) {
      return res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
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

  // Validate UUID format before making database call
  if (!isValidUUID(planId)) {
    return res.status(404).json({ status: 'error', message: 'Workout plan not found.' });
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

console.log('@@@ CONTROLLERS/WORKOUT.JS: generateWorkoutPlan is defined as:', typeof generateWorkoutPlan);
console.log('@@@ CONTROLLERS/WORKOUT.JS: workoutController to be exported:', {
  generateWorkoutPlan: typeof generateWorkoutPlan,
  getWorkoutPlans: typeof getWorkoutPlans,
  getWorkoutPlan: typeof getWorkoutPlan,
  adjustWorkoutPlan: typeof adjustWorkoutPlan,
  deleteWorkoutPlan: typeof deleteWorkoutPlan,
});

module.exports = {
  generateWorkoutPlan,
  getWorkoutPlans,
  getWorkoutPlan,
  adjustWorkoutPlan, // Using this name for the agent-based adjustment
  deleteWorkoutPlan,
}; 