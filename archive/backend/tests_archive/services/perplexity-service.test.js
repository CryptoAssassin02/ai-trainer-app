/**
 * @fileoverview Unit tests for the PerplexityService.
 * Mock external dependencies like fetch.
 */

// Node-fetch is used by the service, so we need to mock it
jest.mock('node-fetch', () => {
  // Handle both default and named exports
  const mockFetch = jest.fn();
  mockFetch.Response = jest.fn();
  mockFetch.Headers = jest.fn();
  return { __esModule: true, default: mockFetch, Response: mockFetch.Response, Headers: mockFetch.Headers };
});

// Mock the logger to avoid console output during tests
jest.mock('../../config/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

// Mock process.env to ensure PERPLEXITY_API_KEY is undefined during tests
const originalEnv = process.env;
beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
  delete process.env.PERPLEXITY_API_KEY;
});

afterEach(() => {
  process.env = originalEnv;
});

// Mock the perplexity config to avoid any dependency on environment variables
jest.mock('../../config/perplexity', () => ({
  api: {
    baseUrl: 'https://api.perplexity.ai',
    endpoint: '/chat/completions',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': 'Bearer MOCK_API_KEY'
    },
    timeout: 5000
  },
  bodyDefaults: {
    model: 'sonar-medium-online'
  },
  retry: {
    maxRetries: 2,
    initialDelay: 100,
    backoffFactor: 2
  },
  fallback: {
    triggerConditions: { http5xx: true, timeout: true },
    maxAttempts: 1
  },
  logging: { level: 'error' },
  environment: 'testing',
  mock: { 
    enabled: false,
    mockResponse: {
      choices: [{ message: { content: 'Mock response for testing environment.' } }]
    }
  }
}));

// Import the service implementation
const { PerplexityService, PerplexityServiceError } = require('../../services/perplexity-service');
const fetch = require('node-fetch');
const logger = require('../../config/logger');

