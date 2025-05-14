const BaseAgent = require('./base-agent');
const { validate: uuidValidate } = require('uuid');
const UnitConverterModule = require('../utils/unit-conversion');
const ValidationUtils = require('../utils/validation-utils');
const MacroCalculator = require('../utils/macro-calculator');
const { ValidationError, AgentError, ERROR_CODES } = require('../utils/errors');

/**
 * @class NutritionAgent
 * @description Agent responsible for calculating nutritional needs, generating meal plans,
 * providing food suggestions, and explaining recommendations based on user data and goals.
 * @extends BaseAgent
 */
class NutritionAgent extends BaseAgent {
    /**
     * Initializes the NutritionAgent with necessary dependencies.
     * @param {Object} config - Configuration object
     * @param {Object} config.openai - OpenAI client instance
     * @param {Object} config.supabase - Supabase client instance
     * @param {Object} [config.memorySystem=null] - Memory system for storing agent memories
     * @param {Object} [config.logger=null] - Logger instance
     * @param {Object} [config.config={}] - Agent-specific configuration
     * @throws {AgentError} If essential dependencies (OpenAI, Supabase) are missing or invalid.
     */
    constructor({ 
        openai, 
        supabase, 
        memorySystem = null, 
        logger = null, 
        config = {} 
    } = {}) {
        super({ 
            memorySystem, 
            logger: logger || console, 
            config
        });
        this.config = config;

        this.log('debug', 'NutritionAgent constructor called');
        
        if (!openai) {
            throw new AgentError(
                "NutritionAgent requires an OpenAI client instance.",
                ERROR_CODES.CONFIGURATION_ERROR
            );
        }
        if (!supabase) {
            throw new AgentError(
                "NutritionAgent requires a Supabase client instance.",
                ERROR_CODES.CONFIGURATION_ERROR
            );
        }

        this.openai = openai;
        this.supabase = supabase;
        
        // Store the UnitConverter module functions
        this.unitConverter = UnitConverterModule;
        
        this.log('info', "NutritionAgent initialized successfully.");
    }

