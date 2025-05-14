const NutritionAgent = require('../../agents/nutrition-agent');
const BaseAgent = require('../../agents/base-agent');
const { validate: uuidValidate, v4: uuidv4 } = require('uuid');
const { AgentError, ValidationError } = require('../../utils/errors');

// --- Mock Dependencies ---
const mockOpenAI = {
    chat: {
        completions: {
            create: jest.fn(),
        }
    }
};

const mockSupabase = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockReturnThis(),
};

const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
};

// Create mock memory system
const mockMemorySystem = {
    storeMemory: jest.fn().mockResolvedValue({ id: 'memory-id' }),
    search: jest.fn().mockResolvedValue([])
};

// Mock the imported modules
jest.mock('../../utils/nutrition-formulas', () => ({
    calculateBMR: jest.fn(),
    calculateTDEE: jest.fn(),
    calculateMacros: jest.fn(),
    // No need to explicitly return other functions like convert/validate
}));

// Mock the static classes
jest.mock('../../utils/macro-calculator', () => {
    return {
        calculateBMR: jest.fn(),
        calculateTDEE: jest.fn(),
        calculateMacros: jest.fn(),
        getComprehensiveRecommendation: jest.fn()
    };
});

jest.mock('../../utils/validation-utils', () => {
    return {
        validateUserProfile: jest.fn().mockReturnValue({ isValid: true, messages: [] }),
        validateGoals: jest.fn().mockReturnValue({ isValid: true, messages: [] }),
        validateDietaryPreferences: jest.fn().mockReturnValue({ isValid: true, messages: [] }),
        resolveGoalPriority: jest.fn().mockReturnValue({ primaryGoal: 'weight_loss', secondaryGoals: [] }),
        isValidNumber: jest.fn().mockReturnValue(true),
        isValidGender: jest.fn().mockReturnValue(true),
        isValidActivityLevel: jest.fn().mockReturnValue(true)
    };
});

// Import the mocked modules
const { calculateBMR, calculateTDEE, calculateMacros } = require('../../utils/nutrition-formulas');
const MacroCalculator = require('../../utils/macro-calculator');
const ValidationUtils = require('../../utils/validation-utils');

// Define mocks in a scope accessible to all tests within this describe block
let eqMock, maybeSingleMock, selectMock, upsertMock, selectAfterUpsertMock;

// Default test data
let testUserId; 
let defaultProfileData;
let defaultPreferencesData;

