const PlanAdjustmentAgent = require('../../agents/plan-adjustment-agent');
const BaseAgent = require('../../agents/base-agent');
const { AgentError, ValidationError, ERROR_CODES } = require('../../utils/errors');
const { validate: uuidValidate } = require('uuid');
const { getOpenAIClient } = require('../../services/openai-service');

// Mock dependencies
jest.mock('uuid', () => ({
  validate: jest.fn().mockReturnValue(true) // Default to valid UUID
}));

// Mock Supabase service
jest.mock('../../services/supabase', () => {
  const mockSupabaseClient = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis()
  };
  
  return {
    getSupabaseClient: jest.fn(() => mockSupabaseClient),
    getSupabaseAdminClient: jest.fn(() => mockSupabaseClient)
  };
});

// Mock adjustment logic modules
jest.mock('../../agents/adjustment-logic/feedback-parser', () => {
  return jest.fn().mockImplementation(() => ({
    parse: jest.fn().mockResolvedValue({
      parsed: { summary: 'Parsed feedback', warnings: [] },
      invalid: false,
      errors: []
    })
  }));
});

jest.mock('../../agents/adjustment-logic/plan-modifier', () => {
  return jest.fn().mockImplementation(() => ({
    modifyPlan: jest.fn().mockResolvedValue({
      modified: true,
      plan: { exercises: [{ name: 'Modified exercise' }] },
      changes: ['Added exercise X']
    })
  }));
});

jest.mock('../../agents/adjustment-logic/adjustment-validator', () => {
  return jest.fn().mockImplementation(() => ({
    validate: jest.fn().mockResolvedValue({
      valid: true,
      warnings: [],
      errors: []
    })
  }));
});

jest.mock('../../agents/adjustment-logic/explanation-generator', () => {
  return jest.fn().mockImplementation(() => ({
    generateExplanation: jest.fn().mockResolvedValue('This is why I made these changes')
  }));
});

// Mocks
jest.mock('../../utils/errors', () => {
  const originalModule = jest.requireActual('../../utils/errors');
  return {
    ...originalModule,
    AgentError: jest.fn().mockImplementation((message, code, details, originalError) => {
      return {
        message,
        code,
        details,
        originalError,
        name: 'AgentError'
      };
    }),
    ValidationError: jest.fn().mockImplementation((message, details) => {
      return {
        message,
        details,
        name: 'ValidationError'
      };
    })
  };
});

// Mock OpenAI service
jest.mock('../../services/openai-service', () => ({
  getOpenAIClient: jest.fn(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: '{"adjustments":"Mock adjustments"}' } }]
        })
      }
    }
  }))
}));