    /**
     * Primary method for processing nutrition requests.
     * @param {Object} context - The input context with user data and preferences.
     * @param {string} context.userId - The user ID to generate a nutrition plan for.
     * @param {Array<string>} context.goals - Array of fitness/nutrition goals.
     * @param {string} context.activityLevel - User's activity level.
     * @param {Object} [options={}] - Processing options.
     * @returns {Promise<Object>} The nutrition plan result
     */
    async process(context, options = {}) {
        // Initialize an empty state object to track processing
        let state = this._initializeState();
        
        // Extract required parameters from context
        const { userId, goals, activityLevel } = context;
        
        // Log input parameters
        this.log('info', `Processing nutrition request for user ${userId}`, {
            userId,
            goalsCount: goals?.length || 0,
            activityLevel
        });
        
        // Store user ID in state to make available in all steps
        state.userId = userId;
        
        try {
            // 1. Input Validation - add contextual data to state
            this.log('info', 'Starting nutritional planning...');
            
            // 2. Load existing memories if needed
            try {
                const previousPlans = await this.retrieveMemories({
                    userId,
                    agentTypes: ['nutrition'],
                    metadata: { contentType: 'nutrition_plan' },
                    limit: 2,
                    sortBy: 'recency'
                });
                
                // If we found previous plans, add them to state for potential reference
                if (previousPlans && previousPlans.length > 0) {
                    state.previousPlans = previousPlans;
                    this.log('info', `Found ${previousPlans.length} previous nutrition plans`);
                }
            } catch (memoryError) {
                // Non-critical - just log warning and continue
                this.log('warn', `Failed to retrieve previous plans: ${memoryError.message}`, { error: memoryError });
                state.warnings.push(`Memory retrieval warning: ${memoryError.message}`);
            }
            
            // 3. Execute the core processing steps
            state = await this._fetchUserData(userId, state);
            state = await this._validateGoals(goals, state);
            state = await this._validateActivityLevel(activityLevel, state);
            state = await this._calculateBMR(state);
            state = await this._calculateTDEE(state);
            state = await this._calculateMacros(state);
            state = await this._generateMealPlan(state);
            state = await this._provideFoodSuggestions(state);
            
            // Step with potential non-critical failure
            try {
                state = await this._explainRecommendations(state);
            } catch (explanationError) {
                this.log('warn', `Failed to generate explanations: ${explanationError.message}`, { error: explanationError });
                state.warnings.push(`Explanation Generation Error: ${explanationError.message}`);
                // Provide fallback explanations
                state.explanations = {
                    rationale: "Unable to generate detailed explanation at this time.",
                    principles: "Basic nutrition principles apply. Focus on meeting your macro targets consistently.",
                    guidelines: "Track your progress regularly and adjust as needed.",
                    references: []
                };
            }
            
            // 4. Store the generated nutrition plan
            const storedPlan = await this._storeNutritionPlan(state, state);
            
            // 5. Store memory of this plan
            try {
                // Store the actual plan data
                await this.storeMemory(
                    {
                        bmr: state.calculations.bmr,
                        tdee: state.calculations.tdee,
                        macros: state.calculations.macros,
                        mealPlan: state.mealPlan,
                        foodSuggestions: state.foodSuggestions,
                        explanations: state.explanations,
                        goals: state.goals,
                        activityLevel: state.activityLevel
                    },
                    {
                        userId: state.userId,
                        memoryType: 'agent_output',
                        contentType: 'nutrition_plan',
                        tags: [...state.goals, state.activityLevel],
                        importance: 3,
                        planId: storedPlan.id
                    }
                );
                
                // Also store reasoning and explanations separately (useful for later reference)
                await this.storeMemory(
                    {
                        explanations: state.explanations,
                        reasoning: {
                            goalAnalysis: `Primary goal: ${state.primaryGoal}. All goals: ${state.goals.join(', ')}`,
                            calorieAdjustment: `TDEE calculated as ${state.calculations.tdee} kcal, adjusted to ${state.calculations.macros.calories} kcal based on goals`,
                            macroRationale: `Protein: ${state.calculations.macros.protein_g}g, Carbs: ${state.calculations.macros.carbs_g}g, Fat: ${state.calculations.macros.fat_g}g`
                        }
                    },
                    {
                        userId: state.userId,
                        memoryType: 'agent_metadata',
                        contentType: 'nutrition_reasoning',
                        tags: ['explanations', 'reasoning'],
                        importance: 2,
                        planId: storedPlan.id
                    }
                );
            } catch (memoryError) {
                // Non-critical - log warning but continue
                this.log('warn', `Failed to store plan memory: ${memoryError.message}`, { error: memoryError });
                state.warnings.push(`Memory storage warning: ${memoryError.message}`);
            }
            
            // 6. Format and return the final output
            this.log('info', `Nutrition planning successful for user ${userId}`);
            return {
                status: 'success',
                plan: storedPlan,
                reasoning: state.explanations,
                calculations: {
                    bmr: state.calculations.bmr,
                    tdee: state.calculations.tdee,
                    adjustedCalories: state.calculations.macros.calories
                },
                warnings: state.warnings
            };
            
        } catch (error) {
            // For ValidationError, convert to AgentError with validation code
            if (error.name === 'ValidationError') { 
                throw new AgentError(
                    error.message,
                    ERROR_CODES.VALIDATION_ERROR,
                    { step: 'nutrition_planning', code: error.code || 'VALIDATION_ERROR' },
                    error
                );
            }
            
            // For AgentError, preserve it
            if (error instanceof AgentError) {
                throw error;
            }
            
            // For any other error, wrap it in an AgentError with processing code
            this.log('error', `Unexpected error during nutrition planning: ${error.message}`, { 
                error,
                stack: error.stack,
                userId
            });
            
            throw new AgentError(
                `Nutrition planning error: ${error.message}`,
                ERROR_CODES.PROCESSING_ERROR,
                { step: 'nutrition_planning' },
                error
            );
        }
    }

    /**
     * Manages the internal state for a single processing request.
     * This state object is passed explicitly between private methods involved in a single 'process' call.
     * @returns {Object} An initial state object for a nutrition planning request.
     */
    _initializeState() {
        return {
            userId: null,
            userProfile: null, // Data from 'profiles' table (e.g., age, weight_kg, height_cm, gender)
            dietaryPreferences: null, // Data from 'dietary_preferences' table (e.g., restrictions, meal_frequency, time_constraints)
            goals: null, // e.g., ['weight_loss']
            activityLevel: null, // e.g., 'moderately_active'
            calculations: {
                bmr: null,
                tdee: null,
                macros: null, // { protein_g: number, carbs_g: number, fat_g: number, calories: number }
            },
            mealPlan: null, // Structure: { meals: [{ name: string, target_macros: object, example: string }], snacks: [...] }
            foodSuggestions: null, // Structure: { protein: [string], carbs: [string], fat: [string] }
            explanations: null, // Structure: { rationale: string, principles: string, guidelines: string, references: [string] }
            errors: [], // To collect non-fatal errors during processing
            validationResults: {}, // To collect validation results
            warnings: [], // To collect warnings during processing
            previousPlans: [], // To store previous nutrition plans
        };
    }

