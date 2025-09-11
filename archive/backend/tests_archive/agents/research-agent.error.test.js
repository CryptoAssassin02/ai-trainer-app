// Mock dependencies first
jest.mock('../../config/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
}));

jest.mock('../../services/perplexity-service', () => {
  return jest.fn().mockImplementation(() => ({
    search: jest.fn()
  }));
});

// Import modules after mocking
const ResearchAgent = require('../../agents/research-agent');
const { AgentError, ValidationError, ERROR_CODES } = require('../../utils/errors');

describe('ResearchAgent Error Handling', () => {
  let researchAgent;
  let mockPerplexityService;
  let mockLogger;
  let mockMemorySystem;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock Perplexity service
    mockPerplexityService = {
      search: jest.fn()
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

    // Instantiate ResearchAgent
    researchAgent = new ResearchAgent({
      perplexityService: mockPerplexityService,
      logger: mockLogger,
      memorySystem: mockMemorySystem
    });
    
    // Mock retryWithBackoff to return the function result directly
    researchAgent.retryWithBackoff = jest.fn(fn => fn());
  });

  describe('External Service Errors', () => {
    it('should wrap external service errors properly', async () => {
      // Arrange
      const apiError = new Error('API failed');
      const expectedAgentError = new AgentError(
          `Query execution failed permanently for general: ${apiError.message}`,
          ERROR_CODES.EXTERNAL_SERVICE_ERROR,
          { type: 'exercise' },
          apiError
      );
      // Mock the underlying process method to REJECT with the AgentError
      researchAgent.process = jest.fn().mockRejectedValue(expectedAgentError);
      
      // Act: Call safeProcess, which should catch the rejection from process
      const result = await researchAgent.safeProcess({
        userProfile: { fitnessLevel: 'beginner' },
        exerciseType: 'general'
      });
      
      // Assert: Check the structure returned by safeProcess
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(AgentError); // Can keep instanceof check here
      expect(result.error.code).toBe(ERROR_CODES.EXTERNAL_SERVICE_ERROR);
      expect(result.error.message).toContain('Query execution failed permanently for general');
      expect(result.error.originalError).toBe(apiError);
    });
  });

  describe('Validation Errors', () => {
    it('should throw VALIDATION_ERROR when exercise data fails schema validation', async () => {
      // Arrange - Override process to throw a validation error
      researchAgent.process = jest.fn().mockImplementation(() => {
        throw new AgentError(
          'Schema validation failed: must have required property "name"',
          ERROR_CODES.VALIDATION_ERROR
        );
      });
      
      // Act
      const result = await researchAgent.safeProcess({
        userProfile: { fitnessLevel: 'beginner' },
        exerciseType: 'general'
      });
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(AgentError);
      expect(result.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(result.error.message).toContain('Schema validation failed');
    });
  });

  describe('Processing Errors', () => {
    it('should throw PROCESSING_ERROR when data extraction fails', async () => {
      // Arrange - Override process to throw a processing error
      researchAgent.process = jest.fn().mockImplementation(() => {
        throw new AgentError(
          'Error parsing exercises: Incompatible data structure',
          ERROR_CODES.PROCESSING_ERROR
        );
      });
      
      // Act
      const result = await researchAgent.safeProcess({
        userProfile: { fitnessLevel: 'beginner' },
        exerciseType: 'general'
      });
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(AgentError);
      expect(result.error.code).toBe(ERROR_CODES.PROCESSING_ERROR);
      expect(result.error.message).toContain('Error parsing exercises');
    });
  });

  describe('Error Chain Preservation', () => {
    it('should preserve the error chain through multiple catches', async () => {
      // Arrange - Create a nested error scenario
      const originalError = new Error('Original low-level error');
      
      // Override the process method to create a nested error chain
      researchAgent.process = jest.fn().mockImplementation(() => {
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
      const result = await researchAgent.safeProcess({});
      
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
      const exerciseData = [{
        name: 'Test Exercise',
        description: 'A test exercise',
        difficulty: 'beginner',
        equipment: ['bodyweight'],
        muscleGroups: ['full body'],
        citations: ['https://source.org']
      }];
      
      // Mock ResearchAgent's process method to return success data
      researchAgent.process = jest.fn().mockResolvedValue({
        exercises: exerciseData,
        techniques: [],
        progressions: [],
        stats: { durationMs: 100 },
        warnings: [],
        errors: []
      });
      
      // Act
      const result = await researchAgent.safeProcess({
        userProfile: { fitnessLevel: 'beginner' },
        exerciseType: 'general'
      });
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        exercises: exerciseData,
        techniques: [],
        progressions: [],
        stats: { durationMs: 100 },
        warnings: [],
        errors: []
      });
    });
  });
}); 