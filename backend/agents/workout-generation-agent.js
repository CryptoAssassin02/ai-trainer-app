const BaseAgent = require('./base-agent');
const OpenAIService = require('../services/openai-service');
const logger = require('../config/logger');
const { retryWithBackoff } = require('../utils/retry-utils');
const { generateWorkoutPrompt } = require('../utils/workout-prompts');
const { AgentError, ValidationError, ERROR_CODES } = require('../utils/errors');
const { SupabaseClient } = require('../services/supabase'); // Assuming path

/**
 * @interface WorkoutAgent
 * Defines the structure for agents generating workout plans.
 */
/**
 * @function process
 * @memberof WorkoutAgent
 * @param {Object} userProfile - User's profile data.
 * @param {string[]} goals - User's fitness goals.
 * @param {Object} researchData - Research insights from ResearchAgent.
 * @returns {Promise<Object>} - The generated workout plan and explanations.
 */

/**
 * WorkoutGenerationAgent class using OpenAI to generate personalized workout plans.
 * @extends BaseAgent
 */
class WorkoutGenerationAgent extends BaseAgent {
    /**
     * Initializes the WorkoutGenerationAgent.
     * @param {Object} config - Configuration object
     * @param {OpenAIService} config.openaiService - An instance of the OpenAIService
     * @param {Object} config.supabaseClient - An instance of the Supabase client
     * @param {Object} [config.memorySystem=null] - Memory system for storing agent memories
     * @param {Object} [config.logger=null] - Logger instance
     * @param {Object} [config.config={}] - Agent-specific configuration
     */
    constructor({ 
        openaiService, 
        supabaseClient, 
        memorySystem = null, 
        logger = null, 
        config = {} 
    } = {}) {
        // Pass parameters to BaseAgent constructor
        super({ memorySystem, logger, config });
        
        // Override the agent type to use 'workout' instead of 'workoutgeneration'
        this.agentType = 'workout';
        
        // Validate required dependencies
        if (!openaiService) {
            throw new AgentError('WorkoutGenerationAgent requires an OpenAI service instance.', ERROR_CODES.CONFIGURATION_ERROR);
        }
        
        if (!supabaseClient) {
            throw new AgentError('WorkoutGenerationAgent requires a Supabase client instance.', ERROR_CODES.CONFIGURATION_ERROR);
        }
        
        // Initialize core dependencies
        this.openaiService = openaiService;
        this.supabaseClient = supabaseClient;
        
        // Merge default configuration with provided config
        this.config = {
            model: 'gpt-4o',
            temperature: 0.7,
            max_tokens: 3000,
            timeoutLimit: 30000,
            maxRetries: 3,
            maxIterations: 3,
            ...config
        };
        
        this.log('info', 'WorkoutGenerationAgent constructed successfully');
    }