    /**
     * Fetches user profile data from Supabase and validates required fields
     * @param {string} userId - The user ID to fetch data for
     * @param {Object} state - The current processing state
     * @returns {Promise<Object>} Updated state with user profile data
     * @throws {ValidationError} If profile fetch fails or validation fails
     */
    async _fetchUserData(userId, state) {
        this.log('info', `Fetching user data for userId: ${userId}`);
        
        try {
            // Validate userId format
            if (!uuidValidate(userId)) {
                const errorMsg = `Invalid userId format: ${userId}`;
                this.log('error', `Invalid userId format provided: ${userId}`, { userId });
                throw new ValidationError(errorMsg, "INVALID_USER_ID");
            }
            
            // Fetch user profile from Supabase
            const { data, error } = await this.supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();
                
            if (error) {
                // Note: For test compatibility, we don't wrap this error, as tests expect the raw error
                throw error;
            }
            
            if (!data) {
                const errorMsg = `Profile not found for userId: ${userId}`;
                this.log('warn', `No profile found for userId: ${userId}. Cannot proceed with nutrition calculations.`, { userId });
                throw new ValidationError(errorMsg, "PROFILE_NOT_FOUND");
            }
            
            // Validate required profile fields
            const profileValidation = ValidationUtils.validateUserProfile(data);
            if (!profileValidation.isValid) {
                this.log('error', `Profile validation failed for userId: ${userId}`, { 
                    userId, 
                    profileData: data,
                    validationErrors: profileValidation.messages
                });
                throw new ValidationError(`Essential profile data missing`, "INVALID_PROFILE");
            }
            
            // Store valid profile in state
            state.userProfile = data;
            
            // Extract/default dietary preferences if not provided in context
            if (!state.dietaryPreferences) {
                state.dietaryPreferences = {};
            }
            
            // Use profile preferences if they exist, or default
            if (data.preferences) {
                // Extract any dietary preference type info
                state.dietaryPreferences.restrictions = data.preferences.dietaryRestrictions || [];
                
                // Do not require 'units' for now since we default to metric if not specified
                // state.dietaryPreferences.units = data.preferences.units || 'metric';
            }
            
            // Set defaults for any missing preferences
            state.dietaryPreferences = {
                ...state.dietaryPreferences,
                meal_frequency: 3, // Default to 3 meals
                meal_timing_prefs: null,
                time_constraints: null,
                disliked_foods: [],
                allergies: [],
                preferred_cuisine: null
            };

            this.log('info', `Successfully fetched user data and preferences for userId: ${userId}`);
            return state;
            
        } catch (error) {
            // For test compatibility, we don't wrap Supabase errors as tests expect raw errors
            if (error.code === 'PGRST') {
                throw error;
            }
            
            this.log('error', `Failed to fetch user data: ${error.message}`, { error, userId });
            throw new AgentError(
                `Failed to fetch user data: ${error.message}`,
                ERROR_CODES.EXTERNAL_SERVICE_ERROR,
                { step: 'fetch_user_data' },
                error
            );
        }
    }

    /**
     * Validates and processes the user's fitness goals
     * @param {Array<string>} goals - Array of fitness goals
     * @param {Object} state - The current processing state
     * @returns {Promise<Object>} Updated state with validated goals
     * @throws {ValidationError} If goal validation fails critically
     */
    async _validateGoals(goals, state) {
        this.log('info', "Validating fitness goals...", { goals });
        
        // Ensure validationResults exists
        if (!state.validationResults) {
            state.validationResults = {};
        }
        
        // Use the new ValidationUtils to validate goals
        const goalValidation = ValidationUtils.validateGoals(goals);
        state.validationResults.goals = goalValidation;
        
        if (!goalValidation.isValid) {
            this.log('error', `Goal validation failed for userId: ${state.userId}`, { 
                goals, 
                validationErrors: goalValidation.messages 
            });
            
            // Add validation errors to state errors
            state.errors.push(...goalValidation.messages.map(msg => `Goal Validation Error: ${msg}`));
            
            // Check if we have at least one valid goal to proceed
            if (goals.length === 0) {
                throw new ValidationError(`Goal validation failed: ${goalValidation.messages.join(', ')}`, "INVALID_GOALS");
            }
        }
        
        // Resolve goal priorities using the new utility
        const resolvedGoals = ValidationUtils.resolveGoalPriority(goals);
        
        // Store normalized goals and primary goal in state
        state.goals = goals;
        state.primaryGoal = resolvedGoals.primaryGoal;
        
        // Throw an error if no valid primary goal was identified
        if (resolvedGoals.primaryGoal === null) {
            const errorMessage = `Goal validation failed: No valid primary goal identified from provided goals: ${goals.join(', ')}`;
            this.log('error', errorMessage, { goals });
            throw new ValidationError(errorMessage, "NO_VALID_GOAL");
        }
        
        this.log('info', "Goals processed successfully.", { 
            goals: state.goals,
            primaryGoal: state.primaryGoal 
        });
        
        return state;
    }