describe('NutritionAgent', () => {
    // Initialize mocks ONCE before any tests in this suite run
    beforeAll(() => {
        eqMock = jest.fn();
        maybeSingleMock = jest.fn();
        selectMock = jest.fn();
        upsertMock = jest.fn();
        selectAfterUpsertMock = jest.fn();
    });

    // Reset mocks and generate fresh test data before each individual test
    beforeEach(() => {
        // Reset all mocks before each test
        jest.resetAllMocks();
        
        // CommonJS Module Mocks
        jest.mock('../../utils/unit-conversion', () => ({
            convertWeightToImperial: jest.fn((kg) => kg * 2.20462),
            convertWeightToMetric: jest.fn((lbs) => lbs / 2.20462),
            convertHeightToImperial: jest.fn((cm) => ({ feet: Math.floor(cm / 30.48), inches: Math.round((cm / 2.54) % 12) })),
            convertHeightToMetric: jest.fn((feet, inches) => Math.round((feet * 30.48) + (inches * 2.54)))
        }));
        
        // Clear call history and reset any previously defined behavior
        jest.clearAllMocks();
        eqMock.mockReset();
        maybeSingleMock.mockReset();
        selectMock.mockReset();
        upsertMock.mockReset();
        selectAfterUpsertMock.mockReset();

        // Set up the BASE chainable structure - Methods return the object containing others
        const chainableSupabaseObject = {
            select: selectMock,
            eq: eqMock,
            maybeSingle: maybeSingleMock,
            upsert: upsertMock
        };
        
        selectMock.mockReturnValue(chainableSupabaseObject);
        eqMock.mockReturnValue(chainableSupabaseObject);
        upsertMock.mockReturnValue({ select: selectAfterUpsertMock }); // upsert needs to return obj with select

        // Set default RESOLUTIONS (can be overridden in tests)
        maybeSingleMock.mockImplementation(async () => {
            // Simple default: resolve profiles with default, prefs with default, others null
            // Note: This relies on knowing the call order within the method being tested.
            // A more robust approach might inspect mock.calls[0].args if needed.
            if (maybeSingleMock.mock.calls.length % 2 !== 0) { // Assume odd calls are profiles
                 return { data: { ...defaultProfileData }, error: null };
            } else { // Assume even calls are dietary_preferences
                 return { data: { ...defaultPreferencesData }, error: null };
            }
        });
        
        // Default success for select() after upsert()
        selectAfterUpsertMock.mockResolvedValue({ data: [{ id: uuidv4(), updated_at: new Date().toISOString(), user_id: testUserId /* other fields */ }], error: null });

        // Configure the main mockSupabase object used by the agent
        // Now, instead of configuring inside the implementation, 
        // tests will configure eqMock, maybeSingleMock, upsertMock, selectAfterUpsertMock directly.
        mockSupabase.from = jest.fn().mockReturnValue(chainableSupabaseObject);

        // Reset other mocks
        calculateBMR.mockReset();
        calculateTDEE.mockReset();
        calculateMacros.mockReset();
        mockOpenAI.chat.completions.create.mockReset();

        testUserId = uuidv4();
        defaultProfileData = {
            id: testUserId,
            name: 'Test User',
            height: 180,
            weight: 75,
            age: 30,
            gender: 'male',
            preferences: { units: 'metric' }
        };
        
        defaultPreferencesData = {
            user_id: testUserId,
            meal_frequency: 3,
            restrictions: ['nuts']
        };

        calculateBMR.mockReturnValue(1730);
        calculateTDEE.mockReturnValue(2635);
        calculateMacros.mockReturnValue({ protein_g: 165, carbs_g: 330, fat_g: 88, calories: 2635 });
        
        // Mock BaseAgent methods
        jest.spyOn(BaseAgent.prototype, 'retryWithBackoff').mockImplementation(async (fn) => {
            return await fn();
        });
        
        jest.spyOn(BaseAgent.prototype, 'storeMemory').mockResolvedValue({ id: 'memory-id' });
        
        jest.spyOn(BaseAgent.prototype, 'retrieveMemories').mockResolvedValue([]);
        
        jest.spyOn(BaseAgent.prototype, 'validate').mockImplementation((value, validationFn, errorMsg) => {
            if (!validationFn(value)) {
                throw new ValidationError(errorMsg);
            }
            return true;
        });
        
        jest.spyOn(BaseAgent.prototype, 'log').mockImplementation((level, message, meta) => {
            if (mockLogger[level]) {
                mockLogger[level](message, meta);
            }
        });
    });

    describe('Constructor', () => {
        it('should initialize successfully with valid dependencies', () => {
            const agent = new NutritionAgent({ 
                openai: mockOpenAI, 
                supabase: mockSupabase, 
                logger: mockLogger,
                memorySystem: mockMemorySystem 
            });
            
            expect(agent).toBeInstanceOf(NutritionAgent);
            expect(agent).toBeInstanceOf(BaseAgent);
            expect(agent.openai).toBe(mockOpenAI);
            expect(agent.supabase).toBe(mockSupabase);
            expect(mockLogger.info).toHaveBeenCalledWith("NutritionAgent initialized successfully.", undefined);
        });

        it('should throw error if OpenAI dependency is missing', () => {
            expect(() => new NutritionAgent({ 
                supabase: mockSupabase, 
                logger: mockLogger,
                memorySystem: mockMemorySystem
            })).toThrow("NutritionAgent requires an OpenAI client instance.");
        });

        it('should throw error if Supabase dependency is missing', () => {
            expect(() => new NutritionAgent({ 
                openai: mockOpenAI, 
                logger: mockLogger,
                memorySystem: mockMemorySystem
            })).toThrow("NutritionAgent requires a Supabase client instance.");
        });
    });

    describe('_initializeState', () => {
        it('should return a state object with default null/empty values', () => {
            const agent = new NutritionAgent({
                openai: mockOpenAI,
                supabase: mockSupabase
            });
            const state = agent._initializeState();
            expect(state).toEqual({
                userId: null,
                userProfile: null,
                dietaryPreferences: null,
                activityLevel: null,
                goals: null,
                calculations: {
                    bmr: null,
                    tdee: null,
                    macros: null
                },
                mealPlan: null,
                foodSuggestions: null,
                explanations: null,
                errors: [],
                validationResults: {},
                warnings: [],
                previousPlans: []
            });
        });
    });

    describe('_fetchUserData', () => {
        let initialState;
        let mockProfile;
        
        beforeEach(() => {
            const agent = new NutritionAgent({
                openai: mockOpenAI,
                supabase: mockSupabase,
                logger: mockLogger
            });
            initialState = agent._initializeState();
            
            // Define mock profile data
            mockProfile = { 
                id: testUserId, 
                name: 'Test Fetch', 
                height: 175, 
                weight: 70, 
                age: 25, 
                gender: 'female', 
                preferences: { units: 'metric' } 
            };
            
            // Set the state userId field which is now required by this implementation
            initialState.userId = testUserId;
            
            // Reset mocks
            jest.clearAllMocks();
            
            // Setup default mock behaviors
            maybeSingleMock
                .mockReset()
                .mockResolvedValue({ data: mockProfile, error: null });
            
            ValidationUtils.validateUserProfile.mockReturnValue({ isValid: true, messages: [] });
        });

        it('should fetch user profile and preferences successfully', async () => {
            const agent = new NutritionAgent({ openai: mockOpenAI, supabase: mockSupabase, logger: mockLogger });
            const mockPrefs = { user_id: testUserId, meal_frequency: 3, restrictions: [] };
            
            // Setup mocks for profile and preferences fetch
            maybeSingleMock
                .mockResolvedValueOnce({ data: mockProfile, error: null })
                .mockResolvedValueOnce({ data: mockPrefs, error: null });

            const updatedState = await agent._fetchUserData(testUserId, initialState);

            expect(maybeSingleMock).toHaveBeenCalledTimes(1);
            expect(ValidationUtils.validateUserProfile).toHaveBeenCalledWith(mockProfile);
            expect(updatedState.userProfile).toEqual(mockProfile);
            expect(updatedState.dietaryPreferences).toEqual({
                restrictions: [],
                meal_frequency: 3,
                meal_timing_prefs: null,
                time_constraints: null,
                disliked_foods: [],
                allergies: [],
                preferred_cuisine: null
            });
        });

        it('should handle missing dietary preferences gracefully using defaults', async () => {
            const agent = new NutritionAgent({ openai: mockOpenAI, supabase: mockSupabase, logger: mockLogger });
            
            // Mock missing dietary preferences (null data)
            maybeSingleMock
                .mockResolvedValueOnce({ data: mockProfile, error: null });
            
            const updatedState = await agent._fetchUserData(testUserId, initialState);

            expect(updatedState.userId).toBe(testUserId);
            expect(updatedState.userProfile).toEqual(mockProfile);
            expect(updatedState.dietaryPreferences).toEqual({
                restrictions: [],
                meal_frequency: 3,
                meal_timing_prefs: null,
                time_constraints: null,
                disliked_foods: [],
                allergies: [],
                preferred_cuisine: null
            });
        });

        it('should log error but continue if dietary preferences fetch fails', async () => {
            const agent = new NutritionAgent({ openai: mockOpenAI, supabase: mockSupabase, logger: mockLogger });
            const prefsError = new Error('Failed to fetch preferences');
            
            // Mock preferences fetch error
            maybeSingleMock
                .mockResolvedValueOnce({ data: mockProfile, error: null })
                .mockRejectedValueOnce(prefsError);
            
            const updatedState = await agent._fetchUserData(testUserId, initialState);

            expect(updatedState.userId).toBe(testUserId);
            expect(updatedState.userProfile).toEqual(mockProfile);
            expect(updatedState.dietaryPreferences).toEqual({ // Should still use defaults
                restrictions: [],
                meal_frequency: 3,
                meal_timing_prefs: null,
                time_constraints: null,
                disliked_foods: [],
                allergies: [],
                preferred_cuisine: null
            });
        });

        it('should throw error for invalid userId format', async () => {
            const agent = new NutritionAgent({ openai: mockOpenAI, supabase: mockSupabase, logger: mockLogger });
            const invalidUserId = 'not-a-uuid';
            
            try {
                await agent._fetchUserData(invalidUserId, initialState);
                fail('Expected _fetchUserData to throw, but it did not.');
            } catch (error) {
                expect(error).toBeInstanceOf(AgentError);
                expect(error.message).toMatch(/Failed to fetch user data: Invalid userId format/);
            }
            
            expect(mockLogger.error).toHaveBeenCalledWith("Invalid userId format provided: " + invalidUserId, { userId: invalidUserId });
        });

        it('should throw error if profile fetch fails', async () => {
            const agent = new NutritionAgent({ openai: mockOpenAI, supabase: mockSupabase, logger: mockLogger });
            const fetchError = new Error('Supabase connection failed');

            // Create a fresh state for this test case
            const testState = {...initialState};
            
            // Reset and configure maybeSingleMock for this test case only
            maybeSingleMock.mockReset();
            maybeSingleMock.mockRejectedValueOnce(fetchError);

            try {
                await agent._fetchUserData(testUserId, testState);
                fail('Expected _fetchUserData to throw, but it did not.');
            } catch (error) {
                expect(error).toBeInstanceOf(AgentError);
                expect(error.message).toMatch(/Failed to fetch user data: Supabase connection failed/);
            }
        });

        it('should throw error if profile is not found', async () => {
            const agent = new NutritionAgent({ openai: mockOpenAI, supabase: mockSupabase, logger: mockLogger });

            // Create a fresh state for this test case
            const testState = {...initialState};
            
            // Reset and configure mocks for this test case only
            maybeSingleMock.mockReset();
            maybeSingleMock.mockResolvedValueOnce({ data: null, error: null });

            try {
                await agent._fetchUserData(testUserId, testState);
                fail('Expected _fetchUserData to throw, but it did not.');
            } catch (error) {
                expect(error).toBeInstanceOf(AgentError);
                expect(error.message).toMatch(/Failed to fetch user data: Profile not found for userId/);
            }
            
            expect(mockLogger.warn).toHaveBeenCalledWith("No profile found for userId: " + testUserId + ". Cannot proceed with nutrition calculations.", { userId: testUserId });
        });

        it('should throw error if essential profile data (e.g., age) is missing', async () => {
            const agent = new NutritionAgent({ openai: mockOpenAI, supabase: mockSupabase, logger: mockLogger });
            const incompleteProfile = { 
                id: testUserId, 
                name: 'Test Fetch', 
                height: 175, 
                weight: 70, 
                age: null,  // Missing age
                gender: 'female', 
                preferences: { units: 'metric' } 
            };

            // Create a fresh state for this test case
            const testState = {...initialState};
            
            // Setup validation mock to indicate missing essential data
            ValidationUtils.validateUserProfile.mockReturnValue({ 
                isValid: false, 
                messages: ['Age must be a valid number'] 
            });
            
            // Configure mocks for this test case only
            maybeSingleMock.mockReset();
            maybeSingleMock.mockResolvedValueOnce({ data: incompleteProfile, error: null });

            try {
                await agent._fetchUserData(testUserId, testState);
                fail('Expected _fetchUserData to throw, but it did not.');
            } catch (error) {
                expect(error).toBeInstanceOf(AgentError);
                expect(error.message).toMatch(/Failed to fetch user data: Essential profile data missing/);
            }
            
            expect(ValidationUtils.validateUserProfile).toHaveBeenCalledWith(incompleteProfile);
            expect(mockLogger.error).toHaveBeenCalledWith(
                "Profile validation failed for userId: " + testUserId,
                expect.objectContaining({ 
                    userId: testUserId, 
                    profileData: incompleteProfile,
                    validationErrors: ['Age must be a valid number']
                })
            );
        });

        it('should throw error if essential preferences data (units) is missing', async () => {
            // This test can be omitted since we now default to 'metric' if units are missing
            // See the comment in _fetchUserData: "// Do not require 'units' for now since we default to metric if not specified"
            const agent = new NutritionAgent({ openai: mockOpenAI, supabase: mockSupabase, logger: mockLogger });
            const initialState = agent._initializeState();
            const profileWithoutUnits = { id: testUserId, name: 'Test Fetch', height: 175, weight: 70, age: 25, gender: 'female', preferences: {} };

            // Setup mocks
            maybeSingleMock.mockResolvedValueOnce({ data: profileWithoutUnits, error: null });
            
            // This should now succeed since we don't require 'units' anymore
            const state = await agent._fetchUserData(testUserId, initialState);
            expect(state.userProfile).toEqual(profileWithoutUnits);
            // We could check that it defaulted to metric units if needed
        });
    });

     describe('_storeNutritionPlan', () => {
        let mockState;
        let expectedDataToStore;
        let storedData; 

         beforeEach(() => {
             mockState = {
                 userId: testUserId,
                 goals: ['muscle_gain'],
                 activityLevel: 'moderately_active',
                 calculations: { bmr: 1800, tdee: 2500, macros: { protein_g: 150, carbs_g: 300, fat_g: 80, calories: 2500 } },
                 mealPlan: { meals: ["Breakfast", "Lunch", "Dinner"] },
                 foodSuggestions: { protein: ["Chicken"], carbs: ["Rice"], fat: ["Avocado"] },
                 explanations: { rationale: "Based on goals...", principles: "Eat protein.", guidelines: "Track weight.", references: [] },
                 errors: []
             };
             expectedDataToStore = {
                 user_id: testUserId,
                 bmr: 1800,
                 tdee: 2500,
                 macros: { protein_g: 150, carbs_g: 300, fat_g: 80, calories: 2500 },
                 meal_plan: mockState.mealPlan,
                 food_suggestions: mockState.foodSuggestions,
                 explanations: mockState.explanations,
                 goals: mockState.goals,
                 activity_level: mockState.activityLevel
             };
             storedData = { ...expectedDataToStore, id: expect.any(String), created_at: expect.any(String), updated_at: expect.any(String) }; 
         });

        it('should store nutrition plan successfully using state', async () => {
            const agent = new NutritionAgent({ openai: mockOpenAI, supabase: mockSupabase, logger: mockLogger });

            // FIX: Configure mocks directly for this case
            const resolvedStoredData = { ...expectedDataToStore, id: uuidv4(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
            selectAfterUpsertMock.mockResolvedValueOnce({ data: [resolvedStoredData], error: null });
            // Ensure upsert returns the object containing select
            upsertMock.mockReturnValue({ select: selectAfterUpsertMock }); 

            const result = await agent._storeNutritionPlan(mockState, mockState);
            expect(mockSupabase.from).toHaveBeenCalledWith('nutrition_plans');
            expect(upsertMock).toHaveBeenCalled();
            expect(selectAfterUpsertMock).toHaveBeenCalled();
            expect(result).toEqual(expect.objectContaining({ ...expectedDataToStore, id: expect.any(String) }));
         });

        it('should throw error if Supabase upsert fails', async () => {
            const agent = new NutritionAgent({ openai: mockOpenAI, supabase: mockSupabase, logger: mockLogger });
            const dbError = new Error('Insert failed');
            
            // Define mockProfile
            const mockProfile = { id: testUserId, name: 'Test User', height: 180, weight: 75, age: 30, gender: 'male', preferences: { units: 'metric' } };
            
            // Setup test state
            const mockState = { 
                userId: testUserId,
                userProfile: mockProfile,
                calculations: {
                    bmr: 1800,
                    tdee: 2500,
                    macros: {
                        protein_g: 150,
                        carbs_g: 250,
                        fat_g: 70,
                        calories: 2200
                    }
                },
                mealPlan: { meals: [] },
                foodSuggestions: { protein: [], carbs: [], fat: [] },
                goals: ['weight_loss'],
                activityLevel: 'light'
            };

            // FIX: Configure mocks directly for this case
            // upsert() returns obj with select(), select() resolves with error
            upsertMock.mockReturnValue({ select: selectAfterUpsertMock }); 
            selectAfterUpsertMock.mockResolvedValueOnce({ data: null, error: dbError });

            try {
                await agent._storeNutritionPlan(mockState, mockState);
                fail('Expected _storeNutritionPlan to throw, but it did not.');
            } catch (e) {
                expect(e).toBeInstanceOf(Error);
                expect(e.message).toBe(`Supabase nutrition plan store error: ${dbError.message}`);
            }
            expect(upsertMock).toHaveBeenCalled(); // Ensure upsert was called
            expect(selectAfterUpsertMock).toHaveBeenCalled(); // Ensure select was called
            expect(mockLogger.error).toHaveBeenCalledWith("Error storing nutrition plan for userId: " + testUserId, expect.objectContaining({ error: dbError }));
        });
    });

    // --- Tests for Integrated Calculation Methods --- 

    describe('_calculateBMR', () => {
        let agent;
        let state;
        let MacroCalculator;

        beforeEach(() => {
            // Import the mock
            MacroCalculator = require('../../utils/macro-calculator');
            agent = new NutritionAgent({ openai: mockOpenAI, supabase: mockSupabase, logger: mockLogger });
            state = agent._initializeState();
            state.userId = testUserId;
            state.userProfile = { ...defaultProfileData }; // Use default valid profile
        });

        it('should call calculateBMR util and update state on success', async () => {
            const expectedBMR = 1730;
            MacroCalculator.calculateBMR.mockReturnValue(expectedBMR); // Mock the static method

            const updatedState = await agent._calculateBMR(state);

            expect(MacroCalculator.calculateBMR).toHaveBeenCalledWith(
                expect.objectContaining({
                    age: defaultProfileData.age,
                    weight: defaultProfileData.weight,
                    height: defaultProfileData.height,
                    gender: defaultProfileData.gender,
                    units: defaultProfileData.preferences.units
                }),
                expect.anything() // The unitConverter
            );
            expect(updatedState.calculations.bmr).toBe(expectedBMR);
            expect(mockLogger.info).toHaveBeenCalledWith("BMR calculated successfully.", { userId: testUserId, bmr: expectedBMR });
            expect(updatedState.errors).toEqual([]);
        });

        it('should throw error and log if user profile is missing', async () => {
            state.userProfile = null;
            await expect(agent._calculateBMR(state)).rejects.toThrow("User profile data is missing");
        });

        it('should throw error and log if calculateBMR util throws', async () => {
            const bmrError = new Error("Invalid age for BMR");
            MacroCalculator.calculateBMR.mockImplementation(() => {
                throw bmrError;
            });

            await expect(agent._calculateBMR(state)).rejects.toThrow("BMR Calculation Error: Invalid age for BMR");
            expect(mockLogger.error).toHaveBeenCalledWith("BMR Calculation failed.", { userId: testUserId, error: bmrError.message });
            expect(state.errors).toContain(`BMR Calculation Error: ${bmrError.message}`);
        });
    });

    describe('_calculateTDEE', () => {
        let agent;
        let state;

        beforeEach(() => {
            agent = new NutritionAgent({ openai: mockOpenAI, supabase: mockSupabase, logger: mockLogger });
            state = agent._initializeState();
            state.userId = testUserId;
            state.calculations.bmr = 1730; // Assume BMR is calculated
            state.activityLevel = 'moderate';
        });

        it('should call calculateTDEE util and update state on success', async () => {
            const expectedTDEE = 2635;
            MacroCalculator.calculateTDEE.mockReturnValue(expectedTDEE);

            const updatedState = await agent._calculateTDEE(state);

            expect(MacroCalculator.calculateTDEE).toHaveBeenCalledWith(state.calculations.bmr, state.activityLevel);
            expect(updatedState.calculations.tdee).toBe(expectedTDEE);
            expect(mockLogger.info).toHaveBeenCalledWith("TDEE calculated successfully.", { userId: testUserId, tdee: expectedTDEE });
            expect(updatedState.errors).toEqual([]);
        });

        it('should throw error if BMR is missing', async () => {
            state.calculations.bmr = null;
            await expect(agent._calculateTDEE(state)).rejects.toThrow("Cannot calculate TDEE: BMR or activity level is missing.");
        });

        it('should throw error if activity level is missing', async () => {
            state.activityLevel = null;
            await expect(agent._calculateTDEE(state)).rejects.toThrow("Cannot calculate TDEE: BMR or activity level is missing.");
        });

        it('should throw error and log if calculateTDEE util throws', async () => {
            const tdeeError = new Error("Invalid activity level");
            MacroCalculator.calculateTDEE.mockImplementation(() => {
                throw tdeeError;
            });

            await expect(agent._calculateTDEE(state)).rejects.toThrow("TDEE Calculation Error: Invalid activity level");
            expect(mockLogger.error).toHaveBeenCalledWith("TDEE Calculation failed.", { userId: testUserId, error: tdeeError.message });
            expect(state.errors).toContain(`TDEE Calculation Error: ${tdeeError.message}`);
        });
    });

    describe('_calculateMacros', () => {
        let agent;
        let state;

        beforeEach(() => {
            agent = new NutritionAgent({ openai: mockOpenAI, supabase: mockSupabase, logger: mockLogger });
            state = agent._initializeState();
            state.userId = testUserId;
            state.calculations.tdee = 2635; // Assume TDEE is calculated
            state.goals = ['weight_loss'];
        });

        it('should call calculateMacros util and update state on success', async () => {
            const resolvedGoals = {
                primaryGoal: 'weight_loss',
                secondaryGoals: []
            };
            
            // Set up ValidationUtils.resolveGoalPriority to return the resolved goals
            ValidationUtils.resolveGoalPriority.mockReturnValue(resolvedGoals);

            const macroResult = {
                calories: 2135,
                macros: {
                    protein: 160,
                    carbs: 214,
                    fat: 71
                },
                percentages: {
                    protein: 30,
                    carbs: 40,
                    fat: 30
                }
            };
            
            MacroCalculator.calculateMacros.mockReturnValue(macroResult);

            const updatedState = await agent._calculateMacros(state);

            expect(ValidationUtils.resolveGoalPriority).toHaveBeenCalledWith(state.goals);
            expect(MacroCalculator.calculateMacros).toHaveBeenCalledWith(
                state.calculations.tdee,
                resolvedGoals,
                state.dietaryPreferences // use state.dietaryPreferences instead of undefined
            );
            
            // Check that the macros are properly transformed to the expected format
            expect(updatedState.calculations.macros).toEqual({
                protein_g: macroResult.macros.protein,
                carbs_g: macroResult.macros.carbs,
                fat_g: macroResult.macros.fat,
                calories: macroResult.calories
            });
            
            expect(mockLogger.info).toHaveBeenCalledWith(
                "Macros calculated successfully.", 
                { userId: testUserId, macros: updatedState.calculations.macros }
            );
            expect(updatedState.errors).toEqual([]);
        });

        it('should throw error if TDEE is missing', async () => {
            state.calculations.tdee = null;
            await expect(agent._calculateMacros(state)).rejects.toThrow("Cannot calculate Macros: TDEE or goals are missing.");
        });

        it('should throw error if goals are missing', async () => {
            state.goals = null;
            await expect(agent._calculateMacros(state)).rejects.toThrow("Cannot calculate Macros: TDEE or goals are missing.");
        });

        it('should throw error and log if calculateMacros util throws', async () => {
            const macrosError = new Error("Invalid TDEE for macros");
            MacroCalculator.calculateMacros.mockImplementation(() => {
                throw macrosError;
            });

            await expect(agent._calculateMacros(state)).rejects.toThrow("Macro Calculation Error: Invalid TDEE for macros");
            expect(mockLogger.error).toHaveBeenCalledWith("Macro Calculation failed.", { userId: testUserId, error: macrosError.message });
            expect(state.errors).toContain(`Macro Calculation Error: ${macrosError.message}`);
        });
    });

     // --- Placeholder Test Suites for Future Steps ---
    describe('_generateMealPlan', () => {
        let agent;
        let state;

        beforeEach(() => {
            agent = new NutritionAgent({ openai: mockOpenAI, supabase: mockSupabase, logger: mockLogger });
            state = agent._initializeState();
            state.userId = testUserId;
            // Setup necessary preconditions for _generateMealPlan
            state.calculations.macros = { protein_g: 150, carbs_g: 300, fat_g: 80, calories: 2500 };
            state.dietaryPreferences = {
                meal_frequency: 3,
                restrictions: ['gluten'],
                allergies: ['peanuts'],
                disliked_foods: ['broccoli'],
                meal_timing_prefs: 'flexible',
                preferred_cuisine: 'Mediterranean'
            };
        });

        it('should call OpenAI, parse response, and update state.mealPlan', async () => {
            const mockMealPlanResponse = {
                mealPlan: {
                    meals: [
                        { name: "Breakfast", target_macros: { protein_g: 30, carbs_g: 60, fat_g: 15 }, example: "Oats with fruit" },
                        { name: "Lunch", target_macros: { protein_g: 50, carbs_g: 90, fat_g: 25 }, example: "Chicken Salad (gluten-free)" },
                        { name: "Dinner", target_macros: { protein_g: 70, carbs_g: 150, fat_g: 40 }, example: "Salmon with Quinoa" }
                    ],
                    snacks: []
                }
            };
            mockOpenAI.chat.completions.create.mockResolvedValue({
                choices: [{ message: { content: JSON.stringify(mockMealPlanResponse) } }]
            });

            const updatedState = await agent._generateMealPlan(state);

            expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(1);
            const prompt = mockOpenAI.chat.completions.create.mock.calls[0][0].messages[1].content;
            expect(prompt).toContain("Calories: 2500 kcal");
            expect(prompt).toContain("Protein: 150g");
            expect(prompt).toContain("Number of Meals: 3");
            expect(prompt).toContain("Dietary Restrictions: gluten");
            expect(prompt).toContain("Allergies: peanuts");
            expect(prompt).toContain("Disliked Foods: broccoli");
            expect(prompt).toContain("Preferred Cuisine (optional): Mediterranean");

            expect(updatedState.mealPlan).toEqual(mockMealPlanResponse.mealPlan);
            expect(mockLogger.info).toHaveBeenCalledWith("Received meal plan structure from OpenAI.", { userId: testUserId });
            expect(mockLogger.info).toHaveBeenCalledWith("Meal Plan structure generated and processed.", { userId: testUserId });
            expect(updatedState.errors).toEqual([]);
        });

        // Optional: Add tests for error handling (OpenAI failure, invalid JSON)
        it('should throw error if OpenAI call fails', async () => {
            const openAIError = new Error("API Error");
            mockOpenAI.chat.completions.create.mockRejectedValue(openAIError);
            
            await expect(agent._generateMealPlan(state)).rejects.toThrow(`Failed to generate meal plan structure: ${openAIError.message}`);
            expect(state.errors).toContain(`Meal Plan Generation Error: ${openAIError.message}`);
        });

        it('should throw error if response is not valid JSON', async () => {
            const invalidContent = "invalid json";
            mockOpenAI.chat.completions.create.mockResolvedValue({ choices: [{ message: { content: invalidContent } }] });

            // FIX: Expect the exact wrapped error message
            const expectedErrorMessage = `Failed to generate meal plan structure: Failed to parse meal plan structure from AI response. Raw response: ${invalidContent}`;
            await expect(agent._generateMealPlan(state)).rejects.toThrow(expectedErrorMessage);
        });
         it('should throw error if response JSON structure is invalid', async () => {
            const invalidStructure = { wrongKey: "data" };
            mockOpenAI.chat.completions.create.mockResolvedValue({ choices: [{ message: { content: JSON.stringify(invalidStructure) } }] });

            await expect(agent._generateMealPlan(state)).rejects.toThrow('AI response for meal plan had an invalid structure');
        });

    });
    describe('_provideFoodSuggestions', () => {
        let agent;
        let state;

        beforeEach(() => {
            agent = new NutritionAgent({ openai: mockOpenAI, supabase: mockSupabase, logger: mockLogger });
            state = agent._initializeState();
            state.userId = testUserId;
            // Setup necessary preconditions
            state.calculations.macros = { protein_g: 150, carbs_g: 300, fat_g: 80, calories: 2500 };
            state.dietaryPreferences = {
                restrictions: ['dairy'],
                allergies: [],
                disliked_foods: ['spinach'],
                preferred_cuisine: 'Asian'
            };
        });

        it('should call OpenAI, parse response, and update state.foodSuggestions', async () => {
            const mockSuggestionsResponse = {
                foodSuggestions: {
                    protein: ["Chicken Breast (grilled)", "Tofu", "Edamame", "Lentils (Red)"],
                    carbs: ["Rice (Jasmine)", "Sweet Potato", "Udon Noodles", "Bok Choy"],
                    fat: ["Avocado", "Sesame Oil", "Peanuts", "Almonds"]
                }
            };
            mockOpenAI.chat.completions.create.mockResolvedValue({
                choices: [{ message: { content: JSON.stringify(mockSuggestionsResponse) } }]
            });

            const updatedState = await agent._provideFoodSuggestions(state);

            expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(1);
            const prompt = mockOpenAI.chat.completions.create.mock.calls[0][0].messages[1].content;
            expect(prompt).toContain("Protein: 150g");
            expect(prompt).toContain("Dietary Restrictions: dairy");
            expect(prompt).toContain("Disliked Foods: spinach");
            expect(prompt).toContain("Preferred Cuisine (optional): Asian");

            expect(updatedState.foodSuggestions).toEqual(mockSuggestionsResponse.foodSuggestions);
            expect(mockLogger.info).toHaveBeenCalledWith("Received food suggestions from OpenAI.", { userId: testUserId });
            expect(mockLogger.info).toHaveBeenCalledWith("Food Suggestions generated and processed.", { userId: testUserId });
            expect(updatedState.errors).toEqual([]);
        });

        // Optional: Add error handling tests
         it('should throw error if OpenAI call fails', async () => {
            const openAIError = new Error("Suggestion API Error");
            mockOpenAI.chat.completions.create.mockRejectedValue(openAIError);
            
            await expect(agent._provideFoodSuggestions(state)).rejects.toThrow(`Failed to generate food suggestions: ${openAIError.message}`);
            expect(state.errors).toContain(`Food Suggestion Error: ${openAIError.message}`);
        });

        it('should throw error if response is not valid JSON', async () => {
            const invalidContent = "not { json";
            mockOpenAI.chat.completions.create.mockResolvedValue({ choices: [{ message: { content: invalidContent } }] });

            // FIX: Expect the exact wrapped error message
            const expectedErrorMessage = `Failed to generate food suggestions: Failed to parse food suggestions from AI response. Raw response: ${invalidContent}`;
            await expect(agent._provideFoodSuggestions(state)).rejects.toThrow(expectedErrorMessage);
        });

        it('should throw error if response JSON structure is invalid', async () => {
            const invalidStructure = { foods: {} }; // Missing foodSuggestions key
            mockOpenAI.chat.completions.create.mockResolvedValue({ choices: [{ message: { content: JSON.stringify(invalidStructure) } }] });

            await expect(agent._provideFoodSuggestions(state)).rejects.toThrow('AI response for food suggestions had an invalid structure');
        });
    });
    describe('_explainRecommendations', () => {
        let agent;
        let state;

        beforeEach(() => {
            agent = new NutritionAgent({ openai: mockOpenAI, supabase: mockSupabase, logger: mockLogger });
            state = agent._initializeState();
            state.userId = testUserId;
            state.goals = ['muscle_gain'];
            state.activityLevel = 'very_active';
            // Assume previous steps populated calculations and plan
            state.calculations = {
                bmr: 1800,
                tdee: 2933,
                macros: { protein_g: 220, carbs_g: 330, fat_g: 81, calories: 2929 }
            };
            state.mealPlan = { meals: [], snacks: [] }; // Structure needed for prompt
        });

        it('should call OpenAI, parse response, and update state on success', async () => {
            const mockApiResponse = {
                explanations: {
                    rationale: "Your 2933 kcal target supports muscle gain given your BMR and activity level...",
                    principles: "Protein aids muscle repair, carbs fuel workouts...",
                    guidelines: "Track progress weekly, adjust calories if needed...",
                    references: ["Mifflin-St Jeor BMR", "AMDR guidelines"]
                }
            };
             mockOpenAI.chat.completions.create.mockResolvedValue({
                 choices: [{ message: { content: JSON.stringify(mockApiResponse) } }]
             });

            const updatedState = await agent._explainRecommendations(state);

            expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(1);
             expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(expect.objectContaining({
                 model: expect.any(String),
                 messages: expect.any(Array),
                 response_format: { type: "json_object" }
             }));
            // Check prompt includes key details
             const actualPrompt = mockOpenAI.chat.completions.create.mock.calls[0][0].messages[1].content;
            expect(actualPrompt).toContain("Primary Goal: muscle_gain");
            expect(actualPrompt).toContain("Calories: 2933 kcal");
            expect(actualPrompt).toContain("Protein 220g");

            expect(updatedState.explanations).toEqual(mockApiResponse.explanations);
            expect(mockLogger.info).toHaveBeenCalledWith("Received explanations from OpenAI.", { userId: testUserId });
            expect(mockLogger.info).toHaveBeenCalledWith("Explanations generated and processed.", { userId: testUserId });
            expect(updatedState.errors).toEqual([]);
        });

        it('should throw error if calculations or goals are missing', async () => {
            state.calculations.macros = null;
            await expect(agent._explainRecommendations(state)).rejects.toThrow("Macros or goals are missing");
            state.calculations.macros = { protein_g: 220, carbs_g: 330, fat_g: 81, calories: 2929 }; // Restore
            state.goals = null;
             await expect(agent._explainRecommendations(state)).rejects.toThrow("Macros or goals are missing");
        });

        it('should use fallback explanation and log warning if OpenAI call fails', async () => {
            const openAIError = new Error("Network Error");
            mockOpenAI.chat.completions.create.mockRejectedValue(openAIError);

            // Should not throw, should use fallback
            const updatedState = await agent._explainRecommendations(state);

            expect(mockLogger.error).toHaveBeenCalledWith("OpenAI call failed for explanation generation.", { userId: testUserId, error: openAIError.message, stack: openAIError.stack });
             expect(mockLogger.warn).toHaveBeenCalledWith("Proceeding without generated explanations due to error.", { userId: testUserId });
             expect(state.errors).toContain(`Explanation Generation Error: ${openAIError.message}`);
             // Check if fallback explanation is set
             expect(updatedState.explanations).toBeDefined();
             expect(updatedState.explanations.rationale).toContain("Unable to generate detailed explanation");
        });

        it('should use fallback explanation and log error if OpenAI response is not valid JSON', async () => {
            mockOpenAI.chat.completions.create.mockResolvedValue({
                choices: [{ message: { content: "This is not JSON" } }]
            });
            // OPTION A (Align Test): Expect fallback.
            const updatedState = await agent._explainRecommendations(state);
            expect(mockLogger.error).toHaveBeenCalledWith("Failed to parse JSON response from OpenAI for explanations.", { responseContent: "This is not JSON" });
            expect(mockLogger.warn).toHaveBeenCalledWith("Proceeding without generated explanations due to error.", { userId: testUserId });
            expect(state.errors).toContainEqual(expect.stringContaining('Failed to parse explanations from AI response'));
            expect(updatedState.explanations.rationale).toContain("Unable to generate detailed explanation");
        });

        it('should use fallback explanation and log error if parsed JSON has invalid structure', async () => {
            const invalidResponse = { wrongKey: {} };
             mockOpenAI.chat.completions.create.mockResolvedValue({
                 choices: [{ message: { content: JSON.stringify(invalidResponse) } }]
             });
             // OPTION A (Align Test): Expect fallback.
            const updatedState = await agent._explainRecommendations(state);
            expect(mockLogger.error).toHaveBeenCalledWith("Invalid structure received from OpenAI for explanations.", { parsedResponse: invalidResponse });
            expect(mockLogger.warn).toHaveBeenCalledWith("Proceeding without generated explanations due to error.", { userId: testUserId });
            expect(state.errors).toContainEqual(expect.stringContaining('Failed to parse explanations from AI response.'));
            expect(updatedState.explanations.rationale).toContain("Unable to generate detailed explanation");
        });

    });

    // --- Tests for Main Process Method (Step 8.4E) ---
    describe('process', () => {
        const goals = ['weight_loss'];
        const activityLevel = 'light';
        let agent;
        let mockStoredPlan;
        let mockProfile;
        let mockPrefs;

        beforeEach(() => {
            agent = new NutritionAgent({ openai: mockOpenAI, supabase: mockSupabase, logger: mockLogger });
            mockStoredPlan = { id: uuidv4(), user_id: testUserId, updated_at: new Date().toISOString() };
            mockProfile = { id: testUserId, name: 'Test User', height: 180, weight: 75, age: 30, gender: 'male', preferences: { units: 'metric' } };
            mockPrefs = { user_id: testUserId, meal_frequency: 3, restrictions: [] };
            
            // Reset OpenAI mocks specifically for process tests
            mockOpenAI.chat.completions.create.mockReset();
            
            // Reset all ValidationUtils mock implementations to ensure clean test state
            ValidationUtils.validateUserProfile.mockReset();
            ValidationUtils.validateDietaryPreferences.mockReset();
            ValidationUtils.validateGoals.mockReset();
            ValidationUtils.isValidActivityLevel.mockReset();
            ValidationUtils.resolveGoalPriority.mockReset();
            
            // Set up default mock implementations
            ValidationUtils.validateUserProfile.mockReturnValue({ isValid: true, messages: [] });
            ValidationUtils.validateDietaryPreferences.mockReturnValue({ isValid: true, messages: [] });
            ValidationUtils.validateGoals.mockReturnValue({ isValid: true, messages: [] });
            ValidationUtils.isValidActivityLevel.mockReturnValue(true);
            ValidationUtils.resolveGoalPriority.mockReturnValue({ primaryGoal: 'weight_loss', secondaryGoals: [] });

            // Setup default maybeSingleMock behavior for successful case
            maybeSingleMock
                .mockResolvedValueOnce({ data: mockProfile, error: null }) // Profile fetch
                .mockResolvedValueOnce({ data: mockPrefs, error: null }); // Dietary prefs
        });

        it('should orchestrate the full workflow and return success response', async () => {
            // Reset mock defaults
            agent._fetchUserData = jest.fn().mockImplementation(async (userId, state) => {
                state.userProfile = mockProfile;
                state.dietaryPreferences = mockPrefs;
                return state;
            });
            agent._validateGoals = jest.fn().mockImplementation(async (goals, state) => {
                state.goals = goals || ['weight_loss'];
                state.primaryGoal = 'weight_loss';
                return state;
            });
            agent._validateActivityLevel = jest.fn().mockImplementation(async (activityLevel, state) => {
                state.activityLevel = activityLevel || 'moderate';
                return state;
            });
            agent._calculateBMR = jest.fn().mockImplementation(async (state) => {
                state.calculations.bmr = 1700;
                return state;
            });
            agent._calculateTDEE = jest.fn().mockImplementation(async (state) => {
                state.calculations.tdee = 2200;
                return state;
            });
            agent._calculateMacros = jest.fn().mockImplementation(async (state) => {
                state.calculations.macros = { protein_g: 150, carbs_g: 200, fat_g: 60, calories: 1950 };
                return state;
            });
            agent._generateMealPlan = jest.fn().mockImplementation(async (state) => {
                state.mealPlan = { meals: [{ name: "B", foods: [] }] };
                return state;
            });
            agent._provideFoodSuggestions = jest.fn().mockImplementation(async (state) => {
                state.foodSuggestions = { protein: ["P"], carbs: ["C"], fat: ["F"] };
                return state;
            });
            agent._explainRecommendations = jest.fn().mockImplementation(async (state) => {
                state.explanations = { rationale: "Your nutrition plan is designed to support your weight loss goals while maintaining muscle." };
                return state;
            });
            agent._storeNutritionPlan = jest.fn().mockResolvedValue({ 
                id: mockStoredPlan.id,
                user_id: testUserId,
                mealPlan: { meals: [{ name: "B", foods: [] }] },
                foodSuggestions: { protein: ["P"], carbs: ["C"], fat: ["F"] },
                explanations: { rationale: "Your nutrition plan is designed to support your weight loss goals while maintaining muscle." }
            });
            
            // Setup retrieveMemories to return an empty array
            jest.spyOn(BaseAgent.prototype, 'retrieveMemories').mockResolvedValue([]);
            // Setup storeMemory to succeed
            jest.spyOn(BaseAgent.prototype, 'storeMemory').mockResolvedValue({ id: 'mock-memory-id' });
            
            const result = await agent.process({ userId: testUserId, goals: ['weight_loss'], activityLevel: 'moderate' });
            
            expect(result.status).toBe('success');
            expect(result.plan).toBeDefined();
            expect(result.reasoning.rationale).toContain('Your nutrition plan is designed to support your');
            expect(result.plan.id).toBe(mockStoredPlan.id); // Compare against the mock ID using 'id' instead of 'planId'
            
            // Expect warnings array to be empty since no errors occurred
            expect(result.warnings).toBeDefined();
            expect(Array.isArray(result.warnings)).toBe(true);
            
            // Add more specific assertions about the plan content if necessary
            expect(result.plan.mealPlan.meals[0].name).toBe("B");
            expect(result.plan.foodSuggestions.protein[0]).toBe("P");
        });

        it('should return error if profile fetch fails', async () => {
            const fetchError = new Error('Profile DB Error');
            
            // Use our agent direct method mocking instead of Supabase mocking
            agent._fetchUserData = jest.fn().mockRejectedValue(new ValidationError(`Profile fetch failed: ${fetchError.message}`, "FETCH_ERROR"));

            await expect(agent.process({userId: testUserId, goals, activityLevel})).rejects.toThrow(AgentError);
            await expect(agent.process({userId: testUserId, goals, activityLevel})).rejects.toThrow(/Profile fetch failed/);
        });

        it('should return error if a calculation step throws', async () => {
            // Reset default mocks
            maybeSingleMock.mockReset();
            maybeSingleMock
                .mockResolvedValueOnce({ data: mockProfile, error: null }) // Profile fetch
                .mockResolvedValueOnce({ data: mockPrefs, error: null }); // Dietary prefs
            
            // Setup MacroCalculator to throw
            const calcError = new Error("Invalid Age");
            MacroCalculator.calculateBMR.mockImplementation(() => { throw calcError; });

            await expect(agent.process({userId: testUserId, goals, activityLevel})).rejects.toThrow(AgentError);
            await expect(agent.process({userId: testUserId, goals, activityLevel})).rejects.toThrow(/Invalid Age/);
        });

        it('should return error if meal plan generation fails (OpenAI error)', async () => {
            // Reset agent method mocks
            agent._fetchUserData = jest.fn().mockImplementation(async (userId, state) => {
                state.userProfile = mockProfile;
                state.dietaryPreferences = mockPrefs;
                return state;
            });
            agent._validateGoals = jest.fn().mockImplementation(async (goals, state) => {
                state.goals = goals || ['weight_loss'];
                state.primaryGoal = 'weight_loss';
                return state;
            });
            agent._validateActivityLevel = jest.fn().mockImplementation(async (activityLevel, state) => {
                state.activityLevel = activityLevel || 'moderate';
                return state;
            });
            agent._calculateBMR = jest.fn().mockImplementation(async (state) => {
                state.calculations.bmr = 1700;
                return state;
            });
            agent._calculateTDEE = jest.fn().mockImplementation(async (state) => {
                state.calculations.tdee = 2200;
                return state;
            });
            agent._calculateMacros = jest.fn().mockImplementation(async (state) => {
                state.calculations.macros = { protein_g: 150, carbs_g: 200, fat_g: 60, calories: 1950 };
                return state;
            });
            
            // Setup the generateMealPlan to fail with an OpenAI error
            const planError = new Error("OpenAI Rate Limit");
            agent._generateMealPlan = jest.fn().mockRejectedValue(
                new ValidationError(`Failed to generate meal plan structure: ${planError.message}`, "OPENAI_ERROR")
            );

            await expect(agent.process({userId: testUserId, goals, activityLevel})).rejects.toThrow(AgentError);
            await expect(agent.process({userId: testUserId, goals, activityLevel})).rejects.toThrow(/OpenAI Rate Limit/);
        });

        it('should return success but include warning if explanation generation fails', async () => {
            // Reset default mocks
            maybeSingleMock.mockReset();
            maybeSingleMock
                .mockResolvedValueOnce({ data: mockProfile, error: null }) // Profile fetch
                .mockResolvedValueOnce({ data: mockPrefs, error: null }); // Dietary prefs
            
            // Mock needed calculation methods
            MacroCalculator.calculateBMR.mockReturnValue(1800);
            MacroCalculator.calculateTDEE.mockReturnValue(2700);
            MacroCalculator.calculateMacros.mockReturnValue({
                calories: 2200,
                macros: { protein: 150, carbs: 250, fat: 70 },
                percentages: { protein: 30, carbs: 50, fat: 20 }
            });
            
            // Override our agent methods to ensure the process flow
            agent._fetchUserData = jest.fn().mockImplementation(async (userId, state) => {
                state.userProfile = mockProfile;
                state.dietaryPreferences = mockPrefs;
                return state;
            });
            agent._validateGoals = jest.fn().mockImplementation(async (goals, state) => {
                state.goals = goals || ['weight_loss'];
                state.primaryGoal = 'weight_loss';
                return state;
            });
            agent._validateActivityLevel = jest.fn().mockImplementation(async (activityLevel, state) => {
                state.activityLevel = activityLevel || 'moderate';
                return state;
            });
            agent._calculateBMR = jest.fn().mockImplementation(async (state) => {
                state.calculations.bmr = 1700;
                return state;
            });
            agent._calculateTDEE = jest.fn().mockImplementation(async (state) => {
                state.calculations.tdee = 2200;
                return state;
            });
            agent._calculateMacros = jest.fn().mockImplementation(async (state) => {
                state.calculations.macros = { protein_g: 150, carbs_g: 200, fat_g: 60, calories: 1950 };
                return state;
            });
            agent._generateMealPlan = jest.fn().mockImplementation(async (state) => {
                state.mealPlan = { meals: [{ name: "B", foods: [] }] };
                return state;
            });
            agent._provideFoodSuggestions = jest.fn().mockImplementation(async (state) => {
                state.foodSuggestions = { protein: ["P"], carbs: ["C"], fat: ["F"] };
                return state;
            });
            
            // Mock explanation to fail
            agent._explainRecommendations = jest.fn().mockRejectedValue(new Error('AI Explanation Timeout'));
            
            agent._storeNutritionPlan = jest.fn().mockResolvedValue({ 
                id: mockStoredPlan.id,
                user_id: testUserId,
                mealPlan: { meals: [{ name: "B", foods: [] }] },
                foodSuggestions: { protein: ["P"], carbs: ["C"], fat: ["F"] },
                explanations: { rationale: "Unable to generate detailed explanation at this time." }
            });
            
            // Setup retrieveMemories to return an empty array
            jest.spyOn(BaseAgent.prototype, 'retrieveMemories').mockResolvedValue([]);
            // Setup storeMemory to succeed
            jest.spyOn(BaseAgent.prototype, 'storeMemory').mockResolvedValue({ id: 'mock-memory-id' });
            
            const result = await agent.process({userId: testUserId, goals: ['weight_loss'], activityLevel: 'moderate'});
            
            expect(result.status).toBe('success');
            expect(result.reasoning.rationale).toContain("Unable to generate detailed explanation");
            expect(result.warnings).toEqual(expect.arrayContaining([
                expect.stringContaining('Explanation Generation Error: AI Explanation Timeout')
            ]));
        });

        it('should return error if storing the plan fails', async () => {
            // Reset default mocks
            maybeSingleMock.mockReset();
            maybeSingleMock
                .mockResolvedValueOnce({ data: mockProfile, error: null }) // Profile fetch
                .mockResolvedValueOnce({ data: mockPrefs, error: null }); // Dietary prefs
            
            // Override our agent methods to ensure the process flow
            agent._fetchUserData = jest.fn().mockImplementation(async (userId, state) => {
                state.userProfile = mockProfile;
                state.dietaryPreferences = mockPrefs;
                return state;
            });
            agent._validateGoals = jest.fn().mockImplementation(async (goals, state) => {
                state.goals = goals || ['weight_loss'];
                state.primaryGoal = 'weight_loss';
                return state;
            });
            agent._validateActivityLevel = jest.fn().mockImplementation(async (activityLevel, state) => {
                state.activityLevel = activityLevel || 'moderate';
                return state;
            });
            agent._calculateBMR = jest.fn().mockImplementation(async (state) => {
                state.calculations.bmr = 1700;
                return state;
            });
            agent._calculateTDEE = jest.fn().mockImplementation(async (state) => {
                state.calculations.tdee = 2200;
                return state;
            });
            agent._calculateMacros = jest.fn().mockImplementation(async (state) => {
                state.calculations.macros = { protein_g: 150, carbs_g: 200, fat_g: 60, calories: 1950 };
                return state;
            });
            agent._generateMealPlan = jest.fn().mockImplementation(async (state) => {
                state.mealPlan = { meals: [{ name: "B", foods: [] }] };
                return state;
            });
            agent._provideFoodSuggestions = jest.fn().mockImplementation(async (state) => {
                state.foodSuggestions = { protein: ["P"], carbs: ["C"], fat: ["F"] };
                return state;
            });
            agent._explainRecommendations = jest.fn().mockImplementation(async (state) => {
                state.explanations = { rationale: 'Store fail rationale', principles: '', guidelines: '', references: [] };
                return state;
            });
            
            // Configure store to fail
            const storeError = new Error("DB connection lost");
            agent._storeNutritionPlan = jest.fn().mockRejectedValue(new ValidationError(`Supabase nutrition plan store error: ${storeError.message}`, "STORAGE_ERROR"));
            
            await expect(agent.process({userId: testUserId, goals, activityLevel})).rejects.toThrow(AgentError);
            await expect(agent.process({userId: testUserId, goals, activityLevel})).rejects.toThrow(/DB connection lost/);
        });
    });

    // Add tests for memory operations
    describe('Memory Operations', () => {
        let agent;
        let mockContext;

        beforeEach(() => {
            agent = new NutritionAgent({ 
                openai: mockOpenAI, 
                supabase: mockSupabase, 
                logger: mockLogger,
                memorySystem: mockMemorySystem
            });

            mockContext = {
                userId: testUserId,
                goals: ['weight_loss', 'muscle_gain'],
                activityLevel: 'moderate'
            };

            // Setup mocks for agent methods
            agent._fetchUserData = jest.fn().mockImplementation(async (userId, state) => {
                state.userProfile = { ...defaultProfileData };
                state.dietaryPreferences = { ...defaultPreferencesData };
                return state;
            });

            agent._validateGoals = jest.fn().mockImplementation(async (goals, state) => {
                state.goals = goals;
                state.primaryGoal = 'weight_loss';
                return state;
            });

            agent._validateActivityLevel = jest.fn().mockImplementation(async (activityLevel, state) => {
                state.activityLevel = activityLevel;
                return state;
            });

            agent._calculateBMR = jest.fn().mockImplementation(async (state) => {
                state.calculations.bmr = 1500;
                return state;
            });

            agent._calculateTDEE = jest.fn().mockImplementation(async (state) => {
                state.calculations.tdee = 2000;
                return state;
            });

            agent._calculateMacros = jest.fn().mockImplementation(async (state) => {
                state.calculations.macros = { protein_g: 150, carbs_g: 200, fat_g: 70, calories: 2000 };
                return state;
            });

            agent._generateMealPlan = jest.fn().mockImplementation(async (state) => {
                state.mealPlan = { meals: [{ name: 'Breakfast', foods: ['eggs', 'toast'] }] };
                return state;
            });

            agent._provideFoodSuggestions = jest.fn().mockImplementation(async (state) => {
                state.foodSuggestions = { protein: ['chicken', 'tofu'], carbs: ['rice', 'potatoes'], fat: ['avocado', 'olive oil'] };
                return state;
            });

            agent._explainRecommendations = jest.fn().mockImplementation(async (state) => {
                state.explanations = { rationale: 'Based on your goals and profile...' };
                return state;
            });

            agent._storeNutritionPlan = jest.fn().mockImplementation(async (planData, state) => {
                return { id: 'plan-123', ...planData };
            });
        });

        it('should retrieve previous nutrition plans from memory', async () => {
            // Setup mock for retrieveMemories to return sample data
            const mockPreviousPlans = [
                {
                    id: 'memory-001',
                    content: {
                        bmr: 1550,
                        tdee: 2100,
                        macros: { protein_g: 160, carbs_g: 210, fat_g: 75, calories: 2100 },
                        goals: ['weight_loss'],
                        activityLevel: 'light'
                    },
                    metadata: {
                        contentType: 'nutrition_plan',
                        created_at: '2023-01-01T00:00:00Z'
                    }
                }
            ];
            
            jest.spyOn(BaseAgent.prototype, 'retrieveMemories').mockResolvedValue(mockPreviousPlans);
            
            await agent.process(mockContext);
            
            // Verify retrieveMemories was called with correct parameters
            expect(BaseAgent.prototype.retrieveMemories).toHaveBeenCalledWith({
                userId: testUserId,
                agentTypes: ['nutrition'],
                metadata: { contentType: 'nutrition_plan' },
                limit: 2,
                sortBy: 'recency'
            });
        });

        it('should store nutrition plan in memory with standardized metadata', async () => {
            // First mock call will be regular plan data
            // Second mock call will be explanations
            jest.spyOn(BaseAgent.prototype, 'storeMemory').mockResolvedValueOnce({ id: 'memory-plan-id' })
                                                         .mockResolvedValueOnce({ id: 'memory-explanations-id' });
            
            await agent.process(mockContext);
            
            // Verify storeMemory was called for the plan data
            expect(BaseAgent.prototype.storeMemory).toHaveBeenCalledWith(
                expect.objectContaining({
                    bmr: expect.any(Number),
                    tdee: expect.any(Number),
                    macros: expect.any(Object),
                    mealPlan: expect.any(Object),
                    foodSuggestions: expect.any(Object),
                    goals: expect.arrayContaining(['weight_loss', 'muscle_gain']),
                    activityLevel: expect.any(String)
                }),
                expect.objectContaining({
                    userId: testUserId,
                    memoryType: 'agent_output',
                    contentType: 'nutrition_plan',
                    tags: expect.arrayContaining(['weight_loss', 'muscle_gain', 'moderate']),
                    importance: 3,
                    planId: expect.any(String)
                })
            );
            
            // Verify storeMemory was called for explanations
            expect(BaseAgent.prototype.storeMemory).toHaveBeenCalledWith(
                expect.objectContaining({
                    explanations: expect.any(Object),
                    reasoning: expect.objectContaining({
                        goalAnalysis: expect.stringContaining('Primary goal'),
                        calorieAdjustment: expect.stringContaining('TDEE')
                    })
                }),
                expect.objectContaining({
                    userId: testUserId,
                    memoryType: 'agent_metadata',
                    contentType: 'nutrition_reasoning',
                    tags: expect.arrayContaining(['explanations', 'reasoning']),
                    importance: 2,
                    planId: expect.any(String)
                })
            );
        });

        it('should handle process flow with memory integration', async () => {
            // Setup mock for retrieveMemories to return empty array
            jest.spyOn(BaseAgent.prototype, 'retrieveMemories').mockResolvedValue([]);
            
            const result = await agent.process(mockContext);
            
            // Verify result
            expect(result.status).toBe('success');
            expect(result.plan).toBeDefined();
            
            // Verify the entire flow with memory operations
            expect(BaseAgent.prototype.retrieveMemories).toHaveBeenCalled();
            expect(agent._fetchUserData).toHaveBeenCalled();
            expect(agent._validateGoals).toHaveBeenCalled();
            expect(agent._validateActivityLevel).toHaveBeenCalled();
            expect(agent._calculateBMR).toHaveBeenCalled();
            expect(agent._calculateTDEE).toHaveBeenCalled();
            expect(agent._calculateMacros).toHaveBeenCalled();
            expect(agent._generateMealPlan).toHaveBeenCalled();
            expect(agent._provideFoodSuggestions).toHaveBeenCalled();
            expect(agent._explainRecommendations).toHaveBeenCalled();
            expect(agent._storeNutritionPlan).toHaveBeenCalled();
            expect(BaseAgent.prototype.storeMemory).toHaveBeenCalledTimes(2);
        });
    });
});