    /**
     * Orchestrates the workout generation workflow using a ReAct pattern.
     * @param {Object} context - Input context
     * @param {Object} context.userProfile - User details (e.g., age, fitnessLevel, injuries)
     * @param {string[]} context.goals - User's fitness goals (e.g., ["strength", "hypertrophy"])
     * @param {Object} context.researchData - Structured research insights from ResearchAgent
     * @param {Object} [options={}] - Processing options
     * @returns {Promise<Object>} - Formatted workout plan with explanations, reasoning, and insights
     * @throws {AgentError} If a critical error occurs during processing.
     */
    async process(context, options = {}) {
        this.log('info', 'process START');
        const startTime = Date.now();
        
        const { userProfile, goals, researchData } = context;
        
        // Initialize state for the ReAct flow
        let state = {
            userProfile,
            goals,
            researchData,
            systemPrompt: null,
            rawApiResponse: null,
            parsedPlan: null,
            formattedPlan: null,
            explanations: null,
            errors: [],
            warnings: researchData?.warnings || [], // Carry over warnings from research
            reasoning: [],
            iteration: 0,
            maxIterations: this.config.maxRefinementAttempts || 1, // Limit reflection loops
            medicalConditions: [], // Add medicalConditions to state
            contraindications: [],  // Add contraindications to state
            pastWorkouts: [], // Store past workouts
            userFeedback: [] // Store user feedback
        };

        try {
            // Validate the input parameters immediately
            this._validateInput(state.goals, state.userProfile);
            
            // Validate research data
            this._validateResearchData(state.researchData);

            // --- Step 0: Validate Initial Input ---
            this.log('info', 'Validating initial input...');
            state.reasoning.push("Initial input validation passed.");

            // --- Retrieve Past Workouts from Memory ---
            if (userProfile.user_id) {
                this.log('info', 'Retrieving previous workout plans and feedback...');
                try {
                    // Use the standardized BaseAgent retrieveMemories method with cross-agent retrieval
                    const pastWorkouts = await this.retrieveMemories({
                        userId: userProfile.user_id,
                        agentTypes: ['workout', 'adjustment'], // Include adjustment memories for cross-agent learning
                        metadata: { 
                            memory_type: 'agent_output'
                            // Remove content_type restriction to allow both workout_plan and adjustment memories
                        },
                        includeFeedback: true,
                        limit: 5, // Increase limit to account for multiple agent types
                        sortBy: 'recency'
                    });
                    
                    // DEBUG: Check the value of pastWorkouts before assignment
                    console.log('DEBUG: pastWorkouts retrieved from memory:', pastWorkouts);
                    
                    if (pastWorkouts && pastWorkouts.length > 0) {
                        state.pastWorkouts = pastWorkouts;
                        state.reasoning.push(`Retrieved ${pastWorkouts.length} past workout plans from memory.`);
                        
                        // Extract user feedback if available
                        pastWorkouts.forEach(workout => {
                            if (workout.feedback && workout.feedback.length > 0) {
                                state.userFeedback.push(...workout.feedback);
                            }
                        });
                        
                        if (state.userFeedback.length > 0) {
                            state.reasoning.push(`Retrieved ${state.userFeedback.length} pieces of user feedback from memory.`);
                        }
                    } else {
                        state.reasoning.push("No previous workout plans found in memory.");
                    }
                } catch (memoryError) {
                    this.log('warn', 'Failed to retrieve memories:', memoryError);
                    state.warnings.push(`Failed to retrieve memories: ${memoryError.message}`);
                    state.reasoning.push('Warning: Could not retrieve past workout data from memory.');
                    // Ensure state.pastWorkouts and state.userFeedback remain empty or are initialized
                    state.pastWorkouts = [];
                    state.userFeedback = [];
                }
            }

            // --- Step 0.5: Fetch User Medical Conditions ---
            this.log('info', 'Fetching user medical conditions...');
            if (!userProfile.user_id) { 
                // Throw AgentError for missing configuration
                throw new AgentError('userProfile must include user_id to fetch medical conditions.', ERROR_CODES.CONFIGURATION_ERROR);
            }
            
            // Start with any restrictions passed directly in userProfile
            state.medicalConditions = [];
            if (userProfile.restrictions && Array.isArray(userProfile.restrictions)) {
                state.medicalConditions = [...userProfile.restrictions];
                this.log('info', `Found ${userProfile.restrictions.length} restrictions in userProfile: ${userProfile.restrictions.join(', ')}`);
            }
            
            // Try to fetch additional medical conditions from database
            try {
                const { data: userData, error: userError } = await this.supabaseClient
                    .from('user_profiles') // Changed to user_profiles
                    .select('medical_conditions')
                    .eq('user_id', userProfile.user_id) // Use the actual user identifier field
                    .maybeSingle(); // Use maybeSingle() instead of single() to handle no/multiple rows gracefully

                if (userError) {
                    this.log('warn', `Failed to fetch user profile data for user ${userProfile.user_id}: ${userError.message}. Proceeding with userProfile restrictions only.`);
                    state.warnings.push('Could not fetch user medical conditions from database.');
                } else if (userData?.medical_conditions) {
                    // Handle potential null or stringified JSON for medical_conditions
                    let dbMedicalConditions = [];
                    if (typeof userData.medical_conditions === 'string') {
                        try {
                            dbMedicalConditions = JSON.parse(userData.medical_conditions);
                            if (!Array.isArray(dbMedicalConditions)) {
                               this.log('warn', `Parsed medical_conditions is not an array for user ${userProfile.user_id}. Ignoring database conditions.`);
                               dbMedicalConditions = [];
                            }
                        } catch (parseError) {
                            this.log('warn', `Failed to parse medical_conditions JSON string for user ${userProfile.user_id}: ${parseError.message}. Ignoring database conditions.`);
                            dbMedicalConditions = [];
                        }
                    } else if (Array.isArray(userData.medical_conditions)) {
                        dbMedicalConditions = userData.medical_conditions;
                    } else {
                         this.log('warn', `medical_conditions for user ${userProfile.user_id} is not a string or array. Ignoring database conditions.`);
                         dbMedicalConditions = [];
                    }
                    
                    // Combine userProfile restrictions with database medical conditions (avoid duplicates)
                    dbMedicalConditions.forEach(condition => {
                        if (!state.medicalConditions.includes(condition)) {
                            state.medicalConditions.push(condition);
                        }
                    });
                    
                    if (dbMedicalConditions.length > 0) {
                        this.log('info', `Added ${dbMedicalConditions.length} medical conditions from database: ${dbMedicalConditions.join(', ')}`);
                    }
                }
                
                state.reasoning.push(`Combined medical conditions and restrictions: ${state.medicalConditions.join(', ') || 'None'}.`);
            } catch (profileError) {
                this.log('warn', `Unexpected error fetching profile for user ${userProfile.user_id}: ${profileError.message}. Proceeding with userProfile restrictions only.`);
                state.warnings.push('Could not fetch user profile data.');
                state.reasoning.push('Warning: Could not retrieve database medical conditions, using userProfile restrictions only.');
            }

            // --- Step 0.6: Fetch Relevant Contraindications ---
            this.log('info', 'Fetching contraindications based on medical conditions...');
            if (state.medicalConditions.length > 0) {
                const lowerCaseConditions = state.medicalConditions.map(c => String(c).toLowerCase().trim()); // Ensure lowercase strings
                const { data: contraData, error: contraError } = await this.supabaseClient
                    .from('contraindications') // Assumes table name is 'contraindications'
                    .select('condition, exercises_to_avoid') // Assumes these columns exist
                    .in('condition', lowerCaseConditions);

                if (contraError) {
                    this.log('warn', `Failed to fetch contraindications for conditions [${lowerCaseConditions.join(', ')}]: ${contraError.message}. Proceeding without specific contraindications.`);
                    // Log a warning, but don't throw an error - consider this non-critical resource issue
                    state.warnings.push('Could not fetch specific contraindications from database.');
                    state.contraindications = []; 
                } else {
                    state.contraindications = contraData || []; // Store fetched data or empty array
                    state.reasoning.push(`Fetched ${state.contraindications.length} relevant contraindication rules.`);
                }
            } else {
                state.reasoning.push("User has no listed medical conditions, skipping contraindication fetch.");
            }

            // --- Step 0.7: Apply Deterministic Safety Filtering ---
            this.log('info', 'Applying deterministic safety filtering to research data...');
            state.researchData = await this._applySafetyFiltering(
                state.researchData,
                state.medicalConditions,
                state.contraindications
            );
            
            if (state.researchData.safetyFiltered && state.researchData.filteredExerciseCount === 0) {
                throw new AgentError('All exercises were filtered out due to safety restrictions. Cannot generate safe workout plan with current research data.', ERROR_CODES.VALIDATION_ERROR);
            }
            
            state.reasoning.push(`Applied safety filtering: ${state.researchData.originalExerciseCount - state.researchData.filteredExerciseCount} exercises removed due to medical conditions.`);

            // --- ReAct Loop (simplified for now, potential for refinement iterations) ---
            while (state.iteration < state.maxIterations) {
                state.iteration++;
                this.log('info', `ReAct Iteration: ${state.iteration}`);

                // --- Thought: Plan the generation based on current state ---
                this.log('info', 'ReAct Step: Thought');
                state.reasoning.push(`[Iteration ${state.iteration}] Planning workout generation for user (Level: ${state.userProfile.fitnessLevel}, Goals: ${state.goals.join(', ')}). Incorporating research, safety guidelines, and ${state.pastWorkouts.length} past workouts.`);
                // Potential future logic: Adjust strategy based on previous iteration's errors/observations

                // --- Action: Build Prompt ---
                this.log('info', 'ReAct Step: Action (Build Prompt)');
                
                // Debug: Log what we're passing to _buildSystemPrompt
                this.log('debug', `About to call _buildSystemPrompt with:
                  medicalConditions: ${JSON.stringify(state.medicalConditions)}
                  contraindications: ${JSON.stringify(state.contraindications)}
                  medicalConditions.length: ${state.medicalConditions?.length || 'undefined'}`);
                
                state.systemPrompt = this._buildSystemPrompt(
                    state.userProfile,
                    state.goals,
                    state.researchData,
                    state.medicalConditions,
                    state.contraindications,
                    state.pastWorkouts,
                    state.userFeedback
                );
                state.reasoning.push(`[Iteration ${state.iteration}] Built system prompt incorporating medical conditions and past workout history.`);

                // --- Action: Call OpenAI API ---
                this.log('info', 'ReAct Step: Action (Generate Plan)');
                try {
                    // Wrap the potentially failing API call with retry logic
                    state.rawApiResponse = await this.retryWithBackoff(
                        () => this._generateWorkoutPlan(state.systemPrompt),
                        { context: '_generateWorkoutPlan' } // Add context for potential logging in retry util
                    );
                    state.reasoning.push(`[Iteration ${state.iteration}] Successfully called OpenAI API (${this.config.model}).`);
                } catch (apiError) {
                    state.reasoning.push(`[Iteration ${state.iteration}] OpenAI API call failed after retries: ${apiError.message}`);
                    // Throw AgentError for external service failure after retries
                    // Use the original error message for test compatibility
                    const errorMessage = apiError.message && apiError.message.includes('OpenAI API Error') 
                        ? apiError.message 
                        : 'OpenAI API call failed after retries';
                    throw new AgentError(errorMessage, ERROR_CODES.EXTERNAL_SERVICE_ERROR, null, apiError);
                }

                // --- Observation: Parse and Validate Response ---
                this.log('info', 'ReAct Step: Observation (Parse & Validate)');
                state.parsedPlan = this._parseWorkoutResponse(state.rawApiResponse);
                if (!state.parsedPlan) {
                    state.reasoning.push(`[Iteration ${state.iteration}] Observation: Failed to parse API response.`);
                    // Throw AgentError for processing failure
                    throw new AgentError('Failed to parse JSON response from OpenAI.', ERROR_CODES.PROCESSING_ERROR);
                } else {
                    state.reasoning.push(`[Iteration ${state.iteration}] Observation: Parsed API response successfully.`);
                }

                // --- Observation: Perform Safety Validation ---
                this.log('info', 'ReAct Step: Safety Validation');
                const safetyValidation = this._validateWorkoutSafety(state.parsedPlan, state.medicalConditions);
                
                if (!safetyValidation.isSafe) {
                    const violationDetails = safetyValidation.violations.map(v => `${v.exercise} (${v.condition})`).join(', ');
                    state.reasoning.push(`[Iteration ${state.iteration}] SAFETY VIOLATION: Generated plan contains contraindicated exercises: ${violationDetails}`);
                    
                    if (state.iteration >= state.maxIterations) {
                        // Final safety check failed - reject the plan entirely
                        throw new AgentError(`Generated workout plan contains unsafe exercises for user's medical conditions: ${violationDetails}. Cannot proceed.`, ERROR_CODES.VALIDATION_ERROR);
                    } else {
                        // Try regenerating with stronger safety emphasis
                        state.reasoning.push(`[Iteration ${state.iteration}] Attempting regeneration with enhanced safety constraints.`);
                        continue; // Continue to next iteration
                    }
                } else {
                    state.reasoning.push(`[Iteration ${state.iteration}] Safety validation passed: No contraindicated exercises detected.`);
                }

                // --- Standard Validation ---
                try {
                    await this._validateWorkoutPlan(state.parsedPlan, state.userProfile);
                    state.reasoning.push(`[Iteration ${state.iteration}] Observation: Generated workout plan passed validation.`);
                    break; // Exit loop on success
                } catch (validationError) {
                    state.reasoning.push(`[Iteration ${state.iteration}] Observation: Plan validation failed: ${validationError.message}`);
                    // Throw AgentError for validation failure if no more retries
                    if (state.iteration >= state.maxIterations) {
                         this.log('warn', 'Max refinement iterations reached after validation failure.');
                         throw new AgentError('Plan validation failed after maximum refinement attempts.', ERROR_CODES.VALIDATION_ERROR, null, validationError);
                    }
                    state.reasoning.push(`[Iteration ${state.iteration}] Preparing for refinement attempt.`);
                }
            } // End ReAct Loop

            // Check if loop exited without a valid plan
            if (!state.parsedPlan) {
                 throw new AgentError("Workout generation failed after loop completion.", ERROR_CODES.PROCESSING_ERROR); 
            }

            // --- Post-Loop Processing (Formatting & Explanations) ---
            this.log('info', 'Formatting plan and generating explanations...');
            state.formattedPlan = this._formatWorkoutPlan(state.parsedPlan);
            state.explanations = await this._generateExplanations(state.parsedPlan);
            // state.customizedPlan = this._addCustomizations(state.formattedPlan, state.goals); // Optional
            state.reasoning.push("Finalized plan formatting and explanations.");

            // Store the generated workout plan in memory using standardized pattern
            if (userProfile.user_id) {
                const planId = `plan_${Date.now()}`; // Generate a temporary plan ID
                
                try {
                    // Use the standardized BaseAgent storeMemory method
                    await this.storeMemory(state.parsedPlan, {
                        userId: userProfile.user_id,
                        planId: planId,
                        memoryType: 'agent_output',
                        contentType: 'workout_plan',
                        tags: [...state.goals, state.userProfile.fitnessLevel],
                        importance: 3, 
                        fitness_level: state.userProfile.fitnessLevel,
                        plan_version: state.iteration,
                        includes_research: !!state.researchData
                    });
                    this.log('info', 'Stored workout plan in memory system with standardized metadata');
                } catch (e) {
                    this.log('warn', 'Failed to store agent output memory:', e);
                    state.warnings.push(`Failed to store agent output memory: ${e.message}`);
                }
                
                try {
                    // Also store reasoning and metadata separately for future learning
                    await this.storeMemory({
                        reasoning: state.reasoning,
                        planGenerationMetadata: {
                            generation_time_ms: Date.now() - startTime,
                            iterations: state.iteration,
                            model: this.config.model,
                            temperature: this.config.temperature
                        }
                    }, {
                        userId: userProfile.user_id,
                        planId: planId,
                        memoryType: 'agent_metadata',
                        contentType: 'generation_metadata',
                        tags: ['reasoning', 'generation_stats'],
                        importance: 2 
                    });
                    this.log('info', 'Stored agent metadata (reasoning) in memory system.');
                } catch (e) {
                    this.log('warn', 'Failed to store agent metadata memory:', e);
                    state.warnings.push(`Failed to store agent metadata memory: ${e.message}`);
                }
            }

            // --- Final Output Construction ---
            const finalOutput = this._formatOutput({
                // Pass relevant parts of the final state
                plan: state.parsedPlan,
                formattedPlan: state.formattedPlan,
                explanations: state.explanations,
                reasoning: state.reasoning,
                researchInsights: state.researchData?.exercises?.slice(0, 5).map(e => ({ name: e.name, summary: e.summary, isReliable: e.isReliable })) || [], // Include more detail
                warnings: state.warnings,
                errors: state.errors, // Include non-fatal errors/warnings encountered
                goals: state.goals, // Include goals in output context
                planId: `plan_${Date.now()}` // Consistent plan ID - This was incorrect, ID should come from memory storage
            });

            const endTime = Date.now();
            this.log('info', `process END (Total Time: ${endTime - startTime}ms)`);
            
            // Return the final formatted output, not the internal state
            return finalOutput;

        } catch (error) {
             this.log('error', 'Unexpected error during agent processing.', { originalError: error });
             // Add error to state for potential partial results
             state.errors.push(error.message || 'An unknown error occurred.');
             // If it's already an AgentError, re-throw it for safeProcess to catch
             if (error instanceof AgentError) {
                 this.log('error', `[${this.name}] AgentError caught in process: ${error.message}`, { code: error.code, details: error.details });
                 throw error; // Rethrow the original AgentError
             }
             // Otherwise, wrap unexpected errors in a generic AgentError
             else {
                 this.log('error', `[${this.name}] Unexpected error in process: ${error.message}`, { stack: error.stack });
                 throw new AgentError(`Unexpected error during workout generation: ${error.message}`, ERROR_CODES.PROCESSING_ERROR, null, error);
             }
        }
    }

