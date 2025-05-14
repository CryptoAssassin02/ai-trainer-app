const BaseAgent = require('../../agents/base-agent');
const { AgentError, ValidationError, ERROR_CODES } = require('../../utils/errors');

describe('BaseAgent', () => {
  let baseAgent;
  let mockLogger;
  let mockMemorySystem;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Recreate fresh mock instances for each test
    mockMemorySystem = {
      storeMemory: jest.fn().mockResolvedValue({ id: 'memory123' }),
      searchSimilarMemories: jest.fn().mockResolvedValue([{ id: 'memory123', content: 'test content' }]),
      getMemoriesByMetadata: jest.fn().mockResolvedValue([{ id: 'memory123', content: 'test content' }]),
      storeUserFeedback: jest.fn().mockResolvedValue({ id: 'feedback123' })
    };
    
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };
    
    // Create a new instance of the BaseAgent class for testing
    baseAgent = new BaseAgent({
      memorySystem: mockMemorySystem, 
      logger: mockLogger
    });
  });

  describe('constructor', () => {
    it('should initialize with default values when no config provided', () => {
      const agent = new BaseAgent();
      expect(agent.logger).toBe(console);
      expect(agent.memorySystem).toBeNull();
      expect(agent.config).toEqual({});
      expect(agent.name).toBe('BaseAgent');
    });

    it('should initialize with provided config', () => {
      const config = { maxRetries: 2 };
      const baseAgent = new BaseAgent({ 
        logger: mockLogger, 
        memorySystem: mockMemorySystem, 
        config 
      });
      
      expect(baseAgent.logger).toBe(mockLogger);
      expect(baseAgent.memorySystem).toBe(mockMemorySystem);
      expect(baseAgent.config).toEqual({ maxRetries: 2 });
      expect(baseAgent.name).toBe('BaseAgent');
    });
  });

  describe('process', () => {
    it('should throw an error when not implemented', async () => {
      await expect(baseAgent.process({})).rejects.toThrow("Method 'process()' must be implemented by BaseAgent");
    });
  });

  describe('safeProcess', () => {
    beforeEach(() => {
      // Override the process method for testing
      baseAgent.process = jest.fn();
    });

    it('should return success result when process succeeds', async () => {
      baseAgent.process.mockResolvedValue({ result: 'success' });
      
      const result = await baseAgent.safeProcess({ test: 'input' });
      
      expect(result).toEqual({
        success: true,
        data: { result: 'success' }
      });
      expect(mockLogger.info).toHaveBeenCalledWith('[BaseAgent] process START');
      expect(mockLogger.info).toHaveBeenCalledWith('[BaseAgent] process END');
    });

    it('should correctly handle AgentError and preserve codes and details', async () => {
      const error = new AgentError(
        'Test error',
        ERROR_CODES.VALIDATION_ERROR,
        { detail: 'test' }
      );
      baseAgent.process.mockRejectedValue(error);
      
      const result = await baseAgent.safeProcess({ test: 'input' });
      
      expect(result).toEqual({
        success: false,
        error
      });
      expect(result.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(result.error.details).toEqual({ detail: 'test' });
      expect(mockLogger.error).toHaveBeenCalledWith(
        '[BaseAgent] Process error: Test error',
        expect.objectContaining({
          errorCode: ERROR_CODES.VALIDATION_ERROR,
          details: { detail: 'test' }
        })
      );
    });

    it('should convert ValidationError to AgentError with proper code', async () => {
      const validationError = new ValidationError('Invalid input', 
        { field: 'username', message: 'Username is required' });
      baseAgent.process.mockRejectedValue(validationError);
      
      const result = await baseAgent.safeProcess({ test: 'input' });
      
      expect(result.success).toBe(false);
      expect(result.error instanceof AgentError).toBe(true);
      expect(result.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(result.error.originalError).toBe(validationError);
      // Ensure original validation details are preserved
      expect(result.error.details).toEqual([{ field: 'username', message: 'Username is required' }]);
    });

    it('should categorize Axios-like external service errors correctly', async () => {
      const axiosError = new Error('Request failed');
      axiosError.response = {
        status: 503,
        data: { error: 'Service unavailable' }
      };
      baseAgent.process.mockRejectedValue(axiosError);
      
      const result = await baseAgent.safeProcess({ test: 'input' });
      
      expect(result.success).toBe(false);
      expect(result.error instanceof AgentError).toBe(true);
      expect(result.error.code).toBe(ERROR_CODES.EXTERNAL_SERVICE_ERROR);
      expect(result.error.details).toEqual({ 
        statusCode: 503, 
        data: { error: 'Service unavailable' } 
      });
    });

    it('should categorize network errors correctly', async () => {
      const networkError = new Error('Connection refused');
      networkError.code = 'ECONNREFUSED';
      baseAgent.process.mockRejectedValue(networkError);
      
      const result = await baseAgent.safeProcess({ test: 'input' });
      
      expect(result.success).toBe(false);
      expect(result.error instanceof AgentError).toBe(true);
      expect(result.error.code).toBe(ERROR_CODES.EXTERNAL_SERVICE_ERROR);
      expect(result.error.details).toEqual({ originalCode: 'ECONNREFUSED' });
    });

    it('should categorize configuration errors correctly', async () => {
      const configError = new Error('Missing configuration for API key');
      baseAgent.process.mockRejectedValue(configError);
      
      const result = await baseAgent.safeProcess({ test: 'input' });
      
      expect(result.success).toBe(false);
      expect(result.error instanceof AgentError).toBe(true);
      expect(result.error.code).toBe(ERROR_CODES.CONFIGURATION_ERROR);
    });

    it('should default to PROCESSING_ERROR for unknown error types', async () => {
      const unknownError = new Error('Unknown error');
      baseAgent.process.mockRejectedValue(unknownError);
      
      const result = await baseAgent.safeProcess({ test: 'input' });
      
      expect(result.success).toBe(false);
      expect(result.error instanceof AgentError).toBe(true);
      expect(result.error.code).toBe(ERROR_CODES.PROCESSING_ERROR);
      expect(result.error.message).toContain('Unknown error');
    });
    
    it('should preserve the original error stack trace', async () => {
      const originalError = new Error('Original error');
      const agentError = new AgentError(
        'Wrapped error', 
        ERROR_CODES.PROCESSING_ERROR, 
        null, 
        originalError
      );
      baseAgent.process.mockRejectedValue(agentError);
      
      const result = await baseAgent.safeProcess({ test: 'input' });
      
      expect(result.success).toBe(false);
      expect(result.error.originalError).toBe(originalError);
      expect(result.error.stack).toContain('Caused by:');
    });
  });

  describe('storeMemory', () => {
    it('should store memory with correct metadata', async () => {
      const baseAgent = new BaseAgent({ memorySystem: mockMemorySystem, logger: mockLogger });
      const content = { test: 'content' };
      const metadata = { userId: 'user-id' };
      
      await baseAgent.storeMemory(content, metadata);
      
      expect(mockMemorySystem.storeMemory).toHaveBeenCalledWith(content, expect.objectContaining({
        agent_type: 'base',
        userId: 'user-id',
        user_id: 'user-id',
        memory_type: 'agent_output',
        content_type: 'json',
        tags: [],
        importance: 1,
        plan_id: null,
        // Allow any string for timestamp and expect the additional workout IDs
        timestamp: expect.any(String),
        workout_log_id: null,
        workout_plan_id: null
      }));
    });
    
    it('should return null if memory system not available', async () => {
      const baseAgent = new BaseAgent({ logger: mockLogger });
      const result = await baseAgent.storeMemory('test');
      
      expect(result).toBeNull();
      expect(mockLogger.debug).toHaveBeenCalledWith('[BaseAgent] Memory system not available, skipping memory storage');
    });
    
    it('should handle errors and log warnings', async () => {
      const baseAgent = new BaseAgent({ memorySystem: mockMemorySystem, logger: mockLogger });
      mockMemorySystem.storeMemory.mockRejectedValue(new Error('Storage error'));
      
      const result = await baseAgent.storeMemory('test');
      
      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith('[BaseAgent] Failed to store memory: Storage error', { error: expect.any(Error) });
    });
  });

  describe('retrieveMemories', () => {
    it('should retrieve memories with correct parameters', async () => {
      const baseAgent = new BaseAgent({ memorySystem: mockMemorySystem, logger: mockLogger });
      const options = {
        userId: 'user-id',
        metadata: { key: 'value' },
        limit: 10,
        threshold: 0.8
      };
      
      await baseAgent.retrieveMemories(options);
      
      // When query is not provided, it should use getMemoriesByMetadata
      expect(mockMemorySystem.getMemoriesByMetadata).toHaveBeenCalledWith(
        'user-id', 
        {
          agent_type: ['base'],
          key: 'value'
        },
        {
          limit: 10,
          sortBy: 'created_at',
          sortDirection: 'desc'
        }
      );
    });
    
    it('should support semantic search with query', async () => {
      const baseAgent = new BaseAgent({ memorySystem: mockMemorySystem, logger: mockLogger });
      const query = 'test query';
      const options = {
        userId: 'user-id',
        query: query,
        agentTypes: ['research', 'nutrition']
      };
      
      await baseAgent.retrieveMemories(options);
      
      // When query is provided, should use searchSimilarMemories
      expect(mockMemorySystem.searchSimilarMemories).toHaveBeenCalledWith(
        'user-id',
        query,
        {
          filter: {
            agent_type: ['research', 'nutrition']
          },
          limit: 5,
          threshold: 0.7
        }
      );
    });
    
    it('should return empty array if memory system not available', async () => {
      const baseAgent = new BaseAgent({ logger: mockLogger });
      baseAgent.memorySystem = null;
      
      const result = await baseAgent.retrieveMemories({ query: 'test' });
      
      expect(result).toEqual([]);
      expect(mockLogger.debug).toHaveBeenCalledWith('[BaseAgent] Memory system not available, skipping memory retrieval');
    });
    
    it('should handle errors and log warnings', async () => {
      const baseAgent = new BaseAgent({ memorySystem: mockMemorySystem, logger: mockLogger });
      // Setup to test both error handling paths
      mockMemorySystem.searchSimilarMemories.mockRejectedValue(new Error('Search error'));
      mockMemorySystem.getMemoriesByMetadata.mockRejectedValue(new Error('Metadata search error'));
      
      // Test with query to trigger searchSimilarMemories path
      const result1 = await baseAgent.retrieveMemories({ query: 'test', userId: 'user-id' });
      
      expect(result1).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith('[BaseAgent] Failed to retrieve memories: Search error', { error: expect.any(Error) });
      
      // Test without query to trigger getMemoriesByMetadata path
      jest.clearAllMocks(); // Clear mocks between tests
      const result2 = await baseAgent.retrieveMemories({ userId: 'user-id' });
      
      expect(result2).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith('[BaseAgent] Failed to retrieve memories: Metadata search error', { error: expect.any(Error) });
    });
  });

  describe('log', () => {
    it('should log messages with agent name prefix', () => {
      baseAgent.log('info', 'Test message');
      expect(mockLogger.info).toHaveBeenCalledWith('[BaseAgent] Test message');
    });

    it('should log messages with data', () => {
      const data = { test: 'data' };
      baseAgent.log('debug', 'Test message', data);
      expect(mockLogger.debug).toHaveBeenCalledWith('[BaseAgent] Test message', data);
    });

    it('should not log if logger is not available', () => {
      baseAgent.logger = null;
      baseAgent.log('info', 'Test message');
      expect(mockLogger.info).not.toHaveBeenCalled();
    });
  });

  describe('validate', () => {
    it('should not throw error when validation passes', () => {
      const validator = jest.fn().mockReturnValue(true);
      expect(() => baseAgent.validate({ test: 'input' }, validator)).not.toThrow();
      expect(validator).toHaveBeenCalledWith({ test: 'input' });
    });

    it('should throw ValidationError when validation fails', () => {
      const validator = jest.fn().mockReturnValue(false);
      expect(() => baseAgent.validate({ test: 'input' }, validator, 'Custom message')).toThrow(ValidationError);
      expect(() => baseAgent.validate({ test: 'input' }, validator, 'Custom message')).toThrow('Custom message');
    });
  });

  describe('retryWithBackoff', () => {
    it('should return result on first success', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await baseAgent.retryWithBackoff(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and succeed eventually', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValueOnce('success');
      
      const result = await baseAgent.retryWithBackoff(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Attempt 1 failed'));
    });

    it('should throw error after all retries fail', async () => {
      const config = { maxRetries: 2 };
      const baseAgent = new BaseAgent({ 
        logger: mockLogger, 
        memorySystem: mockMemorySystem, 
        config 
      });
      
      const operation = jest.fn().mockRejectedValue(new Error('Operation failed'));
      
      await expect(baseAgent.retryWithBackoff(operation)).rejects.toThrow('Operation failed');
      expect(operation).toHaveBeenCalledTimes(2); // maxRetries from config
      expect(mockLogger.error).toHaveBeenCalledWith('[BaseAgent] All 2 attempts failed. Last error: Operation failed');
    });

    it('should use custom retry options if provided', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValueOnce('success');
      
      const result = await baseAgent.retryWithBackoff(operation, {
        maxRetries: 3,
        initialDelay: 100,
        backoffFactor: 2
      });
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });
  });

  // Test inheritance behavior
  describe('inheritance', () => {
    it('should allow derived classes to override process method', async () => {
      class TestAgent extends BaseAgent {
        async process(context) {
          return { processed: context.input };
        }
      }
      
      const testAgent = new TestAgent({
        logger: mockLogger,
        memorySystem: mockMemorySystem
      });
      
      const result = await testAgent.safeProcess({ input: 'test' });
      
      expect(result).toEqual({
        success: true,
        data: { processed: 'test' }
      });
      expect(mockLogger.info).toHaveBeenCalledWith('[TestAgent] process START');
      expect(mockLogger.info).toHaveBeenCalledWith('[TestAgent] process END');
    });
  });

  // Test unified error handling with inheritance
  describe('Unified Error Handling', () => {
    it('should handle error categorization in derived agents', async () => {
      class TestAgent extends BaseAgent {
        async process(context) {
          if (context.shouldFail) {
            if (context.failureType === 'validation') {
              throw new AgentError(
                'Validation failed', 
                ERROR_CODES.VALIDATION_ERROR, 
                { field: 'test' }
              );
            } else if (context.failureType === 'external') {
              throw new AgentError(
                'External service failed', 
                ERROR_CODES.EXTERNAL_SERVICE_ERROR
              );
            } else if (context.failureType === 'resource') {
              throw new AgentError(
                'Resource not found', 
                ERROR_CODES.RESOURCE_ERROR
              );
            } else if (context.failureType === 'memory') {
              throw new AgentError(
                'Memory system failed', 
                ERROR_CODES.MEMORY_SYSTEM_ERROR
              );
            } else {
              throw new Error('Generic error');
            }
          }
          return { success: true };
        }
      }
      
      const testAgent = new TestAgent({
        logger: mockLogger,
        memorySystem: mockMemorySystem
      });
      
      // Test validation error
      let result = await testAgent.safeProcess({ 
        shouldFail: true, 
        failureType: 'validation' 
      });
      
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      
      // Test external service error
      result = await testAgent.safeProcess({ 
        shouldFail: true, 
        failureType: 'external' 
      });
      
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(ERROR_CODES.EXTERNAL_SERVICE_ERROR);
      
      // Test generic error conversion
      result = await testAgent.safeProcess({ 
        shouldFail: true, 
        failureType: 'generic' 
      });
      
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(ERROR_CODES.PROCESSING_ERROR);
    });
    
    it('should maintain error chain when wrapping errors', async () => {
      class TestAgent extends BaseAgent {
        async process(context) {
          try {
            // Simulate a lower-level error
            throw new Error('Low-level error');
          } catch (err) {
            // Wrap in an AgentError
            throw new AgentError(
              'Higher-level error', 
              ERROR_CODES.PROCESSING_ERROR, 
              { context },
              err
            );
          }
        }
      }
      
      const testAgent = new TestAgent({
        logger: mockLogger,
        memorySystem: mockMemorySystem
      });
      
      const result = await testAgent.safeProcess({ test: 'input' });
      
      expect(result.success).toBe(false);
      expect(result.error.message).toBe('Higher-level error');
      expect(result.error.originalError).toBeDefined();
      expect(result.error.originalError.message).toBe('Low-level error');
    });
  });
}); 