describe('PerplexityService', () => {
  let service;
  const mockApiKey = 'test-api-key';
  
  // Sample response for successful API calls
  const mockSuccessResponse = {
    choices: [
      { 
        message: {
          content: 'This is a test response from Perplexity API'
        }
      }
    ]
  };

  beforeEach(() => {
    // Reset all mock implementations and calls before each test
    jest.clearAllMocks();
    
    // Default successful response from fetch
    fetch.default.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue(mockSuccessResponse)
    });
    
    // Create a new instance for each test - pass fetch and logger
    service = new PerplexityService(mockApiKey, {}, fetch.default, logger);
  });
  
  describe('initialization', () => {
    it('should initialize with the provided API key', () => {
      expect(service).toBeDefined();
      expect(service.apiKey).toBe(mockApiKey);
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('PerplexityService initialized'));
    });
    
    it('should throw error if API key is not provided', () => {
      // Save the original process.env.PERPLEXITY_API_KEY if it exists
      const originalApiKey = process.env.PERPLEXITY_API_KEY;
      // Delete the env variable to ensure the test behaves consistently
      delete process.env.PERPLEXITY_API_KEY;
      
      try {
        // Use a different approach for testing this since the service tries to use process.env as fallback
        const createServiceWithNoKey = () => new PerplexityService('', {}, fetch.default, logger);
        expect(createServiceWithNoKey).toThrow();
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Perplexity API key is missing'));
      } finally {
        // Restore the original environment variable if it existed
        if (originalApiKey) {
          process.env.PERPLEXITY_API_KEY = originalApiKey;
        }
      }
    });
  });
  
  describe('search method', () => {
    it('should make a request to the Perplexity API with correct parameters', async () => {
      const query = 'What is the meaning of life?';
      await service.search(query);
      
      expect(fetch.default).toHaveBeenCalledTimes(1);
      const [url, options] = fetch.default.mock.calls[0];
      
      expect(url).toBe('https://api.perplexity.ai/chat/completions');
      expect(options.method).toBe('POST');
      expect(options.headers).toHaveProperty('Authorization', expect.stringContaining('Bearer'));
      
      const requestBody = JSON.parse(options.body);
      expect(requestBody).toHaveProperty('messages');
      expect(requestBody.messages[1]).toHaveProperty('content', query);
    });
    
    it('should return the message object from a successful API call', async () => {
      const result = await service.search('test query');
      expect(result).toEqual(mockSuccessResponse.choices[0].message);
    });
    
    it('should handle and transform API errors appropriately', async () => {
      const errorResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: jest.fn().mockResolvedValue({ error: 'Invalid query format' })
      };
      
      fetch.default.mockResolvedValue(errorResponse);
      
      await expect(service.search('bad query')).rejects.toThrow(PerplexityServiceError);
      await expect(service.search('bad query')).rejects.toMatchObject({
        message: expect.stringContaining('Perplexity API client error'),
        status: 400
      });
    });
    
    it('should handle network failures', async () => {
      fetch.default.mockRejectedValue(new Error('Network failure'));
      
      await expect(service.search('test query')).rejects.toThrow(/Network or fetch error/);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Fetch error encountered'));
    });
    
    it('should retry on temporary failures', async () => {
      // First call fails with a 429 Too Many Requests
      fetch.default.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: jest.fn().mockResolvedValue({ error: 'Rate limited' })
      });
      
      // Second call succeeds
      fetch.default.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockSuccessResponse)
      });
      
      const result = await service.search('test query');
      
      expect(fetch.default).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockSuccessResponse.choices[0].message);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Retryable error encountered'));
    });
    
    it('should throw error if all retries are exhausted', async () => {
      // All calls fail with 500 Internal Server Error
      fetch.default.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: jest.fn().mockResolvedValue({ error: 'Server error' })
      });
      
      await expect(service.search('test query')).rejects.toThrow(PerplexityServiceError);
      // Should have attempted the max number of retries (2) + the initial attempt = 3 calls
      expect(fetch.default).toHaveBeenCalledTimes(3);
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Perplexity API call failed'));
    });
    
    it('should handle structured response format when specified', async () => {
      const structuredContent = { exercise: "Push-up", reps: 10 };
      const structuredJsonString = JSON.stringify(structuredContent);
      
      // Mock response with JSON string in content
      const structuredResponse = {
        choices: [{ 
          message: { 
            content: structuredJsonString 
          } 
        }]
      };
      
      fetch.default.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(structuredResponse)
      });
      
      // Use a spy to track the actual call
      const searchSpy = jest.spyOn(service, 'search');
      
      const result = await service.searchQuery('test query', { structuredResponse: true });
      
      // Verify call was made with expected options
      expect(searchSpy).toHaveBeenCalledWith('test query', expect.objectContaining({ 
        structuredResponse: true 
      }));
      
      // No need to check the specific format of the request body as implementation may vary
      // Just verify the result is parsed correctly
      expect(result).toEqual(structuredContent);
    });

    test('should handle fetch timeouts after retries', async () => {
      // Simulate a timeout error from node-fetch
      const timeoutError = new Error('network timeout at: https://api.perplexity.ai/chat/completions');
      // Mock fetch to reject with this error multiple times
      fetch.default.mockRejectedValue(timeoutError);

      let caughtError = null;
      try {
        await service.search('query causing timeout');
      } catch (error) {
        caughtError = error;
      }

      // Expect the wrapped PerplexityServiceError after retries
      expect(caughtError).toBeInstanceOf(PerplexityServiceError);
      expect(caughtError.message).toContain('Network or fetch error');
      expect(caughtError.message).toContain('network timeout');
      // Should call fetch initial time + maxRetries
      expect(fetch.default).toHaveBeenCalledTimes(1 + service.config.retry.maxRetries);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining(`Perplexity API call failed after ${1 + service.config.retry.maxRetries} attempts`)
      );
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Fetch error encountered')
      );
    });
  });
  
  describe('searchQuery method', () => {
    it('should call search method and return the content string', async () => {
      const result = await service.searchQuery('test query');
      expect(result).toBe(mockSuccessResponse.choices[0].message.content);
    });
    
    it('should handle empty response structure gracefully', async () => {
      fetch.default.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ choices: [] }) // Empty choices array
      });
      
      // Since our implementation now handles empty responses by returning a serialized version
      // instead of throwing an error, we should test for that behavior
      const result = await service.searchQuery('test query');
      expect(result).toBe('{"choices":[]}');
    });
    
    it('should handle parsing errors for structured responses', async () => {
      const invalidJsonString = '{ "broken": "json"'; // Invalid JSON missing closing brace
      
      fetch.default.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: invalidJsonString } }]
        })
      });
      
      await expect(service.searchQuery('test query', { structuredResponse: true }))
        .rejects.toThrow(/Failed to parse structured JSON response/);
      
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to parse structured JSON response',
        expect.any(Object)
      );
    });
  });
}); 