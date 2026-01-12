const BaseAgent = require('./base-agent');
const OpenAIService = require('../services/openai-service');
const { SupabaseClient } = require('../services/supabase');
const logger = require('../config/logger');
const { ValidationError, AgentError, ERROR_CODES } = require('../utils/errors');
// Placeholder imports for modules to be created later
const FeedbackParser = require('./adjustment-logic/feedback-parser');
const PlanModifier = require('./adjustment-logic/plan-modifier');
const AdjustmentValidator = require('./adjustment-logic/adjustment-validator');
const ExplanationGenerator = require('./adjustment-logic/explanation-generator');

/**
 * @interface WorkoutAgent
 * Defines the structure for agents generating or adjusting workout plans.
 */
/**
 * @function process
 * @memberof WorkoutAgent
 * @param {Object} plan - The original workout plan to adjust.
 * @param {string} feedback - User's feedback about the plan.
 * @param {Object} userProfile - User's profile data.
 * @returns {Promise<Object>} - The adjusted workout plan and explanations.
 */

/**
 * PlanAdjustmentAgent class adjusts existing workout plans based on user feedback using a Reflection pattern.
 * This class orchestrates the adjustment process, delegating specific tasks to helper modules.
 * @extends BaseAgent
 */
class PlanAdjustmentAgent extends BaseAgent {
    /**
     * Initializes the PlanAdjustmentAgent.
     * @param {Object} config - Configuration object
     * @param {OpenAIService} config.openaiService - An instance of the OpenAIService
     * @param {Object} config.supabaseClient - An instance of the Supabase client
     * @param {Object} [config.memorySystem=null] - Memory system for storing agent memories
     * @param {Object} [config.logger=logger] - Logger instance
     * @param {Object} [config.config={}] - Agent-specific configuration
     */
    constructor({ 
        openaiService, 
        supabaseClient, 
        memorySystem = null, 
        logger = logger, 
        config = {} 
    } = {}) {
        super({ 
            memorySystem, 
            logger, 
            config: {
                maxRetries: config.maxRetries || 2,
                initialDelay: config.baseDelay || 1000, // ms
                timeoutLimit: config.timeoutLimit || 60000, // ms for OpenAI
                model: config.model || 'gpt-4o', // Default model
                temperature: config.temperature || 0.7,
                max_tokens: config.max_tokens || 4096,
                ...config
            }
        });

        this.log('debug', 'PlanAdjustmentAgent constructor called');
        
        // 1. Dependency Checks
        if (!openaiService) {
            throw new AgentError(
                'OpenAIService instance is required.',
                ERROR_CODES.CONFIGURATION_ERROR
            );
        }
        if (!supabaseClient) {
            throw new AgentError(
                'SupabaseClient instance is required.',
                ERROR_CODES.CONFIGURATION_ERROR
            );
        }

        this.openaiService = openaiService;
        this.supabaseClient = supabaseClient;

        // Set the correct agent type for memory system (overrides automatic detection)
        this.agentType = 'adjustment'; // Use valid agent type from validators

        // 2. Initialize Helper Modules
        try {
            this.feedbackParser = new FeedbackParser(this.openaiService, this.supabaseClient, this.config, this.logger);
            this.planModifier = new PlanModifier(this.supabaseClient, this.config, this.logger);
            this.adjustmentValidator = new AdjustmentValidator(this.supabaseClient, this.config, this.logger);
            this.explanationGenerator = new ExplanationGenerator(this.openaiService, this.config, this.logger);
        } catch (error) {
            throw new AgentError(
                `Failed to initialize adjustment modules: ${error.message}`,
                ERROR_CODES.RESOURCE_ERROR,
                null,
                error
            );
        }
    }