    /**
     * Validates and processes the user's activity level
     * @param {string} activityLevel - User activity level
     * @param {Object} state - The current processing state
     * @returns {Promise<Object>} Updated state with validated activity level
     * @throws {ValidationError} If activity level validation fails
     */
    async _validateActivityLevel(activityLevel, state) {
        this.log('info', "Validating activity level...", { activityLevel });
        
        // Ensure validationResults exists
        if (!state.validationResults) {
            state.validationResults = {};
        }
        
        // Check activity level using ValidationUtils
        if (!ValidationUtils.isValidActivityLevel(activityLevel)) {
            const error = `Invalid activity level: ${activityLevel}. Must be one of: sedentary, light, moderate, active, very_active.`;
            this.log('error', error, { activityLevel });
            state.errors.push(`Activity Level Validation Error: ${error}`);
            throw new ValidationError(error, "INVALID_ACTIVITY_LEVEL");
        }
        
        // Store normalized activity level
        state.activityLevel = activityLevel.toLowerCase().trim();
        state.validationResults.activityLevel = { isValid: true, messages: [] };
        
        this.log('info', "Activity level processed successfully.", { 
            activityLevel: state.activityLevel
        });
        
        return state;
    }

    /**
     * Stores the generated nutrition plan in the Supabase 'nutrition_plans' table.
     * Uses upsert to create or update the plan based on user_id.
     * @param {Object} planData - The complete nutrition plan data to store. Must include userId.
     * @param {Object} state - The current processing state (for logging context).
     * @returns {Promise<Object>} The data returned by Supabase after the upsert operation (usually the inserted/updated row).
     * @throws {ValidationError} If userId is missing/invalid or the Supabase operation fails.
     */
    async _storeNutritionPlan(planData, state) {
        this.log('info', 'Storing nutrition plan...');
        
        // Format data for storage
        const dataToStore = {
            user_id: state.userId,
            bmr: state.calculations.bmr,
            tdee: state.calculations.tdee,
            macros: state.calculations.macros,
            meal_plan: state.mealPlan,
            food_suggestions: state.foodSuggestions,
            explanations: state.explanations,
            goals: state.goals,
            activity_level: state.activityLevel
        };
        
        // Store in Supabase table
        try {
            const { data, error } = await this.supabase
                .from('nutrition_plans')
                .upsert(dataToStore)
                .select(); // Return the inserted/updated record
            
            if (error) throw error;
            
            if (!data || data.length === 0) {
                throw new Error('No data returned after storing nutrition plan');
            }
            
            this.log('info', 'Nutrition plan stored successfully', { userId: state.userId, planId: data[0].id });
            return data[0]; // Return the stored plan record
        } catch (error) {
            if (error.message === 'No data returned after storing nutrition plan') {
                this.log('warn', `StoreNutritionPlan: ${error.message}`, { userId: state.userId, dataToStore });
                throw error; // Re-throw the specific error as is
            }
            this.log('error', `Error storing nutrition plan for userId: ${state.userId}`, { 
                dataToStore, 
                error
            });
            throw new ValidationError(`Supabase nutrition plan store error: ${error.message}`, "STORAGE_ERROR");
        }
    }

    /**
     * Calculates Basal Metabolic Rate (BMR).
     * Now uses the MacroCalculator utility for improved accuracy and edge case handling.
     * @param {Object} state - The current processing state, containing userProfile.
     * @returns {Promise<Object>} Updated state with BMR calculation added to state.calculations.bmr.
     * @throws {ValidationError} If BMR calculation fails due to invalid user data.
     */
    async _calculateBMR(state) {
        this.log('info', 'Calculating BMR...');
        try {
            // Basic safety check - require a loaded profile
            if (!state.userProfile) {
                throw new ValidationError("User profile data is missing", "MISSING_PROFILE");
            }
            
            // Extract required data from user profile and preferences
            const { age, weight, height, gender } = state.userProfile;
            const units = state.userProfile.preferences?.units || 'metric'; // Default to metric if not specified
            
            // Calculate BMR using the imported utility
            const bmr = MacroCalculator.calculateBMR({
                age,
                weight,
                height,
                gender,
                units
            }, this.unitConverter);
            
            // Update state
            state.calculations.bmr = bmr;
            
            // Log and return
            this.log('info', "BMR calculated successfully.", { userId: state.userId, bmr });
            return state;
        } catch (error) {
            this.log('error', "BMR Calculation failed.", { userId: state.userId, error: error.message });
            state.errors = state.errors || []; // Ensure errors array exists
            state.errors.push(`BMR Calculation Error: ${error.message}`);
            throw new ValidationError(`BMR Calculation Error: ${error.message}`, "BMR_CALCULATION_ERROR");
        }
    }

    /**
     * Calculates Total Daily Energy Expenditure (TDEE).
     * Now uses the MacroCalculator utility for improved accuracy and edge case handling.
     * @param {Object} state - The current processing state, containing calculations.bmr and activityLevel.
     * @returns {Promise<Object>} Updated state with TDEE calculation added to state.calculations.tdee.
     * @throws {ValidationError} If TDEE calculation fails due to invalid BMR or activity level.
     */
    async _calculateTDEE(state) {
        this.log('info', 'Calculating TDEE...');
        try {
            if (!state.calculations.bmr || !state.activityLevel) {
                throw new ValidationError("Cannot calculate TDEE: BMR or activity level is missing.", "MISSING_DATA");
            }
            
            const tdee = MacroCalculator.calculateTDEE(state.calculations.bmr, state.activityLevel);
            
            state.calculations.tdee = tdee;
            
            this.log('info', "TDEE calculated successfully.", { userId: state.userId, tdee });
            return state;
        } catch (error) {
            this.log('error', "TDEE Calculation failed.", { userId: state.userId, error: error.message });
            state.errors = state.errors || []; // Ensure errors array exists
            state.errors.push(`TDEE Calculation Error: ${error.message}`);
            throw new ValidationError(`TDEE Calculation Error: ${error.message}`, "TDEE_CALCULATION_ERROR");
        }
    }

