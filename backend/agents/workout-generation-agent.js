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
        // Call super constructor with proper parameters
        super({ 
            memorySystem, 
            logger: logger || console, // Default to console if logger is null
            config: {
                maxRetries: config.maxRetries || 2,
                initialDelay: config.baseDelay || 1000, // ms
                timeoutLimit: config.timeoutLimit || 60000, // ms for OpenAI
                maxRefinementAttempts: config.maxRefinementAttempts || 1,
                model: config.model || 'gpt-4o', // Default model
                temperature: config.temperature || 0.7,
                max_tokens: config.max_tokens || 4096, // Adjusted based on research/needs
                ...config
            }
        });

        this.log('debug', 'WorkoutGenerationAgent constructor called');
        
        if (!openaiService) {
            throw new Error('OpenAIService instance is required.');
        }
        if (!supabaseClient) {
            throw new Error('SupabaseClient instance is required.');
        }
        
        this.openaiService = openaiService;
        this.supabaseClient = supabaseClient;
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
            // --- Step 0: Validate Initial Input ---
            this.log('info', 'Validating initial input...');
            this._validateInput(state.userProfile, state.goals, state.researchData);
            state.reasoning.push("Initial input validation passed.");

            // --- Retrieve Past Workouts from Memory ---
            if (userProfile.user_id) {
                this.log('info', 'Retrieving previous workout plans and feedback...');
                try {
                    // Use the standardized BaseAgent retrieveMemories method
                    const pastWorkouts = await this.retrieveMemories({
                        userId: userProfile.user_id,
                        agentTypes: ['workout'], // Filter for workout agent types
                        metadata: { 
                            memory_type: 'agent_output',
                            content_type: 'workout_plan'
                        },
                        includeFeedback: true,
                        limit: 3,
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
            const { data: userData, error: userError } = await this.supabaseClient
                .from('user_profiles') // Changed to user_profiles
                .select('medical_conditions')
                .eq('user_id', userProfile.user_id) // Use the actual user identifier field
                .single();

            if (userError) {
                this.log('error', `Failed to fetch user profile data for user ${userProfile.user_id}: ${userError.message}`);
                // Throw AgentError for resource issue
                throw new AgentError(`Unable to retrieve user medical conditions for user ${userProfile.user_id}`, ERROR_CODES.RESOURCE_ERROR, null, userError);
            }

            // Handle potential null or stringified JSON for medical_conditions
            if (userData?.medical_conditions) {
                if (typeof userData.medical_conditions === 'string') {
                    try {
                        state.medicalConditions = JSON.parse(userData.medical_conditions);
                        if (!Array.isArray(state.medicalConditions)) {
                           this.log('warn', `Parsed medical_conditions is not an array for user ${userProfile.user_id}. Treating as empty.`);
                           state.medicalConditions = [];
                        }
                    } catch (parseError) {
                        this.log('warn', `Failed to parse medical_conditions JSON string for user ${userProfile.user_id}: ${parseError.message}. Treating as empty.`);
                        state.medicalConditions = [];
                    }
                } else if (Array.isArray(userData.medical_conditions)) {
                    state.medicalConditions = userData.medical_conditions;
                } else {
                     this.log('warn', `medical_conditions for user ${userProfile.user_id} is not a string or array. Treating as empty.`);
                     state.medicalConditions = [];
                }
            } else {
                 state.medicalConditions = []; // Ensure it's an empty array if null/undefined
            }
            state.reasoning.push(`Fetched user medical conditions: ${state.medicalConditions.join(', ') || 'None'}.`);
        } catch (error) {
            // Handle specific error types or re-throw a generic one
            if (error instanceof AgentError) {
                 // If it's already an AgentError (e.g., CONFIGURATION_ERROR or RESOURCE_ERROR), re-throw
                 throw error;
            } else {
                 // Catch other potential errors during validation or DB fetch
                 this.log('error', 'Unexpected error during initial validation or data fetching.', { originalError: error });
                 // Throw a generic processing error, keeping the original error details
                 throw new AgentError('Unexpected error during agent initialization.', ERROR_CODES.PROCESSING_ERROR, null, error);
            } 
        }

        // Start the main processing try-catch after initial setup is confirmed safe
        try {
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
                     throw new AgentError('OpenAI API call failed after retries', ERROR_CODES.EXTERNAL_SERVICE_ERROR, null, apiError);
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
                         tags: [...goals, userProfile.fitnessLevel],
                         importance: 3, 
                         fitness_level: userProfile.fitnessLevel,
                         plan_version: state.iteration,
                         includes_research: !!researchData
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
     * Validates the input parameters for the process method.
     * @param {Object} userProfile - User profile data.
     * @param {string[]} goals - User fitness goals.
     * @param {Object} researchData - Research insights.
     * @throws {AgentError} If validation fails.
     * @private
     */
    _validateInput(userProfile, goals, researchData) {
        this.log('debug', '_validateInput called');
        try {
            this.validate(userProfile, (profile) => profile && typeof profile === 'object', 'Invalid userProfile provided.');
            this.validate(userProfile, (profile) => profile.fitnessLevel, 'userProfile must include fitnessLevel.');
            this.validate(goals, (g) => g && Array.isArray(g) && g.length > 0, 'Invalid or empty goals array provided.');
            this.validate(researchData, (data) => data && typeof data === 'object', 'Invalid researchData provided.');
        } catch (validationError) {
            // Wrap the original ValidationError in an AgentError
            throw new AgentError(validationError.message, ERROR_CODES.VALIDATION_ERROR, validationError.details, validationError);
        }
        this.log('info', 'Input validation successful.');
    }

    /**
     * Formats the final output object.
     * @param {Object} resultData - Data collected during the process.
     * @returns {Object} The final structured output.
     * @private
     */
    _formatOutput(resultData) {
        this.log('debug', '_formatOutput called');
        // TODO: Define the final structure clearly
        return {
            status: resultData.errors?.length > 0 ? 'error' : 'success',
            planId: `plan_${Date.now()}`, // Example temporary ID
            planName: `Workout Plan for ${resultData.goals?.join(', ') || 'User'}`, // Example name
            exercises: resultData.plan?.plan || [], // Assuming schema { plan: [{ exercise, sets, reps }] }
            formattedPlan: resultData.formattedPlan || "Plan formatting pending.",
            explanations: resultData.explanations || "Explanations pending.",
            researchInsights: resultData.researchInsights || [],
            reasoning: resultData.reasoning || ["Reasoning generation pending."],
            warnings: resultData.warnings || [],
            errors: resultData.errors || [], // Include errors if any occurred
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
            injuryPrompt = "\n\nSafety Constraints based on User Medical Conditions:\n";
            medicalConditions.forEach(condition => {
                const lowerCondition = String(condition).toLowerCase().trim(); // Ensure string and lowercase
                // Find matching contraindication from the fetched data
                const matchingContraindication = contraindications.find(
                    c => String(c.condition).toLowerCase().trim() === lowerCondition
                );

                if (matchingContraindication && Array.isArray(matchingContraindication.exercises_to_avoid) && matchingContraindication.exercises_to_avoid.length > 0) {
                    // Exercises to avoid are directly from the DB
                    const exercises = matchingContraindication.exercises_to_avoid.join(', ');
                    injuryPrompt += `- Condition: ${condition} - Avoid exercises: ${exercises}\n`;
                } else {
                    // Generic approach if no specific contraindication data found
                    injuryPrompt += `- Condition: ${condition} - Exercise caution and avoid high-impact activities\n`;
                }
            });
        }
        
        // Add past workout context if available
        let workoutHistoryPrompt = "";
        if (pastWorkouts && pastWorkouts.length > 0) {
            workoutHistoryPrompt = "\n\nUser's Workout History:\n";
            
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
                const response = await this.openaiService.createChatCompletion({
                    model: this.config.model,
                    messages: [
                        { role: "system", content: systemPrompt }
                        // No user message needed if all context is in system prompt
                    ],
                    temperature: this.config.temperature,
                    max_tokens: this.config.max_tokens,
                    // response_format: { type: "json_object" }, // Enable if model supports enforced JSON output
                    // Add timeout if supported by the service implementation
                }, { timeout: this.config.timeoutLimit });
                
                return response.choices[0]?.message?.content || '';
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
            
            // Check for required fields
            if (!parsedData.plan || !Array.isArray(parsedData.plan)) {
                this.log('warn', 'Parsed result missing "plan" array field');
                return null;
            }
            
            return parsedData;
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
            
            if (!exercise.reps || (typeof exercise.reps !== 'number' && typeof exercise.reps !== 'string')) {
                throw new ValidationError(`Exercise "${exercise.exercise}" is missing valid reps.`);
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
}

module.exports = WorkoutGenerationAgent; 