    /**
     * Main process method orchestrating the plan adjustment workflow using the Reflection pattern.
     * @param {Object} context - Input context
     * @param {Object} context.plan - The original workout plan object
     * @param {string} context.feedback - User's feedback text
     * @param {Object} context.userProfile - User's profile data
     * @param {Object} [options={}] - Processing options
     * @returns {Promise<Object>} - The structured output containing the adjusted plan, explanations, etc.
     * @throws {AgentError} If a critical error occurs during processing
     */
    async process(context, options = {}) {
        this.log('info', 'process START');
        const startTime = Date.now();
        
        const { plan, feedback, userProfile } = context;
        const originalUpdatedAt = plan.updated_at; // Store the original timestamp

        // Initialize structured state object for the Reflection pattern
        let state = {
            originalPlan: plan,
            feedback,
            userProfile,
            adjustedPlan: null, // Will hold the modified plan
            // --- State properties for each Reflection step ---
            initialUnderstanding: { // Output of _initialUnderstanding
                parsedFeedback: null,
                categorizedAdjustments: null,
                adjustmentSpecifics: null,
            },
            consideration: { // Output of _consideration
                feasibilityResults: null,
                safetyResults: null,
                coherenceResults: null,
                considerationsSummary: [], // Array of analysis points
            },
            adjustment: { // Output of _adjustment
                appliedChanges: [], // List of changes successfully applied
                skippedChanges: [], // List of changes skipped (e.g., due to safety)
            },
            reflection: { // Output of _reflection
                validationResults: null,
                explanations: null, // Structured explanations
                comparison: null, // Comparison between original and adjusted
            },
            // --- Memory-related state ---
            previousAdjustments: [], // Will hold past plan adjustments
            userFeedbackHistory: [], // Will hold past user feedback
            // --- General state tracking ---
            errors: [],
            warnings: [],
            reasoning: [], // Step-by-step log of the agent's thought process
        };

        try {
            // --- Input Validation ---
            this.log('info', 'Validating input parameters...');
            this._validateInput(state.originalPlan, state.feedback, state.userProfile);
            state.reasoning.push("Initial input validation passed.");

            // --- Retrieve Previous Adjustments from Memory ---
            if (userProfile.user_id) {
                this.log('info', 'Retrieving previous plan adjustments from memory...');
                
                try {
                    // Use standardized BaseAgent retrieveMemories method to get past adjustments
                    const previousAdjustments = await this.retrieveMemories({
                        userId: userProfile.user_id,
                        agentTypes: ['adjustment'], 
                        metadata: {
                            memory_type: 'agent_output',
                            original_plan_id: plan.planId // To find adjustments for this specific plan
                        },
                        limit: 3,
                        sortBy: 'recency'
                    });
                    
                    if (previousAdjustments.length > 0) {
                        state.previousAdjustments = previousAdjustments;
                        state.reasoning.push(`Retrieved ${previousAdjustments.length} previous adjustments for this plan.`);
                        
                        // Get any feedback on these previous adjustments
                        const feedbackMemories = await this.retrieveMemories({
                            userId: userProfile.user_id,
                            agentTypes: ['feedback'],
                            metadata: {
                                memory_type: 'user_feedback',
                                related_plan_id: plan.planId
                            },
                            limit: 5
                        });
                        
                        if (feedbackMemories.length > 0) {
                            state.userFeedbackHistory = feedbackMemories;
                            state.reasoning.push(`Retrieved ${feedbackMemories.length} pieces of feedback history.`);
                        }
                    } else {
                        this.log('info', 'No previous plan adjustments found in memory');
                        state.reasoning.push("This is the first adjustment for this plan.");
                    }
                } catch (error) {
                    this.log('warn', `Memory retrieval issue: ${error.message}`, { error });
                    // Don't fail just because memory retrieval failed
                    state.warnings.push(`Memory retrieval encountered an issue: ${error.message}`);
                }
            }

            // --- Reflection Pattern Execution ---

            // Step 1: Initial Understanding - Parse feedback
            this.log('info', 'Reflection Step 1: Initial Understanding');
            await this._initialUnderstanding(state);
            state.reasoning.push("Completed: Initial Understanding (Feedback Parsing)");

            // Step 2: Consideration - Analyze feasibility, safety, coherence
            this.log('info', 'Reflection Step 2: Consideration');
            await this._consideration(state);
            state.reasoning.push("Completed: Consideration (Analysis)");

            // Step 3: Adjustment - Apply changes to the plan
            this.log('info', 'Reflection Step 3: Adjustment');
            await this._adjustment(state);
            state.reasoning.push("Completed: Adjustment (Plan Modification)");

            // Step 4: Reflection - Validate the adjusted plan and explain changes
            this.log('info', 'Reflection Step 4: Reflection (Validation & Explanation)');
            await this._reflection(state);
            state.reasoning.push("Completed: Reflection (Validation & Explanation)");

            // Store the adjusted plan in memory using standardized pattern
            if (this.memorySystem && userProfile.user_id) {
                try {
                    await this.storeMemory(state.adjustedPlan, {
                        userId: userProfile.user_id,
                        memoryType: 'agent_output',
                        contentType: 'adjusted_plan',
                        planId: plan.planId,
                        tags: ['plan_adjustment'],
                        original_plan_id: plan.planId,
                        feedback_summary: state.initialUnderstanding.parsedFeedback?.summary || feedback.substring(0, 100)
                    });
                    this.log('debug', 'Stored adjusted plan in memory system');
                } catch (error) {
                    this.log('warn', `Failed to store adjusted plan memory: ${error.message}`, { error });
                    state.warnings.push(`Memory storage failed (adjusted plan): ${error.message}`);
                }
                
                // Also store reasoning and metadata separately
                try {
                    await this.storeMemory({
                        reasoning: state.reasoning,
                        changes: state.adjustment.appliedChanges,
                        skipped: state.adjustment.skippedChanges,
                        warningsFromProcess: state.warnings // Capture current warnings before this potential failure
                    }, {
                        userId: userProfile.user_id,
                        memoryType: 'agent_metadata',
                        contentType: 'adjustment_reasoning',
                        planId: plan.planId,
                        tags: ['reasoning', 'adjustment_process'],
                        importance: 2 // Medium importance for learning
                    });
                    this.log('debug', 'Stored reasoning memory in memory system');
                } catch (error) {
                    this.log('warn', `Failed to store reasoning memory: ${error.message}`, { error });
                    state.warnings.push(`Memory storage failed (reasoning): ${error.message}`); // This will be the second warning if both fail
                }
            }

            // --- Final Output Formatting ---
            const finalOutput = this._formatOutput(state);
            const duration = Date.now() - startTime;
            this.log('info', `process END: Plan adjusted successfully in ${duration}ms.`);
            return finalOutput;

        } catch (error) {
            this.log('error', `CRITICAL Error during process: ${error.message}`, { stack: error.stack });
            
            // If it's already an AgentError, re-throw it for safeProcess to handle
            if (error instanceof AgentError || error.name === 'AgentError') {
                throw error;
            } else {
                // Wrap in AgentError with appropriate code based on the type of error
                let errorCode = ERROR_CODES.PROCESSING_ERROR; // Default
                
                if (error.name === 'ValidationError') {
                    errorCode = ERROR_CODES.VALIDATION_ERROR;
                } else if (error.message.includes('network') || error.message.includes('timeout') || error.message.includes('API')) {
                    errorCode = ERROR_CODES.EXTERNAL_SERVICE_ERROR;
                } else if (error.message.includes('missing') || error.message.includes('not found') || error.message.includes('undefined')) {
                    errorCode = ERROR_CODES.RESOURCE_ERROR;
                }
                
                throw new AgentError(
                    `Plan adjustment error: ${error.message}`,
                    errorCode,
                    { step: state.errors[state.errors.length - 1]?.step || 'unknown' },
                    error
                );
            }
        }
    }