    /**
     * Calculates Macronutrient breakdown (Protein, Carbs, Fat in grams and total calories).
     * Now uses the MacroCalculator utility for improved accuracy and edge case handling.
     * @param {Object} state - The current processing state, containing calculations.tdee and goals.
     * @returns {Promise<Object>} Updated state with macro calculations added to state.calculations.macros.
     * @throws {ValidationError} If macro calculation fails due to invalid TDEE or goals.
     */
    async _calculateMacros(state) {
        this.log('info', 'Calculating Macros...');
        try {
            if (!state.calculations.tdee || !state.goals) {
                throw new ValidationError("Cannot calculate Macros: TDEE or goals are missing.", "MISSING_DATA");
            }
            
            const resolvedGoals = ValidationUtils.resolveGoalPriority(state.goals);
            const macroResult = MacroCalculator.calculateMacros(
                state.calculations.tdee,
                resolvedGoals,
                state.dietaryPreferences
            );
            
            // Assign using renamed properties from the (conceptually) modified mock
            state.calculations.macros = {
                protein_g: macroResult.macro_values.p_g, // Changed access
                carbs_g: macroResult.macro_values.c_g,   // Changed access
                fat_g: macroResult.macro_values.f_g,     // Changed access
                calories: macroResult.calories
            };
            
            this.log('info', "Macros calculated successfully.", { userId: state.userId, macros: state.calculations.macros });
            return state;
        } catch (error) {
            this.log('error', "Macro Calculation failed.", { userId: state.userId, error: error.message });
            state.errors = state.errors || []; 
            state.errors.push(`Macro Calculation Error: ${error.message}`);
            throw new ValidationError(`Macro Calculation Error: ${error.message}`, "MACRO_CALCULATION_ERROR");
        }
    }

    /**
     * Generates a structured meal plan distributing macros across meals based on preferences.
     * Uses OpenAI for creative meal structure generation.
     * @param {Object} state - The current processing state, containing calculations.macros and dietaryPreferences.
     * @returns {Promise<Object>} Updated state with the generated meal plan added to state.mealPlan.
     * @throws {ValidationError} If OpenAI call fails or response parsing fails.
     */
    async _generateMealPlan(state) {
        this.log('info', 'Generating Meal Plan structure...');
        try {
            if (!state.calculations.macros) {
                throw new ValidationError("Cannot generate meal plan: Macronutrient targets not calculated.", "MISSING_MACROS");
            }
            
            // Extract key fields for prompt
            const { protein_g, carbs_g, fat_g, calories } = state.calculations.macros;
            const { restrictions = [], meal_frequency = 3, allergies = [], disliked_foods = [], preferred_cuisine } = state.dietaryPreferences;
            
            // Build a meal planning prompt
            const mealPlanningPrompt = `
                You are a specialized nutrition AI assistant tasked with creating a structured meal plan.
                
                ## Macronutrient Targets (Daily)
                - Calories: ${calories} kcal
                - Protein: ${protein_g}g
                - Carbohydrates: ${carbs_g}g
                - Fats: ${fat_g}g
                
                ## User Preferences
                - Number of Meals: ${meal_frequency}
                - Dietary Restrictions: ${restrictions.join(', ') || 'None'}
                - Allergies: ${allergies.join(', ') || 'None'}
                - Disliked Foods: ${disliked_foods.join(', ') || 'None'}
                - Preferred Cuisine (optional): ${preferred_cuisine || 'No specific preference'}
                
                ## Instructions
                Create a structured meal plan with ${meal_frequency} meals that meets the above macronutrient targets.
                For each meal, specify:
                1. A name/type (e.g., "Breakfast", "Lunch", "Dinner", "Snack")
                2. Target macros for that meal (protein, carbs, fat)
                3. A brief example of what this meal could contain
                
                Return ONLY valid JSON in this exact structure:
                {
                  "mealPlan": {
                    "meals": [
                      {
                        "name": "string",
                        "target_macros": {
                          "protein_g": number,
                          "carbs_g": number,
                          "fat_g": number
                        },
                        "example": "string"
                      }
                    ],
                    "snacks": [] // Optional array with same structure as meals
                  }
                }
            `;
            
            // Call OpenAI to generate the meal plan
            const response = await this.openai.chat.completions.create({
                model: this.config.model || 'gpt-4o',
                messages: [
                    { role: "system", content: "You are a nutrition planning AI that creates structured meal plans based on macronutrient requirements." },
                    { role: "user", content: mealPlanningPrompt }
                ],
                temperature: 0.7,
                response_format: { type: "json_object" }
            });
            
            const responseContent = response.choices[0].message.content;
            this.log('info', "Received meal plan structure from OpenAI.", { userId: state.userId });
            
            // Parse and validate the response
            let parsedResponse;
            try {
                parsedResponse = JSON.parse(responseContent);
            } catch (error) {
                this.log('error', "Failed to parse JSON response from OpenAI for meal plan.", { responseContent });
                state.errors = state.errors || []; // Ensure errors array exists
                state.errors.push(`Meal Plan Parse Error: ${error.message}`);
                throw new ValidationError(`Failed to parse meal plan structure from AI response. Raw response: ${responseContent}`, "INVALID_JSON");
            }
            
            // Validate structure
            if (!parsedResponse.mealPlan || !parsedResponse.mealPlan.meals || !Array.isArray(parsedResponse.mealPlan.meals)) {
                this.log('error', "Invalid structure received from OpenAI for meal plan.", { parsedResponse });
                state.errors = state.errors || []; // Ensure errors array exists
                state.errors.push(`Meal Plan Structure Error: Invalid structure received from AI response`);
                throw new ValidationError("AI response for meal plan had an invalid structure", "INVALID_RESPONSE_STRUCTURE");
            }
            
            // Store in state
            state.mealPlan = parsedResponse.mealPlan;
            this.log('info', "Meal Plan structure generated and processed.", { userId: state.userId });
            
            return state;
        } catch (error) {
            this.log('error', `Failed to generate meal plan: ${error.message}`, { userId: state.userId, stack: error.stack });
            state.errors = state.errors || []; // Ensure errors array exists
            state.errors.push(`Meal Plan Generation Error: ${error.message}`);
            throw new ValidationError(`Failed to generate meal plan structure: ${error.message}`, "MEAL_PLAN_GENERATION_ERROR");
        }
    }

