const OpenAIService = require('../services/openai-service');
const { generateStructurePrompt, generateMesocyclePrompt } = require('../utils/workout-prompts-chunked');
const { programStructureSchema, mesocycleDetailSchema } = require('../utils/chunked-schemas');
// Removed non-existent database-utils import - using direct supabase operations instead
const { getSupabaseClientWithToken } = require('../services/supabase');
const { getProfileByUserId } = require('../services/profile-service');
const { NotFoundError, DatabaseError, ApplicationError } = require('../utils/errors');
const logger = require('../config/logger');
const Ajv = require('ajv');

/**
 * Generate high-level workout program structure
 * POST /api/v1/workouts/structure
 */
async function generateWorkoutStructure(req, res) {
  const startTime = Date.now();
  
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

    // Merge request data with profile data
    const mergedProfile = {
      ...userProfile,
      fitnessLevel: fitnessLevel || userProfile.experienceLevel,
      preferences: {
        ...userProfile.preferences,
        exerciseTypes: exerciseTypes || userProfile.exerciseTypes,
        restrictions: restrictions || userProfile.restrictions,
        workoutFrequency: workoutFrequency || userProfile.workoutFrequency,
        gymCategory: userProfile.gymCategory || 'minimal_home'
      }
    };

    // Generate structure prompt
    const gymData = {
      gymCategory: mergedProfile.preferences.gymCategory,
      restrictions: restrictions || [],
      exerciseTypes: exerciseTypes || []
    };

    // DEBUG: Log function parameters
    console.log('[DEBUG] generateStructurePrompt parameters:');
    console.log('[DEBUG] mergedProfile:', JSON.stringify(mergedProfile, null, 2));
    console.log('[DEBUG] goals:', goals);
    console.log('[DEBUG] gymData:', gymData);
    console.log('[DEBUG] primaryGoal:', primaryGoal);

    const systemPrompt = generateStructurePrompt(
      mergedProfile, 
      goals, 
      gymData, 
      '', // injuryPrompt - empty for now
      primaryGoal || null
    );

    // DEBUG: Log the generated prompt
    console.log('[DEBUG] Generated system prompt type:', typeof systemPrompt);
    console.log('[DEBUG] Generated system prompt length:', systemPrompt?.length || 0);
    console.log('[DEBUG] Generated system prompt preview:', systemPrompt?.substring(0, 200) + '...');

    // Call OpenAI for structure generation
    const openaiService = new OpenAIService();
    const aiResponse = await openaiService.generateChatCompletion([
      { role: 'system', content: systemPrompt }
    ], {
      model: 'gpt-4.1',
      max_tokens: 8192, // Smaller response for structure only
      temperature: 0.7
    });

    // DEBUG: Log the AI response structure
    console.log('[DEBUG] aiResponse type:', typeof aiResponse);
    console.log('[DEBUG] aiResponse keys:', Object.keys(aiResponse || {}));
    console.log('[DEBUG] aiResponse content type:', typeof aiResponse?.content);
    console.log('[DEBUG] aiResponse direct type:', typeof aiResponse);
    console.log('[DEBUG] aiResponse preview:', typeof aiResponse === 'string' ? aiResponse.substring(0, 200) : 'Not a string');

    // Parse and validate structure
    // The OpenAI service returns content directly as a string, not as aiResponse.content
    const rawContent = typeof aiResponse === 'string' ? aiResponse : aiResponse?.content;
    
    if (!rawContent) {
      throw new Error('No content received from OpenAI service');
    }
    
    // Extract JSON from markdown code blocks if present
    let jsonStr = rawContent.trim();
    const jsonMatch = rawContent.match(/```json\s*([\s\S]*?)\s*```/) || 
                     rawContent.match(/```\s*([\s\S]*?)\s*```/);
    
    if (jsonMatch && jsonMatch[1]) {
      jsonStr = jsonMatch[1].trim();
    } else {
      // If no code blocks found, try to find JSON-like content
      const jsonStart = jsonStr.indexOf('{');
      const jsonEnd = jsonStr.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        jsonStr = jsonStr.substring(jsonStart, jsonEnd + 1);
      }
    }
    
    console.log('[DEBUG] Extracted JSON string length:', jsonStr.length);
    console.log('[DEBUG] Extracted JSON preview:', jsonStr.substring(0, 200));
    
    const structureData = JSON.parse(jsonStr);
    
    // Validate against schema
    const ajv = new Ajv();
    const validate = ajv.compile(programStructureSchema);
    
    if (!validate(structureData)) {
      throw new Error(`Structure validation failed: ${JSON.stringify(validate.errors)}`);
    }

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
        plan_data: {
          structure: structureData,
          aiResponse: {
            model: 'gpt-4.1',
            tokensUsed: aiResponse.usage?.total_tokens || 0,
            processingTime: Date.now() - startTime
          },
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
 * Generate detailed exercises for specific mesocycle
 * POST /api/v1/workouts/:planId/mesocycles/:mesocycleNumber
 */
async function generateMesocycleDetails(req, res) {
  const startTime = Date.now();
  
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

    // Update state to generating
    const { error: updateError } = await supabaseRLSClient
      .from('workout_plans')
      .update({
        generation_state: `mesocycle_${mesocycleNum}_generating`,
        current_mesocycle: mesocycleNum
      })
      .eq('id', planId);

    if (updateError) throw updateError;

    // Generate mesocycle prompt with context
    const mesocycleContext = plan.plan_data.structure.mesocycles[mesocycleNum - 1];
    const systemPrompt = generateMesocyclePrompt({
      programStructure: plan.plan_data.structure,
      mesocycleNumber: mesocycleNum,
      totalMesocycles: plan.total_mesocycles,
      mesocycleTheme: mesocycleContext.theme,
      mesocycleDuration: mesocycleContext.duration,
      mesocycleFocus: mesocycleContext.focus,
      userProfile: plan.plan_data.userProfile || {},
      workoutFrequency: plan.plan_data.structure.trainingFrequency.daysPerWeek
    });

    // Call OpenAI for detailed generation
    const openaiService = new OpenAIService();
    const aiResponse = await openaiService.generateChatCompletion([
      { role: 'system', content: systemPrompt }
    ], {
      model: 'gpt-4.1',
      max_tokens: 16384, // Larger for detailed exercises
      temperature: 0.7
    });

    // Parse and validate mesocycle details
    // The OpenAI service returns content directly as a string, not as aiResponse.content
    const rawContent = typeof aiResponse === 'string' ? aiResponse : aiResponse?.content;
    
    if (!rawContent) {
      throw new Error('No content received from OpenAI service for mesocycle generation');
    }
    
    // Extract JSON from markdown code blocks if present
    let jsonStr = rawContent.trim();
    const jsonMatch = rawContent.match(/```json\s*([\s\S]*?)\s*```/) || 
                     rawContent.match(/```\s*([\s\S]*?)\s*```/);
    
    if (jsonMatch && jsonMatch[1]) {
      jsonStr = jsonMatch[1].trim();
    } else {
      // If no code blocks found, try to find JSON-like content
      const jsonStart = jsonStr.indexOf('{');
      const jsonEnd = jsonStr.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        jsonStr = jsonStr.substring(jsonStart, jsonEnd + 1);
      }
    }
    
    const mesocycleData = JSON.parse(jsonStr);
    
    // Validate against schema
    const ajv = new Ajv();
    const validate = ajv.compile(mesocycleDetailSchema);
    
    if (!validate(mesocycleData)) {
      throw new Error(`Mesocycle validation failed: ${JSON.stringify(validate.errors)}`);
    }

    // Update plan with mesocycle details
    const currentPlanData = plan.plan_data;
    
    // Add mesocycle details to plan data
    if (!currentPlanData.mesocycles) {
      currentPlanData.mesocycles = {};
    }
    currentPlanData.mesocycles[mesocycleNum] = mesocycleData;

    // Update generation state
    const isComplete = mesocycleNum === plan.total_mesocycles;
    const newState = isComplete ? 'completed' : `mesocycle_${mesocycleNum}_complete`;
    
    const { data: updatedPlan, error: planUpdateError } = await supabaseRLSClient
      .from('workout_plans')
      .update({
        generation_state: newState,
        mesocycles_generated: mesocycleNum,
        generation_completed_at: isComplete ? new Date().toISOString() : null,
        plan_data: currentPlanData
      })
      .eq('id', planId)
      .select('*')
      .single();

    if (planUpdateError) throw planUpdateError;

    // Prepare response
    const responseData = {
      planId,
      mesocycleNumber: mesocycleNum,
      mesocycleDetails: mesocycleData,
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
    
    // Reset state on error with proper JSONB handling
    try {
      // Get current errors array first
      const { data: currentPlan } = await supabaseRLSClient
        .from('workout_plans')
        .select('generation_errors')
        .eq('id', req.params.planId)
        .single();

      const currentErrors = currentPlan?.generation_errors || [];
      const newError = {
        mesocycle: parseInt(mesocycleNumber),
        error: error.message.replace(/"/g, '\\"'), // Escape quotes
        timestamp: new Date().toISOString()
      };
      
      const updatedErrors = [...currentErrors, newError];

      await supabaseRLSClient
        .from('workout_plans')
        .update({
          generation_state: 'failed',
          generation_errors: updatedErrors
        })
        .eq('id', req.params.planId);
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
  getGenerationStatus
};