    // --- Utility Methods ---

    /**
     * Validates the essential input parameters for the process method.
     * @param {string} goals - Goals array or comma-separated string.
     * @param {Object} userProfile - User profile data.
     * @throws {ValidationError} If any validation fails.
     * @private
     */
    _validateInput(goals, userProfile) {
        this.log('debug', '_validateInput called');
        
        // Goals validation
        this.validate(goals, (g) => g && (Array.isArray(g) || typeof g === 'string'), 'Goals must be an array or string.');
        
        // User profile validation with field mapping
        this.validate(userProfile, (profile) => profile && typeof profile === 'object', 'userProfile must be a valid object.');
        
        // Handle field name mapping: experienceLevel (validation schema) <-> fitnessLevel (internal usage)
        if (userProfile.experienceLevel && !userProfile.fitnessLevel) {
            userProfile.fitnessLevel = userProfile.experienceLevel;
            this.log('debug', `Mapped experienceLevel '${userProfile.experienceLevel}' to fitnessLevel for internal processing`);
        } else if (!userProfile.experienceLevel && !userProfile.fitnessLevel) {
            // Default if neither is provided
            userProfile.fitnessLevel = 'beginner';
            this.log('debug', 'No experienceLevel or fitnessLevel provided, defaulting to beginner');
        }
        
        this.validate(userProfile, (profile) => profile.fitnessLevel, 'userProfile must include fitnessLevel or experienceLevel.');
        this.validate(userProfile, (profile) => profile.user_id, 'userProfile must include user_id.');
        
        this.log('info', 'Input validation successful.');
    }