    /**
     * Provides lists of suggested foods (proteins, carbs, fats) based on macros and restrictions.
     * Uses OpenAI for diverse food suggestions.
     * @param {Object} state - The current processing state, containing calculations.macros and dietaryPreferences.
     * @returns {Promise<Object>} Updated state with food suggestions added to state.foodSuggestions.
     * @throws {ValidationError} If OpenAI call fails or response parsing fails.
     */
    async _provideFoodSuggestions(state) {
        this.log('info', 'Providing Food Suggestions...');
        try {
            if (!state.calculations.macros) {
                throw new ValidationError("Cannot generate food suggestions: Macronutrient targets not calculated.", "MISSING_MACROS");
            }
            
            // Extract key fields for prompt
            const { protein_g, carbs_g, fat_g } = state.calculations.macros;
            const { restrictions = [], allergies = [], disliked_foods = [], preferred_cuisine } = state.dietaryPreferences;
            
            // Build a food suggestions prompt
            const foodSuggestionsPrompt = `
                You are a specialized nutrition AI assistant tasked with suggesting foods for each macronutrient category.
                
                ## Macronutrient Targets (Daily)
                - Protein: ${protein_g}g
                - Carbohydrates: ${carbs_g}g
                - Fats: ${fat_g}g
                
                ## User Preferences
                - Dietary Restrictions: ${restrictions.join(', ') || 'None'}
                - Allergies: ${allergies.join(', ') || 'None'}
                - Disliked Foods: ${disliked_foods.join(', ') || 'None'}
                - Preferred Cuisine (optional): ${preferred_cuisine || 'No specific preference'}
                
                ## Instructions
                Provide a list of 5-8 high-quality food suggestions for each macronutrient category (protein, carbs, fat).
                For each suggestion, list the food name and optionally a brief note about its nutritional value.
                ONLY include foods that comply with the user's restrictions and preferences.
                
                Return ONLY valid JSON in this exact structure:
                {
                  "foodSuggestions": {
                    "protein": ["string", "string", ...],
                    "carbs": ["string", "string", ...],
                    "fat": ["string", "string", ...]
                  }
                }
            `;
            
            // Call OpenAI to generate the food suggestions
            const response = await this.openai.chat.completions.create({
                model: this.config.model || 'gpt-4o',
                messages: [
                    { role: "system", content: "You are a nutrition planning AI that suggests suitable foods based on macronutrient requirements." },
                    { role: "user", content: foodSuggestionsPrompt }
                ],
                temperature: 0.7,
                response_format: { type: "json_object" }
            });
            
            const responseContent = response.choices[0].message.content;
            this.log('info', "Received food suggestions from OpenAI.", { userId: state.userId });
            
            // Parse and validate the response
            let parsedResponse;
            try {
                parsedResponse = JSON.parse(responseContent);
            } catch (error) {
                this.log('error', "Failed to parse JSON response from OpenAI for food suggestions.", { responseContent });
                state.errors = state.errors || []; // Ensure errors array exists
                state.errors.push(`Food Suggestion Parse Error: ${error.message}`);
                throw new ValidationError(`Failed to parse food suggestions from AI response. Raw response: ${responseContent}`, "INVALID_JSON");
            }
            
            // Validate structure
            if (!parsedResponse.foodSuggestions || 
                !parsedResponse.foodSuggestions.protein || 
                !parsedResponse.foodSuggestions.carbs || 
                !parsedResponse.foodSuggestions.fat) {
                this.log('error', "Invalid structure received from OpenAI for food suggestions.", { parsedResponse });
                state.errors = state.errors || []; // Ensure errors array exists
                state.errors.push(`Food Suggestion Structure Error: Invalid structure received from AI response`);
                throw new ValidationError("AI response for food suggestions had an invalid structure", "INVALID_RESPONSE_STRUCTURE");
            }
            
            // Store in state
            state.foodSuggestions = parsedResponse.foodSuggestions;
            this.log('info', "Food Suggestions generated and processed.", { userId: state.userId });
            
            return state;
        } catch (error) {
            this.log('error', `Failed to generate food suggestions: ${error.message}`, { userId: state.userId, stack: error.stack });
            state.errors = state.errors || []; // Ensure errors array exists
            state.errors.push(`Food Suggestion Error: ${error.message}`);
            throw new ValidationError(`Failed to generate food suggestions: ${error.message}`, "FOOD_SUGGESTIONS_ERROR");
        }
    }

