const { OpenAI } = require('openai');
const logger = require('../../config/logger');
const openaiConfig = require('../../config/openai'); // Need this for checking defaults/overrides

// --- Mocks FIRST ---

// Mock Logger
jest.mock('../../config/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// Mock Env Config (Test Environment)
jest.mock('../../config/env', () => ({
  isProduction: false,
  isTest: true,
  isDevelopment: false,
  externalServices: {
    openai: {
      apiKey: 'test-api-key', // Needs a value for service constructor check
    },
  },
}));

// Mock configuration - Defined within the mock factory now
/*
const mockOpenAIConfig = {
  apiKey: 'test-api-key',
  organization: 'test-org-id',
  // ... rest of the config ...
};
*/

// Mock the configuration module
jest.mock('../../config/openai', () => ({
  // Define the config object directly inside the factory
  apiKey: 'test-api-key',
  organization: 'test-org-id',
  defaultChatModel: 'gpt-3.5-turbo-test',
  defaultEmbeddingModel: 'text-embedding-ada-002-test',
  temperature: 0.7,
  maxTokens: 150,
  retry: {
    maxRetries: 1, // Keep retries low for tests
    baseDelay: 50, // Short delay for tests
    retryableStatusCodes: [429, 500, 502, 503, 504],
  },
  MODELS: {
    GPT_4: 'gpt-4',
    GPT_4_TURBO: 'gpt-4-turbo',
    GPT_4o: 'gpt-4o',
    GPT_3_5_TURBO: 'gpt-3.5-turbo',
    TEXT_EMBEDDING_3_SMALL: 'text-embedding-3-small',
    TEXT_EMBEDDING_3_LARGE: 'text-embedding-3-large',
    TEXT_EMBEDDING_ADA_002: 'text-embedding-ada-002',
  },
  // Mock the utils, specifically estimateCost
  utils: {
    // Keep other utils real if needed, or mock them as well
    ...jest.requireActual('../../config/openai').utils,
    estimateCost: jest.fn().mockReturnValue(0), // Mock cost estimation to always return 0
  },
}));

// Mock the OpenAI SDK **correctly**
jest.mock('openai', () => {
  // Define mocks *inside* the factory function
  const mockChatCompletionsCreate = jest.fn();
  const mockEmbeddingsCreate = jest.fn();

  class MockAPIError extends Error { // Define class inside
    constructor(status, error, message, headers) {
      super(message || `Mock API Error status: ${status}`);
      this.status = status;
      this.error = error;
      this.headers = headers;
      this.name = 'APIError';
      Object.setPrototypeOf(this, MockAPIError.prototype);
    }
  }
  Object.setPrototypeOf(MockAPIError.prototype, Error.prototype);

  // Return the mocked SDK structure
  return {
    OpenAI: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockChatCompletionsCreate, // Use internally defined function
        },
      },
      embeddings: {
        create: mockEmbeddingsCreate, // Use internally defined function
      },
    })),
    APIError: MockAPIError, // Use internally defined class
    // IMPORTANT: Also expose the mock functions if tests need to manipulate them directly
    _mockChatCompletionsCreate: mockChatCompletionsCreate,
    _mockEmbeddingsCreate: mockEmbeddingsCreate,
  };
});

// --- Now Require modules AFTER mocks ---
const openAIService = require('../../services/openai-service');
const mockedConfig = require('../../config/openai'); // Get the mocked config
const { _mockChatCompletionsCreate, _mockEmbeddingsCreate, APIError: MockAPIErrorForTests } = require('openai'); // Get the exported mocks

// --- Test Suites ---

