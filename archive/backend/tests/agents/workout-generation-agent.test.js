const WorkoutGenerationAgent = require('../../agents/workout-generation-agent');
const BaseAgent = require('../../agents/base-agent');
const OpenAIService = require('../../services/openai-service');
const { SupabaseClient } = require('../../services/supabase'); // Assuming it's a class or specific export
const logger = require('../../config/logger');
const { generateWorkoutPrompt } = require('../../utils/workout-prompts');
const { AgentError, ValidationError, ERROR_CODES } = require('../../utils/errors');

// Mocks
jest.mock('../../agents/base-agent');
jest.mock('../../services/openai-service');
jest.mock('../../services/supabase', () => ({
  SupabaseClient: jest.fn().mockImplementation(() => ({
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: {}, error: null }),
    // Add other Supabase methods as needed by the agent
  })),
}));
jest.mock('../../config/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));
jest.mock('../../utils/workout-prompts', () => ({
  generateWorkoutPrompt: jest.fn().mockReturnValue('mocked_system_prompt'),
}));

describe('WorkoutGenerationAgent', () => {
  let mockOpenAIService;
  let mockSupabaseClient;
  let mockMemorySystem;
  let agent;

  beforeEach(() => {
    // Reset mocks before each test
    BaseAgent.mockClear();
    OpenAIService.mockClear();
    SupabaseClient.mockClear();
    logger.info.mockClear();
    logger.warn.mockClear();
    logger.error.mockClear();
    logger.debug.mockClear();
    generateWorkoutPrompt.mockClear();


    mockOpenAIService = new OpenAIService();
    mockSupabaseClient = new SupabaseClient();
    mockMemorySystem = {
      retrieveMemories: jest.fn().mockResolvedValue([]),
      storeMemory: jest.fn().mockResolvedValue({ id: 'mem_123' }),
    };
    
    // Mock BaseAgent implementation
    // Spy on BaseAgent.prototype.log if BaseAgent itself is not easily mockable for `this.log`
     BaseAgent.prototype.log = jest.fn();
     BaseAgent.prototype.validate = jest.fn((data, condition, message) => {
       if (!condition(data)) {
         throw new ValidationError(message);
       }
     });
     BaseAgent.prototype.retrieveMemories = jest.fn().mockResolvedValue([]);
     BaseAgent.prototype.storeMemory = jest.fn().mockResolvedValue({ id: 'fake_memory_id'});
     BaseAgent.prototype.retryWithBackoff = jest.fn().mockImplementation(async (fn) => fn());


    agent = new WorkoutGenerationAgent({
      openaiService: mockOpenAIService,
      supabaseClient: mockSupabaseClient,
      memorySystem: mockMemorySystem,
      logger: logger, // Use the mocked logger
      config: { maxRefinementAttempts: 1 } // Default for simpler initial tests
    });

    // Manually assign config because BaseAgent constructor is mocked
    agent.config = {
        maxRetries: 2, // Use defaults or test values
        initialDelay: 1000,
        timeoutLimit: 60000,
        maxRefinementAttempts: 1, // Align with passed config
        model: 'gpt-4o',
        temperature: 0.7,
        max_tokens: 4096,
         // Optionally spread the passed config again if needed:
         // ...{ maxRefinementAttempts: 1 } 
    };
  });

  describe('constructor', () => {
    test('should instantiate correctly with valid dependencies', () => {
      expect(agent).toBeInstanceOf(WorkoutGenerationAgent);
      expect(agent.openaiService).toBe(mockOpenAIService);
      expect(agent.supabaseClient).toBe(mockSupabaseClient);
      expect(BaseAgent.prototype.log).toHaveBeenCalledWith('debug', 'WorkoutGenerationAgent constructor called');
    });

    test('should throw Error if openaiService is missing', () => {
      expect(() => new WorkoutGenerationAgent({ supabaseClient: mockSupabaseClient, logger }))
        .toThrow('OpenAIService instance is required.');
    });

    test('should throw Error if supabaseClient is missing', () => {
      expect(() => new WorkoutGenerationAgent({ openaiService: mockOpenAIService, logger }))
        .toThrow('SupabaseClient instance is required.');
    });
  });

  // Test _validateInput directly first as it's a simple helper called by process
  describe('_validateInput', () => {
    const validUserProfile = { fitnessLevel: 'beginner', user_id: 'user123' };
    const validGoals = ['strength'];
    const validResearchData = { exercises: [] };

    test('should not throw for valid input', () => {
      expect(() => agent._validateInput(validUserProfile, validGoals, validResearchData)).not.toThrow();
      expect(BaseAgent.prototype.validate).toHaveBeenCalledTimes(4); // userProfile, fitnessLevel, goals, researchData
    });

    test('should throw AgentError if userProfile is invalid', () => {
      expect(() => agent._validateInput(null, validGoals, validResearchData))
        .toThrow(new AgentError('Invalid userProfile provided.', ERROR_CODES.VALIDATION_ERROR));
    });
    
    test('should throw AgentError if userProfile is missing fitnessLevel', () => {
      expect(() => agent._validateInput({ user_id: 'user123' }, validGoals, validResearchData))
        .toThrow(new AgentError('userProfile must include fitnessLevel.', ERROR_CODES.VALIDATION_ERROR));
    });

    test('should throw AgentError if goals are invalid', () => {
      expect(() => agent._validateInput(validUserProfile, [], validResearchData))
        .toThrow(new AgentError('Invalid or empty goals array provided.', ERROR_CODES.VALIDATION_ERROR));
    });

    test('should throw AgentError if researchData is invalid', () => {
      expect(() => agent._validateInput(validUserProfile, validGoals, null))
        .toThrow(new AgentError('Invalid researchData provided.', ERROR_CODES.VALIDATION_ERROR));
    });
  });
  
  // More tests for process and other helpers will follow...

  describe('process', () => {
    let validContext;
    let mockUserProfile;
    let mockUserProfilesFrom, mockUserProfilesSelect, mockUserProfilesEq, mockUserProfilesSingle;
    let mockContraFrom, mockContraSelect, mockContraIn;

    beforeEach(() => {
        // Define standard valid context
        mockUserProfile = { 
          user_id: 'user123', 
          fitnessLevel: 'intermediate', 
          medical_conditions: null // Start with no conditions for happy path
        };
        validContext = {
          userProfile: mockUserProfile,
          goals: ['strength', 'hypertrophy'],
          researchData: { exercises: [{ name: 'Squat', summary: '...', isReliable: true }], warnings: [] },
        };

        // Reset/Reconfigure mocks for Supabase fetches within process
        // Mock 'user_profiles' fetch mocks
        mockUserProfilesFrom = jest.fn().mockReturnThis();
        mockUserProfilesSelect = jest.fn().mockReturnThis();
        mockUserProfilesEq = jest.fn().mockReturnThis();
        mockUserProfilesSingle = jest.fn().mockResolvedValue({ data: { medical_conditions: null }, error: null });
        
        // Mock 'contraindications' fetch mocks
        mockContraFrom = jest.fn().mockReturnThis();
        mockContraSelect = jest.fn().mockReturnThis();
        mockContraIn = jest.fn().mockResolvedValue({ data: [], error: null }); // Default to no contraindications found
        
        // Chain the mocks - Need to carefully manage which 'from' is called
        mockSupabaseClient.from = jest.fn((tableName) => {
            if (tableName === 'user_profiles') {
                const userProfileChain = {
                    select: mockUserProfilesSelect,
                    eq: mockUserProfilesEq,
                    single: mockUserProfilesSingle
                };
                mockUserProfilesSelect.mockReturnValue(userProfileChain);
                mockUserProfilesEq.mockReturnValue(userProfileChain);
                mockUserProfilesSingle.mockResolvedValue({ data: { medical_conditions: mockUserProfile.medical_conditions }, error: null });
                return userProfileChain;
            } else if (tableName === 'contraindications') {
                const contraChain = {
                    select: mockContraSelect,
                    in: mockContraIn
                };
                mockContraSelect.mockReturnValue(contraChain);
                return contraChain;
            }
            return { 
                select: jest.fn().mockReturnThis(), 
                eq: jest.fn().mockReturnThis(),
                in: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({ data: null, error: null })
            };
        });

        // Mock OpenAI response for plan generation
        mockOpenAIService.createChatCompletion = jest.fn().mockResolvedValue({
            choices: [{ message: { content: JSON.stringify({
                plan: [{ exercise: 'Squat', sets: 3, reps: '8-12' }],
                explanations: 'Generated explanation'
            })}}]
        });

        // Mock internal validation and formatting helpers for happy path
        agent._validateWorkoutPlan = jest.fn().mockResolvedValue(true);
        agent._formatWorkoutPlan = jest.fn().mockReturnValue('Formatted Plan');
        agent._generateExplanations = jest.fn().mockResolvedValue('Generated Explanation');
        agent._formatOutput = jest.fn().mockImplementation(resultData => ({ // Basic implementation
             status: resultData.errors?.length > 0 ? 'error' : 'success',
             planId: 'plan_mock_id',
             planName: `Workout Plan for ${resultData.goals?.join(', ') || 'User'}`,
             exercises: resultData.plan?.plan || [],
             formattedPlan: resultData.formattedPlan || "Formatted Plan",
             explanations: resultData.explanations || "Generated Explanation",
             researchInsights: resultData.researchInsights || [],
             reasoning: resultData.reasoning || [],
             warnings: resultData.warnings || [],
             errors: resultData.errors || [],
        }));
    });

    test('should run happy path successfully', async () => {
        const result = await agent.process(validContext);

        expect(result.status).toBe('success');
        expect(result.exercises.length).toBeGreaterThan(0);
        expect(result.warnings).toEqual([]); 
        expect(result.errors).toEqual([]);

        expect(BaseAgent.prototype.validate).toHaveBeenCalled(); 
        expect(BaseAgent.prototype.retrieveMemories).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user123' }));
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_profiles');
        expect(mockUserProfilesSelect).toHaveBeenCalledWith('medical_conditions');
        expect(mockUserProfilesEq).toHaveBeenCalledWith('user_id', 'user123');
        expect(mockUserProfilesSingle).toHaveBeenCalled();
        expect(mockContraSelect).not.toHaveBeenCalled(); 
        
        expect(generateWorkoutPrompt).toHaveBeenCalled();
        expect(BaseAgent.prototype.retryWithBackoff).toHaveBeenCalled(); 
        expect(mockOpenAIService.createChatCompletion).toHaveBeenCalled();
        expect(agent._validateWorkoutPlan).toHaveBeenCalled();
        expect(agent._formatWorkoutPlan).toHaveBeenCalled();
        expect(agent._generateExplanations).toHaveBeenCalled();
        expect(BaseAgent.prototype.storeMemory).toHaveBeenCalledTimes(2); 
        expect(agent._formatOutput).toHaveBeenCalled();
    });
    
    test('should throw AgentError on Input Validation Failure', async () => {
        const invalidContext = { ...validContext, goals: [] }; 
        
        await expect(agent.process(invalidContext))
            .rejects.toThrow(new AgentError('Invalid or empty goals array provided.', ERROR_CODES.VALIDATION_ERROR));
            
        expect(BaseAgent.prototype.retrieveMemories).not.toHaveBeenCalled();
        expect(mockUserProfilesSelect).not.toHaveBeenCalled(); 
        expect(mockUserProfilesEq).not.toHaveBeenCalled();
        expect(mockUserProfilesSingle).not.toHaveBeenCalled();
        expect(generateWorkoutPrompt).not.toHaveBeenCalled();
    });

    test('should continue with warning if memory retrieval fails (Non-critical)', async () => {
       const memoryError = new Error('Memory DB connection failed');
       agent.retrieveMemories = jest.fn().mockRejectedValueOnce(memoryError); 

       const result = await agent.process(validContext);

       expect(result.status).toBe('success'); 
       expect(result.warnings).toContain('Failed to retrieve memories: Memory DB connection failed');
       expect(BaseAgent.prototype.log).toHaveBeenCalledWith('warn', 'Failed to retrieve memories:', memoryError); 
       
       expect(mockUserProfilesSelect).toHaveBeenCalled(); 
       expect(generateWorkoutPrompt).toHaveBeenCalled();
       expect(mockOpenAIService.createChatCompletion).toHaveBeenCalled();
       expect(BaseAgent.prototype.storeMemory).toHaveBeenCalledTimes(2); 
       agent.retrieveMemories = BaseAgent.prototype.retrieveMemories; 
    });

    test('should throw AgentError if fetching medical conditions fails (Critical)', async () => {
        const dbError = new Error('DB connection error');
        mockUserProfilesSingle.mockResolvedValueOnce({ data: null, error: dbError });

        await expect(agent.process(validContext))
            .rejects.toMatchObject({
                name: 'AgentError',
                code: ERROR_CODES.RESOURCE_ERROR,
                message: 'Unable to retrieve user medical conditions for user user123'
            });
            
        expect(BaseAgent.prototype.retrieveMemories).toHaveBeenCalled(); 
        expect(mockUserProfilesSingle).toHaveBeenCalled(); 
        expect(generateWorkoutPrompt).not.toHaveBeenCalled();
        expect(mockOpenAIService.createChatCompletion).not.toHaveBeenCalled();
    });

    test('should continue with warning if fetching contraindications fails (Non-critical)', async () => {
        const dbError = new Error('Contraindication DB error');
        const conditions = ['asthma'];
        const contextWithConditions = {
            ...validContext,
            userProfile: { ...mockUserProfile, medical_conditions: conditions }
        };

        mockUserProfilesSingle.mockResolvedValueOnce({ data: { medical_conditions: conditions }, error: null });
        mockContraIn.mockResolvedValueOnce({ data: null, error: dbError }); 

        const result = await agent.process(contextWithConditions); 

        expect(result.status).toBe('success'); 
        expect(result.warnings).toContain('Could not fetch specific contraindications from database.');
        expect(BaseAgent.prototype.log).toHaveBeenCalledWith('warn', `Failed to fetch contraindications for conditions [asthma]: ${dbError.message}. Proceeding without specific contraindications.`); 

        expect(mockContraSelect).toHaveBeenCalled(); 
        expect(generateWorkoutPrompt).toHaveBeenCalled();
        expect(mockOpenAIService.createChatCompletion).toHaveBeenCalled();
        expect(BaseAgent.prototype.storeMemory).toHaveBeenCalledTimes(2);
    });
    
    test('should throw AgentError if API call fails after retries', async () => {
        const apiError = new Error('OpenAI API timeout');
        // Let createChatCompletion be the source of the failure
        mockOpenAIService.createChatCompletion.mockRejectedValue(apiError); 

        await expect(agent.process(validContext))
            .rejects.toMatchObject({
                name: 'AgentError',
                code: ERROR_CODES.EXTERNAL_SERVICE_ERROR,
                message: 'OpenAI API call failed after retries',
                originalError: apiError
            });
        
        expect(BaseAgent.prototype.retrieveMemories).toHaveBeenCalled();
        expect(mockUserProfilesSingle).toHaveBeenCalled(); 
        expect(generateWorkoutPrompt).toHaveBeenCalled();
        expect(BaseAgent.prototype.retryWithBackoff).toHaveBeenCalled(); 
        expect(mockOpenAIService.createChatCompletion).toHaveBeenCalled(); 
        expect(agent._validateWorkoutPlan).not.toHaveBeenCalled(); 
    });

    test('should throw AgentError if parsing API response fails', async () => {
        // Mock OpenAI to return invalid JSON
        mockOpenAIService.createChatCompletion.mockResolvedValueOnce({
            choices: [{ message: { content: 'This is not JSON' }}]
        });

        await expect(agent.process(validContext))
            .rejects.toMatchObject({
                name: 'AgentError',
                code: ERROR_CODES.PROCESSING_ERROR,
                message: 'Failed to parse JSON response from OpenAI.'
            });
        
        expect(BaseAgent.prototype.retryWithBackoff).toHaveBeenCalled();
        // _parseWorkoutResponse is called internally, leading to failure.
        expect(agent._validateWorkoutPlan).not.toHaveBeenCalled(); 
    });

    test('should succeed after refinement if validation fails initially (maxRefinementAttempts > 1)', async () => {
        agent.config.maxRefinementAttempts = 2; 

        const validationError = new ValidationError('Initial plan invalid');
        // Spy on the instance method for more robust mocking of sequential calls
        const validateSpy = jest.spyOn(agent, '_validateWorkoutPlan')
            .mockImplementationOnce(() => Promise.reject(validationError)) // More explicit for async rejection
            .mockResolvedValueOnce(true);

        mockOpenAIService.createChatCompletion
            .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ plan: [{ exercise: 'Plan A', sets: 1, reps: 1 }]})}}]})
            .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ plan: [{ exercise: 'Plan B', sets: 2, reps: 2 }]})}}]});
            
        const result = await agent.process(validContext);

        expect(result.status).toBe('success');
        expect(validateSpy).toHaveBeenCalledTimes(2);
        expect(mockOpenAIService.createChatCompletion).toHaveBeenCalledTimes(2); 
        expect(BaseAgent.prototype.log).toHaveBeenCalledWith('info', 'ReAct Iteration: 2');
        expect(result.exercises[0].exercise).toBe('Plan B'); 
        
        validateSpy.mockRestore(); // Clean up spy
    });
    
    test('should throw AgentError if validation fails after final iteration (maxRefinementAttempts = 1)', async () => {
        agent.config.maxRefinementAttempts = 1; // Default, only one attempt

        const validationError = new ValidationError('Plan is definitively invalid');
        agent._validateWorkoutPlan.mockRejectedValueOnce(validationError); // Fails the only time

        await expect(agent.process(validContext))
            .rejects.toMatchObject({
                name: 'AgentError',
                code: ERROR_CODES.VALIDATION_ERROR,
                message: 'Plan validation failed after maximum refinement attempts.',
                originalError: validationError
            });

        expect(agent._validateWorkoutPlan).toHaveBeenCalledTimes(1);
        expect(mockOpenAIService.createChatCompletion).toHaveBeenCalledTimes(1);
    });

    test('should continue with warning if memory storage fails (Non-critical)', async () => {
        const storeMemoryError = new Error('Failed to store memory in DB');
        BaseAgent.prototype.storeMemory
            .mockRejectedValueOnce(storeMemoryError) // First call (plan) fails
            .mockRejectedValueOnce(storeMemoryError); // Second call (metadata) fails or mockResolvedValueOnce for others

        const result = await agent.process(validContext);

        expect(result.status).toBe('success'); // Process still considered successful
        expect(result.warnings).toEqual(expect.arrayContaining([
            'Failed to store agent output memory: Failed to store memory in DB',
            'Failed to store agent metadata memory: Failed to store memory in DB'
        ]));
        expect(BaseAgent.prototype.log).toHaveBeenCalledWith('warn', 'Failed to store agent output memory:', storeMemoryError);
        expect(BaseAgent.prototype.log).toHaveBeenCalledWith('warn', 'Failed to store agent metadata memory:', storeMemoryError);
        expect(BaseAgent.prototype.storeMemory).toHaveBeenCalledTimes(2);
    });

    test('should throw AgentError on outer catch block for unexpected errors', async () => {
        const unexpectedError = new Error('Something broke unexpectedly');
        // Force an error in a later stage, e.g., _formatWorkoutPlan
        agent._formatWorkoutPlan = jest.fn().mockImplementation(() => {
            throw unexpectedError;
        });

        await expect(agent.process(validContext))
            .rejects.toMatchObject({
                name: 'AgentError',
                code: ERROR_CODES.PROCESSING_ERROR,
                message: `Unexpected error during workout generation: ${unexpectedError.message}`,
                originalError: unexpectedError
            });
    });

  });

  describe('_formatOutput', () => {
    test('should return success structure with no errors', () => {
      const resultData = {
        plan: { plan: [{ exercise: 'Squat', sets: 3, reps: '10' }] },
        formattedPlan: 'Formatted Squat Plan',
        explanations: 'Squat explanations',
        reasoning: ['Reason 1'],
        researchInsights: [{ name: 'Squat Research', summary: '...', isReliable: true }],
        warnings: [],
        errors: [],
        goals: ['strength'],
      };
      const mockDateNow = jest.spyOn(Date, 'now').mockReturnValue(1234567890000);
      
      const output = agent._formatOutput(resultData);

      expect(output.status).toBe('success');
      expect(output.planId).toBe('plan_1234567890000');
      expect(output.planName).toBe('Workout Plan for strength');
      expect(output.exercises).toEqual([{ exercise: 'Squat', sets: 3, reps: '10' }]);
      expect(output.formattedPlan).toBe('Formatted Squat Plan');
      expect(output.explanations).toBe('Squat explanations');
      expect(output.researchInsights).toEqual([{ name: 'Squat Research', summary: '...', isReliable: true }]);
      expect(output.reasoning).toEqual(['Reason 1']);
      expect(output.warnings).toEqual([]);
      expect(output.errors).toEqual([]);
      
      mockDateNow.mockRestore();
    });

    test('should return error structure with errors present', () => {
      const resultData = {
        plan: null, 
        formattedPlan: null,
        explanations: null,
        reasoning: ['Failed to generate'],
        researchInsights: [],
        warnings: ['Warning 1'],
        errors: ['Error 1', 'Error 2'],
        goals: ['strength'],
      };
      const mockDateNow = jest.spyOn(Date, 'now').mockReturnValue(1234567890000);

      const output = agent._formatOutput(resultData);

      expect(output.status).toBe('error');
      expect(output.planId).toBe('plan_1234567890000');
      expect(output.planName).toBe('Workout Plan for strength'); 
      expect(output.exercises).toEqual([]); 
      expect(output.formattedPlan).toBe('Plan formatting pending.'); 
      expect(output.explanations).toBe('Explanations pending.'); 
      expect(output.researchInsights).toEqual([]);
      expect(output.reasoning).toEqual(['Failed to generate']);
      expect(output.warnings).toEqual(['Warning 1']);
      expect(output.errors).toEqual(['Error 1', 'Error 2']);
      
      mockDateNow.mockRestore();
    });

    test('should handle missing optional fields gracefully', () => {
        const resultData = {
            plan: { plan: [{ exercise: 'Push-up', sets: 3, reps: '15' }] },
            goals: ['endurance'],
        };
        const mockDateNow = jest.spyOn(Date, 'now').mockReturnValue(1234567890000);
        const output = agent._formatOutput(resultData);

        expect(output.status).toBe('success');
        expect(output.planId).toBe('plan_1234567890000');
        expect(output.planName).toBe('Workout Plan for endurance');
        expect(output.exercises).toEqual([{ exercise: 'Push-up', sets: 3, reps: '15' }]);
        expect(output.formattedPlan).toBe("Plan formatting pending.");
        expect(output.explanations).toBe("Explanations pending.");
        expect(output.researchInsights).toEqual([]);
        expect(output.reasoning).toEqual(["Reasoning generation pending."]);
        expect(output.warnings).toEqual([]);
        expect(output.errors).toEqual([]);
        mockDateNow.mockRestore();
    });
  });

  describe('_buildSystemPrompt', () => {
    const baseUserProfile = { fitnessLevel: 'beginner', age: 30, user_id: 'user123' };
    const baseGoals = ['weight_loss'];
    const baseResearchData = { 
        exercises: [{ name: 'Walk', summary: 'Good for cardio.', isReliable: true }],
        warnings: []
    };

    beforeEach(() => {
        generateWorkoutPrompt.mockClear(); // Clear mock before each test in this describe block
    });

    test('should generate prompt with no memory, conditions, or contraindications', () => {
      const prompt = agent._buildSystemPrompt(baseUserProfile, baseGoals, baseResearchData, [], []);
      expect(generateWorkoutPrompt).toHaveBeenCalledWith(
        baseUserProfile,
        baseGoals,
        baseResearchData,
        ""
      );
      expect(prompt).toBe('mocked_system_prompt');
    });

    test('should include medical conditions and contraindications in prompt', () => {
      const medicalConditions = ['knee pain', 'asthma'];
      const contraindications = [
        { condition: 'knee pain', exercises_to_avoid: ['jumping jacks', 'lunges'] },
        { condition: 'asthma', exercises_to_avoid: ['sprints'] }
      ];
      // The agent code constructs the injury prompt with original casing for condition display
      const expectedInjuryPromptContent = 
        "- Condition: knee pain - Avoid exercises: jumping jacks, lunges\n" +
        "- Condition: asthma - Avoid exercises: sprints\n";

      agent._buildSystemPrompt(baseUserProfile, baseGoals, baseResearchData, medicalConditions, contraindications);
      expect(generateWorkoutPrompt).toHaveBeenCalledWith(
        baseUserProfile,
        baseGoals,
        baseResearchData,
        expect.stringContaining(expectedInjuryPromptContent)
      );
    });
    
    test('should include stringified past workouts and feedback in prompt', () => {
        const pastWorkouts = [
            { 
                content: { plan: [{ exercise: 'Old Squat', sets: 3, reps: 10 }] }, 
                created_at: new Date().toISOString(),
                feedback: [
                    { content: { rating: 'helpful', comment: 'Good old workout' } } 
                ]
            },
            {
                content: JSON.stringify({ plan: [{ exercise: 'Old Run', duration: '30min' }] }), 
                created_at: new Date().toISOString(),
                feedback: [] 
            }
        ];
        const userFeedback = [ { content: { rating: 'helpful', comment: 'Good old workout' } } ];
        
        agent._buildSystemPrompt(baseUserProfile, baseGoals, baseResearchData, [], [], pastWorkouts, userFeedback);
        
        const actualCallArgs = generateWorkoutPrompt.mock.calls[0];
        const combinedHistoryAndInjuryPrompt = actualCallArgs[3];

        expect(combinedHistoryAndInjuryPrompt).toContain("User's Workout History:");
        expect(combinedHistoryAndInjuryPrompt).toContain("Past Workout #1");
        expect(combinedHistoryAndInjuryPrompt).toContain("Old Squat");
        expect(combinedHistoryAndInjuryPrompt).toContain("User Feedback: helpful - Good old workout");
        expect(combinedHistoryAndInjuryPrompt).toContain("Past Workout #2");
        expect(combinedHistoryAndInjuryPrompt).toContain("Old Run");
        expect(combinedHistoryAndInjuryPrompt).toContain("User Feedback Summary: 1 positive, 0 negative ratings.");
    });

    test('should handle medical conditions as strings and other types correctly', () => {
        const medicalConditions = ['KNEE PAIN  ', {customToString: 'should not be called'}, null, undefined];
        // Agent code uses String(condition).toLowerCase().trim() for matching contraindications
        // but uses original condition for display in prompt string.
        const contraindications = [
          { condition: 'knee pain', exercises_to_avoid: ['jumping jacks'] }, // Matched by 'KNEE PAIN  '
          { condition: 'asthma', exercises_to_avoid: ['sprints'] } // Not in medicalConditions
        ];
  
        agent._buildSystemPrompt(baseUserProfile, baseGoals, baseResearchData, medicalConditions, contraindications);
        
        const actualCallArgs = generateWorkoutPrompt.mock.calls[0];
        const combinedHistoryAndInjuryPrompt = actualCallArgs[3];

        expect(combinedHistoryAndInjuryPrompt).toContain("- Condition: KNEE PAIN   - Avoid exercises: jumping jacks");
        expect(combinedHistoryAndInjuryPrompt).toContain("- Condition: [object Object] - Exercise caution and avoid high-impact activities");
        expect(combinedHistoryAndInjuryPrompt).toContain("- Condition: null - Exercise caution and avoid high-impact activities");
        expect(combinedHistoryAndInjuryPrompt).toContain("- Condition: undefined - Exercise caution and avoid high-impact activities");
        expect(combinedHistoryAndInjuryPrompt).not.toContain("asthma"); // Asthma contraindication shouldn't be added
    });
  });

  describe('_generateWorkoutPlan', () => {
    const mockSystemPrompt = 'Test system prompt for OpenAI';

    beforeEach(() => {
        // Clear mocks specific to this describe block if necessary, or rely on global beforeEach
        mockOpenAIService.createChatCompletion.mockClear();
        BaseAgent.prototype.retryWithBackoff.mockClear();
    });

    test('should call openaiService.createChatCompletion via retryWithBackoff and return content', async () => {
      const mockApiResponseContent = JSON.stringify({ plan: ['exercise1'] });
      mockOpenAIService.createChatCompletion.mockResolvedValueOnce({
        choices: [{ message: { content: mockApiResponseContent } }]
      });
      BaseAgent.prototype.retryWithBackoff.mockImplementationOnce(async (fn) => fn());

      const result = await agent._generateWorkoutPlan(mockSystemPrompt);

      expect(BaseAgent.prototype.retryWithBackoff).toHaveBeenCalled();
      expect(mockOpenAIService.createChatCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          model: agent.config.model,
          messages: [{ role: 'system', content: mockSystemPrompt }],
          temperature: agent.config.temperature,
          max_tokens: agent.config.max_tokens,
        }),
        expect.objectContaining({ timeout: agent.config.timeoutLimit })
      );
      expect(result).toBe(mockApiResponseContent);
    });

    test('should propagate error if retryWithBackoff (and thus createChatCompletion) fails', async () => {
      const apiError = new Error('Persistent API failure');
      mockOpenAIService.createChatCompletion.mockRejectedValue(apiError);
      BaseAgent.prototype.retryWithBackoff.mockImplementationOnce(async (fn) => {
        try {
            return await fn();
        } catch (e) {
            throw e; 
        }
      });

      await expect(agent._generateWorkoutPlan(mockSystemPrompt))
        .rejects.toThrow(apiError);
      
      expect(BaseAgent.prototype.retryWithBackoff).toHaveBeenCalled();
      expect(mockOpenAIService.createChatCompletion).toHaveBeenCalled();
    });
  });

  describe('_parseWorkoutResponse', () => {
    beforeEach(() => {
        BaseAgent.prototype.log.mockClear(); // Clear log calls for this specific describe block
    });

    test('should parse valid standard JSON string', () => {
      const jsonString = '{"plan":[{"exercise":"Squat","sets":3,"reps":"10-12"}],"explanations":"Valid plan."}';
      const result = agent._parseWorkoutResponse(jsonString);
      expect(result).toEqual({
        plan: [{ exercise: 'Squat', sets: 3, reps: '10-12' }],
        explanations: 'Valid plan.'
      });
    });

    test('should parse valid JSON string wrapped in markdown ```json ... ```', () => {
      const markdownJsonString = 'Some text before ```json\n{"plan":[{"exercise":"Bench","sets":3,"reps":8}],"reasoning":["Good choice"]}\n``` Some text after';
      const result = agent._parseWorkoutResponse(markdownJsonString);
      expect(result).toEqual({
        plan: [{ exercise: 'Bench', sets: 3, reps: 8 }],
        reasoning: ['Good choice']
      });
    });
    
    test('should parse valid JSON string wrapped in markdown ``` ... ```', () => {
      const markdownJsonString = '```\n{"plan":[{"exercise":"Deadlift","sets":1,"reps":5}]}\n```';
      const result = agent._parseWorkoutResponse(markdownJsonString);
      expect(result).toEqual({
        plan: [{ exercise: 'Deadlift', sets: 1, reps: 5 }]
      });
    });

    test('should return null for empty or null input string', () => {
      expect(agent._parseWorkoutResponse('')).toBeNull();
      expect(agent._parseWorkoutResponse(null)).toBeNull();
      expect(agent._parseWorkoutResponse(undefined)).toBeNull();
    });

    test('should return null for invalid JSON string', () => {
      const invalidJsonString = 'This is not JSON, {plan: "bad"}';
      expect(agent._parseWorkoutResponse(invalidJsonString)).toBeNull();
      expect(BaseAgent.prototype.log).toHaveBeenCalledWith('warn', expect.stringContaining('Failed to parse API response:'));
    });

    test('should return null if parsed result is not an object', () => {
      const arrayJsonString = '[1, 2, 3]'; 
      expect(agent._parseWorkoutResponse(arrayJsonString)).toBeNull();
      // For an array input, it passes the typeof parsedData !== 'object' check (arrays are objects)
      // and then fails on !parsedData.plan, logging the "missing \"plan\" array field" warning.
      expect(BaseAgent.prototype.log).toHaveBeenCalledWith('warn', 'Parsed result missing "plan" array field');
    });

    test('should return null if parsed object is missing "plan" array field', () => {
      const missingPlanJsonString = '{"name":"My Workout","exercises":"None yet"}';
      expect(agent._parseWorkoutResponse(missingPlanJsonString)).toBeNull();
      expect(BaseAgent.prototype.log).toHaveBeenCalledWith('warn', 'Parsed result missing "plan" array field');
    });
    
    test('should return null if parsed object has "plan" but it is not an array', () => {
      const nonArrayPlanJsonString = '{"plan":"This should be an array"}';
      expect(agent._parseWorkoutResponse(nonArrayPlanJsonString)).toBeNull();
      expect(BaseAgent.prototype.log).toHaveBeenCalledWith('warn', 'Parsed result missing "plan" array field');
    });
  });

  describe('_validateWorkoutPlan', () => {
    const validUserProfile = { fitnessLevel: 'intermediate' };
    const beginnerProfile = { fitnessLevel: 'beginner' };
    let validPlan;

    beforeEach(() => {
      BaseAgent.prototype.log.mockClear();
      validPlan = {
        plan: [
          { exercise: 'Squat', sets: 3, reps: '10' },
          { exercise: 'Bench Press', sets: 3, reps: 8 },
        ]
      };
    });

    test('should return true for a valid plan structure and exercises', async () => {
      await expect(agent._validateWorkoutPlan(validPlan, validUserProfile)).resolves.toBe(true);
      expect(BaseAgent.prototype.log).toHaveBeenCalledWith('info', 'Workout plan validation successful');
    });

    test('should throw ValidationError if plan is null or not an array', async () => {
      await expect(agent._validateWorkoutPlan({ plan: null }, validUserProfile))
        .rejects.toThrow(new ValidationError('Workout plan is missing required structure.'));
      await expect(agent._validateWorkoutPlan({ plan: 'not an array' }, validUserProfile))
        .rejects.toThrow(new ValidationError('Workout plan is missing required structure.'));
       await expect(agent._validateWorkoutPlan(null, validUserProfile))
        .rejects.toThrow(new ValidationError('Workout plan is missing required structure.'));
    });

    test('should throw ValidationError if plan array is empty', async () => {
      await expect(agent._validateWorkoutPlan({ plan: [] }, validUserProfile))
        .rejects.toThrow(new ValidationError('Workout plan has empty exercise list.'));
    });

    test('should throw ValidationError if an exercise is missing a name', async () => {
      const invalidPlan = { plan: [{ sets: 3, reps: 10 }] };
      await expect(agent._validateWorkoutPlan(invalidPlan, validUserProfile))
        .rejects.toThrow(new ValidationError('Exercise at index 0 is missing a name.'));
    });

    test('should throw ValidationError if an exercise has invalid sets', async () => {
      let invalidPlan = { plan: [{ exercise: 'Squat', reps: 10 }] }; 
      await expect(agent._validateWorkoutPlan(invalidPlan, validUserProfile))
        .rejects.toThrow(new ValidationError('Exercise "Squat" is missing valid sets.'));
      
      invalidPlan = { plan: [{ exercise: 'Squat', sets: 'three', reps: 10 }] }; 
      await expect(agent._validateWorkoutPlan(invalidPlan, validUserProfile))
        .rejects.toThrow(new ValidationError('Exercise "Squat" is missing valid sets.'));
    });

    test('should throw ValidationError if an exercise has invalid reps', async () => {
      let invalidPlan = { plan: [{ exercise: 'Squat', sets: 3 }] }; 
      await expect(agent._validateWorkoutPlan(invalidPlan, validUserProfile))
        .rejects.toThrow(new ValidationError('Exercise "Squat" is missing valid reps.'));

      invalidPlan = { plan: [{ exercise: 'Squat', sets: 3, reps: null }] }; 
       await expect(agent._validateWorkoutPlan(invalidPlan, validUserProfile))
        .rejects.toThrow(new ValidationError('Exercise "Squat" is missing valid reps.'));
    });
    
    test('should throw ValidationError if beginner plan has too many exercises (>12)', async () => {
      const longPlan = {
        plan: Array(13).fill(null).map((_, i) => ({ exercise: `Ex ${i}`, sets: 3, reps: 10 }))
      };
      await expect(agent._validateWorkoutPlan(longPlan, beginnerProfile))
        .rejects.toThrow(new ValidationError('Workout plan has too many exercises for a beginner.'));
    });

    test('should allow up to 12 exercises for beginner plan', async () => {
      const okPlan = {
        plan: Array(12).fill(null).map((_, i) => ({ exercise: `Ex ${i}`, sets: 3, reps: 10 }))
      };
      await expect(agent._validateWorkoutPlan(okPlan, beginnerProfile)).resolves.toBe(true);
    });
  });

  describe('_generateExplanations', () => {
    test('should return existing explanations if present in workoutPlan', async () => {
      const workoutPlanWithExplanations = {
        plan: [/* ... */],
        explanations: 'These are pre-existing explanations.'
      };
      const explanations = await agent._generateExplanations(workoutPlanWithExplanations);
      expect(explanations).toBe('These are pre-existing explanations.');
    });

    test('should return placeholder string if explanations are missing', async () => {
      const workoutPlanWithoutExplanations = {
        plan: [/* ... */]
      };
      const explanations = await agent._generateExplanations(workoutPlanWithoutExplanations);
      expect(explanations).toBe('Explanations will be provided in a future update.');
    });

    test('should return placeholder string if workoutPlan.explanations is null or undefined', async () => {
        let workoutPlan = { plan: [/* ... */], explanations: null };
        let explanations = await agent._generateExplanations(workoutPlan);
        expect(explanations).toBe('Explanations will be provided in a future update.');

        workoutPlan = { plan: [/* ... */], explanations: undefined };
        explanations = await agent._generateExplanations(workoutPlan);
        expect(explanations).toBe('Explanations will be provided in a future update.');
    });
  });
}); 