    // --- Reflection Pattern Method Implementations ---

    /**
     * Executes the Initial Understanding step: Parses and structures user feedback.
     * @param {Object} state - The current process state object. Modifies state.initialUnderstanding.
     * @throws {AgentError} If feedback parsing fails
     * @private
     */
    async _initialUnderstanding(state) {
        this.log('info', '_initialUnderstanding: Delegating feedback parsing...');
        try {
             // Replace placeholder with call to FeedbackParser module method
             const { parsed, categorized, specifics } = await this.feedbackParser.parse(state.feedback);
             state.initialUnderstanding.parsedFeedback = parsed;
             state.initialUnderstanding.categorizedAdjustments = categorized;
             state.initialUnderstanding.adjustmentSpecifics = specifics;

             // Collect warnings from parser
             if (parsed?.warnings?.length > 0) {
                 state.warnings.push(...parsed.warnings);
                 this.log('warn', `Collected ${parsed.warnings.length} warnings from FeedbackParser.`);
             }

             this.log('info', 'Feedback parsing complete.');

        } catch (error) {
             this.log('error', `Error during initial understanding: ${error.message}`);
             throw new AgentError(
                  `Failed to parse user feedback: ${error.message}`,
                  ERROR_CODES.PROCESSING_ERROR,
                  { step: 'initialUnderstanding' },
                  error
             );
        }
    }