describe('OpenAIService', () => {
  // Common mock data
  const messages = [{ role: 'user', content: 'Hello' }];
  const inputText = 'Test input string';
  const mockEmbedding = [0.1, 0.2, 0.3];
  const inputTexts = ['Test string 1', 'Test string 2'];
  const mockEmbeddings = [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]];
  const mockSuccessResponseChat = { choices: [{ message: { role: 'assistant', content: 'Hello User!' }, finish_reason: 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } };
  const mockSuccessResponseEmbedSingle = { data: [{ embedding: mockEmbedding, index: 0 }], usage: { prompt_tokens: 5, total_tokens: 5 } };
  const mockSuccessResponseEmbedMulti = { data: [{ embedding: mockEmbeddings[0], index: 0 }, { embedding: mockEmbeddings[1], index: 1 }], usage: { prompt_tokens: 10, total_tokens: 10 } };

  beforeEach(() => {
    // Clear mocks before each test
    jest.clearAllMocks();
    _mockChatCompletionsCreate.mockClear();
    _mockEmbeddingsCreate.mockClear();
    if (mockedConfig.utils && typeof mockedConfig.utils.estimateCost?.mockClear === 'function') {
      mockedConfig.utils.estimateCost.mockClear();
    }
  });

  describe('Initialization', () => {
    // This test is inherently difficult because the constructor runs once on initial require.
    // We check the *result* of initialization implicitly in other tests.
    test('should be defined', () => {
      expect(openAIService).toBeDefined();
    });
    // test('should initialize OpenAI client', () => {
    //   // Can't reliably test constructor call count after initial require
    // });
  });

  describe('generateChatCompletion', () => {
    // No need to require mocks/logger/config inside tests now

    test('should use default model and parameters from test config', async () => {
      const mockSuccessResponse = { choices: [{ message: { role: 'assistant', content: 'Hello User!' }, finish_reason: 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } };
      _mockChatCompletionsCreate.mockResolvedValue(mockSuccessResponse);
      await openAIService.generateChatCompletion(messages);

      expect(_mockChatCompletionsCreate).toHaveBeenCalledWith(expect.objectContaining({
        model: mockedConfig.defaultChatModel,
        temperature: mockedConfig.temperature,
        messages,
      }));
      expect(logger.info).toHaveBeenCalledWith(
          'OpenAI Chat Completion Usage:',
          expect.objectContaining({ usage: mockSuccessResponse.usage, estimatedCostUSD: 0 })
      );
    });

    test('should override default model and parameters with provided options', async () => {
      _mockChatCompletionsCreate.mockResolvedValue(mockSuccessResponseChat);
      const options = {
        model: mockedConfig.MODELS.GPT_4o,
        temperature: 0.9,
        maxTokens: 500,
      };
      await openAIService.generateChatCompletion(messages, options);

      expect(_mockChatCompletionsCreate).toHaveBeenCalledWith(expect.objectContaining({
        model: options.model,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        messages,
      }));
      // Check that the expected usage log was called, even if other logs were called too
      expect(logger.info).toHaveBeenCalledWith(
        'OpenAI Chat Completion Usage:',
        expect.objectContaining({ usage: mockSuccessResponseChat.usage, estimatedCostUSD: 0 })
      );
    });

    test('should return completion content on successful API call', async () => {
      const mockSuccessResponse = { choices: [{ message: { role: 'assistant', content: 'Hello User!' }, finish_reason: 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } };
      _mockChatCompletionsCreate.mockResolvedValue(mockSuccessResponse);
      const result = await openAIService.generateChatCompletion(messages);
      expect(result).toBe('Hello User!');
      expect(_mockChatCompletionsCreate).toHaveBeenCalledTimes(1);
    });

     test('should return message object when finish_reason is tool_calls', async () => {
      const mockToolCallResponse = {
        choices: [{ message: { role: 'assistant', tool_calls: [{ type: 'function', function: { name: 'getX', arguments: '{}' } }] }, finish_reason: 'tool_calls' }],
        usage: { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30 },
      };
      _mockChatCompletionsCreate.mockResolvedValue(mockToolCallResponse);
      const result = await openAIService.generateChatCompletion(messages);
      expect(result).toEqual(mockToolCallResponse.choices[0].message);
      expect(_mockChatCompletionsCreate).toHaveBeenCalledTimes(1);
      expect(logger.info).toHaveBeenCalledWith('OpenAI chat completion finished due to tool calls.');
      expect(logger.info).toHaveBeenCalledWith('OpenAI Chat Completion Usage:', expect.objectContaining({ usage: mockToolCallResponse.usage, estimatedCostUSD: 0 }));
    });

    // --- Error and Retry Tests (using test config: maxRetries=1) ---
    test('should handle retryable API errors (429) and succeed on retry', async () => {
      const mockSuccessResponse = { choices: [{ message: { role: 'assistant', content: 'Hello User!' }, finish_reason: 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } };
      const rateLimitError = new MockAPIErrorForTests(429, { message: 'Rate limit exceeded' }, 'Rate limit');
      _mockChatCompletionsCreate
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValue(mockSuccessResponse);

      const result = await openAIService.generateChatCompletion(messages);

      expect(result).toBe('Hello User!');
      expect(_mockChatCompletionsCreate).toHaveBeenCalledTimes(2);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringMatching(/^OpenAI Chat Completion failed with retryable status 429\. Retrying \(1\/1\) after \d+ms\.\.\.$/)
      );
      expect(logger.error).toHaveBeenCalledWith(
          'Error during OpenAI Chat Completion (Attempt 1)',
          { error: rateLimitError.message, status: 429 }
      );
       // Check successful usage log occurred after retry
       expect(logger.info).toHaveBeenCalledWith(
          'OpenAI Chat Completion Usage:',
          expect.objectContaining({ usage: mockSuccessResponse.usage, estimatedCostUSD: 0 })
      );
    });

    test('should fail after exhausting retries (maxRetries=1 in test config)', async () => {
      const persistentError = new MockAPIErrorForTests(503, { message: 'Service Unavailable' }, 'Service Unavailable');
      _mockChatCompletionsCreate.mockRejectedValue(persistentError);

      let caughtError = null;
      try {
        await openAIService.generateChatCompletion(messages);
      } catch (error) {
        caughtError = error;
      }

      expect(caughtError).toBeInstanceOf(MockAPIErrorForTests);
      expect(caughtError.status).toBe(503);
      expect(_mockChatCompletionsCreate).toHaveBeenCalledTimes(1 + mockedConfig.retry.maxRetries);
      expect(logger.warn).toHaveBeenCalledTimes(mockedConfig.retry.maxRetries);
      expect(logger.error).toHaveBeenCalledWith(
          expect.stringContaining(`OpenAI Chat Completion failed with status 503 after exhausting all ${mockedConfig.retry.maxRetries} retries.`)
      );
      expect(logger.error).toHaveBeenCalledWith(
          'Error during OpenAI Chat Completion (Attempt 2)',
          { error: persistentError.message, status: 503 }
      );
    });

    test('should not retry for non-retryable API errors (e.g., 400)', async () => {
      const badRequestError = new MockAPIErrorForTests(400, { message: 'Bad Request' }, 'Bad Request');
      _mockChatCompletionsCreate.mockRejectedValue(badRequestError);

      await expect(openAIService.generateChatCompletion(messages)).rejects.toThrow(MockAPIErrorForTests);
      await expect(openAIService.generateChatCompletion(messages)).rejects.toHaveProperty('status', 400);

      expect(_mockChatCompletionsCreate).toHaveBeenCalledTimes(2);
      expect(logger.warn).not.toHaveBeenCalled();
      // Check the specific non-retryable error log
      expect(logger.error).toHaveBeenCalledWith(
          expect.stringContaining('OpenAI Chat Completion failed with non-retryable status 400')
      );
      // Check the initial error log as well
      expect(logger.error).toHaveBeenCalledWith(
          'Error during OpenAI Chat Completion (Attempt 1)',
          { error: badRequestError.message, status: 400 }
      );
    });

    test('should throw original error for unexpected non-API errors', async () => {
      const unexpectedError = new Error('Something went wrong');
      _mockChatCompletionsCreate.mockRejectedValue(unexpectedError);

      await expect(openAIService.generateChatCompletion(messages)).rejects.toThrow('Something went wrong');

      expect(_mockChatCompletionsCreate).toHaveBeenCalledTimes(1);
      expect(logger.warn).not.toHaveBeenCalled();
      // Check the specific unexpected error log, including the error object
      expect(logger.error).toHaveBeenCalledWith(
          expect.stringContaining('An unexpected non-APIError occurred during OpenAI Chat Completion.'),
          unexpectedError
      );
      // Check the initial attempt error log
       expect(logger.error).toHaveBeenCalledWith(
          'Error during OpenAI Chat Completion (Attempt 1)',
          { error: unexpectedError.message, status: undefined } // Status might be undefined
      );
    });

    test('should throw error for invalid response structure', async () => {
      const invalidResponse = { choices: [] };
      _mockChatCompletionsCreate.mockResolvedValue(invalidResponse);
      await expect(openAIService.generateChatCompletion(messages)).rejects.toThrow('Invalid response structure from OpenAI Chat Completion');

      // Find the specific log call
      const errorLogCall = logger.error.mock.calls.find(
        call => call[0] === 'Invalid response structure received from OpenAI Chat Completion'
      );
      // Assert that the call was made and the second argument matches
      expect(errorLogCall).toBeDefined();
      expect(errorLogCall[1]).toEqual(invalidResponse);
    });
  });

  // --- generateEmbedding Tests ---
  describe('generateEmbedding', () => {
    test('should use default embedding model from test config', async () => {
      _mockEmbeddingsCreate.mockResolvedValue(mockSuccessResponseEmbedSingle);
      await openAIService.generateEmbedding(inputText);
      expect(_mockEmbeddingsCreate).toHaveBeenCalledWith(expect.objectContaining({
        model: mockedConfig.defaultEmbeddingModel,
        input: inputText,
      }));

      // Find the specific log call
      const infoLogCall = logger.info.mock.calls.find(
        call => call[0] === 'OpenAI Embedding Generation Usage:'
      );
       // Assert that the call was made and the second argument matches
      expect(infoLogCall).toBeDefined();
      expect(infoLogCall[1]).toEqual(
        expect.objectContaining({ usage: mockSuccessResponseEmbedSingle.usage, estimatedCostUSD: 0 })
      );
    });

    test('should override default embedding model with provided options', async () => {
      _mockEmbeddingsCreate.mockResolvedValue(mockSuccessResponseEmbedSingle);
      const options = { model: mockedConfig.MODELS.TEXT_EMBEDDING_3_LARGE };
      await openAIService.generateEmbedding(inputText, options);
      expect(_mockEmbeddingsCreate).toHaveBeenCalledWith(expect.objectContaining({
        model: options.model,
        input: inputText,
      }));

      // Find the specific log call
      const infoLogCall = logger.info.mock.calls.find(
        call => call[0] === 'OpenAI Embedding Generation Usage:'
      );
      // Assert that the call was made and the second argument matches
      expect(infoLogCall).toBeDefined();
      expect(infoLogCall[1]).toEqual(
        expect.objectContaining({ usage: mockSuccessResponseEmbedSingle.usage, estimatedCostUSD: 0 })
      );
    });

    test('should return embedding vector for single string input', async () => {
      _mockEmbeddingsCreate.mockResolvedValue(mockSuccessResponseEmbedSingle);
      const result = await openAIService.generateEmbedding(inputText);
      expect(result).toEqual([0.1, 0.2, 0.3]);
      expect(_mockEmbeddingsCreate).toHaveBeenCalledTimes(1);
    });

     test('should return array of embedding vectors for array input', async () => {
      _mockEmbeddingsCreate.mockResolvedValue(mockSuccessResponseEmbedMulti);
      const result = await openAIService.generateEmbedding(inputTexts);
      expect(result).toEqual(mockEmbeddings);
      expect(_mockEmbeddingsCreate).toHaveBeenCalledTimes(1);
      expect(_mockEmbeddingsCreate).toHaveBeenCalledWith(expect.objectContaining({ input: inputTexts }));

      // Find the specific log call
      const infoLogCall = logger.info.mock.calls.find(
        call => call[0] === 'OpenAI Embedding Generation Usage:'
      );
       // Assert that the call was made and the second argument matches
      expect(infoLogCall).toBeDefined();
      expect(infoLogCall[1]).toEqual(
        expect.objectContaining({ usage: mockSuccessResponseEmbedMulti.usage, estimatedCostUSD: 0 })
      );
    });

    // --- Error and Retry Tests (using test config: maxRetries=1) ---
    test('should handle retryable API errors (429) and succeed on retry', async () => {
      const rateLimitError = new MockAPIErrorForTests(429, { message: 'Rate limit exceeded' }, 'Rate limit');
      _mockEmbeddingsCreate
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValue(mockSuccessResponseEmbedSingle);
      const result = await openAIService.generateEmbedding(inputText);
      expect(result).toEqual(mockEmbedding);
      expect(_mockEmbeddingsCreate).toHaveBeenCalledTimes(2);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringMatching(/^OpenAI Embedding Generation failed with retryable status 429\. Retrying \(1\/1\) after \d+ms\.\.\.$/)
      );

      // Find the specific usage log call (after retry)
      const infoLogCall = logger.info.mock.calls.find(
        call => call[0] === 'OpenAI Embedding Generation Usage:'
      );
      expect(infoLogCall).toBeDefined();
      expect(infoLogCall[1]).toEqual(
        expect.objectContaining({ usage: mockSuccessResponseEmbedSingle.usage, estimatedCostUSD: 0 })
      );

      // Check warn log using .some() with regex
      expect(
        logger.warn.mock.calls.some(call =>
          typeof call[0] === 'string' &&
          call[0].match(/^OpenAI Embedding Generation failed with retryable status 429\. Retrying \(1\/1\) after \d+ms\.\.\.$/)
        )
      ).toBe(true);
    });

    test('should fail after exhausting retries (maxRetries=1 in test config)', async () => {
       const persistentError = new MockAPIErrorForTests(500, { message: 'Internal Server Error' }, 'Internal Server Error');
       _mockEmbeddingsCreate.mockRejectedValue(persistentError);

      let caughtError = null;
      try {
        await openAIService.generateEmbedding(inputText);
      } catch (error) {
        caughtError = error;
      }

      expect(caughtError).toBeInstanceOf(MockAPIErrorForTests);
      expect(caughtError.status).toBe(500);
      expect(_mockEmbeddingsCreate).toHaveBeenCalledTimes(1 + mockedConfig.retry.maxRetries);
      expect(logger.warn).toHaveBeenCalledTimes(mockedConfig.retry.maxRetries);
      // Check the final error log
      expect(logger.error).toHaveBeenCalledWith(
          expect.stringContaining(`OpenAI Embedding Generation failed with status 500 after exhausting all ${mockedConfig.retry.maxRetries} retries.`)
      );
       // Check the error log for the *last* attempt (attempt 2)
      expect(logger.error).toHaveBeenCalledWith(
          'Error during OpenAI Embedding Generation (Attempt 2)',
          { error: persistentError.message, status: 500 }
      );
    });

    test('should not retry for non-retryable API errors (e.g., 401)', async () => {
      const authError = new MockAPIErrorForTests(401, { message: 'Unauthorized' }, 'Unauthorized');
      _mockEmbeddingsCreate.mockRejectedValue(authError);

      await expect(openAIService.generateEmbedding(inputText)).rejects.toThrow(MockAPIErrorForTests);
      await expect(openAIService.generateEmbedding(inputText)).rejects.toHaveProperty('status', 401);

      expect(_mockEmbeddingsCreate).toHaveBeenCalledTimes(2);
      expect(logger.warn).not.toHaveBeenCalled();
       // Check the specific non-retryable error log
       expect(logger.error).toHaveBeenCalledWith(
           expect.stringContaining('OpenAI Embedding Generation failed with non-retryable status 401')
       );
       // Check the initial error log as well
      expect(logger.error).toHaveBeenCalledWith(
          'Error during OpenAI Embedding Generation (Attempt 1)',
          { error: authError.message, status: 401 }
      );
    });

     test('should throw error for invalid response structure (missing data)', async () => {
      const invalidResponse = {};
      _mockEmbeddingsCreate.mockResolvedValue(invalidResponse);
      await expect(openAIService.generateEmbedding(inputText)).rejects.toThrow('Invalid response structure from OpenAI Embeddings');

      // Find the specific log call
      const errorLogCall = logger.error.mock.calls.find(
        call => call[0] === 'Invalid response structure received from OpenAI Embeddings'
      );
      // Assert that the call was made and the second argument matches
      expect(errorLogCall).toBeDefined();
      expect(errorLogCall[1]).toEqual(invalidResponse);
    });

    test('should throw error for invalid response structure (missing embedding)', async () => {
      const invalidResponse = { index: 0 };
      _mockEmbeddingsCreate.mockResolvedValue({ data: [invalidResponse] });
      await expect(openAIService.generateEmbedding(inputText)).rejects.toThrow('Missing embedding in response data at index 0');

      // Find the specific log call
      const errorLogCall = logger.error.mock.calls.find(
        call => call[0] === 'Missing embedding in response data at index 0'
      );
       // Assert that the call was made and the second argument matches
      expect(errorLogCall).toBeDefined();
      expect(errorLogCall[1]).toEqual(invalidResponse);
    });
  });
}); 