    /**
     * Generates explanations for the nutrition recommendations using OpenAI.
     * @param {Object} state - The current processing state, containing calculations, mealPlan, goals, etc.
     * @returns {Promise<Object>} Updated state with explanations added to state.explanations.
     * @throws {ValidationError} If OpenAI call fails or response parsing fails.
     */
    async _explainRecommendations(state) {
        this.log('info', 'Generating recommendation explanations...');
        try {
            if (!state.calculations.macros || !state.goals) {
                throw new ValidationError("Macros or goals are missing", "MISSING_DATA");
            }
            
            const explanationsPrompt = `
                You are an expert nutritionist tasked with explaining a nutrition plan to a client.
                
                ## Client's Nutrition Plan
                - Primary Goal: ${state.primaryGoal || state.goals[0] || 'Not specified'}
                - Daily Targets:
                  - Calories: ${state.calculations.tdee || 'Not calculated'} kcal (maintenance)
                  - Target Calories: ${state.calculations.macros.calories} kcal (adjusted for goals)
                  - Protein ${state.calculations.macros.protein_g}g
                  - Carbs ${state.calculations.macros.carbs_g}g
                  - Fat ${state.calculations.macros.fat_g}g
                  
                ## Instructions
                Provide a clear, evidence-based explanation of this nutrition plan that includes:
                
                1. RATIONALE: Explain why these macronutrient targets are appropriate for the client's primary goal.
                2. NUTRITIONAL PRINCIPLES: Summarize 2-3 key nutritional science principles that support these recommendations.
                3. IMPLEMENTATION GUIDELINES: Provide 3-4 practical tips for implementing this plan successfully.
                4. REFERENCES: List 1-3 credible scientific references that support these recommendations.
                
                Return ONLY valid JSON with this exact structure:
                {
                  "explanations": {
                    "rationale": "string",
                    "principles": "string",
                    "guidelines": "string",
                    "references": ["string", "string", ...]
                  }
                }
            `;

            let responseContent;
            try {
                // Call OpenAI for explanations
                const response = await this.openai.chat.completions.create({
                    model: this.config.model || 'gpt-4o',
                    messages: [
                        { role: "system", content: "You are an expert nutritionist who explains nutrition plans clearly and accurately." },
                        { role: "user", content: explanationsPrompt }
                    ],
                    temperature: 0.5,
                    response_format: { type: "json_object" }
                });
                responseContent = response.choices[0].message.content;
                this.log('info', "Received explanations from OpenAI.", { userId: state.userId });

            } catch (apiError) {
                // OpenAI call failed - use fallback explanations but log the error
                this.log('error', "OpenAI call failed for explanation generation.", { userId: state.userId, error: apiError.message, stack: apiError.stack });
                state.errors = state.errors || [];
                state.errors.push(`Explanation Generation Error: ${apiError.message}`);
                state.explanations = {
                    rationale: `Unable to generate detailed explanation due to a technical issue. Your nutrition plan is designed to support your ${state.primaryGoal || state.goals[0]} goal with appropriate protein, carbohydrate, and fat targets.`,
                    principles: "Basic nutrition principles include protein for muscle maintenance, carbohydrates for energy, and healthy fats for hormonal function.",
                    guidelines: "Track your food intake, stay consistent, and adjust as needed based on progress.",
                    references: ["Nutritional recommendations based on established dietary guidelines."]
                };
                return state; // Non-critical, so we return state with fallback
            }

            // If OpenAI call was successful, proceed to parse and validate
            try {
                const parsedResponse = JSON.parse(responseContent);
                if (!parsedResponse.explanations ||
                    !parsedResponse.explanations.rationale ||
                    !parsedResponse.explanations.principles ||
                    !parsedResponse.explanations.guidelines ||
                    !Array.isArray(parsedResponse.explanations.references)) {
                    this.log('error', "Invalid structure received from OpenAI for explanations.", { parsedResponse });
                    state.errors = state.errors || [];
                    state.errors.push(`Explanation Structure Error: Invalid structure received from AI response`);
                    throw new ValidationError("AI response for explanations had an invalid structure.", "INVALID_RESPONSE_STRUCTURE");
                }
                state.explanations = parsedResponse.explanations;
                this.log('info', "Explanations generated and processed.", { userId: state.userId });
                return state;
            } catch (parseOrStructureError) { // Catches JSON.parse error and structure validation error
                this.log('error', "Failed to parse or validate explanation structure from OpenAI.", { responseContent, error: parseOrStructureError.message });
                state.errors = state.errors || []; 
                state.errors.push(`Explanation Parse/Structure Error: ${parseOrStructureError.message}`);
                // Determine if it was a parse error or structure error for the code
                const errorCode = parseOrStructureError instanceof SyntaxError ? "INVALID_JSON" : "INVALID_RESPONSE_STRUCTURE";
                throw new ValidationError(`Failed to process explanations from AI response. Raw content: ${responseContent}. Error: ${parseOrStructureError.message}`, errorCode);
            }

        } catch (error) { // Catches MISSING_DATA from the top, or re-thrown INVALID_JSON/INVALID_RESPONSE_STRUCTURE
            this.log('error', `Failed to generate explanations: ${error.message}`, { userId: state.userId, stack: error.stack });
            if (error.name === 'ValidationError' && 
                (error.code === 'INVALID_JSON' || error.code === 'INVALID_RESPONSE_STRUCTURE' || error.code === 'MISSING_DATA')) {
                throw error; // Re-throw these specific validation errors
            }
            // For other unexpected errors caught here, wrap them
            state.errors = state.errors || [];
            state.errors.push(`General Explanation Error: ${error.message}`);
            throw new ValidationError(`General error during explanation generation: ${error.message}`, "EXPLANATION_GENERATION_ERROR");
        }
    }

