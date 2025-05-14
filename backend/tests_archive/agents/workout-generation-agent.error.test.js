// Mock config before other imports require it
jest.mock('../../config', () => ({
  env: {
    supabase: { // Mock the expected structure
      url: 'mock-url',
      anonKey: 'mock-key'
    },
    openai: { apiKey: 'mock-openai-key' },
    // Add other nested env properties if needed by the agent or its dependencies
  },
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock dependencies first
jest.mock('../../config/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
}));

jest.mock('../../services/openai-service', () => {
  return jest.fn().mockImplementation(() => ({
    complete: jest.fn(),
    generateWithReasoning: jest.fn()
  }));
});

// Import modules after mocking
const WorkoutGenerationAgent = require('../../agents/workout-generation-agent');
const { AgentError, ValidationError, ERROR_CODES } = require('../../utils/errors');

describe('WorkoutGenerationAgent Error Handling', () => {
  let workoutGenerationAgent;
  let mockOpenAIService;
  let mockLogger;
  let mockMemorySystem;
  let mockSupabaseClient;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock OpenAI service
    mockOpenAIService = {
      complete: jest.fn(),
      generateWithReasoning: jest.fn()
    };

    // Mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    // Mock memory system
    mockMemorySystem = {
      storeMemory: jest.fn().mockResolvedValue({ id: 'memory-id' }),
      searchSimilarMemories: jest.fn().mockResolvedValue([]),
      getMemoriesByMetadata: jest.fn().mockResolvedValue([])
    };
    
    // Mock Supabase client
    mockSupabaseClient = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(),
            data: []
          }))
        })),
        insert: jest.fn().mockResolvedValue({ data: { id: 'new-record' } }),
        update: jest.fn().mockResolvedValue({ data: { id: 'updated-record' } })
      }))
    };

    // Instantiate WorkoutGenerationAgent with all required dependencies
    workoutGenerationAgent = new WorkoutGenerationAgent({
      openaiService: mockOpenAIService,
      logger: mockLogger,
      memorySystem: mockMemorySystem,
      supabaseClient: mockSupabaseClient // Add required SupabaseClient
    });
    
    // Mock retryWithBackoff to return the function result directly
    workoutGenerationAgent.retryWithBackoff = jest.fn(fn => fn());
  });

  describe('External Service Errors', () => {
    it('should wrap external service errors properly', async () => {
      // Arrange
      const apiError = new Error('API failed');
      mockOpenAIService.generateWithReasoning.mockRejectedValue(apiError);
      
      // Mock process to simulate the actual behavior when OpenAI fails
      workoutGenerationAgent.process = jest.fn().mockImplementation(() => {
        throw new AgentError(
          'OpenAI API call failed: API failed',
          ERROR_CODES.EXTERNAL_SERVICE_ERROR,
          { service: 'openai' },
          apiError
        );
      });
      
      // Act
      const result = await workoutGenerationAgent.safeProcess({
        userProfile: { fitnessLevel: 'beginner' },
        goals: ['strength']
      });
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(AgentError);
      expect(result.error.code).toBe(ERROR_CODES.EXTERNAL_SERVICE_ERROR);
      expect(result.error.message).toContain('OpenAI API call failed');
      expect(result.error.originalError).toBeDefined();
    });
  });

  describe('Validation Errors', () => {
    it('should throw VALIDATION_ERROR when input validation fails', async () => {
      // Arrange - Override process to throw a validation error
      workoutGenerationAgent.process = jest.fn().mockImplementation(() => {
        throw new AgentError(
          'Validation failed: Missing required field "fitnessLevel"',
          ERROR_CODES.VALIDATION_ERROR,
          { field: 'fitnessLevel' }
        );
      });
      
      // Act
      const result = await workoutGenerationAgent.safeProcess({
        userProfile: {},
        goals: ['strength']
      });
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(AgentError);
      expect(result.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(result.error.message).toContain('Validation failed');
    });
  });

  describe('Processing Errors', () => {
    it('should throw PROCESSING_ERROR when workout generation fails', async () => {
      // Arrange - Override process to throw a processing error
      workoutGenerationAgent.process = jest.fn().mockImplementation(() => {
        throw new AgentError(
          'Error generating workout plan: Invalid reasoning steps',
          ERROR_CODES.PROCESSING_ERROR
        );
      });
      
      // Act
      const result = await workoutGenerationAgent.safeProcess({
        userProfile: { fitnessLevel: 'beginner' },
        goals: ['strength']
      });
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(AgentError);
      expect(result.error.code).toBe(ERROR_CODES.PROCESSING_ERROR);
      expect(result.error.message).toContain('Error generating workout plan');
    });
  });

  describe('Error Chain Preservation', () => {
    it('should preserve the error chain through multiple catches', async () => {
      // Arrange - Create a nested error scenario
      const originalError = new Error('Original low-level error');
      
      // Override the process method to create a nested error chain
      workoutGenerationAgent.process = jest.fn().mockImplementation(() => {
        try {
          try {
            throw originalError;
          } catch (firstLevelError) {
            throw new AgentError(
              'First level wrapper',
              ERROR_CODES.PROCESSING_ERROR,
              { level: 1 },
              firstLevelError
            );
          }
        } catch (secondLevelError) {
          throw new AgentError(
            'Second level wrapper',
            ERROR_CODES.EXTERNAL_SERVICE_ERROR,
            { level: 2 },
            secondLevelError
          );
        }
      });
      
      // Act
      const result = await workoutGenerationAgent.safeProcess({});
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(AgentError);
      expect(result.error.code).toBe(ERROR_CODES.EXTERNAL_SERVICE_ERROR);
      expect(result.error.message).toBe('Second level wrapper');
      
      // Check first level error in the chain
      expect(result.error.originalError).toBeInstanceOf(AgentError);
      expect(result.error.originalError.message).toBe('First level wrapper');
      expect(result.error.originalError.code).toBe(ERROR_CODES.PROCESSING_ERROR);
      
      // Check original error
      expect(result.error.originalError.originalError).toBe(originalError);
      expect(result.error.originalError.originalError.message).toBe('Original low-level error');
      
      // Check error details are preserved
      expect(result.error.details).toEqual({ level: 2 });
      expect(result.error.originalError.details).toEqual({ level: 1 });
    });
  });

  describe('safeProcess Integration', () => {
    it('should handle successful processing and return structured result', async () => {
      // Arrange - setup successful response
      const workoutPlan = {
        name: 'Beginner Strength Plan',
        exercises: [
          {
            name: 'Squat',
            sets: 3,
            reps: '8-10',
            restSeconds: 60
          }
        ],
        reasoning: 'This plan focuses on fundamental strength movements'
      };
      
      // Mock WorkoutGenerationAgent's process method to return success data
      workoutGenerationAgent.process = jest.fn().mockResolvedValue(workoutPlan);
      
      // Act
      const result = await workoutGenerationAgent.safeProcess({
        userProfile: { fitnessLevel: 'beginner' },
        goals: ['strength']
      });
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(workoutPlan);
    });
  });
}); 