    /**
     * Executes the Consideration step: Analyzes feasibility, safety, and coherence.
     * @param {Object} state - The current process state object. Modifies state.consideration.
     * @throws {AgentError} If consideration analysis fails
     * @private
     */
    async _consideration(state) {
        this.log('info', '_consideration: Delegating adjustment analysis...');
        try {
            // Replace placeholder with calls to AdjustmentValidator module methods
            const feasibility = await this.adjustmentValidator.analyzeFeasibility(state.originalPlan, state.initialUnderstanding.parsedFeedback, state.userProfile);
            const safety = await this.adjustmentValidator.checkSafety(state.initialUnderstanding.parsedFeedback, state.userProfile);
            const coherence = await this.adjustmentValidator.verifyCoherence(state.originalPlan, state.initialUnderstanding.parsedFeedback, state.userProfile);
            state.consideration.feasibilityResults = feasibility;
            state.consideration.safetyResults = safety;
            state.consideration.coherenceResults = coherence;

            // Collect safety warnings
            if (safety?.warnings?.length > 0) {
                state.warnings.push(...safety.warnings);
                 this.log('warn', `Collected ${safety.warnings.length} safety warnings from AdjustmentValidator.`);
            }

            // Combine results into a summary for easy access
            state.consideration.considerationsSummary = [
                 ...(feasibility.infeasible.map(i => ({ type: 'feasibility', status: 'infeasible', ...i }))),
                 ...(safety.unsafeRequests.map(u => ({ type: 'safety', status: 'unsafe', ...u }))),
                 ...(coherence.incoherent.map(i => ({ type: 'coherence', status: 'incoherent', ...i }))),
                 ...(safety.warnings.map(warningMessage => ({ type: 'safety', status: 'warning', message: warningMessage }))), 
            ];

            this.log('info', `Consideration analysis complete. Issues/Warnings: ${state.consideration.considerationsSummary.length}`);

        } catch (error) {
            this.log('error', `Error during consideration: ${error.message}`);
            throw new AgentError(
                `Failed during consideration analysis: ${error.message}`,
                ERROR_CODES.PROCESSING_ERROR,
                { step: 'consideration' },
                error
            );
        }
    }

    /**
     * Executes the Adjustment step: Applies modifications to the plan.
     * @param {Object} state - The current process state object. Sets state.adjustedPlan and modifies state.adjustment.
     * @throws {AgentError} If plan modification fails
     * @private
     */
    async _adjustment(state) {
        this.log('info', '_adjustment: Delegating plan modification...');
        try {
            // Replace placeholder with call to PlanModifier module method
            this.log('info', '_adjustment: Calling this.planModifier.apply...'); // Log before call
            const result = await this.planModifier.apply(
                state.originalPlan,
                state.initialUnderstanding.parsedFeedback,
                [
                    state.consideration.feasibilityResults,
                    state.consideration.safetyResults,
                    state.consideration.coherenceResults
                ] // Pass as array of results that PlanModifier can search through
            );
            this.log('info', `_adjustment: Received result from apply: ${JSON.stringify(result)}`); // Log result after call
            
            // Ensure result has the expected structure before destructuring
            if (!result || typeof result.modifiedPlan === 'undefined' || !Array.isArray(result.appliedChanges) || !Array.isArray(result.skippedChanges)) {
                this.log('error', `_adjustment: Invalid structure received from planModifier.apply. Result: ${JSON.stringify(result)}`);
                throw new AgentError(
                    'Invalid structure received from plan modification step.',
                    ERROR_CODES.PROCESSING_ERROR,
                    { step: 'adjustment' }
                );
            }
            
            // Destructure after validation
            const { modifiedPlan, appliedChanges, skippedChanges } = result;

            state.adjustedPlan = modifiedPlan;
            state.adjustment.appliedChanges = appliedChanges;
            state.adjustment.skippedChanges = skippedChanges;

            this.log('info', `Plan modification complete. Applied: ${appliedChanges.length}, Skipped: ${skippedChanges.length}`);

        } catch (error) {
            this.log('error', `Error during adjustment: ${error.message}`);
            throw new AgentError(
                `Failed to modify plan: ${error.message}`,
                ERROR_CODES.PROCESSING_ERROR,
                { step: 'adjustment' },
                error
            );
        }
    }