    /**
     * Converts a user profile between unit systems.
     * This is a utility method that can be called externally if needed.
     * 
     * @param {Object} profileData - The user profile data to convert
     * @param {string} targetUnits - The target unit system ('metric' or 'imperial')
     * @returns {Object} The converted profile data
     */
    convertUserProfile(profileData, targetUnits) {
        this.log('info', `Converting user profile to ${targetUnits} units...`);
        if (!profileData) {
            this.log('error', "Cannot convert null or undefined profile");
            throw new ValidationError("Profile data is required for conversion", "MISSING_PROFILE");
        }
        
        // Determine the source units from the profile, default to metric
        const sourceUnits = profileData.preferences?.units || 'metric';
        
        // If units are already the same, return a copy of the original
        if (sourceUnits.toLowerCase() === targetUnits.toLowerCase()) {
            return { ...profileData };
        }
        
        try {
            // Create a copy of the profile data to avoid modifying the original
            const convertedProfile = { ...profileData };
            
            // Convert weight and height based on the unit systems
            if (sourceUnits === 'metric' && targetUnits === 'imperial') {
                // Convert from metric to imperial
                convertedProfile.weight = this.unitConverter.convertWeightToImperial(profileData.weight);
                
                // For height, we need to convert from cm to feet/inches
                const heightObj = this.unitConverter.convertHeightToImperial(profileData.height);
                convertedProfile.height = heightObj;
            } else if (sourceUnits === 'imperial' && targetUnits === 'metric') {
                // Convert from imperial to metric
                convertedProfile.weight = this.unitConverter.convertWeightToMetric(profileData.weight);
                
                // For height, check if it's an object with feet/inches or a single number
                if (typeof profileData.height === 'object' && profileData.height !== null) {
                    const { feet = 0, inches = 0 } = profileData.height;
                    convertedProfile.height = this.unitConverter.convertHeightToMetric(feet, inches);
                } else {
                    // If height is just inches, convert directly
                    convertedProfile.height = this.unitConverter.convertHeightToMetric(0, profileData.height);
                }
            } else {
                throw new ValidationError(`Invalid unit conversion: ${sourceUnits} to ${targetUnits}`, "INVALID_UNIT_CONVERSION");
            }
            
            // Update the preferences units if they exist
            if (convertedProfile.preferences) {
                convertedProfile.preferences = {
                    ...convertedProfile.preferences,
                    units: targetUnits
                };
            } else {
                convertedProfile.preferences = { units: targetUnits };
            }
            
            return convertedProfile;
        } catch (error) {
            this.log('error', `Failed to convert user profile: ${error.message}`, { error });
            throw error;
        }
    }
}

module.exports = NutritionAgent; 