describe('PlanAdjustmentAgent', () => {
  let planAdjustmentAgent;
  let mockOpenAIService;
  let mockSupabaseClient;
  let mockMemorySystem;
  let mockLogger;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock dependencies using factory functions instead of constructors
    mockOpenAIService = getOpenAIClient();
    // Use mock from module instead of function call
    mockSupabaseClient = require('../../services/supabase').getSupabaseClient();
    
    // Create mock memory system
    mockMemorySystem = {
      storeMemory: jest.fn().mockResolvedValue({ id: 'memory-123' }),
      storeUserFeedback: jest.fn().mockResolvedValue({ id: 'feedback-123' }),
      getMemoriesByMetadata: jest.fn().mockResolvedValue([]),
      retrieveMemories: jest.fn().mockResolvedValue([]),
      getMemoriesByWorkoutPlan: jest.fn().mockResolvedValue([
        {
          content: {
            exercises: [
              { name: 'Squat', sets: 3, reps: 10, notes: 'Standard squat' }
            ],
            reasoning: 'Previous reasoning'
          },
          metadata: {
            planId: 'plan-123'
          }
        }
      ]),
      searchSimilarMemories: jest.fn().mockResolvedValue([])
    };
    
    // Create mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };
    
    // Initialize PlanAdjustmentAgent with mocks
    planAdjustmentAgent = new PlanAdjustmentAgent({
      openaiService: mockOpenAIService,
      supabaseClient: mockSupabaseClient,
      memorySystem: mockMemorySystem,
      logger: mockLogger,
      config: { testConfig: true }
    });
  });
  
  describe('Constructor', () => {
    // Define mocks accessible to all tests in this block
    let mockOpenAIService;
    let mockSupabaseClient;
    let mockMemorySystem;
    let mockLogger;
  
    // Use beforeEach to set up default mocks and reset state
    beforeEach(() => {
      jest.resetModules(); // Ensure clean slate
  
      // Mock dependencies with working implementations using jest.doMock
      jest.doMock('../../agents/adjustment-logic/feedback-parser', () => jest.fn().mockImplementation(() => ({ parse: jest.fn().mockResolvedValue({ parsed: {}, categorized: {}, specifics: {} }) })));
      jest.doMock('../../agents/adjustment-logic/plan-modifier', () => jest.fn().mockImplementation(() => ({ apply: jest.fn().mockResolvedValue({ modifiedPlan: {}, appliedChanges: [], skippedChanges: [] }) })));
      jest.doMock('../../agents/adjustment-logic/adjustment-validator', () => jest.fn().mockImplementation(() => ({ 
        analyzeFeasibility: jest.fn().mockResolvedValue({ feasible: [], infeasible: [] }), 
        checkSafety: jest.fn().mockResolvedValue({ safeRequests: [], unsafeRequests: [], warnings: [] }), 
        verifyCoherence: jest.fn().mockResolvedValue({ coherent: [], incoherent: [] }), 
        validateAdjustedPlan: jest.fn().mockResolvedValue({ isValid: true, issues: [] }) 
      })));
      jest.doMock('../../agents/adjustment-logic/explanation-generator', () => jest.fn().mockImplementation(() => ({ 
        generate: jest.fn().mockResolvedValue({ summary: 'Test explanation', details: [] }), 
        compare: jest.fn().mockResolvedValue({ majorChanges: [] }) 
      })));
  
      // Mock other necessary dependencies AFTER resetting modules
      // Use require inside beforeEach to ensure fresh instances if needed by mocks
      mockOpenAIService = require('../../services/openai-service').getOpenAIClient();
      mockSupabaseClient = require('../../services/supabase').getSupabaseClient();
      mockLogger = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() };
      mockMemorySystem = {
        storeMemory: jest.fn().mockResolvedValue({ id: 'memory-123' }),
        retrieveMemories: jest.fn().mockResolvedValue([]),
        // Add other methods if BaseAgent constructor uses them
      };
      
      // Mock BaseAgent methods that might be called by the constructor (if any)
      // jest.spyOn(BaseAgent.prototype, 'log').mockImplementation(mockLogger.debug);
    });

    test('should initialize with provided parameters', () => {
      // Require the agent *inside* the test after mocks are set
      const PlanAdjustmentAgent = require('../../agents/plan-adjustment-agent');
      const agent = new PlanAdjustmentAgent({
        openaiService: mockOpenAIService,
        supabaseClient: mockSupabaseClient,
        memorySystem: mockMemorySystem, // Pass memory system
        logger: mockLogger,
        config: { testConfig: true }
      });
      expect(agent.openaiService).toBe(mockOpenAIService);
      expect(agent.supabaseClient).toBe(mockSupabaseClient);
      expect(agent.memorySystem).toBe(mockMemorySystem);
      expect(agent.logger).toBe(mockLogger);
      expect(agent.config).toEqual(expect.objectContaining({ 
        testConfig: true,
        maxRetries: expect.any(Number),
        initialDelay: expect.any(Number)
      }));
      expect(agent.name).toBe('PlanAdjustmentAgent');
    });

    test('should throw error if OpenAI service is not provided', () => {
      const PlanAdjustmentAgent = require('../../agents/plan-adjustment-agent');
      const errorFn = () => {
        new PlanAdjustmentAgent({
          // openaiService: mockOpenAIService, // Omitted
          supabaseClient: mockSupabaseClient,
          logger: mockLogger
        });
      };
      expect(errorFn).toThrow('OpenAIService instance is required.');
      // Check AgentError properties if needed
      // expect(errorFn).toThrow(expect.objectContaining({ code: ERROR_CODES.CONFIGURATION_ERROR }));
    });

    test('should throw error if Supabase client is not provided', () => {
      const PlanAdjustmentAgent = require('../../agents/plan-adjustment-agent');
      const errorFn = () => {
        new PlanAdjustmentAgent({
          openaiService: mockOpenAIService,
          // supabaseClient: mockSupabaseClient, // Omitted
          logger: mockLogger
        });
      };
      expect(errorFn).toThrow('SupabaseClient instance is required.');
      // expect(errorFn).toThrow(expect.objectContaining({ code: ERROR_CODES.CONFIGURATION_ERROR }));
    });

    // --- Specific Helper Failure Tests ---
    test('should throw RESOURCE_ERROR if FeedbackParser fails to instantiate', () => {
      const mockError = new Error('FeedbackParser constructor failed');
      // Override only FeedbackParser for this test
      jest.doMock('../../agents/adjustment-logic/feedback-parser', () => {
          return jest.fn().mockImplementation(() => { // Mock the constructor
            throw mockError;
          });
      });

      const AgentWithError = require('../../agents/plan-adjustment-agent');
      const { ERROR_CODES } = require('../../utils/errors');

      const errorFn = () => {
        new AgentWithError({
          openaiService: mockOpenAIService,
          supabaseClient: mockSupabaseClient,
          logger: mockLogger
        });
      };

      expect(errorFn).toThrow(expect.objectContaining({
        message: expect.stringContaining('FeedbackParser constructor failed'), // Check for original error message
        code: ERROR_CODES.RESOURCE_ERROR
      }));
    });

    test('should throw RESOURCE_ERROR if PlanModifier fails to instantiate', () => {
      const mockError = new Error('PlanModifier constructor failed');
      // Override only PlanModifier
      jest.doMock('../../agents/adjustment-logic/plan-modifier', () => {
          return jest.fn().mockImplementation(() => { throw mockError; });
      });

      const AgentWithError = require('../../agents/plan-adjustment-agent');
      const { ERROR_CODES } = require('../../utils/errors');

      const errorFn = () => new AgentWithError({ openaiService: mockOpenAIService, supabaseClient: mockSupabaseClient, logger: mockLogger });

      expect(errorFn).toThrow(expect.objectContaining({
        message: expect.stringContaining('PlanModifier constructor failed'),
        code: ERROR_CODES.RESOURCE_ERROR
      }));
    });

    test('should throw RESOURCE_ERROR if AdjustmentValidator fails to instantiate', () => {
      const mockError = new Error('AdjustmentValidator constructor failed');
       // Override only AdjustmentValidator
      jest.doMock('../../agents/adjustment-logic/adjustment-validator', () => {
          return jest.fn().mockImplementation(() => { throw mockError; });
      });
      
      const AgentWithError = require('../../agents/plan-adjustment-agent');
      const { ERROR_CODES } = require('../../utils/errors');

      const errorFn = () => new AgentWithError({ openaiService: mockOpenAIService, supabaseClient: mockSupabaseClient, logger: mockLogger });

      expect(errorFn).toThrow(expect.objectContaining({
        message: expect.stringContaining('AdjustmentValidator constructor failed'),
        code: ERROR_CODES.RESOURCE_ERROR
      }));
    });

    test('should throw RESOURCE_ERROR if ExplanationGenerator fails to instantiate', () => {
      const mockError = new Error('ExplanationGenerator constructor failed');
      // Override only ExplanationGenerator
      jest.doMock('../../agents/adjustment-logic/explanation-generator', () => {
          return jest.fn().mockImplementation(() => { throw mockError; });
      });

      const AgentWithError = require('../../agents/plan-adjustment-agent');
      const { ERROR_CODES } = require('../../utils/errors');

      const errorFn = () => new AgentWithError({ openaiService: mockOpenAIService, supabaseClient: mockSupabaseClient, logger: mockLogger });

      expect(errorFn).toThrow(expect.objectContaining({
        message: expect.stringContaining('ExplanationGenerator constructor failed'),
        code: ERROR_CODES.RESOURCE_ERROR
      }));
    });
    // --- End New Tests ---
  });
  
  describe('process method', () => {
    const validPlan = {
      planId: 'plan-123',
      updated_at: new Date().toISOString(), // Simulate timestamp
      exercises: [
        { name: 'Squat', sets: 3, reps: 10, notes: 'Standard squat' }
      ],
      weeklySchedule: { Monday: { sessionName: 'Leg Day', exercises: [{ exercise: 'Squat', sets: 3, repsOrDuration: '10' }] } }
    };
    const validFeedback = 'I need more knee-friendly exercises';
    const validUserProfile = {
      user_id: 'user-123',
      height: 175,
      weight: 70,
      age: 30,
      gender: 'male',
      fitnessLevel: 'intermediate', // Added for validation logic
      goals: ['strength'] // Added for validation logic
    };
    const validContext = { plan: validPlan, feedback: validFeedback, userProfile: validUserProfile };

    let planAdjustmentAgent; // Agent instance for process tests
    let mockFeedbackParserInstance;
    let mockPlanModifierInstance;
    let mockAdjustmentValidatorInstance;
    let mockExplanationGeneratorInstance;
    // Mocks for BaseAgent methods
    let mockValidate;
    let mockRetrieveMemories;
    let mockStoreMemory;
    let mockLog; // Add mock for log if needed

    beforeEach(() => {
        jest.resetModules();

        // --- Mock Helper Modules --- Refined mocking strategy
        mockFeedbackParserInstance = { 
            parse: jest.fn().mockResolvedValue({ 
                parsed: { summary: 'Parsed OK', warnings: [] }, 
                categorized: { byType: {} }, 
                specifics: { forValidation: {} } 
            })
        };
        jest.doMock('../../agents/adjustment-logic/feedback-parser', () => jest.fn().mockImplementation(() => mockFeedbackParserInstance));

        mockPlanModifierInstance = {
            apply: jest.fn().mockResolvedValue({ 
                modifiedPlan: { ...validPlan, planName: 'Adjusted Plan', updated_at: new Date().toISOString() },
                appliedChanges: [{ type: 'test_change' }], 
                skippedChanges: [] 
            })
        };
        jest.doMock('../../agents/adjustment-logic/plan-modifier', () => jest.fn().mockImplementation(() => mockPlanModifierInstance));

        mockAdjustmentValidatorInstance = {
            analyzeFeasibility: jest.fn().mockResolvedValue({ feasible: [], infeasible: [] }),
            checkSafety: jest.fn().mockResolvedValue({ safeRequests: [], unsafeRequests: [], warnings: [] }),
            verifyCoherence: jest.fn().mockResolvedValue({ coherent: [], incoherent: [] }),
            validateAdjustedPlan: jest.fn().mockResolvedValue({ isValid: true, issues: [] })
        };
        jest.doMock('../../agents/adjustment-logic/adjustment-validator', () => jest.fn().mockImplementation(() => mockAdjustmentValidatorInstance));

        mockExplanationGeneratorInstance = {
            generate: jest.fn().mockResolvedValue({ summary: 'Generated explanation', details: [] }),
            compare: jest.fn().mockResolvedValue({ majorChanges: [] })
        };
        jest.doMock('../../agents/adjustment-logic/explanation-generator', () => jest.fn().mockImplementation(() => mockExplanationGeneratorInstance));

        // --- Mock BaseAgent Methods --- Use prototype spies
        const BaseAgent = require('../../agents/base-agent');
        mockValidate = jest.spyOn(BaseAgent.prototype, 'validate').mockImplementation(() => {}); // Assume validation passes
        mockRetrieveMemories = jest.spyOn(BaseAgent.prototype, 'retrieveMemories').mockResolvedValue([]); // Default to no memories
        mockStoreMemory = jest.spyOn(BaseAgent.prototype, 'storeMemory').mockResolvedValue({ id: 'mem-test-id' });
        mockLog = jest.spyOn(BaseAgent.prototype, 'log').mockImplementation(() => {}); // Mock log to suppress output

        // --- Mock other dependencies --- 
        const mockOpenAIService = require('../../services/openai-service').getOpenAIClient();
        const mockSupabaseClient = require('../../services/supabase').getSupabaseClient();
        const mockLogger = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() }; // Use simple mock for constructor

        // --- Instantiate Agent --- Require AFTER mocks
        const PlanAdjustmentAgent = require('../../agents/plan-adjustment-agent');
        planAdjustmentAgent = new PlanAdjustmentAgent({
            openaiService: mockOpenAIService,
            supabaseClient: mockSupabaseClient,
            memorySystem: { mockSystem: true }, // Provide a mock memorySystem object
            logger: mockLogger, 
        });
    });

    afterEach(() => {
        jest.restoreAllMocks(); // Clean up spies
    });
    
    test('Happy Path: should successfully process a valid adjustment request', async () => {
        const result = await planAdjustmentAgent.process(validContext);

        // 1. Verify Input Validation was called
        expect(mockValidate).toHaveBeenCalledTimes(3); // plan, feedback, userProfile

        // 2. Verify Memory Retrieval
        expect(mockRetrieveMemories).toHaveBeenCalledTimes(1); // Changed from 2 to 1
        // Refine based on actual retrieve calls if needed

        // 3. Verify Helper Module Methods Called
        expect(mockFeedbackParserInstance.parse).toHaveBeenCalledWith(validFeedback);
        expect(mockAdjustmentValidatorInstance.analyzeFeasibility).toHaveBeenCalled();
        expect(mockAdjustmentValidatorInstance.checkSafety).toHaveBeenCalled();
        expect(mockAdjustmentValidatorInstance.verifyCoherence).toHaveBeenCalled();
        expect(mockPlanModifierInstance.apply).toHaveBeenCalled();
        expect(mockAdjustmentValidatorInstance.validateAdjustedPlan).toHaveBeenCalled();
        expect(mockExplanationGeneratorInstance.generate).toHaveBeenCalled();
        expect(mockExplanationGeneratorInstance.compare).toHaveBeenCalled();

        // 4. Verify Memory Storage
        expect(mockStoreMemory).toHaveBeenCalledTimes(2); // Once for adjusted plan, once for reasoning
        // Check specifics of storeMemory calls if needed
        expect(mockStoreMemory).toHaveBeenCalledWith(
            expect.objectContaining({ planName: 'Adjusted Plan' }), // Check adjusted plan data
            expect.objectContaining({ memoryType: 'agent_output' })
        );
        expect(mockStoreMemory).toHaveBeenCalledWith(
            expect.objectContaining({ reasoning: expect.any(Array) }), // Check reasoning data
            expect.objectContaining({ memoryType: 'agent_metadata' })
        );

        // 5. Verify Final Output Structure
        expect(result.status).toBe('success');
        expect(result.adjustedPlan).toBeDefined();
        expect(result.adjustedPlan.planName).toBe('Adjusted Plan'); // Check modified plan returned
        expect(result.explanations).toBeDefined();
        expect(result.explanations.summary).toBe('Generated explanation');
        expect(result.changesSummary).toEqual([{ type: 'test_change' }]);
        expect(result.skippedSummary).toEqual([]);
        expect(result.warnings).toEqual([]);
        expect(result.errors).toEqual([]);
        expect(result.reasoning.length).toBeGreaterThan(0); // Check reasoning steps were recorded
    });

    test('Input Validation Failure: should throw AgentError if plan is invalid', async () => {
        const invalidContext = { ...validContext, plan: { planName: 'Incomplete Plan' } }; // No planId
        // Make the BaseAgent validate method throw when called for the plan
        // The first call to validate is for the plan.
        mockValidate.mockImplementationOnce((data, validator, message) => {
            // Simulate the validator for planId failing
            if (!validator(data)) { // The validator for plan is (p) => p && typeof p === 'object' && p.planId
                throw new ValidationError(message || 'Validation failed for plan');
            }
        });

        await expect(planAdjustmentAgent.process(invalidContext))
            .rejects.toMatchObject({ 
                name: 'AgentError', 
                code: ERROR_CODES.VALIDATION_ERROR, 
                message: expect.stringContaining('Invalid or missing original plan object')
            });
    });

    test('Input Validation Failure: should throw AgentError if feedback is invalid', async () => {
        const invalidContext = { ...validContext, feedback: '' };
        mockValidate.mockImplementationOnce(() => {}).mockImplementationOnce((data, validator, message) => {
            if (!data) throw new ValidationError(message || 'Validation failed');
        });
        
        await expect(planAdjustmentAgent.process(invalidContext))
            .rejects.toMatchObject({ 
                name: 'AgentError', 
                code: ERROR_CODES.VALIDATION_ERROR, 
                message: expect.stringContaining('Invalid or empty feedback provided')
            });
    });

    test('Input Validation Failure: should throw AgentError if userProfile is invalid', async () => {
        const invalidContext = { ...validContext, userProfile: { user_id: null } }; // Missing user_id
        mockValidate.mockImplementationOnce(() => {}).mockImplementationOnce(() => {}).mockImplementationOnce((data, validator, message) => {
             if (!data || !data.user_id) throw new ValidationError(message || 'Validation failed');
        });

        await expect(planAdjustmentAgent.process(invalidContext))
            .rejects.toMatchObject({ 
                name: 'AgentError', 
                code: ERROR_CODES.VALIDATION_ERROR, 
                message: expect.stringContaining('Invalid or missing user profile object')
            });
    });

    test('Memory Retrieval Failure (Non-critical): should continue processing and log warning', async () => {
        // Mock retrieveMemories to throw an error
        // The spy is already on BaseAgent.prototype.retrieveMemories from beforeEach
        mockRetrieveMemories.mockRejectedValueOnce(new Error('DB connection failed')); // First call fails
        // Subsequent calls might succeed or also fail depending on what we want to test for the second call
        // For this test, let's assume the second call (if it happens) also fails or is not critical to the main flow if the first failed.
        mockRetrieveMemories.mockRejectedValueOnce(new Error('DB connection failed again'));

        const result = await planAdjustmentAgent.process(validContext);

        // Verify it still tried to parse feedback etc.
        expect(mockFeedbackParserInstance.parse).toHaveBeenCalledWith(validFeedback);
        expect(mockPlanModifierInstance.apply).toHaveBeenCalled(); // Ensure main logic proceeded

        // Verify a warning was logged/added to state
        expect(result.warnings.length).toBeGreaterThanOrEqual(1);
        expect(result.warnings).toEqual(expect.arrayContaining([
            expect.stringContaining('Memory retrieval encountered an issue: DB connection failed')
        ]));
        
        // Verify the overall status is still success because memory retrieval is non-critical for adjustment output
        expect(result.status).toBe('success');
        expect(result.adjustedPlan).toBeDefined(); // Plan should still be adjusted
        expect(mockStoreMemory).toHaveBeenCalled(); // Should still attempt to store the result
    });

    test('Helper Module Failure (_initialUnderstanding): should throw AgentError if feedbackParser.parse fails', async () => {
        const parseError = new Error('LLM parsing blew up');
        // mockFeedbackParserInstance is already set up in beforeEach to be the instance used by the agent.
        // We mock its 'parse' method to throw an error.
        mockFeedbackParserInstance.parse.mockRejectedValueOnce(parseError);
        const { ERROR_CODES } = require('../../utils/errors'); // Ensure ERROR_CODES is available

        await expect(planAdjustmentAgent.process(validContext))
            .rejects.toMatchObject({ 
                name: 'AgentError', 
                code: ERROR_CODES.PROCESSING_ERROR, // As _initialUnderstanding wraps it
                message: expect.stringContaining('Failed to parse user feedback: LLM parsing blew up'),
                originalError: parseError, // Check that original error is preserved
                details: expect.objectContaining({ step: 'initialUnderstanding' })
            });
        
        // Verify that subsequent critical steps like plan modification were not called
        expect(mockPlanModifierInstance.apply).not.toHaveBeenCalled();
        expect(mockStoreMemory).not.toHaveBeenCalled(); // Should not attempt to store if critical step failed
    });

    test('Helper Module Failure (_consideration): should throw AgentError if adjustmentValidator.analyzeFeasibility fails', async () => {
        const feasibilityError = new Error('Feasibility analysis exploded');
        mockAdjustmentValidatorInstance.analyzeFeasibility.mockRejectedValueOnce(feasibilityError);
        const { ERROR_CODES } = require('../../utils/errors');

        await expect(planAdjustmentAgent.process(validContext))
            .rejects.toMatchObject({
                name: 'AgentError',
                code: ERROR_CODES.PROCESSING_ERROR,
                message: expect.stringContaining('Failed during consideration analysis: Feasibility analysis exploded'),
                originalError: feasibilityError,
                details: expect.objectContaining({ step: 'consideration' })
            });

        // Verify that subsequent steps like plan modification were not called
        expect(mockPlanModifierInstance.apply).not.toHaveBeenCalled();
        expect(mockStoreMemory).not.toHaveBeenCalled();
    });

    test('Helper Module Failure (_adjustment): should throw AgentError if planModifier.apply fails', async () => {
        const modificationError = new Error('Plan modification failed catastrophically');
        mockPlanModifierInstance.apply.mockRejectedValueOnce(modificationError);
        const { ERROR_CODES } = require('../../utils/errors');

        await expect(planAdjustmentAgent.process(validContext))
            .rejects.toMatchObject({
                name: 'AgentError',
                code: ERROR_CODES.PROCESSING_ERROR,
                message: expect.stringContaining('Failed to modify plan: Plan modification failed catastrophically'),
                originalError: modificationError,
                details: expect.objectContaining({ step: 'adjustment' })
            });
        
        expect(mockAdjustmentValidatorInstance.validateAdjustedPlan).not.toHaveBeenCalled(); // Reflection step should not run
        expect(mockStoreMemory).not.toHaveBeenCalled();
    });

    test('Helper Module Failure (_reflection - Validator): should throw AgentError if adjustmentValidator.validateAdjustedPlan fails', async () => {
        const validationReflectionError = new Error('Post-adjustment validation exploded');
        mockAdjustmentValidatorInstance.validateAdjustedPlan.mockRejectedValueOnce(validationReflectionError);
        const { ERROR_CODES } = require('../../utils/errors');

        await expect(planAdjustmentAgent.process(validContext))
            .rejects.toMatchObject({
                name: 'AgentError',
                code: ERROR_CODES.PROCESSING_ERROR,
                message: expect.stringContaining('Failed during reflection stage: Post-adjustment validation exploded'),
                originalError: validationReflectionError,
                details: expect.objectContaining({ step: 'reflection' })
            });
        
        expect(mockExplanationGeneratorInstance.generate).not.toHaveBeenCalled(); // Further reflection steps should not run
        expect(mockStoreMemory).not.toHaveBeenCalled();
    });

    test('Helper Module Failure (_reflection - Generator): should throw AgentError if explanationGenerator.generate fails', async () => {
        const explanationError = new Error('Explanation generation bombed');
        mockExplanationGeneratorInstance.generate.mockRejectedValueOnce(explanationError);
        const { ERROR_CODES } = require('../../utils/errors');

        await expect(planAdjustmentAgent.process(validContext))
            .rejects.toMatchObject({
                name: 'AgentError',
                code: ERROR_CODES.PROCESSING_ERROR,
                message: expect.stringContaining('Failed during reflection stage: Explanation generation bombed'),
                originalError: explanationError,
                details: expect.objectContaining({ step: 'reflection' })
            });
        
        expect(mockStoreMemory).not.toHaveBeenCalled(); // Store memory should not be called if reflection fails critically
    });

    test('Memory Storage Failure (Non-critical): should continue and log warning if storeMemory fails', async () => {
        // Mock storeMemory to throw an error
        // The spy is already on BaseAgent.prototype.storeMemory from beforeEach
        const storeMemoryError = new Error('Supabase write failed');
        mockStoreMemory.mockRejectedValue(storeMemoryError); // All calls to storeMemory will fail

        const result = await planAdjustmentAgent.process(validContext);

        // Verify main logic (like plan modification) still completed
        expect(mockPlanModifierInstance.apply).toHaveBeenCalled();
        expect(result.adjustedPlan).toBeDefined();
        
        // Verify warnings were logged/added to state for both storeMemory calls
        expect(result.warnings.length).toBeGreaterThanOrEqual(2); // Expecting two failures
        expect(result.warnings).toEqual(expect.arrayContaining([
            expect.stringContaining('Memory storage failed (adjusted plan): Supabase write failed'),
            expect.stringContaining('Memory storage failed (reasoning): Supabase write failed') 
        ]));
        
        // Verify the overall status is still success
        expect(result.status).toBe('success');
    });

    // Add more process method tests here (e.g., helper failures, memory failures)
  });

  describe('_formatOutput', () => {
    let agentInstance; 
    let mockDateNow;
    const fixedTimestamp = 1678886400000; 
    const originalPlanId = 'plan-orig-123';

    beforeEach(() => {
      jest.resetModules(); // Reset modules to ensure clean mocks for this describe block

      // Mock all helper dependencies of PlanAdjustmentAgent for its constructor
      jest.doMock('../../agents/adjustment-logic/feedback-parser', () => jest.fn().mockImplementation(() => ({ parse: jest.fn() })));
      jest.doMock('../../agents/adjustment-logic/plan-modifier', () => jest.fn().mockImplementation(() => ({ apply: jest.fn() })));
      jest.doMock('../../agents/adjustment-logic/adjustment-validator', () => jest.fn().mockImplementation(() => ({ 
        analyzeFeasibility: jest.fn(), checkSafety: jest.fn(), 
        verifyCoherence: jest.fn(), validateAdjustedPlan: jest.fn() 
      })));
      jest.doMock('../../agents/adjustment-logic/explanation-generator', () => jest.fn().mockImplementation(() => ({ generate: jest.fn(), compare: jest.fn() })));
      
      // Require services needed for constructor AFTER mocks are set
      const mockOpenAIService = require('../../services/openai-service').getOpenAIClient();
      const mockSupabaseClient = require('../../services/supabase').getSupabaseClient();
      const mockLogger = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() };
      
      const PlanAdjustmentAgent = require('../../agents/plan-adjustment-agent');
      agentInstance = new PlanAdjustmentAgent({
        openaiService: mockOpenAIService,
        supabaseClient: mockSupabaseClient,
        logger: mockLogger,
        // memorySystem is not directly used by _formatOutput, so can be null or minimal mock
        memorySystem: null 
      });

      mockDateNow = jest.spyOn(global.Date, 'now').mockReturnValue(fixedTimestamp);
    });

    afterEach(() => {
      mockDateNow.mockRestore();
      // jest.resetAllMocks(); // Use if needed, but resetModules in beforeEach is often enough
    });

    test('should correctly format output for a successful adjustment', () => {
      const successState = {
        originalPlan: { planId: originalPlanId, exercises: ['orig_ex1'] },
        adjustedPlan: { planId: `adj_${originalPlanId}_temp`, exercises: ['adj_ex1'], name: 'Adjusted Plan Alpha' },
        feedback: 'Great feedback',
        userProfile: { user_id: 'user-test-789' },
        initialUnderstanding: { parsedFeedback: { summary: 'Understood feedback' } },
        consideration: { considerationsSummary: ['All good'] },
        adjustment: { appliedChanges: ['change1'], skippedChanges: ['skip1'] },
        reflection: { 
          validationResults: { isValid: true, issues: [] }, 
          explanations: { summary: 'Plan looks solid' }, 
          comparison: { notes: 'Original vs Adjusted' } 
        },
        errors: [],
        warnings: ['minor warning'],
        reasoning: ['step a', 'step b'],
      };
      const output = agentInstance._formatOutput(successState);
      expect(output.status).toBe('success');
      expect(output.originalPlanId).toBe(originalPlanId);
      expect(output.adjustedPlanId).toBe(`adj_${originalPlanId}_${fixedTimestamp}`);
      expect(output.adjustedPlan).toEqual(successState.adjustedPlan);
      expect(output.explanations).toEqual(successState.reflection.explanations);
      expect(output.changesSummary).toEqual(successState.adjustment.appliedChanges);
      expect(output.skippedSummary).toEqual(successState.adjustment.skippedChanges);
      expect(output.comparison).toEqual(successState.reflection.comparison);
      expect(output.validation).toEqual(successState.reflection.validationResults);
      expect(output.reasoning).toEqual(successState.reasoning);
      expect(output.warnings).toEqual(successState.warnings);
      expect(output.errors).toEqual([]);
    });

    test('should correctly format output when errors are present', () => {
      const errorState = {
        originalPlan: { planId: originalPlanId, exercises: ['orig_ex1'] },
        adjustedPlan: null, 
        feedback: 'Problematic feedback',
        userProfile: { user_id: 'user-test-789' },
        initialUnderstanding: {}, 
        consideration: {}, 
        adjustment: { appliedChanges: [], skippedChanges: [] }, 
        reflection: { validationResults: null, explanations: null, comparison: null },
        errors: [{ message: 'Critical failure', step: 'adjustment' }],
        warnings: ['early warning'],
        reasoning: ['step a', 'error occurred'],
      };
      const output = agentInstance._formatOutput(errorState);
      expect(output.status).toBe('error');
      expect(output.originalPlanId).toBe(originalPlanId);
      expect(output.adjustedPlanId).toBeNull();
      expect(output.adjustedPlan).toEqual(errorState.originalPlan);
      expect(output.explanations).toEqual({ error: "Failed to generate explanations due to error." });
      expect(output.changesSummary).toEqual(errorState.adjustment.appliedChanges);
      expect(output.skippedSummary).toEqual(errorState.adjustment.skippedChanges);
      expect(output.comparison).toEqual({ error: "Failed to generate comparison due to error." });
      expect(output.validation).toEqual({ error: "Validation skipped due to error." });
      expect(output.reasoning).toEqual(errorState.reasoning);
      expect(output.warnings).toEqual(errorState.warnings);
      expect(output.errors).toEqual(errorState.errors);
    });

    test('should handle missing optional fields in state gracefully for success output', () => {
      const minimalSuccessState = {
        originalPlan: { planId: originalPlanId },
        adjustedPlan: { planId: `adj_${originalPlanId}_temp`, name: 'Minimal Adjusted Plan' },
        adjustment: {}, 
        reflection: {}, 
        errors: [], warnings: [], reasoning: [],
      };
      const output = agentInstance._formatOutput(minimalSuccessState);
      expect(output.status).toBe('success');
      expect(output.adjustedPlanId).toBe(`adj_${originalPlanId}_${fixedTimestamp}`);
      expect(output.adjustedPlan).toEqual(minimalSuccessState.adjustedPlan);
      expect(output.explanations).toEqual({}); 
      expect(output.changesSummary).toEqual([]);
      expect(output.skippedSummary).toEqual([]);
      expect(output.comparison).toEqual({});
      expect(output.validation).toBeNull();
    });
  });

  describe('_initialUnderstanding method', () => {
    let agentInstance;
    let mockFeedbackParserInstance;
    let initialState;

    beforeEach(() => {
      jest.resetModules();

      // Mock helper modules - FeedbackParser is key here
      mockFeedbackParserInstance = {
        parse: jest.fn() // Will be configured per test
      };
      jest.doMock('../../agents/adjustment-logic/feedback-parser', () => jest.fn().mockImplementation(() => mockFeedbackParserInstance));
      
      // Mock other helpers with basic mocks as they are not directly tested here but needed for agent instantiation
      jest.doMock('../../agents/adjustment-logic/plan-modifier', () => jest.fn().mockImplementation(() => ({ apply: jest.fn() })));
      jest.doMock('../../agents/adjustment-logic/adjustment-validator', () => jest.fn().mockImplementation(() => ({ analyzeFeasibility: jest.fn(), checkSafety: jest.fn(), verifyCoherence: jest.fn(), validateAdjustedPlan: jest.fn() })));
      jest.doMock('../../agents/adjustment-logic/explanation-generator', () => jest.fn().mockImplementation(() => ({ generate: jest.fn(), compare: jest.fn() })));

      const mockOpenAIService = require('../../services/openai-service').getOpenAIClient();
      const mockSupabaseClient = require('../../services/supabase').getSupabaseClient();
      const mockLogger = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() };
      const PlanAdjustmentAgent = require('../../agents/plan-adjustment-agent');
      
      agentInstance = new PlanAdjustmentAgent({
        openaiService: mockOpenAIService,
        supabaseClient: mockSupabaseClient,
        logger: mockLogger,
        memorySystem: null
      });
      
      // Spy on agent's log method to check for warnings if needed, or check state.warnings directly
      jest.spyOn(agentInstance, 'log').mockImplementation(() => {}); 

      initialState = {
        feedback: 'Test feedback string',
        initialUnderstanding: { parsedFeedback: null, categorizedAdjustments: null, adjustmentSpecifics: null },
        warnings: [],
        // Other state properties can be minimal as they are not directly used by _initialUnderstanding
        originalPlan: {}, userProfile: {}, consideration: {}, adjustment: {}, reflection: {}, errors: [], reasoning: []
      };
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('should correctly update state after successful feedback parsing', async () => {
      const mockParsedResult = {
        parsed: { summary: 'Parsed feedback successfully', details: ['detail1'], warnings: ['parser_warning_1'] },
        categorized: { byType: { safety: ['cat_safety'] } },
        specifics: { forValidation: { exercises: new Set(['squat']) } },
        // These fields are not directly from FeedbackParser but good to have for completeness if parse added them
        // For now, assume FeedbackParser only returns the above structure from its .parse method
      };
      mockFeedbackParserInstance.parse.mockResolvedValue(mockParsedResult); // Mock a successful parse

      await agentInstance._initialUnderstanding(initialState);

      expect(mockFeedbackParserInstance.parse).toHaveBeenCalledWith(initialState.feedback);
      expect(initialState.initialUnderstanding.parsedFeedback).toEqual(mockParsedResult.parsed);
      expect(initialState.initialUnderstanding.categorizedAdjustments).toEqual(mockParsedResult.categorized);
      expect(initialState.initialUnderstanding.adjustmentSpecifics).toEqual(mockParsedResult.specifics);
      expect(initialState.warnings).toEqual(expect.arrayContaining(['parser_warning_1']));
      expect(agentInstance.log).toHaveBeenCalledWith('warn', 'Collected 1 warnings from FeedbackParser.');
    });

    test('should handle successful parsing with no warnings from parser', async () => {
        const mockParsedResult = {
            parsed: { summary: 'Parsed without warnings', details: [], warnings: [] }, // No warnings here
            categorized: { byType: {} },
            specifics: { forValidation: {} }
        };
        mockFeedbackParserInstance.parse.mockResolvedValue(mockParsedResult);

        await agentInstance._initialUnderstanding(initialState);

        expect(initialState.initialUnderstanding.parsedFeedback).toEqual(mockParsedResult.parsed);
        expect(initialState.warnings).toEqual([]); // Should be empty
        // Check that the specific log for collecting warnings was NOT called, or called differently
        expect(agentInstance.log).not.toHaveBeenCalledWith('warn', expect.stringContaining('warnings from FeedbackParser'));
      });
  });

  describe('_consideration method', () => {
    let agentInstance;
    let mockAdjustmentValidatorInstance;
    let initialState;

    beforeEach(() => {
      jest.resetModules();

      mockAdjustmentValidatorInstance = {
        analyzeFeasibility: jest.fn(),
        checkSafety: jest.fn(),
        verifyCoherence: jest.fn(),
        validateAdjustedPlan: jest.fn() // Also mock this though not directly used by _consideration
      };
      jest.doMock('../../agents/adjustment-logic/adjustment-validator', () => jest.fn().mockImplementation(() => mockAdjustmentValidatorInstance));

      // Mock other helpers
      jest.doMock('../../agents/adjustment-logic/feedback-parser', () => jest.fn().mockImplementation(() => ({ parse: jest.fn() })));
      jest.doMock('../../agents/adjustment-logic/plan-modifier', () => jest.fn().mockImplementation(() => ({ apply: jest.fn() })));
      jest.doMock('../../agents/adjustment-logic/explanation-generator', () => jest.fn().mockImplementation(() => ({ generate: jest.fn(), compare: jest.fn() })));

      const mockOpenAIService = require('../../services/openai-service').getOpenAIClient();
      const mockSupabaseClient = require('../../services/supabase').getSupabaseClient();
      const mockLogger = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() };
      const PlanAdjustmentAgent = require('../../agents/plan-adjustment-agent');
      
      agentInstance = new PlanAdjustmentAgent({
        openaiService: mockOpenAIService,
        supabaseClient: mockSupabaseClient,
        logger: mockLogger,
        memorySystem: null
      });
      jest.spyOn(agentInstance, 'log').mockImplementation(() => {}); 

      initialState = {
        originalPlan: { planId: 'plan1', exercises: [] },
        feedback: 'Some feedback',
        userProfile: { user_id: 'user1', goals: ['strength'] },
        initialUnderstanding: { 
          parsedFeedback: { /* some parsed structure */ }, 
          categorizedAdjustments: {}, 
          adjustmentSpecifics: {} 
        },
        consideration: { feasibilityResults: null, safetyResults: null, coherenceResults: null, considerationsSummary: [] },
        warnings: [],
        adjustment: {}, reflection: {}, errors: [], reasoning: []
      };
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('should correctly update state after successful consideration analysis', async () => {
      const mockFeasibilityResult = { 
        feasible: [{id: 'f1', detail: 'is feasible'}], 
        infeasible: [{id: 'if1', reason: 'Reason F for infeasibility'}] 
      };
      const mockSafetyResult = { 
        safeRequests: [{id: 's1', detail: 'is safe'}], 
        unsafeRequests: [{id: 'us1', reason: 'Reason S for unsafety'}], 
        warnings: ['safety_warn_1_msg'] 
      };
      const mockCoherenceResult = { 
        coherent: [{id: 'c1', detail: 'is coherent'}], 
        incoherent: [{id: 'ic1', reason: 'Reason C for incoherence'}] 
      };

      mockAdjustmentValidatorInstance.analyzeFeasibility.mockResolvedValue(mockFeasibilityResult);
      mockAdjustmentValidatorInstance.checkSafety.mockResolvedValue(mockSafetyResult);
      mockAdjustmentValidatorInstance.verifyCoherence.mockResolvedValue(mockCoherenceResult);

      await agentInstance._consideration(initialState);

      expect(mockAdjustmentValidatorInstance.analyzeFeasibility).toHaveBeenCalledWith(
        initialState.originalPlan, 
        initialState.initialUnderstanding.parsedFeedback, 
        initialState.userProfile
      );
      expect(mockAdjustmentValidatorInstance.checkSafety).toHaveBeenCalledWith(
        initialState.initialUnderstanding.parsedFeedback, 
        initialState.userProfile
      );
      expect(mockAdjustmentValidatorInstance.verifyCoherence).toHaveBeenCalledWith(
        initialState.originalPlan, 
        initialState.initialUnderstanding.parsedFeedback, 
        initialState.userProfile
      );

      expect(initialState.consideration.feasibilityResults).toEqual(mockFeasibilityResult);
      expect(initialState.consideration.safetyResults).toEqual(mockSafetyResult);
      expect(initialState.consideration.coherenceResults).toEqual(mockCoherenceResult);
      expect(initialState.warnings).toEqual(expect.arrayContaining(['safety_warn_1_msg']));
      expect(agentInstance.log).toHaveBeenCalledWith('warn', 'Collected 1 safety warnings from AdjustmentValidator.');
      
      // Check considerationsSummary (basic check, can be more detailed)
      expect(initialState.consideration.considerationsSummary.length).toBe(
        mockFeasibilityResult.infeasible.length +
        mockSafetyResult.unsafeRequests.length +
        mockCoherenceResult.incoherent.length +
        mockSafetyResult.warnings.length
      ); 
      expect(initialState.consideration.considerationsSummary).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'feasibility', status: 'infeasible', id: 'if1', reason: 'Reason F for infeasibility' }),
        expect.objectContaining({ type: 'safety', status: 'unsafe', id: 'us1', reason: 'Reason S for unsafety' }),
        expect.objectContaining({ type: 'coherence', status: 'incoherent', id: 'ic1', reason: 'Reason C for incoherence' }),
        expect.objectContaining({ type: 'safety', status: 'warning', message: 'safety_warn_1_msg' })
      ]));
    });
  });

  describe('_adjustment method', () => {
    let agentInstance;
    let mockPlanModifierInstance;
    let initialState;

    beforeEach(() => {
      jest.resetModules();

      mockPlanModifierInstance = {
        apply: jest.fn() // Configured per test
      };
      jest.doMock('../../agents/adjustment-logic/plan-modifier', () => jest.fn().mockImplementation(() => mockPlanModifierInstance));

      // Mock other helpers
      jest.doMock('../../agents/adjustment-logic/feedback-parser', () => jest.fn().mockImplementation(() => ({ parse: jest.fn() })));
      jest.doMock('../../agents/adjustment-logic/adjustment-validator', () => jest.fn().mockImplementation(() => ({ analyzeFeasibility: jest.fn(), checkSafety: jest.fn(), verifyCoherence: jest.fn(), validateAdjustedPlan: jest.fn() })));
      jest.doMock('../../agents/adjustment-logic/explanation-generator', () => jest.fn().mockImplementation(() => ({ generate: jest.fn(), compare: jest.fn() })));

      const mockOpenAIService = require('../../services/openai-service').getOpenAIClient();
      const mockSupabaseClient = require('../../services/supabase').getSupabaseClient();
      const mockLogger = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() };
      const PlanAdjustmentAgent = require('../../agents/plan-adjustment-agent');
      
      agentInstance = new PlanAdjustmentAgent({
        openaiService: mockOpenAIService,
        supabaseClient: mockSupabaseClient,
        logger: mockLogger,
        memorySystem: null
      });
      jest.spyOn(agentInstance, 'log').mockImplementation(() => {}); 

      initialState = {
        originalPlan: { planId: 'plan1', exercises: [ { name: 'Squat'}] },
        initialUnderstanding: { parsedFeedback: { /* parsed feedback object */ } },
        consideration: { /* consideration results */ },
        adjustment: { appliedChanges: [], skippedChanges: [] },
        adjustedPlan: null,
        // Other state properties
        feedback: '', userProfile: {}, reflection: {}, errors: [], warnings: [], reasoning: []
      };
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('should correctly update state after successful plan modification', async () => {
      const mockModifiedPlan = { planId: 'plan1_adj', exercises: [{name: 'Leg Press'}], name: 'Adjusted Plan Bravo' };
      const mockAppliedChanges = [{ type: 'substituted', from: 'Squat', to: 'Leg Press' }];
      const mockSkippedChanges = [{ type: 'volume', reason: 'not feasible' }];
      
      mockPlanModifierInstance.apply.mockResolvedValue({
        modifiedPlan: mockModifiedPlan,
        appliedChanges: mockAppliedChanges,
        skippedChanges: mockSkippedChanges
      });

      await agentInstance._adjustment(initialState);

      expect(mockPlanModifierInstance.apply).toHaveBeenCalledWith(
        initialState.originalPlan,
        initialState.initialUnderstanding.parsedFeedback,
        initialState.consideration
      );
      expect(initialState.adjustedPlan).toEqual(mockModifiedPlan);
      expect(initialState.adjustment.appliedChanges).toEqual(mockAppliedChanges);
      expect(initialState.adjustment.skippedChanges).toEqual(mockSkippedChanges);
    });

    test('should throw AgentError if planModifier.apply returns invalid structure', async () => {
        mockPlanModifierInstance.apply.mockResolvedValue({ someOtherStructure: true }); // Invalid structure
        const { ERROR_CODES } = require('../../utils/errors');

        await expect(agentInstance._adjustment(initialState))
            .rejects.toMatchObject({
                name: 'AgentError',
                code: ERROR_CODES.PROCESSING_ERROR,
                message: expect.stringContaining('Invalid structure received from plan modification step'),
                details: expect.objectContaining({ step: 'adjustment' })
            });
    });
  });

  describe('_reflection method', () => {
    let agentInstance;
    let mockAdjustmentValidatorInstance;
    let mockExplanationGeneratorInstance;
    let initialState;

    beforeEach(() => {
      jest.resetModules();

      mockAdjustmentValidatorInstance = {
        validateAdjustedPlan: jest.fn(),
        // other methods not directly called by _reflection but part of the class
        analyzeFeasibility: jest.fn(), checkSafety: jest.fn(), verifyCoherence: jest.fn()
      };
      jest.doMock('../../agents/adjustment-logic/adjustment-validator', () => jest.fn().mockImplementation(() => mockAdjustmentValidatorInstance));

      mockExplanationGeneratorInstance = {
        generate: jest.fn(),
        compare: jest.fn()
      };
      jest.doMock('../../agents/adjustment-logic/explanation-generator', () => jest.fn().mockImplementation(() => mockExplanationGeneratorInstance));

      // Mock other helpers
      jest.doMock('../../agents/adjustment-logic/feedback-parser', () => jest.fn().mockImplementation(() => ({ parse: jest.fn() })));
      jest.doMock('../../agents/adjustment-logic/plan-modifier', () => jest.fn().mockImplementation(() => ({ apply: jest.fn() })));

      const mockOpenAIService = require('../../services/openai-service').getOpenAIClient();
      const mockSupabaseClient = require('../../services/supabase').getSupabaseClient();
      const mockLogger = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() };
      const PlanAdjustmentAgent = require('../../agents/plan-adjustment-agent');
      
      agentInstance = new PlanAdjustmentAgent({
        openaiService: mockOpenAIService,
        supabaseClient: mockSupabaseClient,
        logger: mockLogger,
        memorySystem: null
      });
      jest.spyOn(agentInstance, 'log').mockImplementation(() => {}); 

      initialState = {
        originalPlan: { planId: 'plan1', updated_at: 'ts1' },
        adjustedPlan: { planId: 'plan1_adj', name: 'Adjusted Plan Charlie', updated_at: 'ts2' },
        userProfile: { user_id: 'user1' },
        initialUnderstanding: { parsedFeedback: { /* data */ } },
        adjustment: { appliedChanges: [/* data */] },
        reflection: { validationResults: null, explanations: null, comparison: null },
        warnings: [],
        // Other state properties
        feedback: '', consideration: {}, errors: [], reasoning: []
      };
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('should update state correctly when adjusted plan is valid', async () => {
      const mockValidationResult = { isValid: true, issues: [] };
      const mockExplanations = { summary: 'All good in reflection', details: ['detail_reflect'] };
      const mockComparison = { notes: 'Comparison notes' };

      mockAdjustmentValidatorInstance.validateAdjustedPlan.mockResolvedValue(mockValidationResult);
      mockExplanationGeneratorInstance.generate.mockResolvedValue(mockExplanations);
      mockExplanationGeneratorInstance.compare.mockResolvedValue(mockComparison);

      await agentInstance._reflection(initialState);

      expect(mockAdjustmentValidatorInstance.validateAdjustedPlan).toHaveBeenCalledWith(
        initialState.adjustedPlan,
        initialState.userProfile,
        initialState.originalPlan.updated_at
      );
      expect(mockExplanationGeneratorInstance.generate).toHaveBeenCalledWith(
        initialState.adjustedPlan,
        initialState.originalPlan,
        initialState.initialUnderstanding.parsedFeedback,
        initialState.adjustment.appliedChanges
      );
      expect(mockExplanationGeneratorInstance.compare).toHaveBeenCalledWith(initialState.adjustedPlan, initialState.originalPlan);
      
      expect(initialState.reflection.validationResults).toEqual(mockValidationResult);
      expect(initialState.reflection.explanations).toEqual(mockExplanations);
      expect(initialState.reflection.comparison).toEqual(mockComparison);
      expect(initialState.warnings).toEqual([]); // No new warnings from this step
    });

    test('should update state and add warnings when adjusted plan is invalid (non-critical)', async () => {
      const mockValidationResult = { isValid: false, issues: [{ type: 'test_issue', message: 'Plan has an issue' }] };
      const mockExplanations = { summary: 'Explaining despite issue', details: [] };
      const mockComparison = { notes: 'Comparison with issue' };

      mockAdjustmentValidatorInstance.validateAdjustedPlan.mockResolvedValue(mockValidationResult);
      mockExplanationGeneratorInstance.generate.mockResolvedValue(mockExplanations);
      mockExplanationGeneratorInstance.compare.mockResolvedValue(mockComparison);

      await agentInstance._reflection(initialState);

      expect(initialState.reflection.validationResults).toEqual(mockValidationResult);
      expect(initialState.reflection.explanations).toEqual(mockExplanations);
      expect(initialState.reflection.comparison).toEqual(mockComparison);
      expect(initialState.warnings).toEqual(expect.arrayContaining([
        'Adjusted plan failed final validation. Review issues before use.',
        expect.objectContaining({ type: 'validation_test_issue', message: 'Plan has an issue' })
      ]));
      expect(agentInstance.log).toHaveBeenCalledWith('warn', 'Adjusted plan failed validation. Explanations might be based on an invalid plan.', mockValidationResult.issues);
    });

    test('should throw AgentError (RESOURCE_ERROR) if adjustedPlan is missing', async () => {
      initialState.adjustedPlan = null;
      const { ERROR_CODES } = require('../../utils/errors');

      try {
        await agentInstance._reflection(initialState);
        throw new Error('_reflection did not throw an error when adjustedPlan was null.');
      } catch (error) {
        expect(error.name).toBe('AgentError');
        expect(error.code).toBe(ERROR_CODES.RESOURCE_ERROR);
        expect(error.message).toContain('Adjusted plan is missing, cannot perform reflection.');
        expect(error.details).toEqual(expect.objectContaining({ step: 'reflection' })); 
      }
    });
  });
}); 