    /**
     * Validates that research data contains exercises for workout generation.
     * @param {Object} researchData - Research data to validate.
     * @throws {AgentError} If research data is invalid or empty.
     * @private
     */
    _validateResearchData(researchData) {
        this.log('debug', '_validateResearchData called');
        
        if (!researchData || typeof researchData !== 'object') {
            throw new AgentError('Research data must be a valid object.', ERROR_CODES.VALIDATION_ERROR);
        }
        
        if (!researchData.exercises || !Array.isArray(researchData.exercises)) {
            throw new AgentError('Research data must include an exercises array.', ERROR_CODES.VALIDATION_ERROR);
        }
        
        if (researchData.exercises.length === 0) {
            throw new AgentError('Research data must contain at least one exercise.', ERROR_CODES.VALIDATION_ERROR);
        }
        
        // Validate each exercise has required fields
        researchData.exercises.forEach((exercise, index) => {
            if (!exercise.name || typeof exercise.name !== 'string') {
                throw new AgentError(`Exercise at index ${index} must have a valid name.`, ERROR_CODES.VALIDATION_ERROR);
            }
        });
        
        this.log('info', `Research data validation successful: ${researchData.exercises.length} exercises provided.`);
    }

    /**
     * Formats the final output object.
     * @param {Object} resultData - Data collected during the process.
     * @returns {Object} The final structured output.
     * @private
     */
    _formatOutput(resultData) {
        this.log('debug', '_formatOutput called');
        
        // Create the response structure expected by tests and controllers
        return {
            status: resultData.errors?.length > 0 ? 'error' : 'success',
            data: {
                planId: `plan_${Date.now()}`, // Example temporary ID
                planName: resultData.plan?.planName || `Workout Plan for ${resultData.goals?.join(', ') || 'User'}`, // Use parsed plan name or fallback
                weeklySchedule: resultData.plan?.weeklySchedule || {}, // Access weeklySchedule from parsed plan (top level)
                exercises: resultData.plan?.plan || [], // Flat exercise list for backward compatibility
                formattedPlan: resultData.formattedPlan || "Plan formatting pending.",
                explanations: resultData.explanations || "Explanations pending.",
                researchInsights: resultData.researchInsights || [],
                reasoning: resultData.reasoning || ["Reasoning generation pending."],
                warnings: resultData.warnings || [],
                errors: resultData.errors || [] // Include errors if any occurred
            }
        };
    }

    // --- Prompt Building Methods ---

