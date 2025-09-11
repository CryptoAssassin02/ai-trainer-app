const ResearchAgent = require('../../agents/research-agent');
const BaseAgent = require('../../agents/base-agent');
const { AgentError, ERROR_CODES } = require('../../utils/errors');
const PerplexityService = require('../../services/perplexity-service');
const logger = require('../../config/logger'); // Import the actual logger

// --- Move Utility Mock to Top Level ---
jest.mock('../../utils/research-utils', () => ({
  safeParseResponse: jest.fn(content => {
    try { return JSON.parse(content); } catch (e) { return null; }
  }),
  validateAgainstSchema: jest.fn().mockReturnValue({ isValid: true, errors: [] }), // Default mock
  generateContraindicationWarning: jest.fn().mockReturnValue(null),
  // Mock other utils if needed
  extractExerciseData: jest.fn(data => data), // Add mocks for others used implicitly?
  extractTechniqueData: jest.fn(data => data),
  extractProgressionData: jest.fn(data => data),
}));
// --- End Move Utility Mock ---

// Mock dependencies
// --- Refactored BaseAgent Mock ---
jest.mock('../../agents/base-agent', () => {
  // Return a mock class constructor
  return jest.fn().mockImplementation(function({ logger: baseLogger }) {
    // Simulate BaseAgent storing the logger instance ON THE INSTANCE ('this')
    this.logger = baseLogger || require('../../config/logger');
    this.retrieveMemories = jest.fn().mockResolvedValue([]);
    this.storeMemory = jest.fn().mockResolvedValue({ id: 'mem-mock-id' });
    this.validate = jest.fn();
    this.log = jest.fn();
    // Assign other necessary mocked methods to 'this'
  });
});
// --- End Refactored BaseAgent Mock ---

const mockPerplexitySearch = jest.fn();
jest.mock('../../services/perplexity-service', () => {
  // This factory function will be called instead of the real module
  return jest.fn().mockImplementation(() => {
    // This is the constructor mock
    return {
      // Mock methods of the service instance here
      search: mockPerplexitySearch,
    };
  });
});
jest.mock('../../config/logger'); // Mock the logger

