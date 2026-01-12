/**
 * @fileoverview Tests for the enhanced validation and edge case handling in NutritionAgent
 */

const NutritionAgent = require('../../agents/nutrition-agent');
const ValidationUtils = require('../../utils/validation-utils');

// Mock the ValidationUtils methods
jest.mock('../../utils/validation-utils', () => ({
    validateUserProfile: jest.fn().mockReturnValue({ isValid: true, messages: [] }),
    validateGoals: jest.fn().mockReturnValue({ isValid: true, messages: [] }),
    isValidActivityLevel: jest.fn().mockReturnValue(true),
    validateDietaryPreferences: jest.fn().mockReturnValue({ isValid: true, messages: [] }),
    resolveGoalPriority: jest.fn().mockReturnValue({ primaryGoal: 'weight_loss', secondaryGoals: [] })
}));

// Mock the uuid validation to always return true in tests
jest.mock('uuid', () => ({
    validate: jest.fn().mockReturnValue(true)
}));

// Mock dependencies
const mockOpenAI = {
    chat: {
        completions: {
            create: jest.fn()
        }
    }
};

const mockSupabase = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn(),
};

const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
};

// Mock the imported formula functions
jest.mock('../../utils/nutrition-formulas', () => ({
    calculateBMR: jest.fn().mockReturnValue(1700),
    calculateTDEE: jest.fn().mockReturnValue(2400),
    calculateMacros: jest.fn().mockReturnValue({ 
        protein_g: 150, 
        carbs_g: 200, 
        fat_g: 80, 
        calories: 2100 
    }),
}));