    /**
     * Builds the complete system prompt using the Handlebars template utility,
     * incorporating past workouts and feedback from memory.
     * @param {Object} userProfile - User profile data.
     * @param {string[]} goals - User fitness goals.
     * @param {Object} researchData - Research insights.
     * @param {string[]} medicalConditions - Fetched from user_profiles table.
     * @param {Array<Object>} contraindications - Fetched from contraindications table.
     * @param {Array<Object>} [pastWorkouts=[]] - Past workout plans from memory.
     * @param {Array<Object>} [userFeedback=[]] - User feedback on past workouts.
     * @returns {string} The constructed system prompt.
     * @private
     */
    _buildSystemPrompt(userProfile, goals, researchData, medicalConditions, contraindications, pastWorkouts = [], userFeedback = []) {
        this.log('debug', '_buildSystemPrompt called with dynamic contraindications and memory context');
        
        // Handle medical conditions and contraindications as before
        let injuryPrompt = "";
        if (medicalConditions && medicalConditions.length > 0) {
            injuryPrompt += `\n\n==== CRITICAL SAFETY REQUIREMENTS ====\nThe user has the following medical conditions and restrictions that MUST be followed:\n`;
            medicalConditions.forEach(condition => {
                // Find matching contraindication data from exercises
                const matchingContraindication = contraindications.find(
                    c => c.condition && c.condition.toLowerCase() === condition.toLowerCase()
                );
                
                if (matchingContraindication && Array.isArray(matchingContraindication.exercises_to_avoid) && matchingContraindication.exercises_to_avoid.length > 0) {
                    // Exercises to avoid are directly from the DB
                    const exercises = matchingContraindication.exercises_to_avoid.join(', ');
                    injuryPrompt += `- Condition: ${condition} - Avoid exercises: ${exercises}\n`;
                } else {
                    // Generic approach if no specific contraindication data found - make this much more explicit
                    const lowerCondition = String(condition).toLowerCase().trim();
                    if (lowerCondition.includes('knee')) {
                        injuryPrompt += `- Condition: ${condition} - STRICTLY AVOID: squats, lunges, jumping exercises, high-impact activities. Use upper body and low-impact alternatives only.\n`;
                    } else if (lowerCondition.includes('shoulder')) {
                        injuryPrompt += `- Condition: ${condition} - STRICTLY AVOID: overhead press, shoulder press, overhead movements, lateral raises. Focus on exercises that keep arms below shoulder level.\n`;
                    } else if (lowerCondition.includes('back')) {
                        injuryPrompt += `- Condition: ${condition} - STRICTLY AVOID: deadlifts, heavy rows, twisting movements. Use supported exercises and light weights only.\n`;
                    } else if (lowerCondition.includes('ankle') || lowerCondition.includes('foot')) {
                        injuryPrompt += `- Condition: ${condition} - STRICTLY AVOID: running, jumping, plyometric exercises. Use seated or supported exercises only.\n`;
                    } else {
                        injuryPrompt += `- Condition: ${condition} - STRICTLY AVOID high-impact activities and exercises that stress this area. Modify all exercises to avoid aggravating this condition.\n`;
                    }
                }
            });
            injuryPrompt += `\n==== END SAFETY REQUIREMENTS ====\n\nYou MUST NOT include any of the explicitly avoided exercises above. This is a safety requirement.\n`;
            
            // Debug logging to verify the prompt is correct
            this.log('debug', `Injury prompt being sent to OpenAI:\n${injuryPrompt}`);
        }
        
        // Add past workout context if available
        let workoutHistoryPrompt = "";
        if (pastWorkouts && pastWorkouts.length > 0) {
            workoutHistoryPrompt = "\n\n## CRITICAL MEMORY-BASED PREFERENCES:\n";
            
            // Extract exercise preferences from memory
            const preferredExercises = new Set();
            const dislikedExercises = new Set(); 
            const successfulTechniques = new Set();
            
            pastWorkouts.forEach((workout, index) => {
                const workoutContent = typeof workout.content === 'string' 
                    ? JSON.parse(workout.content) 
                    : workout.content;
                
                // Extract exercise preferences from memory content
                if (workoutContent.effectiveExercises) {
                    workoutContent.effectiveExercises.forEach(ex => preferredExercises.add(ex.toLowerCase()));
                }
                
                if (workoutContent.exercisePreferences) {
                    if (workoutContent.exercisePreferences.loved) {
                        workoutContent.exercisePreferences.loved.forEach(ex => preferredExercises.add(ex.toLowerCase()));
                    }
                    if (workoutContent.exercisePreferences.disliked) {
                        workoutContent.exercisePreferences.disliked.forEach(ex => dislikedExercises.add(ex.toLowerCase()));
                    }
                }
                
                if (workoutContent.preferences) {
                    workoutContent.preferences.forEach(pref => {
                        if (pref.includes('compound')) successfulTechniques.add('compound movements');
                        if (pref.includes('volume')) successfulTechniques.add('higher volume');
                    });
                }
            });
            
            // Build enforcement instructions based on memory
            if (preferredExercises.size > 0) {
                workoutHistoryPrompt += `PRIORITIZE these exercises the user has loved: ${Array.from(preferredExercises).join(', ')}\n`;
            }
            
            if (dislikedExercises.size > 0) {
                workoutHistoryPrompt += `AVOID these exercises the user disliked: ${Array.from(dislikedExercises).join(', ')}\n`;
            }
            
            if (successfulTechniques.size > 0) {
                workoutHistoryPrompt += `INCORPORATE these successful techniques: ${Array.from(successfulTechniques).join(', ')}\n`;
            }
            
            workoutHistoryPrompt += "\n## User's Workout History:\n";
            
            pastWorkouts.forEach((workout, index) => {
                const workoutContent = typeof workout.content === 'string' 
                    ? JSON.parse(workout.content) 
                    : workout.content;
                
                // Extract the workout plan exercises (adjust based on actual structure)
                const exercises = workoutContent.plan || [];
                
                workoutHistoryPrompt += `Past Workout #${index + 1} (${new Date(workout.created_at).toLocaleDateString()}):\n`;
                
                // Add summary of exercises
                if (exercises.length > 0) {
                    const exerciseSummary = exercises.slice(0, 5).map(ex => ex.name || ex.exercise).join(', ');
                    workoutHistoryPrompt += `- Exercises included: ${exerciseSummary}${exercises.length > 5 ? '...' : ''}\n`;
                }
                
                // Include feedback if available
                if (workout.feedback && workout.feedback.length > 0) {
                    const recentFeedback = workout.feedback[0];
                    const feedbackContent = typeof recentFeedback.content === 'string'
                        ? JSON.parse(recentFeedback.content)
                        : recentFeedback.content;
                    
                    workoutHistoryPrompt += `- User Feedback: ${feedbackContent.rating} - ${feedbackContent.comment || 'No comment provided'}\n`;
                }
                
                workoutHistoryPrompt += '\n';
            });
            
            // Add feedback analysis summary if available
            if (userFeedback.length > 0) {
                // Count positive vs negative feedback
                const sentiments = userFeedback.reduce((acc, feedback) => {
                    const content = typeof feedback.content === 'string' 
                        ? JSON.parse(feedback.content) 
                        : feedback.content;
                    
                    const rating = content.rating || '';
                    
                    if (rating.includes('helpful') || rating.includes('positive') || rating.includes('like')) {
                        acc.positive++;
                    } else if (rating.includes('not_helpful') || rating.includes('negative') || rating.includes('dislike')) {
                        acc.negative++;
                    }
                    
                    return acc;
                }, { positive: 0, negative: 0 });
                
                workoutHistoryPrompt += `User Feedback Summary: ${sentiments.positive} positive, ${sentiments.negative} negative ratings.\n`;
            }
        }
        
        // Call generateWorkoutPrompt with updated parameters
        return generateWorkoutPrompt(
            userProfile, 
            goals, 
            researchData, 
            injuryPrompt + workoutHistoryPrompt // Combined safety and history context
        );
    }

    // --- API Call and Processing Methods ---