describe('ResearchAgent', () => {
  let mockPerplexityServiceInstance; // Variable to hold the mocked instance
  const { validateAgainstSchema, safeParseResponse } = require('../../utils/research-utils'); // Import mocked utils

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    mockPerplexitySearch.mockClear(); // Clear specific method mock
    // Reset utility mocks
    safeParseResponse.mockClear().mockImplementation(content => {
      try { return JSON.parse(content); } catch (e) { return null; }
    });
    validateAgainstSchema.mockClear().mockReturnValue({ isValid: true, errors: [] });

    // Create mock instance using the mocked constructor
    mockPerplexityServiceInstance = new PerplexityService();

    // BaseAgent.mockClear(); // Clear BaseAgent constructor mock calls - No longer needed with factory mock
  });

  // --- Constructor Tests ---
  describe('Constructor', () => {
    test('should instantiate correctly with valid dependencies', () => {
      const agent = new ResearchAgent({ perplexityService: mockPerplexityServiceInstance, logger });

      expect(agent).toBeDefined();
      expect(agent.constructor.name).toBe('ResearchAgent');
      expect(agent.perplexityService).toBe(mockPerplexityServiceInstance);
      expect(BaseAgent).toHaveBeenCalledWith({ logger });
      expect(agent.logger).toBe(logger);
      expect(agent.config).toBeDefined();
      expect(agent.config.maxRetries).toBe(3);
      expect(logger.info).toHaveBeenCalledWith('ResearchAgent constructed successfully.');
      expect(logger.debug).toHaveBeenCalledWith('Constructing ResearchAgent...');
    });

    test('should use default config values if none provided', () => {
      const agent = new ResearchAgent({ perplexityService: mockPerplexityServiceInstance }); // No config or logger

      expect(agent.config.maxRetries).toBe(3);
      expect(agent.config.initialDelay).toBe(1000);
      expect(agent.config.backoffFactor).toBe(1.5);
      expect(BaseAgent).toHaveBeenCalledWith({ logger: require('../../config/logger') });
      expect(agent.logger).toBeDefined();
    });

    test('should override default config values', () => {
      const customConfig = { maxRetries: 5, initialDelay: 500, backoffFactor: 2.0 };
      const agent = new ResearchAgent({
        perplexityService: mockPerplexityServiceInstance,
        config: customConfig,
        logger
      });

      expect(agent.config.maxRetries).toBe(5);
      expect(agent.config.initialDelay).toBe(500);
      expect(agent.config.backoffFactor).toBe(2.0);
      expect(BaseAgent).toHaveBeenCalledWith({ logger });
      expect(agent.logger).toBe(logger);
    });

    test('should throw AgentError if PerplexityService is missing', () => {
      expect(() => {
        new ResearchAgent({ logger });
      }).toThrow(AgentError);

      try {
        new ResearchAgent({ logger });
      } catch (e) {
        expect(e.message).toBe('PerplexityService instance is required.');
        expect(e.code).toBe(ERROR_CODES.CONFIGURATION_ERROR);
        expect(logger.error).toHaveBeenCalledWith('ResearchAgent constructor missing PerplexityService instance.');
      }
    });
  });

  // --- Add other test blocks below ---

  // --- Process Method Tests ---
  describe('process method', () => {
    let baseContext;
    let mockUserProfile;

    beforeEach(() => {
      // Define a base context for tests
      mockUserProfile = {
        fitnessLevel: 'intermediate',
        age: 30,
        gender: 'male',
        goals: ['strength'],
        injuries: [{ type: 'knee', severity: 'mild' }],
      };
      baseContext = {
        query: 'Find strength exercises',
        userId: 'user-123',
        userProfile: mockUserProfile,
        exerciseType: 'strength',
        goals: ['strength'],
        useCache: false,
      };

      // Default mock implementations for successful path
      const mockApiResponse = [
        {
          name: 'Bench Press',
          description: 'Chest exercise',
          difficulty: 'intermediate',
          equipment: ['barbell', 'bench'],
          muscleGroups: ['chest', 'triceps'],
          citations: ['https://trusted.com/bench-press'] // Added citation
        }
      ];
      mockPerplexitySearch.mockResolvedValue({ content: JSON.stringify(mockApiResponse) });

      // Mock BaseAgent methods on the prototype (since BaseAgent itself is mocked)
      // Note: BaseAgent mock factory already provides these, but we can configure them
      BaseAgent.prototype.retrieveMemories = jest.fn().mockResolvedValue([]);
      BaseAgent.prototype.storeMemory = jest.fn().mockResolvedValue({ id: 'mem-stored-id' });

      // Mock utils used within process (if not mocking internal methods)
      // -- REMOVED from here, moved to top level --
      // jest.mock('../../utils/research-utils', () => ({ ... }));

      // Re-initialize agent to pick up prototype mocks if necessary
      // (Not strictly needed here as BaseAgent instance methods are mocked in factory)
      // researchAgent = new ResearchAgent({ perplexityService: mockPerplexityServiceInstance, logger });
    });

    test('Happy Path (No Cache, With UserID & Memory Store)', async () => {
      // Ensure BaseAgent methods are available on the agent instance
      // These are set by the mock constructor factory
      const agent = new ResearchAgent({ perplexityService: mockPerplexityServiceInstance, logger });

      const result = await agent.process(baseContext);

      // Assertions
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.data.exercises).toBeInstanceOf(Array);
      expect(result.data.exercises.length).toBeGreaterThan(0);
      expect(result.data.exercises[0].name).toBe('Bench Press');
      expect(result.data.exercises[0].citations).toEqual(['https://trusted.com/bench-press']);
      expect(result.data.exercises[0].isReliable).toBe(true); // Should be reliable now
      expect(result.warnings).toEqual([]); // No warnings expected

      // Verify mocks
      expect(agent.retrieveMemories).toHaveBeenCalledTimes(1);
      expect(agent.retrieveMemories).toHaveBeenCalledWith({
        userId: 'user-123',
        memoryType: 'research',
        tags: ['exercises'],
        limit: 5,
      });
      expect(mockPerplexitySearch).toHaveBeenCalledTimes(1);
      // Check some aspect of the prompt generation implicitly via the API call
      // expect(mockPerplexitySearch).toHaveBeenCalledWith(expect.stringContaining('User Profile:'));

      // Verify storeMemory was called twice (once for result, once potentially for raw? No, just result)
      expect(agent.storeMemory).toHaveBeenCalledTimes(1);
      expect(agent.storeMemory).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user-123',
        memoryType: 'research',
        contentType: 'json',
        tags: ['exercises', 'strength'],
        content: expect.objectContaining({ exercises: expect.any(Array) }),
        metadata: expect.objectContaining({ goal: 'strength' })
      }));

      // Verify logger calls (optional, can be verbose)
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Processing research query'));
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Stored research results'));
    });

    test('Happy Path (No Cache, No UserID)', async () => {
      const agent = new ResearchAgent({ perplexityService: mockPerplexityServiceInstance, logger });
      const noUserContext = { ...baseContext, userId: null };

      const result = await agent.process(noUserContext);

      expect(result.success).toBe(true);
      expect(result.data.exercises.length).toBeGreaterThan(0);

      // Verify memory functions NOT called
      expect(agent.retrieveMemories).not.toHaveBeenCalled();
      expect(agent.storeMemory).not.toHaveBeenCalled();

      // Verify search was called
      expect(mockPerplexitySearch).toHaveBeenCalledTimes(1);
    });

    test('Cache Hit: Should return cached results and not call Perplexity API', async () => {
      const agent = new ResearchAgent({ perplexityService: mockPerplexityServiceInstance, logger });
      const cachedMemory = {
        id: 'mem-cached',
        content: {
          exercises: [{ name: 'Cached Squat', isReliable: true, difficulty: 'beginner' }],
          techniques: [{ name: 'Tempo', description: 'Slow eccentric'}],
          progressions: [{ name: 'Add Weight', description: 'Increase load'}],
        },
      };
      agent.retrieveMemories.mockResolvedValueOnce([cachedMemory]);

      const cacheContext = { ...baseContext, useCache: true };
      const result = await agent.process(cacheContext);

      // --- Adjusted Assertions for Cache Hit --- 
      // expect(result.success).toBe(true); // Agent returns content directly
      expect(result.exercises).toBeInstanceOf(Array);
      expect(result.exercises[0].name).toBe('Cached Squat');
      expect(result.techniques).toBeInstanceOf(Array);
      expect(result.techniques[0].name).toBe('Tempo');
      expect(result.progressions).toBeInstanceOf(Array);
      expect(result.progressions[0].name).toBe('Add Weight');
      expect(result.success).toBeUndefined(); // Verify it doesn't have the wrapper properties
      expect(result.data).toBeUndefined();
      // --- End Adjusted Assertions ---

      // Verify API was NOT called
      expect(mockPerplexitySearch).not.toHaveBeenCalled();
      // Verify storeMemory was NOT called (using cache)
      expect(agent.storeMemory).not.toHaveBeenCalled();
      // Verify retrieveMemories WAS called
      expect(agent.retrieveMemories).toHaveBeenCalledTimes(1);
    });

    test('Cache Miss (No UserID): Should ignore cache and call Perplexity API', async () => {
      const agent = new ResearchAgent({ perplexityService: mockPerplexityServiceInstance, logger });
      const noUserCacheContext = { ...baseContext, userId: null, useCache: true };

      // retrieveMemories should not be called
      agent.retrieveMemories.mockResolvedValueOnce([{ content: { exercises: [{ name: 'Should Not Be Used' }] } }]);

      const result = await agent.process(noUserCacheContext);

      expect(result.success).toBe(true);
      expect(result.data.exercises[0].name).toBe('Bench Press'); // From API mock
      expect(agent.retrieveMemories).not.toHaveBeenCalled();
      expect(mockPerplexitySearch).toHaveBeenCalledTimes(1);
      expect(agent.storeMemory).not.toHaveBeenCalled(); // No user ID
    });

    test('Cache Miss (No Memories): Should call Perplexity API', async () => {
      const agent = new ResearchAgent({ perplexityService: mockPerplexityServiceInstance, logger });
      // retrieveMemories returns empty array (default mock behavior)
      // agent.retrieveMemories.mockResolvedValueOnce([]);

      const cacheContext = { ...baseContext, useCache: true };
      const result = await agent.process(cacheContext);

      expect(result.success).toBe(true);
      expect(result.data.exercises[0].name).toBe('Bench Press'); // From API mock
      expect(agent.retrieveMemories).toHaveBeenCalledTimes(1);
      expect(mockPerplexitySearch).toHaveBeenCalledTimes(1);
      expect(agent.storeMemory).toHaveBeenCalledTimes(1); // Store the new result
    });

    test('Memory Retrieval Failure (Non-critical): Should continue and call API', async () => {
      const agent = new ResearchAgent({ perplexityService: mockPerplexityServiceInstance, logger });
      const retrievalError = new Error('DB connection failed');
      agent.retrieveMemories.mockRejectedValueOnce(retrievalError);

      const result = await agent.process(baseContext);

      expect(result.success).toBe(true);
      expect(result.data.exercises[0].name).toBe('Bench Press'); // From API mock
      expect(result.warnings).toContain('Memory retrieval encountered issues: DB connection failed');
      expect(agent.retrieveMemories).toHaveBeenCalledTimes(1);
      expect(mockPerplexitySearch).toHaveBeenCalledTimes(1);
      expect(agent.storeMemory).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith('Failed to retrieve memories: DB connection failed', { error: retrievalError });
    });

    // --- Error Handling Tests for process method ---
    test('Perplexity API Failure: Should return error and not store memory', async () => {
      const agent = new ResearchAgent({ perplexityService: mockPerplexityServiceInstance, logger });
      const apiError = new Error('Perplexity API is down');
      mockPerplexitySearch.mockRejectedValueOnce(apiError);

      const result = await agent.process(baseContext);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe(ERROR_CODES.EXTERNAL_SERVICE_ERROR);
      expect(result.error.message).toContain('Query execution failed permanently');
      expect(result.error.originalError).toBe(apiError);

      expect(agent.storeMemory).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith('DEBUG: Caught error during perplexityService.search call: Perplexity API is down');
      expect(logger.error).toHaveBeenCalledWith('Query execution failed permanently: Perplexity API is down', { error: apiError });
    });

    test('Parsing Failure (Malformed JSON from Perplexity): Should return error', async () => {
      const agent = new ResearchAgent({ perplexityService: mockPerplexityServiceInstance, logger });
      mockPerplexitySearch.mockResolvedValueOnce({ content: 'This is not JSON' }); // Malformed content
      // safeParseResponse mock (top-level) will return null for this content

      const result = await agent.process(baseContext);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      // The error comes from parseExercises, which throws an AgentError
      // The process method catches this and re-wraps or returns it.
      // Based on current agent code, parseExercises itself throws if safeParseResponse is null
      expect(result.error.code).toBe(ERROR_CODES.PROCESSING_ERROR); 
      expect(result.error.message).toContain('Failed to parse JSON response content');
      expect(logger.warn).toHaveBeenCalledWith('Processing/Validation failed critically for exercise data: Failed to parse JSON from content string.');
      expect(agent.storeMemory).not.toHaveBeenCalled();
    });

    test('Parsing Failure (Schema Validation): Should return error', async () => {
      const agent = new ResearchAgent({ perplexityService: mockPerplexityServiceInstance, logger });
      mockPerplexitySearch.mockResolvedValueOnce({ content: JSON.stringify([{ name: 'Exercise without difficulty' }]) });
      // Override top-level mock for this specific test
      const { validateAgainstSchema } = require('../../utils/research-utils');
      validateAgainstSchema.mockReturnValueOnce({ isValid: false, errors: [{ message: 'Difficulty is required' }] });

      const result = await agent.process(baseContext);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(result.error.message).toContain('Schema validation failed: Difficulty is required');
      expect(logger.warn).toHaveBeenCalledWith('Processing/Validation failed critically for exercise data: Schema validation failed: Difficulty is required');
      expect(agent.storeMemory).not.toHaveBeenCalled();
    });

    test('Parsing Empty Result: Should return error if parseExercises results in no exercises', async () => {
      const agent = new ResearchAgent({ perplexityService: mockPerplexityServiceInstance, logger });
      // Perplexity returns a valid JSON string, but it represents an empty array of exercises
      mockPerplexitySearch.mockResolvedValueOnce({ content: JSON.stringify([]) });

      const result = await agent.process(baseContext);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(result.error.message).toContain('No valid exercises found after parsing');
      expect(logger.warn).toHaveBeenCalledWith('Processing/Validation failed critically for exercise data: No valid exercises found');
      expect(agent.storeMemory).not.toHaveBeenCalled();
    });

    test('Memory Storage Failure (Non-critical): Should continue and return success with warning', async () => {
      const agent = new ResearchAgent({ perplexityService: mockPerplexityServiceInstance, logger });
      const storageError = new Error('Failed to write to memory DB');
      agent.storeMemory.mockRejectedValueOnce(storageError);
      // retrieveMemories is successful (default mock)
      mockPerplexitySearch.mockResolvedValueOnce({ content: JSON.stringify([{ name: 'Test Exercise' }]) });

      const result = await agent.process(baseContext);

      expect(result.success).toBe(true);
      expect(result.data.exercises[0].name).toBe('Test Exercise');
      expect(result.warnings).toContain('Memory storage failed: Failed to write to memory DB');
      expect(agent.storeMemory).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith('Failed to store research in memory: Failed to write to memory DB', { error: storageError });
    });

    // --- Data Transformation & Validation Tests within process method ---
    test('cleanExerciseData should apply defaults', async () => {
      const agent = new ResearchAgent({ perplexityService: mockPerplexityServiceInstance, logger });
      // API returns data missing some fields
      const rawData = [{ name: 'Push Up' /* other fields missing */ }];
      mockPerplexitySearch.mockResolvedValueOnce({ content: JSON.stringify(rawData) });

      // Mock validateAgainstSchema to accept this structure initially
      const { validateAgainstSchema } = require('../../utils/research-utils');
      validateAgainstSchema.mockReturnValueOnce({ isValid: true }); // Assume initial parse is ok

      const result = await agent.process(baseContext);

      expect(result.success).toBe(true);
      expect(result.data.exercises).toBeInstanceOf(Array);
      const cleanedExercise = result.data.exercises[0];
      expect(cleanedExercise.name).toBe('Push Up');
      expect(cleanedExercise.description).toBe(''); // Default applied
      expect(cleanedExercise.difficulty).toBe('intermediate'); // Default applied
      expect(cleanedExercise.equipment).toEqual(['bodyweight']); // Default applied
      expect(cleanedExercise.muscleGroups).toEqual([]); // Default applied
      expect(cleanedExercise.citations).toEqual([]); // Default applied
      expect(cleanedExercise.isReliable).toBe(false); // No citations -> unreliable
      expect(cleanedExercise.warning).toBe('No citations provided');
    });

    test('filterExercisesForInjuries should filter based on user profile', async () => {
      const agent = new ResearchAgent({ perplexityService: mockPerplexityServiceInstance, logger });
      const exercisesFromApi = [
        { name: 'Squat', description: 'Good for legs', difficulty: 'intermediate', citations: ['trusted.com'] },
        { name: 'Box Jump', description: 'High-impact jump', difficulty: 'advanced', citations: ['trusted.com'] }
      ];
      mockPerplexitySearch.mockResolvedValueOnce({ content: JSON.stringify(exercisesFromApi) });

      // Context with a knee injury
      const injuryContext = {
        ...baseContext,
        userProfile: {
          ...mockUserProfile,
          injuries: [{ type: 'knee', severity: 'high' }],
        }
      };

      const result = await agent.process(injuryContext);

      expect(result.success).toBe(true);
      const squat = result.data.exercises.find(e => e.name === 'Squat');
      const boxJump = result.data.exercises.find(e => e.name === 'Box Jump');

      expect(squat).toBeDefined();
      expect(squat.isReliable).toBe(true); // Squat is fine
      expect(squat.warning).toBeNull();

      expect(boxJump).toBeDefined();
      expect(boxJump.isReliable).toBe(false); // Box Jump contraindicated
      expect(boxJump.warning).toContain('contraindicated for knee injury: high-impact');
    });

    test('filterExercisesForInjuries should not filter if no injuries', async () => {
      const agent = new ResearchAgent({ perplexityService: mockPerplexityServiceInstance, logger });
      const exercisesFromApi = [
        { name: 'Squat', description: 'Good for legs', difficulty: 'intermediate', citations: ['trusted.com'] },
        { name: 'Box Jump', description: 'High-impact jump', difficulty: 'advanced', citations: ['trusted.com'] }
      ];
      mockPerplexitySearch.mockResolvedValueOnce({ content: JSON.stringify(exercisesFromApi) });

      // Context with NO injuries
      const noInjuryContext = {
        ...baseContext,
        userProfile: {
          ...mockUserProfile,
          injuries: [], // Empty array
        }
      };

      const result = await agent.process(noInjuryContext);

      expect(result.success).toBe(true);
      expect(result.data.exercises.length).toBe(2);
      const squat = result.data.exercises.find(e => e.name === 'Squat');
      const boxJump = result.data.exercises.find(e => e.name === 'Box Jump');

      expect(squat.isReliable).toBe(true);
      expect(squat.warning).toBeNull();
      expect(boxJump.isReliable).toBe(true);
      expect(boxJump.warning).toBeNull();
    });

    test('checkSourceReliability should flag exercises with no or untrusted citations', async () => {
      const agent = new ResearchAgent({ perplexityService: mockPerplexityServiceInstance, logger });
      const exercisesFromApi = [
        { name: 'Good Exercise', description: 'Valid source', difficulty: 'intermediate', citations: ['study.edu'] },
        { name: 'No Citation Exercise', description: 'Who knows?', difficulty: 'beginner', citations: [] },
        { name: 'Bad Citation Exercise', description: 'From blog', difficulty: 'advanced', citations: ['randomblog.xyz'] }
      ];
      mockPerplexitySearch.mockResolvedValueOnce({ content: JSON.stringify(exercisesFromApi) });

      const result = await agent.process(baseContext);

      expect(result.success).toBe(true);
      const goodEx = result.data.exercises.find(e => e.name === 'Good Exercise');
      const noCitEx = result.data.exercises.find(e => e.name === 'No Citation Exercise');
      const badCitEx = result.data.exercises.find(e => e.name === 'Bad Citation Exercise');

      expect(goodEx.isReliable).toBe(true);
      expect(goodEx.warning).toBeNull();

      expect(noCitEx.isReliable).toBe(false);
      expect(noCitEx.warning).toBe('No citations provided');

      expect(badCitEx.isReliable).toBe(false);
      expect(badCitEx.warning).toContain('Citations lack sufficient trust');
      expect(result.warnings).toContain('Exercise "No Citation Exercise" flagged as potentially unreliable due to missing citations.');
      expect(result.warnings).toContain('Exercise "Bad Citation Exercise" flagged as potentially unreliable due to citation score.');
    });

  });

  // --- Utility method tests ---
  describe('generateSearchPrompt', () => {
    let agent;
    beforeEach(() => {
      agent = new ResearchAgent({ perplexityService: mockPerplexityServiceInstance, logger });
    });

    test('should include user profile details when available', () => {
      const state = {
        userProfile: {
          fitnessLevel: 'beginner',
          age: 30,
          gender: 'female',
          goals: ['weight_loss', 'endurance'],
          injuries: [{ type: 'shoulder' }],
        },
        query: 'Find cardio exercises',
        exerciseType: 'cardio',
      };
      const prompt = agent.generateSearchPrompt(state);
      expect(prompt).toContain('User Profile:');
      expect(prompt).toContain('- Fitness Level: beginner');
      expect(prompt).toContain('- Age: 30');
      expect(prompt).toContain('- Gender: female');
      expect(prompt).toContain('- Goals: weight_loss, endurance');
      expect(prompt).toContain('- Injuries: shoulder');
      expect(prompt).toContain('Search Request: Find cardio exercises');
      expect(prompt).toContain('Format your response as a JSON array');
    });

    test('should handle missing user profile details gracefully', () => {
      const state = {
        userProfile: { goals: ['general'] }, // Only goals provided
        query: 'Find bodyweight exercises',
        exerciseType: 'bodyweight',
      };
      const prompt = agent.generateSearchPrompt(state);
      expect(prompt).toContain('User Profile:');
      expect(prompt).toContain('- Goals: general');
      expect(prompt).not.toContain('- Fitness Level:');
      expect(prompt).not.toContain('- Injuries:');
      expect(prompt).toContain('Search Request: Find bodyweight exercises');
    });

    test('should use default query if none provided', () => {
      const state = {
        userProfile: { fitnessLevel: 'advanced' },
        query: null, // No query
        exerciseType: 'plyometrics',
      };
      const prompt = agent.generateSearchPrompt(state);
      expect(prompt).toContain('Search Request: Find safe and effective plyometrics exercises');
    });
  });

  describe('retryWithBackoff', () => {
    let agent;
    beforeEach(() => {
      agent = new ResearchAgent({ perplexityService: mockPerplexityServiceInstance, logger });
      jest.useFakeTimers(); // Use fake timers for setTimeout
    });

    afterEach(() => {
      jest.useRealTimers(); // Restore real timers
    });

    test('should return result on first successful try', async () => {
      const mockFn = jest.fn().mockResolvedValue('Success');
      const result = await agent.retryWithBackoff(mockFn, 3, 100);
      expect(result).toBe('Success');
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(logger.warn).not.toHaveBeenCalled();
    });

    test('should retry and return result after failures', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('Success');

      const promise = agent.retryWithBackoff(mockFn, 3, 100);

      // Advance timers for delays
      await jest.advanceTimersByTimeAsync(100); // First delay
      await jest.advanceTimersByTimeAsync(200); // Second delay (100 * 2)

      const result = await promise;

      expect(result).toBe('Success');
      expect(mockFn).toHaveBeenCalledTimes(3);
      expect(logger.warn).toHaveBeenCalledTimes(2);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Retry 1/3: Fail 1. Waiting 100ms...'));
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Retry 2/3: Fail 2. Waiting 200ms...'));
    });

    test('should throw error after max retries', async () => {
      const errorFail3 = new Error('Fail 3');
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockRejectedValueOnce(errorFail3);

      // const promise = agent.retryWithBackoff(mockFn, 2, 50);
      // await jest.advanceTimersByTimeAsync(50);
      // await jest.advanceTimersByTimeAsync(100);
      // await expect(promise).rejects.toThrow('Fail 3');

      // --- Alternative approach for catching the rejection ---
      try {
        const promise = agent.retryWithBackoff(mockFn, 2, 50);
        // Important: Advance timers BEFORE awaiting the promise that might reject
        await jest.advanceTimersByTimeAsync(50);  // Delay 1
        await jest.advanceTimersByTimeAsync(100); // Delay 2
        await promise; // This should throw
        fail('Promise should have rejected'); // Ensure it doesn't pass if no error
      } catch (e) {
        expect(e.message).toBe('Fail 3');
        expect(e).toBe(errorFail3); // Check identity if possible
      }
      // --- End Alternative approach ---

      expect(mockFn).toHaveBeenCalledTimes(3);
      expect(logger.warn).toHaveBeenCalledTimes(2);
      expect(logger.error).toHaveBeenCalledWith('Max retries (2) exceeded: Fail 3', { error: errorFail3 });
    });
  });

  describe('parseExercises', () => {
    let agent;
    const { validateAgainstSchema, safeParseResponse } = require('../../utils/research-utils');

    beforeEach(() => {
      agent = new ResearchAgent({ perplexityService: mockPerplexityServiceInstance, logger });
      // Reset mocks
      validateAgainstSchema.mockClear().mockReturnValue({ isValid: true, errors: [] });
      safeParseResponse.mockClear().mockImplementation(c => { try { return JSON.parse(c); } catch { return null; } });
    });

    test('Success: should parse valid JSON array', () => {
      const validContent = JSON.stringify([{ name: 'Test' }]);
      const response = { content: validContent };
      const result = agent.parseExercises(response);
      expect(result).toEqual([{ name: 'Test' }]);
      expect(safeParseResponse).toHaveBeenCalledWith(validContent);
      expect(validateAgainstSchema).toHaveBeenCalledWith([{ name: 'Test' }], expect.any(Object), 'Exercise');
    });
     test('Success: should parse valid JSON object and wrap in array', () => {
      const validContent = JSON.stringify({ name: 'Test' }); // Single object
      const response = { content: validContent };
      const result = agent.parseExercises(response);
      expect(result).toEqual([{ name: 'Test' }]);
      expect(safeParseResponse).toHaveBeenCalledWith(validContent);
      expect(validateAgainstSchema).toHaveBeenCalledWith({ name: 'Test' }, expect.any(Object), 'Exercise');
    });

    test('Failure (Empty Response): should throw if response or content is missing', () => {
      expect(() => agent.parseExercises(null)).toThrow(AgentError);
      expect(() => agent.parseExercises({})).toThrow(AgentError);
      try { agent.parseExercises({}); } catch (e) {
        expect(e.code).toBe(ERROR_CODES.EXTERNAL_SERVICE_ERROR);
        expect(e.message).toContain('Empty or invalid content');
      }
    });

    test('Failure (Invalid JSON): should throw if content is not valid JSON', () => {
      const response = { content: 'not json' };
      safeParseResponse.mockReturnValueOnce(null); // Simulate parse failure
      expect(() => agent.parseExercises(response)).toThrow(AgentError);
       try { agent.parseExercises(response); } catch (e) {
        expect(e.code).toBe(ERROR_CODES.PROCESSING_ERROR);
        expect(e.message).toContain('Failed to parse JSON response content');
      }
    });

    test('Failure (Schema Validation): should throw if parsed data fails schema validation', () => {
      const invalidData = [{ name: 'Missing difficulty' }];
      const response = { content: JSON.stringify(invalidData) };
      validateAgainstSchema.mockReturnValueOnce({ isValid: false, errors: [{ message: 'Missing field' }] });
      expect(() => agent.parseExercises(response)).toThrow(AgentError);
      try { agent.parseExercises(response); } catch (e) {
        expect(e.code).toBe(ERROR_CODES.VALIDATION_ERROR);
        expect(e.message).toContain('Schema validation failed: Missing field');
      }
    });
     test('Failure (Not Array/Object): should throw if parsed data is not array/object', () => {
      const invalidContent = JSON.stringify('just a string');
      const response = { content: invalidContent };
      validateAgainstSchema.mockReturnValueOnce({ isValid: true }); // Assume string passes schema somehow for test
      // parseExercises tries to wrap non-arrays, but fails if not an object
      expect(() => agent.parseExercises(response)).toThrow(AgentError);
        try { agent.parseExercises(response); } catch (e) {
        expect(e.code).toBe(ERROR_CODES.PROCESSING_ERROR);
        expect(e.message).toContain('Parsed exercise data is not an array as expected');
      }
    });
  });

  describe('cleanExerciseData', () => {
     let agent;
     beforeEach(() => {
       agent = new ResearchAgent({ perplexityService: mockPerplexityServiceInstance, logger });
     });

     test('should apply default values for missing fields', () => {
       const input = [{ name: 'Squat' }, { name: 'Lunge', difficulty: 'beginner' }];
       const expected = [
         { name: 'Squat', description: '', difficulty: 'intermediate', equipment: ['bodyweight'], muscleGroups: [], citations: [], isReliable: true, warning: null },
         { name: 'Lunge', description: '', difficulty: 'beginner', equipment: ['bodyweight'], muscleGroups: [], citations: [], isReliable: true, warning: null },
       ];
       expect(agent.cleanExerciseData(input)).toEqual(expected);
     });

     test('should keep existing valid fields', () => {
       const input = [{
         name: 'Bench', description: 'Chest press', difficulty: 'advanced',
         equipment: ['barbell'], muscleGroups: ['chest'], citations: ['a.com'],
         isReliable: false, warning: 'test warning'
       }];
       const expected = [{
         name: 'Bench', description: 'Chest press', difficulty: 'advanced',
         equipment: ['barbell'], muscleGroups: ['chest'], citations: ['a.com'],
         isReliable: false, warning: 'test warning'
       }];
       expect(agent.cleanExerciseData(input)).toEqual(expected);
     });

     test('should return empty array for empty, null, or invalid input', () => {
       expect(agent.cleanExerciseData([])).toEqual([]);
       expect(agent.cleanExerciseData(null)).toEqual([]);
       expect(agent.cleanExerciseData('string')).toEqual([]);
     });
  });

  // Utility Methods direct tests already included previously
});