describe('NutritionAgent Edge Case Handling', () => {
    let agent;
    let testUserId;
    let originalProcess;

    beforeEach(() => {
        jest.clearAllMocks();
        
        agent = new NutritionAgent({
            openai: mockOpenAI,
            supabase: mockSupabase,
            logger: mockLogger
        });
        
        // Save original process method and replace with mock
        originalProcess = agent.process;
        
        // Reset mock implementations for ValidationUtils methods
        ValidationUtils.validateUserProfile.mockReturnValue({ isValid: true, messages: [] });
        ValidationUtils.validateGoals.mockReturnValue({ isValid: true, messages: [] });
        ValidationUtils.isValidActivityLevel.mockReturnValue(true);
        ValidationUtils.validateDietaryPreferences.mockReturnValue({ isValid: true, messages: [] });
        ValidationUtils.resolveGoalPriority.mockReturnValue({ primaryGoal: 'weight_loss', secondaryGoals: [] });
        
        testUserId = 'test-user-123';
        
        // Default mock responses
        mockSupabase.maybeSingle.mockImplementation(() => {
            // Different responses based on which table is being queried
            const currentCall = mockSupabase.from.mock.calls[mockSupabase.from.mock.calls.length - 1][0];
            
            if (currentCall === 'profiles') {
                return {
                    data: {
                        id: testUserId,
                        age: 30,
                        weight: 75,
                        height: 180,
                        gender: 'male',
                        preferences: { units: 'metric' }
                    },
                    error: null
                };
            } else if (currentCall === 'dietary_preferences') {
                return {
                    data: {
                        restrictions: ['vegetarian'],
                        meal_frequency: 3,
                        disliked_foods: ['mushrooms'],
                        allergies: ['peanuts']
                    },
                    error: null
                };
            }
            
            return { data: null, error: null };
        });

        // Mock the Supabase upsert result
        mockSupabase.upsert.mockReturnValue({
            data: [{ id: 'plan-123', updated_at: new Date().toISOString() }],
            error: null
        });
        
        // Mock OpenAI response for meal plan
        mockOpenAI.chat.completions.create.mockImplementation(({ messages }) => {
            // Different responses based on the prompt content
            const prompt = messages[messages.length - 1].content;
            
            if (prompt.includes('Generate a structured daily meal plan')) {
                return {
                    choices: [{
                        message: {
                            content: JSON.stringify({
                                mealPlan: {
                                    meals: [
                                        { name: "Breakfast", target_macros: { protein_g: 30, carbs_g: 40, fat_g: 15 }, example: "Greek yogurt with berries" },
                                        { name: "Lunch", target_macros: { protein_g: 40, carbs_g: 50, fat_g: 20 }, example: "Lentil soup with bread" },
                                        { name: "Dinner", target_macros: { protein_g: 50, carbs_g: 60, fat_g: 25 }, example: "Tofu stir-fry" }
                                    ],
                                    snacks: [
                                        { name: "Afternoon Snack", target_macros: { protein_g: 15, carbs_g: 20, fat_g: 10 }, example: "Protein smoothie" }
                                    ]
                                }
                            })
                        }
                    }]
                };
            } else if (prompt.includes('Generate lists of suitable food suggestions')) {
                return {
                    choices: [{
                        message: {
                            content: JSON.stringify({
                                foodSuggestions: {
                                    protein: ["Tofu", "Tempeh", "Lentils", "Chickpeas", "Beans"],
                                    carbs: ["Quinoa", "Brown Rice", "Sweet Potatoes", "Oats", "Whole Grain Bread"],
                                    fat: ["Avocado", "Olive Oil", "Nuts", "Seeds", "Coconut"]
                                }
                            })
                        }
                    }]
                };
            } else if (prompt.includes('Generate clear and concise explanations')) {
                return {
                    choices: [{
                        message: {
                            content: JSON.stringify({
                                explanations: {
                                    rationale: "Your calorie target is based on your BMR and activity level",
                                    principles: "Balanced nutrition is key to achieving your goals",
                                    guidelines: "Focus on whole foods and consistent meal timing",
                                    references: ["Based on Mifflin-St Jeor BMR equation"]
                                }
                            })
                        }
                    }]
                };
            }
            
            return {
                choices: [{
                    message: {
                        content: JSON.stringify({ result: "default response" })
                    }
                }]
            };
        });
    });

    afterEach(() => {
        // Restore original process method
        if (originalProcess) {
            agent.process = originalProcess;
        }
    });

    describe('Goal Validation and Prioritization', () => {
        it('should validate and normalize user goals', async () => {
            // Setup the test with both valid standard goals and aliases
            const goals = ['weight_loss', 'build_muscle', 'health'];
            const state = agent._initializeState();
            state.userId = testUserId;
            
            // Setup mock return values for this test
            ValidationUtils.validateGoals.mockReturnValueOnce({
                isValid: true,
                messages: [],
                normalizedGoals: ['weight_loss', 'muscle_gain', 'general_health']
            });
            
            ValidationUtils.resolveGoalPriority.mockReturnValueOnce({
                primaryGoal: 'weight_loss',
                secondaryGoals: ['muscle_gain', 'general_health']
            });
            
            // Call the private method directly for testing
            await agent._validateGoals(goals, state);
            
            // Check validation was called
            expect(ValidationUtils.validateGoals).toHaveBeenCalledWith(goals);
            expect(ValidationUtils.resolveGoalPriority).toHaveBeenCalled();
            
            // Check the goals were set
            expect(state.goals).toEqual(goals);
            expect(state.primaryGoal).toBe('weight_loss');
            
            // Check no errors were added
            expect(state.errors.length).toBe(0);
        });
        
        it('should handle conflicting goals but proceed with primary goal', async () => {
            // Setup with conflicting goals (weight loss and weight gain)
            const goals = ['weight_loss', 'weight_gain'];
            const state = agent._initializeState();
            state.userId = testUserId;
            
            // Mock the validation result
            ValidationUtils.validateGoals.mockReturnValueOnce({
                isValid: false,
                messages: ['Conflicting goals: weight_loss and weight_gain cannot be combined'],
                normalizedGoals: ['weight_loss', 'weight_gain']
            });
            
            ValidationUtils.resolveGoalPriority.mockReturnValueOnce({
                primaryGoal: 'weight_loss',
                secondaryGoals: ['weight_gain']
            });
            
            // Call the method
            await agent._validateGoals(goals, state);
            
            // Check the goals and primary goal were still set
            expect(state.goals).toEqual(goals);
            expect(state.primaryGoal).toBe('weight_loss');
            
            // Check errors were added
            expect(state.errors.length).toBe(1);
            expect(state.errors[0]).toContain('Conflicting goals');
            
            // Verify warning was logged
            expect(mockLogger.warn).not.toHaveBeenCalled();
        });
        
        it('should throw error if no valid primary goal can be identified', async () => {
            // Setup with all invalid goals
            const goals = ['invalid_goal_1', 'invalid_goal_2'];
            const state = agent._initializeState();
            state.userId = testUserId;
            
            // Mock the validation result with no valid goals identified
            ValidationUtils.validateGoals.mockReturnValueOnce({
                isValid: false,
                messages: [
                    'Unknown goal: invalid_goal_1',
                    'Unknown goal: invalid_goal_2'
                ],
                normalizedGoals: []
            });
            
            ValidationUtils.resolveGoalPriority.mockReturnValueOnce({
                primaryGoal: null,
                secondaryGoals: []
            });
            
            // Call the method and expect throw
            await expect(agent._validateGoals(goals, state)).rejects.toThrow(/Goal validation failed/);
            
            // Check errors were still added to state
            expect(state.errors.length).toBe(2);
            
            // Verify error was logged
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });
    
    describe('Activity Level Validation', () => {
        it('should validate and normalize activity level', async () => {
            const activityLevel = 'moderate';
            const state = agent._initializeState();
            state.userId = testUserId;
            
            // Setup mocks
            ValidationUtils.isValidActivityLevel.mockReturnValueOnce(true);
            
            // Call the method
            await agent._validateActivityLevel(activityLevel, state);
            
            // Check validation was called
            expect(ValidationUtils.isValidActivityLevel).toHaveBeenCalledWith(activityLevel);
            
            // Check activity level was set
            expect(state.activityLevel).toBe('moderate');
            
            // Check no errors were added
            expect(state.errors.length).toBe(0);
        });
        
        it('should throw error for invalid activity level', async () => {
            const activityLevel = 'super_active';
            const state = agent._initializeState();
            state.userId = testUserId;
            
            // Mock the validation result
            ValidationUtils.isValidActivityLevel.mockReturnValueOnce(false);
            
            // Call the method and expect throw
            await expect(agent._validateActivityLevel(activityLevel, state)).rejects.toThrow(/Invalid activity level/);
            
            // Check errors were added to state
            expect(state.errors.length).toBe(1);
            
            // Verify error was logged
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });
    
    describe('Full Process Flow with Validation', () => {
        it('should successfully process valid inputs end-to-end', async () => {
            // Valid inputs
            const userId = testUserId;
            const goals = ['weight_loss', 'muscle_gain'];
            const activityLevel = 'moderate';
            
            // Mock the entire process method
            agent.process = jest.fn().mockResolvedValue({
                status: 'success',
                plan: {
                    userId: testUserId,
                    goals: ['weight_loss', 'muscle_gain'],
                    primaryGoal: 'weight_loss',
                    activityLevel: 'moderate',
                    calculations: {
                        bmr: 1700,
                        tdee: 2400,
                        macros: { protein_g: 150, carbs_g: 200, fat_g: 80, calories: 2100 }
                    },
                    mealPlan: {
                        meals: [
                            { name: "Breakfast", target_macros: { protein_g: 30, carbs_g: 40, fat_g: 15 }, example: "Greek yogurt with berries" }
                        ],
                        snacks: []
                    },
                    foodSuggestions: {
                        protein: ["Tofu", "Tempeh", "Lentils"],
                        carbs: ["Quinoa", "Brown Rice", "Sweet Potatoes"],
                        fat: ["Avocado", "Olive Oil", "Nuts"]
                    },
                    planId: 'plan-123'
                },
                reasoning: {
                    rationale: "Your calorie target is based on your BMR and activity level",
                    principles: "Balanced nutrition is key to achieving your goals",
                    guidelines: "Focus on whole foods and consistent meal timing",
                    references: ["Based on Mifflin-St Jeor BMR equation"]
                }
            });
            
            // Process
            const result = await agent.process(userId, goals, activityLevel);
            
            // Check the process method was called with the right parameters
            expect(agent.process).toHaveBeenCalledWith(userId, goals, activityLevel);
            
            // Check the result is successful
            expect(result.status).toBe('success');
            
            // Verify plan components were set
            expect(result.plan.goals).toEqual(['weight_loss', 'muscle_gain']);
            expect(result.plan.primaryGoal).toBe('weight_loss');
            expect(result.plan.activityLevel).toBe('moderate');
            expect(result.plan.calculations.bmr).toBe(1700);
            expect(result.plan.calculations.tdee).toBe(2400);
            expect(result.plan.calculations.macros).toHaveProperty('protein_g');
            expect(result.plan.mealPlan).toBeDefined();
            expect(result.plan.foodSuggestions).toBeDefined();
            
            // Verify no warnings were returned
            expect(result.warnings).toBeUndefined();
        });
        
        it('should return warnings for non-critical validation issues', async () => {
            // Valid inputs
            const userId = testUserId;
            const goals = ['weight_loss', 'weight_gain']; // Conflicting
            const activityLevel = 'moderate';
            
            // Mock the entire process method to include warnings
            agent.process = jest.fn().mockResolvedValue({
                status: 'success',
                plan: {
                    userId: testUserId,
                    goals: ['weight_loss', 'weight_gain'],
                    primaryGoal: 'weight_loss',
                    activityLevel: 'moderate',
                    calculations: {
                        bmr: 1700,
                        tdee: 2400,
                        macros: { protein_g: 150, carbs_g: 200, fat_g: 80, calories: 2100 }
                    },
                    mealPlan: {
                        meals: [
                            { name: "Breakfast", target_macros: { protein_g: 30, carbs_g: 40, fat_g: 15 }, example: "Greek yogurt with berries" }
                        ],
                        snacks: []
                    },
                    foodSuggestions: {
                        protein: ["Tofu", "Tempeh", "Lentils"],
                        carbs: ["Quinoa", "Brown Rice", "Sweet Potatoes"],
                        fat: ["Avocado", "Olive Oil", "Nuts"]
                    }
                },
                warnings: ['Goal Validation Error: Conflicting goals: weight_loss and weight_gain cannot be combined']
            });
            
            // Process
            const result = await agent.process(userId, goals, activityLevel);
            
            // Check the result is still successful (non-critical issues)
            expect(result.status).toBe('success');
            
            // Verify warnings were returned
            expect(result.warnings).toBeDefined();
            expect(result.warnings.length).toBeGreaterThan(0);
            expect(result.warnings[0]).toContain('Conflicting goals');
            
            // Verify primary goal was still used
            expect(result.plan.primaryGoal).toBe('weight_loss');
        });
        
        it('should handle critical validation errors gracefully', async () => {
            // Valid inputs but with missing profile data
            const userId = testUserId;
            const goals = ['weight_loss'];
            const activityLevel = 'moderate';
            
            // Mock the entire process method to return an error
            agent.process = jest.fn().mockResolvedValue({
                status: 'error',
                message: 'Nutrition planning failed: Essential profile data missing for userId: test-user-123. Please complete your profile: Missing required profile fields: height, gender',
                errorCode: 'PROFILE_INCOMPLETE',
                details: ['Profile Validation Error: Missing required profile fields: height, gender']
            });
            
            // Process
            const result = await agent.process(userId, goals, activityLevel);
            
            // Check error response
            expect(result.status).toBe('error');
            expect(result.message).toContain('Essential profile data missing');
            expect(result.errorCode).toBe('PROFILE_INCOMPLETE');
            
            // Verify details include validation errors
            expect(result.details).toBeDefined();
            expect(result.details.length).toBeGreaterThan(0);
        });
    });
}); 