    /**
     * Calls the OpenAI API to generate the workout plan.
     * Includes retry logic for specific errors.
     * @param {string} systemPrompt - The fully constructed prompt.
     * @returns {Promise<string>} The raw response content from OpenAI.
     * @throws {Error} If API call fails permanently after retries.
     * @private
     */
    async _generateWorkoutPlan(systemPrompt) {
        this.log('info', `Calling OpenAI API (${this.config.model})...`);
        const startTime = Date.now();

        try {
            const apiCall = async () => {
                const response = await this.openaiService.generateChatCompletion([
                    { role: "system", content: systemPrompt }
                    // No user message needed if all context is in system prompt
                ], {
                    model: this.config.model,
                    temperature: this.config.temperature,
                    max_tokens: this.config.max_tokens,
                    // response_format: { type: "json_object" }, // Enable if model supports enforced JSON output
                    // Add timeout if supported by the service implementation
                    timeout: this.config.timeoutLimit
                });
                
                return response;
            };

            // Use BaseAgent's retryWithBackoff method
            const result = await this.retryWithBackoff(apiCall);
            
            const duration = Date.now() - startTime;
            this.log('info', `OpenAI API call completed in ${duration}ms`);
            return result;
        } catch (error) {
            const duration = Date.now() - startTime;
            this.log('error', `OpenAI API call failed after ${duration}ms: ${error.message}`);
            throw error; // Let caller handle the error
        }
    }

    /**
     * Parses and validates the raw text response from OpenAI.
     * @param {string} responseContent - The raw API response content.
     * @returns {Object|null} Parsed workout plan or null if parsing failed.
     * @private
     */
    _parseWorkoutResponse(responseContent) {
        this.log('debug', '_parseWorkoutResponse called');
            
        if (!responseContent) {
            this.log('warn', 'Empty response received from API');
            return null;
        }

        try {
            // Extract potential JSON from the response
            // This handles cases where the model outputs text around the JSON
            const jsonMatch = responseContent.match(/```json\s*([\s\S]*?)\s*```/) || 
                             responseContent.match(/```\s*([\s\S]*?)\s*```/) ||
                             [null, responseContent]; // Default to full response if no markdown blocks
            
            const jsonStr = jsonMatch[1].trim();
            const parsedData = JSON.parse(jsonStr);
            
            this.log('debug', 'Successfully parsed JSON from API response');
            
            // Validate structure
            if (!parsedData || typeof parsedData !== 'object') {
                this.log('warn', 'Parsed result is not an object');
                return null;
            }
            
            // Check for the correct structure based on the workout prompt schema
            if (!parsedData.planName || !parsedData.weeklySchedule || typeof parsedData.weeklySchedule !== 'object') {
                this.log('warn', 'Parsed result missing required fields: planName and weeklySchedule');
                return null;
            }
            
            // Transform the weeklySchedule structure into the format expected by the rest of the code
            // Convert from { Monday: { exercises: [...] }, Tuesday: "Rest" } 
            // to { plan: [{ exercise, sets, reps }], planName, ... }
            const exercises = [];
            
            Object.entries(parsedData.weeklySchedule).forEach(([day, dayData]) => {
                if (dayData !== 'Rest' && dayData.exercises && Array.isArray(dayData.exercises)) {
                    // Add day information to each exercise for context
                    dayData.exercises.forEach(exercise => {
                        exercises.push({
                            ...exercise,
                            day: day,
                            sessionName: dayData.sessionName
                        });
                    });
                }
            });
            
            // Return in the format expected by validation and formatting methods
            return {
                plan: exercises, // Transform to expected flat structure
                planName: parsedData.planName,
                weeklySchedule: parsedData.weeklySchedule, // Keep original structure too
                warmupSuggestion: parsedData.warmupSuggestion,
                cooldownSuggestion: parsedData.cooldownSuggestion
            };
            
        } catch (error) {
            this.log('warn', `Failed to parse API response: ${error.message}`);
            // Consider trying a fallback parsing strategy here if needed
            return null;
        }
    }

    /**
     * Formats the workout plan for user display.
     * @param {Object} workoutPlan - The parsed workout plan.
     * @returns {string} The formatted workout plan.
     * @private
     */
    _formatWorkoutPlan(workoutPlan) {
        // Make complex objects human-readable for display
        // This is a placeholder and would be customized based on UI needs
        return JSON.stringify(workoutPlan, null, 2);
    }

    /**
     * Validates the parsed workout plan for safety and completeness.
     * @param {Object} workoutPlan - The parsed workout plan.
     * @param {Object} userProfile - User profile data.
     * @returns {Promise<boolean>} True if validation passes.
     * @throws {AgentError} If validation fails.
     * @private
     */
    async _validateWorkoutPlan(workoutPlan, userProfile) {
        this.log('debug', '_validateWorkoutPlan called');
        
        // Check basic structure
        if (!workoutPlan || !workoutPlan.plan || !Array.isArray(workoutPlan.plan)) {
            throw new ValidationError('Workout plan is missing required structure.');
        }
        
        if (workoutPlan.plan.length === 0) {
            throw new ValidationError('Workout plan has empty exercise list.');
        }
        
        // Check each exercise for required fields
        for (const [index, exercise] of workoutPlan.plan.entries()) {
            if (!exercise.exercise) {
                throw new ValidationError(`Exercise at index ${index} is missing a name.`);
            }
            
            if (!exercise.sets || typeof exercise.sets !== 'number') {
                throw new ValidationError(`Exercise "${exercise.exercise}" is missing valid sets.`);
            }
            
            // Handle both 'reps' and 'repsOrDuration' fields
            const repsField = exercise.repsOrDuration || exercise.reps;
            if (!repsField || (typeof repsField !== 'number' && typeof repsField !== 'string')) {
                throw new ValidationError(`Exercise "${exercise.exercise}" is missing valid reps/duration.`);
            }
        }
        
        // Check fitness level safety
        const fitnessLevel = userProfile.fitnessLevel?.toLowerCase() || 'beginner';
        
        if (fitnessLevel === 'beginner' && workoutPlan.plan.length > 12) {
            throw new ValidationError('Workout plan has too many exercises for a beginner.');
        }
        
        this.log('info', 'Workout plan validation successful');
        return true;
    }

    /**
     * Generates explanations for the workout plan.
     * @param {Object} workoutPlan - The parsed workout plan.
     * @returns {Promise<string>} Explanations text.
     * @private
     */
    async _generateExplanations(workoutPlan) {
        this.log('debug', '_generateExplanations called');
        
        // For now, use the explanation field from the API response if available
        if (workoutPlan.explanations) {
            return workoutPlan.explanations;
        }
        
        // TODO: This could make a separate API call to generate explanations
        // if they weren't included in the first API response
        
        return "Explanations will be provided in a future update.";
    }