    /**
     * Executes the Reflection step: Validates the adjusted plan and generates explanations.
     * @param {Object} state - The current process state object. Modifies state.reflection.
     * @throws {AgentError} If validation or explanation generation fails
     * @private
     */
    async _reflection(state) {
        this.log('info', '_reflection: Delegating validation and explanation generation...');
        if (!state.adjustedPlan) {
            const resourceError = new AgentError(
                "Adjusted plan is missing, cannot perform reflection.",
                ERROR_CODES.RESOURCE_ERROR,
                { step: 'reflection' }
            );
            throw resourceError; 
        }

        try {
            // Replace placeholder with call to AdjustmentValidator module method
            const validation = await this.adjustmentValidator.validateAdjustedPlan(
                state.adjustedPlan,
                state.userProfile,
                state.originalPlan?.updated_at // Pass the original timestamp
            );
            state.reflection.validationResults = validation;
            
            // Check validation results before generating explanations
            if (!validation.isValid) {
                 this.log('warn', 'Adjusted plan failed validation. Explanations might be based on an invalid plan.', validation.issues);
                 // Add a warning instead of throwing an error
                 state.warnings.push("Adjusted plan failed final validation. Review issues before use.");

                 // Collect specific validation issues as warnings
                 if (validation.issues?.length > 0) {
                      state.warnings.push(...validation.issues.map(issue => ({ type: `validation_${issue.type}`, message: issue.message })) );
                 }
            }

            // Replace placeholder with call to ExplanationGenerator module method
            const explanations = await this.explanationGenerator.generate(
                state.adjustedPlan,
                state.originalPlan,
                state.initialUnderstanding.parsedFeedback,
                state.adjustment.appliedChanges
            );
            const comparison = await this.explanationGenerator.compare(state.adjustedPlan, state.originalPlan);
            state.reflection.explanations = explanations;
            state.reflection.comparison = comparison;

            this.log('info', `Validation and explanation generation complete. Validation status: ${validation.isValid}`);

        } catch (error) {
            this.log('error', `Error during reflection: ${error.message}`);
            throw new AgentError(
                `Failed during reflection stage: ${error.message}`,
                ERROR_CODES.PROCESSING_ERROR,
                { step: 'reflection' },
                error
            );
        }
    }

    // --- Core Utility Methods ---

    /**
     * Validates the essential input parameters for the process method.
     * @param {Object} plan - The original workout plan.
     * @param {string} feedback - User feedback text.
     * @param {Object} userProfile - User profile data.
     * @throws {ValidationError} If any validation fails (to be caught by process method).
     * @private
     */
    _validateInput(plan, feedback, userProfile) {
        this.log('debug', '_validateInput called');
        
        // Removed try...catch, let ValidationError propagate
        this.validate(
            plan,
            (p) => p && typeof p === 'object' && p.planId,
            'Invalid or missing original plan object (must include planId).'
        );
        
        this.validate(
            feedback,
            (f) => f && typeof f === 'string' && f.trim() !== '',
            'Invalid or empty feedback provided.'
        );
        
        this.validate(
            userProfile,
            (p) => p && typeof p === 'object' && p.user_id,
            'Invalid or missing user profile object (must include user_id).'
        );
        
        this.log('info', 'Input validation successful.');
    }

    /**
     * Formats the final structured output object based on the process state.
     * @param {Object} state - The final state object after all Reflection steps.
     * @returns {Object} The final structured output for the API response.
     * @private
     */
    _formatOutput(state) {
        this.log('debug', '_formatOutput called');
        const isSuccess = state.errors.length === 0;

        return {
            status: isSuccess ? 'success' : 'error',
            originalPlanId: state.originalPlan?.planId,
            // Provide a new ID for the adjusted plan
            adjustedPlanId: isSuccess && state.adjustedPlan ? `adj_${state.originalPlan?.planId}_${Date.now()}` : null,
            // Return adjusted plan on success, original plan on failure (or null if original was invalid)
            adjustedPlan: isSuccess ? state.adjustedPlan : (state.originalPlan || null),
            // Include structured details from the reflection step
            explanations: state.reflection?.explanations || (isSuccess ? {} : { error: "Failed to generate explanations due to error." }),
            changesSummary: state.adjustment?.appliedChanges || [],
            skippedSummary: state.adjustment?.skippedChanges || [],
            comparison: state.reflection?.comparison || (isSuccess ? {} : { error: "Failed to generate comparison due to error." }),
            validation: state.reflection?.validationResults || (isSuccess ? null : { error: "Validation skipped due to error." }),
            // Include process metadata
            reasoning: state.reasoning || [],
            warnings: state.warnings || [],
            errors: state.errors || [], // Ensure errors are always included if they occurred
        };
    }
}

module.exports = PlanAdjustmentAgent; 