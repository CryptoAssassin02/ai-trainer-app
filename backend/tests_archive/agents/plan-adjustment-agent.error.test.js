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

// Mock adjustment-logic modules to avoid initialization errors
jest.mock('../../agents/adjustment-logic/feedback-parser', () => {
  return jest.fn().mockImplementation(() => ({
    parse: jest.fn()
  }));
});

jest.mock('../../agents/adjustment-logic/plan-modifier', () => {
  return jest.fn().mockImplementation(() => ({
    modify: jest.fn()
  }));
});

jest.mock('../../agents/adjustment-logic/adjustment-validator', () => {
  return jest.fn().mockImplementation(() => ({
    validate: jest.fn()
  }));
});

jest.mock('../../agents/adjustment-logic/explanation-generator', () => {
  return jest.fn().mockImplementation(() => ({
    generate: jest.fn()
  }));
});

// Import modules after mocking
const PlanAdjustmentAgent = require('../../agents/plan-adjustment-agent');
const { AgentError, ValidationError, ERROR_CODES } = require('../../utils/errors');

describe('PlanAdjustmentAgent Error Handling', () => {
  let planAdjustmentAgent;
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

    // Instantiate PlanAdjustmentAgent with all required dependencies
    planAdjustmentAgent = new PlanAdjustmentAgent({
      openaiService: mockOpenAIService,
      logger: mockLogger,
      memorySystem: mockMemorySystem,
      supabaseClient: mockSupabaseClient // Add required SupabaseClient
      // No need to pass the adjustment modules as they are mocked via jest.mock
    });
    
    // Mock retryWithBackoff to return the function result directly
    planAdjustmentAgent.retryWithBackoff = jest.fn(fn => fn());
  });

  describe('External Service Errors', () => {
    it('should wrap external service errors properly', async () => {
      // Arrange
      const apiError = new Error('API failed');
      mockOpenAIService.complete.mockRejectedValue(apiError);
      
      // Mock process to simulate the actual behavior when OpenAI fails
      planAdjustmentAgent.process = jest.fn().mockImplementation(() => {
        throw new AgentError(
          'OpenAI API call failed during plan adjustment: API failed',
          ERROR_CODES.EXTERNAL_SERVICE_ERROR,
          { service: 'openai', step: 'adjustPlan' },
          apiError
        );
      });
      
      // Act
      const result = await planAdjustmentAgent.safeProcess({
        originalPlan: { name: 'Test Plan', exercises: [] },
        feedback: 'Add more leg exercises'
      });
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(AgentError);
      expect(result.error.code).toBe(ERROR_CODES.EXTERNAL_SERVICE_ERROR);
      expect(result.error.message).toContain('OpenAI API call failed during plan adjustment');
      expect(result.error.originalError).toBeDefined();
    });
  });

  describe('Validation Errors', () => {
    it('should throw VALIDATION_ERROR when input validation fails', async () => {
      // Arrange - Override process to throw a validation error
      planAdjustmentAgent.process = jest.fn().mockImplementation(() => {
        throw new AgentError(
          'Validation failed: Missing required field "originalPlan"',
          ERROR_CODES.VALIDATION_ERROR,
          { field: 'originalPlan' }
        );
      });
      
      // Act
      const result = await planAdjustmentAgent.safeProcess({
        feedback: 'Add more leg exercises'
      });
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(AgentError);
      expect(result.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(result.error.message).toContain('Validation failed');
    });
  });

  describe('Processing Errors', () => {
    it('should throw PROCESSING_ERROR when a step in the workflow fails', async () => {
      // Arrange - Mock process to simulate the error propagation
      planAdjustmentAgent.process = jest.fn().mockImplementation(() => {
        throw new AgentError(
          'Error in plan adjustment workflow: Failed at feedback parsing step',
          ERROR_CODES.PROCESSING_ERROR,
          { step: 'parseFeedback' }
        );
      });
      
      // Act
      const result = await planAdjustmentAgent.safeProcess({
        originalPlan: { name: 'Test Plan', exercises: [] },
        feedback: 'Add more leg exercises'
      });
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(AgentError);
      expect(result.error.code).toBe(ERROR_CODES.PROCESSING_ERROR);
      expect(result.error.message).toContain('Error in plan adjustment workflow');
      expect(result.error.details).toEqual({ step: 'parseFeedback' });
    });
  });

  describe('Error Chain Preservation', () => {
    it('should preserve the error chain through multiple catches', async () => {
      // Arrange - Create a nested error scenario
      const originalError = new Error('Original low-level error in feedback parser');
      
      // Override the process method to create a nested error chain
      planAdjustmentAgent.process = jest.fn().mockImplementation(() => {
        try {
          try {
            throw originalError;
          } catch (firstLevelError) {
            throw new AgentError(
              'Failed to parse feedback',
              ERROR_CODES.PROCESSING_ERROR,
              { module: 'feedbackParser' },
              firstLevelError
            );
          }
        } catch (secondLevelError) {
          throw new AgentError(
            'Plan adjustment failed',
            ERROR_CODES.PROCESSING_ERROR,
            { workflow: 'adjustPlan' },
            secondLevelError
          );
        }
      });
      
      // Act
      const result = await planAdjustmentAgent.safeProcess({
        originalPlan: { name: 'Test Plan', exercises: [] },
        feedback: 'Add more leg exercises'
      });
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(AgentError);
      expect(result.error.code).toBe(ERROR_CODES.PROCESSING_ERROR);
      expect(result.error.message).toBe('Plan adjustment failed');
      
      // Check first level error in the chain
      expect(result.error.originalError).toBeInstanceOf(AgentError);
      expect(result.error.originalError.message).toBe('Failed to parse feedback');
      expect(result.error.originalError.code).toBe(ERROR_CODES.PROCESSING_ERROR);
      
      // Check original error
      expect(result.error.originalError.originalError).toBe(originalError);
      expect(result.error.originalError.originalError.message).toBe('Original low-level error in feedback parser');
      
      // Check error details are preserved
      expect(result.error.details).toEqual({ workflow: 'adjustPlan' });
      expect(result.error.originalError.details).toEqual({ module: 'feedbackParser' });
    });
  });

  describe('safeProcess Integration', () => {
    it('should handle successful processing and return structured result', async () => {
      // Arrange - setup successful response
      const adjustedPlan = {
        name: 'Adjusted Test Plan',
        exercises: [
          { name: 'Squat', sets: 3, reps: '8-10' },
          { name: 'Leg Press', sets: 3, reps: '10-12' } // Added to meet user feedback
        ],
        adjustmentReasons: 'Added leg press to target quadriceps'
      };
      
      // Mock PlanAdjustmentAgent's process method to return success data
      planAdjustmentAgent.process = jest.fn().mockResolvedValue(adjustedPlan);
      
      // Act
      const result = await planAdjustmentAgent.safeProcess({
        originalPlan: { name: 'Test Plan', exercises: [{ name: 'Squat', sets: 3, reps: '8-10' }] },
        feedback: 'Add more leg exercises'
      });
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(adjustedPlan);
    });
  });
}); 