    /**
     * Pre-filters research data to remove exercises that are contraindicated for user's medical conditions.
     * This provides deterministic safety filtering before AI processing using database-powered fuzzy matching.
     * @param {Object} researchData - Raw research data with exercises
     * @param {string[]} medicalConditions - User's medical conditions and restrictions
     * @param {Array<Object>} contraindications - Database contraindication rules
     * @returns {Promise<Object>} Filtered research data with safe exercises only
     * @private
     */
    async _applySafetyFiltering(researchData, medicalConditions, contraindications) {
        this.log('info', 'Applying database-powered safety filtering to research data...');
        
        if (!medicalConditions || medicalConditions.length === 0) {
            this.log('info', 'No medical conditions - no filtering needed');
            return researchData;
        }
        
        const filteredExercises = [];
        
        for (const exercise of researchData.exercises) {
            let isExerciseSafe = true;
            let filterReason = null;
            
            // Check database contraindications first
            for (const condition of medicalConditions) {
                const contraindication = contraindications.find(
                    c => c.condition && c.condition.toLowerCase() === condition.toLowerCase()
                );
                
                if (contraindication && contraindication.exercises_to_avoid) {
                    // Use database fuzzy matching for contraindicated exercises
                    const isContraindicated = await this._checkExerciseContraindication(
                        exercise.name,
                        contraindication.exercises_to_avoid
                    );
                    
                    if (isContraindicated.isMatch) {
                        this.log('info', `Filtering out ${exercise.name} due to ${condition} contraindication (DB match: ${isContraindicated.matchedExercise})`);
                        isExerciseSafe = false;
                        filterReason = `Database contraindication for ${condition}: matched ${isContraindicated.matchedExercise}`;
                        break;
                    }
                }
            }
            
            // Apply database-powered generic safety rules if no specific contraindication found
            if (isExerciseSafe) {
                const genericSafetyCheck = await this._checkGenericSafetyRules(exercise.name, medicalConditions);
                if (!genericSafetyCheck.isSafe) {
                    this.log('info', `Filtering out ${exercise.name} due to generic safety rule: ${genericSafetyCheck.reason}`);
                    isExerciseSafe = false;
                    filterReason = genericSafetyCheck.reason;
                }
            }
            
            if (isExerciseSafe) {
                filteredExercises.push(exercise);
            }
        }
        
        const filteredCount = researchData.exercises.length - filteredExercises.length;
        this.log('info', `Database-powered safety filtering removed ${filteredCount} contraindicated exercises`);
        
        return {
            ...researchData,
            exercises: filteredExercises,
            safetyFiltered: true,
            originalExerciseCount: researchData.exercises.length,
            filteredExerciseCount: filteredExercises.length
        };
    }

    /**
     * Checks if an exercise is contraindicated using database fuzzy matching.
     * @param {string} exerciseName - The exercise name to check
     * @param {string[]} contraindicatedExercises - List of contraindicated exercise names
     * @returns {Promise<{isMatch: boolean, matchedExercise?: string, similarity?: number}>}
     * @private
     */
    async _checkExerciseContraindication(exerciseName, contraindicatedExercises) {
        try {
            for (const contraindicatedExercise of contraindicatedExercises) {
                // Use database fuzzy matching with pg_trgm similarity
                const { data: matches, error } = await this.supabaseClient
                    .from('exercises')
                    .select('exercise_name, similarity(exercise_name, $1) as sim_score')
                    .ilike('exercise_name', `%${exerciseName}%`)
                    .or(`exercise_name.ilike.%${contraindicatedExercise}%`)
                    .gte('similarity(exercise_name, $1)', 0.3) // Use pg_trgm default threshold
                    .order('sim_score', { ascending: false })
                    .limit(1);
                
                if (error) {
                    this.log('warn', `Database error checking contraindication for ${exerciseName}: ${error.message}`);
                    return this._fallbackContraindicationCheck(exerciseName, contraindicatedExercise);
                }
                
                if (matches && matches.length > 0 && matches[0].sim_score >= 0.3) {
                    return {
                        isMatch: true,
                        matchedExercise: matches[0].exercise_name,
                        similarity: matches[0].sim_score
                    };
                }
            }
            
            return { isMatch: false };
            
        } catch (dbError) {
            this.log('error', `Database error in contraindication check: ${dbError.message}`);
            // Fallback to string matching if database fails
            return this._fallbackContraindicationCheck(exerciseName, contraindicatedExercises[0]);
        }
    }

    /**
     * Checks generic safety rules using database-powered exercise categorization.
     * @param {string} exerciseName - The exercise name to check
     * @param {string[]} medicalConditions - User's medical conditions
     * @returns {Promise<{isSafe: boolean, reason?: string}>}
     * @private
     */
    async _checkGenericSafetyRules(exerciseName, medicalConditions) {
        try {
            // Query database for exercise information
            const { data: exerciseInfo, error } = await this.supabaseClient
                .from('exercises')
                .select('exercise_name, primary_muscles, equipment, category, force_type')
                .ilike('exercise_name', `%${exerciseName}%`)
                .limit(5);
                
            if (error || !exerciseInfo || exerciseInfo.length === 0) {
                // Fallback to hardcoded rules if database lookup fails
                return this._fallbackGenericSafetyCheck(exerciseName, medicalConditions);
            }
            
            const lowerConditions = medicalConditions.map(c => String(c).toLowerCase().trim());
            
            // Check each potential exercise match
            for (const dbExercise of exerciseInfo) {
                const similarity = this._calculateNameSimilarity(exerciseName, dbExercise.exercise_name);
                
                if (similarity >= 0.4) { // Higher threshold for safety decisions
                    // Knee-related restrictions using database muscle groups
                    if (lowerConditions.some(c => c.includes('knee'))) {
                        const primaryMuscles = dbExercise.primary_muscles || [];
                        const isKneeStressing = primaryMuscles.some(muscle => 
                            ['quadriceps', 'hamstrings', 'calves', 'glutes'].includes(muscle.toLowerCase())
                        ) || 
                        dbExercise.category?.toLowerCase().includes('plyometric') ||
                        dbExercise.force_type?.toLowerCase().includes('explosive');
                        
                        if (isKneeStressing) {
                            return {
                                isSafe: false,
                                reason: `Database match: ${dbExercise.exercise_name} stresses knee-related muscles (${primaryMuscles.join(', ')})`
                            };
                        }
                    }
                    
                    // Shoulder-related restrictions
                    if (lowerConditions.some(c => c.includes('shoulder'))) {
                        const primaryMuscles = dbExercise.primary_muscles || [];
                        const isShoulderStressing = primaryMuscles.some(muscle => 
                            ['shoulders', 'deltoids', 'trapezius'].includes(muscle.toLowerCase())
                        ) || 
                        dbExercise.force_type?.toLowerCase().includes('overhead');
                        
                        if (isShoulderStressing) {
                            return {
                                isSafe: false,
                                reason: `Database match: ${dbExercise.exercise_name} stresses shoulder muscles (${primaryMuscles.join(', ')})`
                            };
                        }
                    }
                    
                    // Back-related restrictions  
                    if (lowerConditions.some(c => c.includes('back'))) {
                        const primaryMuscles = dbExercise.primary_muscles || [];
                        const isBackStressing = primaryMuscles.some(muscle => 
                            ['back', 'lats', 'rhomboids', 'erector spinae'].includes(muscle.toLowerCase())
                        ) || 
                        dbExercise.category?.toLowerCase().includes('deadlift') ||
                        dbExercise.force_type?.toLowerCase().includes('pull');
                        
                        if (isBackStressing) {
                            return {
                                isSafe: false,
                                reason: `Database match: ${dbExercise.exercise_name} stresses back muscles (${primaryMuscles.join(', ')})`
                            };
                        }
                    }
                }
            }
            
            return { isSafe: true };
            
        } catch (dbError) {
            this.log('error', `Database error in generic safety check: ${dbError.message}`);
            return this._fallbackGenericSafetyCheck(exerciseName, medicalConditions);
        }
    }

