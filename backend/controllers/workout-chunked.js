const OpenAIService = require('../services/openai-service');
const WorkoutStructureAgent = require('../agents/workout-structure-agent');
const WeeklyStructureAgent = require('../agents/weekly-structure-agent');
const DailyWorkoutAgent = require('../agents/daily-workout-agent');
const AdjustmentAgent = require('../agents/adjustment-agent');
const WorkoutCompletionVerifier = require('../utils/workout-completion-verifier');
const WorkoutGenerationStateManager = require('../utils/workout-generation-state-manager');
// Removed non-existent database-utils import - using direct supabase operations instead
const { getSupabaseClientWithToken } = require('../services/supabase');
const { getProfileByUserId } = require('../services/profile-service');
const { NotFoundError, DatabaseError, ApplicationError } = require('../utils/errors');
const logger = require('../config/logger');

/**
 * Generate high-level workout program structure
 * POST /api/v1/workouts/structure
 */
async function generateWorkoutStructure(req, res) {
  const startTime = Date.now();
  const USE_STRUCTURED_OUTPUTS = process.env.USE_STRUCTURED_OUTPUTS !== 'false';
  
  try {
    const { goals, fitnessLevel, exerciseTypes, restrictions, workoutFrequency, additionalNotes, primaryGoal } = req.body;
    const userId = req.user.id;
    const jwtToken = req.headers.authorization?.split(' ')[1];
    
    // Validate input
    if (!goals || !Array.isArray(goals) || goals.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Goals array is required and cannot be empty'
      });
    }

    // Fetch user profile for context
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

    // Merge request data with profile data (snapshot for plan_data)
    const mergedProfile = {
      ...userProfile,
      fitnessLevel: fitnessLevel || userProfile.experienceLevel,
      preferences: {
        ...userProfile.preferences,
        exerciseTypes: exerciseTypes || userProfile.exerciseTypes,
        restrictions: restrictions || userProfile.restrictions,
        workoutFrequency: workoutFrequency || userProfile.workoutFrequency,
        gymCategory: userProfile.gymCategory || 'minimal_home'
      },
      // Include additionalNotes if provided in request or present on profile
      ...(additionalNotes && String(additionalNotes).trim().length > 0
        ? { additionalNotes: String(additionalNotes).trim() }
        : (userProfile.additionalNotes && String(userProfile.additionalNotes).trim().length > 0
            ? { additionalNotes: String(userProfile.additionalNotes).trim() }
            : {}))
    };

    // Resolve primary goal for context
    const resolvedPrimaryGoal = primaryGoal || userProfile.primaryGoal || null;

    // Use Agent for structure generation
    const structureAgent = new WorkoutStructureAgent({ openaiService: new OpenAIService() });
    const result = await structureAgent.safeProcess({
      userProfile,
      requestData: req.body,
      gymData: {},
      primaryGoal: resolvedPrimaryGoal,
      injuryPrompt: ''
    }, { useStructuredOutputs: USE_STRUCTURED_OUTPUTS });

    if (!result.success) {
      try {
        await stateManager.handleError(planId, result.error, { mesocycle: mesocycleNum });
      } catch (_) {}
      const status = result.error?.code === 'AGENT_VALIDATION_ERROR' ? 400
        : result.error?.code === 'AGENT_EXTERNAL_SERVICE_ERROR' ? 503
        : 500;
      return res.status(status).json({ status: 'error', message: result.error.message, details: result.error.details });
    }

    const structureData = result.data;

    // Determine generation method based on goals
    const isMultiGoal = goals && goals.length > 1;
    const generationMethod = isMultiGoal ? 'multi_goal_orchestrated' : 'single_goal';
    
    // Create initial orchestrator data for multi-goal plans
    const orchestratorData = isMultiGoal ? {
      goals: goals,
      primaryGoal: resolvedPrimaryGoal,
      programStructure: structureData,
      trainingParameters: {
        frequency: structureData.trainingFrequency || { daysPerWeek: 4 },
        duration: structureData.totalDuration || 12,
        mesocycles: structureData.totalMesocycles || 3
      },
      generationMetadata: {
        method: 'chunked_generation',
        structureGeneratedAt: new Date().toISOString(),
        totalMesocycles: structureData.totalMesocycles
      }
    } : {};
    
    console.log('[DEBUG] Initial generation method:', generationMethod);
    console.log('[DEBUG] Initial orchestrator data:', JSON.stringify(orchestratorData, null, 2));
    
    // Store in database with chunking state
    const supabaseRLSClient = getSupabaseClientWithToken(jwtToken);
    
    const { data: planData, error: insertError } = await supabaseRLSClient
      .from('workout_plans')
      .insert({
        user_id: userId,
        name: structureData.programName,
        description: `AI-generated chunked workout plan - ${structureData.programName}`,
        generation_state: 'structure_generated',
        total_mesocycles: structureData.totalMesocycles,
        mesocycles_generated: 0,
        current_mesocycle: 1,
        generation_started_at: new Date().toISOString(),
        ai_generated: true,
        status: 'draft',
        goals: goals || ['general_fitness'],
        primary_goal: resolvedPrimaryGoal,
        generation_method: generationMethod,
        orchestrator_data: orchestratorData,
        plan_data: {
          structure: structureData,
          userProfile: mergedProfile,
          generationMethod: 'chunked_structure'
        }
      })
      .select('id')
      .single();

    if (insertError) throw insertError;
    const planId = planData.id;

    res.status(201).json({
      status: 'success',
      data: {
        planId,
        structure: structureData,
        nextStep: {
          action: 'generate_mesocycle',
          mesocycleNumber: 1,
          endpoint: `/api/v1/workouts/${planId}/mesocycles/1`
        }
      },
      message: 'Program structure generated successfully'
    });

  } catch (error) {
    console.error('[generateWorkoutStructure] Error:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate workout structure',
      details: error.message
    });
  }
}