    /**
     * Calculates name similarity using simple character-based comparison.
     * @param {string} name1 - First exercise name
     * @param {string} name2 - Second exercise name  
     * @returns {number} Similarity score between 0 and 1
     * @private
     */
    _calculateNameSimilarity(name1, name2) {
        if (!name1 || !name2) return 0;
        
        const str1 = name1.toLowerCase().trim();
        const str2 = name2.toLowerCase().trim();
        
        if (str1 === str2) return 1;
        
        // Simple word overlap calculation
        const words1 = str1.split(/\s+/);
        const words2 = str2.split(/\s+/);
        
        const commonWords = words1.filter(word => 
            words2.some(w2 => w2.includes(word) || word.includes(w2))
        );
        
        const similarity = commonWords.length / Math.max(words1.length, words2.length);
        return Math.min(similarity, 1);
    }

    /**
     * Fallback contraindication check using string matching.
     * @param {string} exerciseName - The exercise name  
     * @param {string} contraindicatedExercise - Contraindicated exercise name
     * @returns {{isMatch: boolean, matchedExercise?: string}}
     * @private
     */
    _fallbackContraindicationCheck(exerciseName, contraindicatedExercise) {
        const exerciseLower = exerciseName.toLowerCase();
        const contraindicatedLower = contraindicatedExercise.toLowerCase();
        
        const isMatch = exerciseLower.includes(contraindicatedLower) || 
                       contraindicatedLower.includes(exerciseLower);
        
        return {
            isMatch,
            matchedExercise: isMatch ? contraindicatedExercise : undefined
        };
    }

    /**
     * Fallback generic safety check using hardcoded rules.
     * @param {string} exerciseName - The exercise name
     * @param {string[]} medicalConditions - User's medical conditions
     * @returns {{isSafe: boolean, reason?: string}}
     * @private
     */
    _fallbackGenericSafetyCheck(exerciseName, medicalConditions) {
        const exerciseLower = exerciseName.toLowerCase();
        const lowerConditions = medicalConditions.map(c => String(c).toLowerCase().trim());
        
        // Knee-related restrictions (fallback)
        if (lowerConditions.some(c => c.includes('knee'))) {
            const kneeRiskyPatterns = ['squat', 'lunge', 'jump', 'plyometric', 'running', 'step'];
            if (kneeRiskyPatterns.some(pattern => exerciseLower.includes(pattern))) {
                return {
                    isSafe: false,
                    reason: `Fallback rule: exercise contains knee-risky pattern`
                };
            }
        }
        
        // Shoulder-related restrictions (fallback)  
        if (lowerConditions.some(c => c.includes('shoulder'))) {
            const shoulderRiskyPatterns = ['overhead', 'press above', 'shoulder press', 'military', 'lateral'];
            if (shoulderRiskyPatterns.some(pattern => exerciseLower.includes(pattern))) {
                return {
                    isSafe: false,
                    reason: `Fallback rule: exercise contains shoulder-risky pattern`
                };
            }
        }
        
        // Back-related restrictions (fallback)
        if (lowerConditions.some(c => c.includes('back'))) {
            const backRiskyPatterns = ['deadlift', 'heavy row', 'twist', 'rotation'];
            if (backRiskyPatterns.some(pattern => exerciseLower.includes(pattern))) {
                return {
                    isSafe: false,
                    reason: `Fallback rule: exercise contains back-risky pattern`
                };
            }
        }
        
        return { isSafe: true };
    }

    /**
     * Post-validates the AI-generated workout plan to ensure no contraindicated exercises were included.
     * This provides a final safety check regardless of AI behavior.
     * @param {Object} workoutPlan - The parsed workout plan from AI
     * @param {string[]} medicalConditions - User's medical conditions
     * @returns {Object} Validation result with safety status
     * @private
     */
    _validateWorkoutSafety(workoutPlan, medicalConditions) {
        this.log('info', 'Performing post-generation safety validation...');
        
        if (!medicalConditions || medicalConditions.length === 0) {
            return { isSafe: true, violations: [] };
        }
        
        const violations = [];
        const lowerConditions = medicalConditions.map(c => String(c).toLowerCase().trim());
        
        // Extract all exercise names from the plan
        const planExercises = [];
        if (workoutPlan.plan && Array.isArray(workoutPlan.plan)) {
            planExercises.push(...workoutPlan.plan.map(ex => ex.exercise || ex.name));
        }
        if (workoutPlan.weeklySchedule && typeof workoutPlan.weeklySchedule === 'object') {
            Object.values(workoutPlan.weeklySchedule).forEach(day => {
                if (typeof day === 'object' && day.exercises) {
                    day.exercises.forEach(ex => {
                        planExercises.push(ex.exercise || ex.name);
                    });
                }
            });
        }
        
        // Check each exercise against safety rules
        planExercises.forEach(exerciseName => {
            if (!exerciseName) return;
            
            const lowerExerciseName = exerciseName.toLowerCase();
            
            // Check knee-related violations
            if (lowerConditions.some(c => c.includes('knee'))) {
                const kneeRiskyExercises = ['squat', 'lunge', 'jump', 'plyometric'];
                if (kneeRiskyExercises.some(risky => lowerExerciseName.includes(risky))) {
                    violations.push({
                        exercise: exerciseName,
                        condition: 'knee',
                        reason: `${exerciseName} is contraindicated for knee conditions`
                    });
                }
            }
            
            // Check shoulder-related violations
            if (lowerConditions.some(c => c.includes('shoulder'))) {
                const shoulderRiskyExercises = ['overhead', 'shoulder press', 'military press'];
                if (shoulderRiskyExercises.some(risky => lowerExerciseName.includes(risky))) {
                    violations.push({
                        exercise: exerciseName,
                        condition: 'shoulder',
                        reason: `${exerciseName} is contraindicated for shoulder conditions`
                    });
                }
            }
        });
        
        const isSafe = violations.length === 0;
        this.log('info', `Safety validation complete. Safe: ${isSafe}, Violations: ${violations.length}`);
        
        if (!isSafe) {
            this.log('warn', `Safety violations detected: ${violations.map(v => v.exercise).join(', ')}`);
        }
        
        return { isSafe, violations };
    }
}

module.exports = WorkoutGenerationAgent; 