/**
 * Generate detailed daily workouts for a specific mesocycle
 * POST /api/v1/workouts/:planId/mesocycles/:mesocycleNumber
 */
async function generateMesocycleDetails(req, res) {
  const startTime = Date.now();
  const USE_STRUCTURED_OUTPUTS = process.env.USE_STRUCTURED_OUTPUTS !== 'false';
  
  try {
    const { planId, mesocycleNumber } = req.params;
    const userId = req.user.id;
    
    // Get existing plan structure
    const jwtToken = req.headers.authorization?.split(' ')[1];
    const supabaseRLSClient = getSupabaseClientWithToken(jwtToken);
    const { data: plan, error: fetchError } = await supabaseRLSClient
      .from('workout_plans')
      .select('*')
      .eq('id', planId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !plan) {
      return res.status(404).json({
        status: 'error',
        message: 'Workout plan not found'
      });
    }

    // Validate mesocycle number
    const mesocycleNum = parseInt(mesocycleNumber);
    if (mesocycleNum < 1 || mesocycleNum > plan.total_mesocycles) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid mesocycle number. Must be between 1 and ${plan.total_mesocycles}`
      });
    }

    // Check if already generated
    if (plan.mesocycles_generated >= mesocycleNum) {
      return res.status(409).json({
        status: 'error',
        message: `Mesocycle ${mesocycleNum} already generated`
      });
    }

    // Update state to generating via state manager
    const stateManager = new WorkoutGenerationStateManager(supabaseRLSClient);
    await stateManager.recordProgress(planId, mesocycleNum, 'generating');

    // Validate weekly structure presence for this mesocycle
    const planData = plan.plan_data || {};
    const mesocycles = planData.mesocycles || [];
    const isArray = Array.isArray(mesocycles);
    const mesoIndex = isArray ? (mesocycleNum - 1) : mesocycleNum;
    const mesoNode = isArray ? mesocycles[mesoIndex] : (mesocycles && mesocycles[mesoIndex]);
    const weeklyStructure = mesoNode && Array.isArray(mesoNode.weekly_structures) && mesoNode.weekly_structures.length > 0
      ? mesoNode.weekly_structures
      : null;

    if (!weeklyStructure) {
      return res.status(400).json({
        status: 'error',
        message: `Weekly structure missing for mesocycle ${mesocycleNum}. Generate weekly structure before daily workouts.`
      });
    }

    // Build inputs for DailyWorkoutAgent
    const structure = planData.structure || {};
    const mCtx = Array.isArray(structure?.mesocycles)
      ? structure.mesocycles[mesocycleNum - 1]
      : null;

    const userInputs = {
      goals: plan.goals || [],
      trainingFrequency: structure?.trainingFrequency || plan.plan_data?.userProfile?.preferences?.workoutFrequency || {},
      equipment: plan.equipment_required || plan.plan_data?.userProfile?.equipment || []
    };

    const mesocycleData = {
      focus: mCtx?.focus || mCtx?.theme || 'general',
      duration: mCtx?.duration || structure?.totalDuration || 4
    };

    // Use DailyWorkoutAgent for daily workout generation
    const dailyAgent = new DailyWorkoutAgent({ openaiService: new OpenAIService(), supabaseClient: supabaseRLSClient });
    const result = await dailyAgent.safeProcess({
      userProfile: plan.plan_data.userProfile || {},
      userInputs,
      mesocycleData,
      weeklyStructure
    }, { useStructuredOutputs: USE_STRUCTURED_OUTPUTS });

    if (!result.success) {
      const status = result.error?.code === 'AGENT_VALIDATION_ERROR' ? 400
        : result.error?.code === 'AGENT_EXTERNAL_SERVICE_ERROR' ? 503
        : 500;
      return res.status(status).json({ status: 'error', message: result.error.message, details: result.error.details });
    }

    const dailyWorkouts = result.data;

    // Update plan with daily workouts under mesocycle node
    const currentPlanData = plan.plan_data;
    if (!currentPlanData.mesocycles) {
      currentPlanData.mesocycles = Array.isArray(mesocycles) ? mesocycles : {};
    }

    if (Array.isArray(currentPlanData.mesocycles)) {
      // Ensure array is large enough
      while (currentPlanData.mesocycles.length < mesocycleNum) {
        currentPlanData.mesocycles.push({});
      }
      currentPlanData.mesocycles[mesocycleNum - 1] = {
        ...(currentPlanData.mesocycles[mesocycleNum - 1] || {}),
        daily_workouts: dailyWorkouts
      };
    } else {
      currentPlanData.mesocycles[mesocycleNum] = {
        ...(currentPlanData.mesocycles[mesocycleNum] || {}),
        daily_workouts: dailyWorkouts
      };
    }

    // Update generation state
    const isComplete = mesocycleNum === plan.total_mesocycles;
    const updateData = {
      mesocycles_generated: mesocycleNum,
      generation_completed_at: isComplete ? new Date().toISOString() : null,
      plan_data: currentPlanData
    };
    
    // If generation is complete, set proper generation method and orchestrator data
    if (isComplete) {
      const isMultiGoal = plan.goals && plan.goals.length > 1;
      const generationMethod = isMultiGoal ? 'multi_goal_orchestrated' : 'single_goal';
      
      // Create orchestrator data for multi-goal plans
      const orchestratorData = isMultiGoal ? {
        goals: plan.goals,
        primaryGoal: plan.primary_goal || plan.goals[0],
        programStructure: currentPlanData.structure,
        mesocycleDetails: currentPlanData.mesocycles,
        trainingParameters: {
          frequency: currentPlanData.structure?.trainingFrequency || { daysPerWeek: 4 },
          duration: currentPlanData.structure?.totalDuration || 12,
          mesocycles: currentPlanData.structure?.totalMesocycles || 3
        },
        generationMetadata: {
          method: 'chunked_generation',
          completedAt: new Date().toISOString(),
          totalMesocycles: plan.total_mesocycles
        }
      } : {};
      
      updateData.generation_method = generationMethod;
      updateData.orchestrator_data = orchestratorData;
      
      console.log('[DEBUG] Setting final generation method:', generationMethod);
      console.log('[DEBUG] Setting orchestrator data:', JSON.stringify(orchestratorData, null, 2));
    }
    
    const { data: updatedPlan, error: planUpdateError } = await supabaseRLSClient
      .from('workout_plans')
      .update({
        ...updateData,
        generation_state: isComplete ? 'completed' : `mesocycle_${mesocycleNum}_complete`
      })
      .eq('id', planId)
      .select('*')
      .single();

    if (planUpdateError) throw planUpdateError;

    // Prepare response
    const responseData = {
      planId,
      mesocycleNumber: mesocycleNum,
      dailyWorkouts,
      generationComplete: mesocycleNum === plan.total_mesocycles
    };

    if (mesocycleNum < plan.total_mesocycles) {
      responseData.nextStep = {
        action: 'generate_mesocycle',
        mesocycleNumber: mesocycleNum + 1,
        endpoint: `/api/v1/workouts/${planId}/mesocycles/${mesocycleNum + 1}`
      };
    }

    res.status(200).json({
      status: 'success',
      data: responseData,
      message: `Mesocycle ${mesocycleNum} generated successfully`
    });

  } catch (error) {
    console.error('[generateMesocycleDetails] Error:', error);
    
    // Centralized error state handling
    try {
      const stateManager = new WorkoutGenerationStateManager(supabaseRLSClient);
      await stateManager.handleError(req.params.planId, error, { mesocycle: parseInt(mesocycleNumber) });
    } catch (resetError) {
      console.error('[generateMesocycleDetails] Error resetting state:', resetError);
    }
    
    res.status(500).json({
      status: 'error',
      message: `Failed to generate mesocycle ${mesocycleNumber}`,
      details: error.message
    });
  }
}

/**
 * Generate weekly structure for a specific mesocycle
 * POST /api/v1/workouts/:planId/mesocycles/:mesocycleNumber/weekly-structure
 */
async function generateWeeklyStructure(req, res) {
  const USE_STRUCTURED_OUTPUTS = process.env.USE_STRUCTURED_OUTPUTS !== 'false';

  try {
    const { planId, mesocycleNumber } = req.params;
    const userId = req.user.id;
    const mesocycleNum = parseInt(mesocycleNumber);

    const jwtToken = req.headers.authorization?.split(' ')[1];
    const supabaseRLSClient = getSupabaseClientWithToken(jwtToken);
    const { data: plan, error: fetchError } = await supabaseRLSClient
      .from('workout_plans')
      .select('*')
      .eq('id', planId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !plan) {
      return res.status(404).json({ status: 'error', message: 'Workout plan not found' });
    }

    if (mesocycleNum < 1 || mesocycleNum > plan.total_mesocycles) {
      return res.status(400).json({ status: 'error', message: `Invalid mesocycle number. Must be between 1 and ${plan.total_mesocycles}` });
    }

    const structure = plan.plan_data?.structure;
    if (!structure) {
      return res.status(400).json({ status: 'error', message: 'Program structure required before weekly structure generation' });
    }

    const mCtx = Array.isArray(structure.mesocycles) ? structure.mesocycles[mesocycleNum - 1] : null;
    if (!mCtx) {
      return res.status(400).json({ status: 'error', message: `Missing mesocycle context for ${mesocycleNum}` });
    }

    const userInputs = {
      goals: plan.goals || [],
      trainingFrequency: structure?.trainingFrequency || {},
      equipment: plan.equipment_required || plan.plan_data?.userProfile?.equipment || []
    };
    const mesocycleData = { focus: mCtx?.focus || mCtx?.theme || 'general', duration: mCtx?.duration || 4 };

    const weeklyAgent = new WeeklyStructureAgent({ openaiService: new OpenAIService(), supabaseClient: supabaseRLSClient });
    const result = await weeklyAgent.safeProcess({
      userProfile: plan.plan_data?.userProfile || {},
      userInputs,
      mesocycleData
    }, { useStructuredOutputs: USE_STRUCTURED_OUTPUTS });

    if (!result.success) {
      const status = result.error?.code === 'AGENT_VALIDATION_ERROR' ? 400
        : result.error?.code === 'AGENT_EXTERNAL_SERVICE_ERROR' ? 503
        : 500;
      return res.status(status).json({ status: 'error', message: result.error.message, details: result.error.details });
    }

    const weekly = result.data;

    const currentPlanData = plan.plan_data || {};
    if (!Array.isArray(currentPlanData.mesocycles)) {
      currentPlanData.mesocycles = [];
    }
    while (currentPlanData.mesocycles.length < mesocycleNum) {
      currentPlanData.mesocycles.push({});
    }
    currentPlanData.mesocycles[mesocycleNum - 1] = {
      ...(currentPlanData.mesocycles[mesocycleNum - 1] || {}),
      weekly_structures: weekly
    };

    const { error: updateError } = await supabaseRLSClient
      .from('workout_plans')
      .update({ plan_data: currentPlanData })
      .eq('id', planId);
    if (updateError) throw updateError;

    res.status(200).json({ status: 'success', data: { planId, mesocycleNumber: mesocycleNum, weeklyStructure: weekly }, message: `Weekly structure for mesocycle ${mesocycleNum} generated successfully` });

  } catch (error) {
    console.error('[generateWeeklyStructure] Error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to generate weekly structure', details: error.message });
  }
}

/**
 * Adjust plan at specified stage
 * POST /api/v1/workouts/:planId/adjust
 */
async function adjustPlan(req, res) {
  const USE_STRUCTURED_OUTPUTS = process.env.USE_STRUCTURED_OUTPUTS !== 'false';

  try {
    const { planId } = req.params;
    const { agentType, editRequest, mesocycleIndex } = req.body || {};
    const userId = req.user.id;
    const jwtToken = req.headers.authorization?.split(' ')[1];
    const supabaseRLSClient = getSupabaseClientWithToken(jwtToken);

    const { data: plan, error: fetchError } = await supabaseRLSClient
      .from('workout_plans')
      .select('*')
      .eq('id', planId)
      .eq('user_id', userId)
      .single();
    if (fetchError || !plan) {
      return res.status(404).json({ status: 'error', message: 'Workout plan not found' });
    }

    const agent = new AdjustmentAgent({ openaiService: new OpenAIService(), supabaseClient: supabaseRLSClient });
    const result = await agent.safeProcess({
      planId,
      agentType,
      editRequest,
      currentPlanData: plan.plan_data,
      userProfile: plan.plan_data?.userProfile || {},
      triggerFollowUps: true
    }, { useStructuredOutputs: USE_STRUCTURED_OUTPUTS, mesocycleIndex });

    if (!result.success) {
      const status = result.error?.code === 'AGENT_VALIDATION_ERROR' ? 400
        : result.error?.code === 'AGENT_EXTERNAL_SERVICE_ERROR' ? 503
        : 500;
      return res.status(status).json({ status: 'error', message: result.error.message, details: result.error.details });
    }

    const updatedPlanData = result.data;
    const { error: updateError } = await supabaseRLSClient
      .from('workout_plans')
      .update({ plan_data: updatedPlanData })
      .eq('id', planId);
    if (updateError) throw updateError;

    res.status(200).json({ status: 'success', data: { planId, planData: updatedPlanData }, message: 'Plan adjusted successfully' });

  } catch (error) {
    console.error('[adjustPlan] Error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to adjust plan', details: error.message });
  }
}

/**
 * Orchestrate progressive generation with SSE
 * POST /api/v1/workouts/:planId/generate-progressive
 */
async function generateProgressiveWorkout(req, res) {
  // Server-Sent Events (SSE) progressive generation for Phase 1
  // Stream events: structure_generated -> mesocycle_progress (generating, complete) -> completed
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders && res.flushHeaders();

  const sendEvent = (type, data) => {
    try {
      res.write(`event: ${type}\n`);
      res.write(`data: ${JSON.stringify(data || {})}\n\n`);
    } catch (_) {}
  };

  let closed = false;
  req.on('close', () => { closed = true; try { res.end(); } catch {} });

  const { planId } = req.params;
  const userId = req.user?.id;
  const jwtToken = req.headers.authorization?.split(' ')[1];

  try {
    const supabaseRLSClient = getSupabaseClientWithToken(jwtToken);
    const { data: plan, error: fetchError } = await supabaseRLSClient
      .from('workout_plans')
      .select('*')
      .eq('id', planId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !plan) {
      sendEvent('error', { message: 'Workout plan not found' });
      return res.end();
    }

    // Ensure structure exists
    const structure = plan?.plan_data?.structure;
    if (!structure) {
      sendEvent('error', { message: 'Program structure not found for this plan' });
      return res.end();
    }

    // Notify clients that structure exists (UI will set Weekly to In Progress)
    if (!closed) sendEvent('structure_generated', { planId });

    // Generate Weekly Structure for Mesocycle 1 (Phase 1)
    if (closed) return; // client disconnected
    const weeklyAgent = new WeeklyStructureAgent({ openaiService: new OpenAIService(), supabaseClient: supabaseRLSClient });
    const mCtx = Array.isArray(structure.mesocycles) ? structure.mesocycles[0] : null;
    const weeklyResult = await weeklyAgent.safeProcess({
      userProfile: plan.plan_data?.userProfile || {},
      userInputs: {
        goals: plan.goals || [],
        trainingFrequency: structure?.trainingFrequency || {},
        equipment: plan.equipment_required || plan.plan_data?.userProfile?.equipment || []
      },
      mesocycleData: { focus: mCtx?.focus || mCtx?.theme || 'general', duration: mCtx?.duration || 4 }
    }, { useStructuredOutputs: process.env.USE_STRUCTURED_OUTPUTS !== 'false' });

    if (!weeklyResult.success) {
      sendEvent('error', { message: weeklyResult.error?.message || 'Weekly structure failed' });
      return res.end();
    }

    // Persist weekly structure under mesocycle 1
    const currentPlanData = plan.plan_data || {};
    if (!Array.isArray(currentPlanData.mesocycles)) {
      currentPlanData.mesocycles = [];
    }
    while (currentPlanData.mesocycles.length < 1) currentPlanData.mesocycles.push({});
    currentPlanData.mesocycles[0] = {
      ...(currentPlanData.mesocycles[0] || {}),
      weekly_structures: weeklyResult.data
    };
    await supabaseRLSClient.from('workout_plans').update({ plan_data: currentPlanData }).eq('id', planId);

    // Notify UI that weekly structure has completed successfully
    if (!closed) sendEvent('weekly_complete', { planId });

    // Begin Daily Workouts for Mesocycle 1
    if (closed) return;
    sendEvent('mesocycle_progress', { planId, mesocycleNumber: 1, status: 'generating' });

    const dailyAgent = new DailyWorkoutAgent({ openaiService: new OpenAIService(), supabaseClient: supabaseRLSClient });
    const dailyResult = await dailyAgent.safeProcess({
      userProfile: plan.plan_data?.userProfile || {},
      userInputs: {
        goals: plan.goals || [],
        trainingFrequency: structure?.trainingFrequency || {},
        equipment: plan.equipment_required || plan.plan_data?.userProfile?.equipment || []
      },
      mesocycleData: { focus: mCtx?.focus || mCtx?.theme || 'general', duration: mCtx?.duration || 4 },
      weeklyStructure: weeklyResult.data
    }, { useStructuredOutputs: process.env.USE_STRUCTURED_OUTPUTS !== 'false' });

    if (!dailyResult.success) {
      sendEvent('error', { message: dailyResult.error?.message || 'Daily workouts failed' });
      return res.end();
    }

    // Persist daily workouts, advance state to mesocycle_1_complete
    const updatedPlanData = currentPlanData;
    updatedPlanData.mesocycles[0] = {
      ...(updatedPlanData.mesocycles[0] || {}),
      daily_workouts: dailyResult.data
    };
    await supabaseRLSClient
      .from('workout_plans')
      .update({
        plan_data: updatedPlanData,
        mesocycles_generated: Math.max(1, plan.mesocycles_generated || 0),
        generation_state: 'mesocycle_1_complete'
      })
      .eq('id', planId);

    if (!closed) sendEvent('mesocycle_progress', { planId, mesocycleNumber: 1, status: 'complete' });

    // Final event for phase 1
    if (!closed) sendEvent('completed', { planId });
    try { res.end(); } catch {}
  } catch (error) {
    console.error('[generateProgressiveWorkout] Error:', error);
    try { sendEvent('error', { message: error?.message || 'Unexpected error' }); } catch {}
    try { res.end(); } catch {}
  }
}

/**
 * Get generation status for a workout plan
 * GET /api/v1/workouts/:planId/status
 */
async function getGenerationStatus(req, res) {
  try {
    const { planId } = req.params;
    const userId = req.user.id;
    const jwtToken = req.headers.authorization?.split(' ')[1];
    
    const supabaseRLSClient = getSupabaseClientWithToken(jwtToken);
    const { data: plan, error } = await supabaseRLSClient
      .from('workout_plans')
      .select('id, generation_state, mesocycles_generated, total_mesocycles, current_mesocycle, generation_started_at, generation_completed_at, generation_errors')
      .eq('id', planId)
      .eq('user_id', userId)
      .single();

    if (error || !plan) {
      return res.status(404).json({
        status: 'error',
        message: 'Workout plan not found'
      });
    }

    const progress = {
      planId,
      state: plan.generation_state,
      progress: {
        completed: plan.mesocycles_generated,
        total: plan.total_mesocycles,
        percentage: Math.round((plan.mesocycles_generated / plan.total_mesocycles) * 100)
      },
      currentMesocycle: plan.current_mesocycle,
      timestamps: {
        started: plan.generation_started_at,
        completed: plan.generation_completed_at
      },
      errors: plan.generation_errors || []
    };

    // Add next action if not complete
    if (plan.generation_state !== 'completed' && plan.generation_state !== 'failed') {
      const nextMesocycle = plan.mesocycles_generated + 1;
      if (nextMesocycle <= plan.total_mesocycles) {
        progress.nextAction = {
          action: 'generate_mesocycle',
          mesocycleNumber: nextMesocycle,
          endpoint: `/api/v1/workouts/${planId}/mesocycles/${nextMesocycle}`
        };
      }
    }

    res.status(200).json({
      status: 'success',
      data: progress
    });

  } catch (error) {
    console.error('[getGenerationStatus] Error:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to get generation status',
      details: error.message
    });
  }
}

module.exports = {
  generateWorkoutStructure,
  generateMesocycleDetails,
  generateWeeklyStructure,
  adjustPlan,
  getGenerationStatus,
  generateProgressiveWorkout
};