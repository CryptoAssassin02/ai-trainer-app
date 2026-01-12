/**
 * Test Utilities for Backend Unit Tests
 * 
 * This file provides common testing utilities and helpers to standardize
 * test patterns across the backend.
 */

const { getSupabaseClient } = require('../../services/supabase');
const { getClient: getOpenAIClient } = require('../../services/openai-service');

/**
 * Creates a mock request object for testing Express routes and middleware
 * 
 * @param {Object} options - Options to configure the mock request
 * @param {Object} options.body - Request body
 * @param {Object} options.query - Query parameters
 * @param {Object} options.params - Route parameters
 * @param {Object} options.headers - Request headers
 * @param {Object} options.user - Authenticated user object
 * @param {Object} options.cookies - Request cookies
 * @returns {Object} - A mock request object
 */
const mockRequest = (options = {}) => {
  const {
    body = {},
    query = {},
    params = {},
    headers = {},
    user = null,
    cookies = {},
  } = options;
  
  return {
    body,
    query,
    params,
    headers,
    user,
    cookies,
    get: jest.fn((header) => headers[header.toLowerCase()]),
  };
};

/**
 * Creates a mock response object for testing Express routes and middleware
 * 
 * @returns {Object} - A mock response object with Jest spy methods
 */
const mockResponse = () => {
  const res = {};
  
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.sendStatus = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  
  return res;
};

/**
 * Creates a mock next function for testing Express middleware
 * 
 * @returns {Function} - A Jest mock function
 */
const mockNext = jest.fn();

/**
 * Generates test user data for authentication tests
 * 
 * @param {Object} overrides - Fields to override in the default user object
 * @returns {Object} - A test user object
 */
const generateTestUser = (overrides = {}) => {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    ...overrides,
  };
};

/**
 * Generates a mock JWT token for testing authentication
 * 
 * @param {Object} payload - Token payload
 * @returns {String} - A mock JWT token
 */
const generateMockToken = (payload = {}) => {
  return `mock-jwt-token-${JSON.stringify(payload)}`;
};

/**
 * Creates a mock Supabase response for testing database interactions
 * 
 * @param {Object} data - The mock data to return
 * @param {Error|null} error - The mock error to return
 * @returns {Object} - A mock Supabase response
 */
const mockSupabaseResponse = (data = null, error = null) => {
  return { data, error };
};

/**
 * Utility to create a mock for testing rate limiting
 * 
 * @returns {Object} - Rate limiter mock
 */
const mockRateLimiter = () => {
  return {
    consume: jest.fn().mockResolvedValue({ remainingPoints: 10 }),
  };
};

/**
 * Utility to create mock API responses for external services
 */
const mockApiResponses = {
  openai: {
    completion: (content = 'Mock OpenAI response') => ({
      choices: [{
        message: { content }
      }]
    }),
    embedding: (dimensions = 3) => ({
      data: [{
        embedding: Array(dimensions).fill(0).map((_, i) => i / dimensions)
      }]
    })
  },
  perplexity: {
    response: (content = 'Mock Perplexity response') => ({
      choices: [{
        message: {
          content: JSON.stringify({ result: content })
        }
      }]
    })
  }
};

/**
 * Sleep utility for testing async operations
 * 
 * @param {Number} ms - Milliseconds to sleep
 * @returns {Promise} - Resolves after the specified time
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Utility to reset all mocks between tests
 */
const resetAllMocks = () => {
  jest.clearAllMocks();
  
  // Reset supabase client mock
  const supabaseClient = getSupabaseClient();
  const mockFrom = supabaseClient.from;
  if (mockFrom && mockFrom.mockClear) {
    mockFrom.mockClear();
  }
  
  // Reset OpenAI client mock
  const openaiClient = getOpenAIClient();
  if (openaiClient.chat?.completions?.create?.mockClear) {
    openaiClient.chat.completions.create.mockClear();
  }
  if (openaiClient.embeddings?.create?.mockClear) {
    openaiClient.embeddings.create.mockClear();
  }
};

module.exports = {
  mockRequest,
  mockResponse,
  mockNext,
  generateTestUser,
  generateMockToken,
  mockSupabaseResponse,
  mockRateLimiter,
  mockApiResponses,
  sleep,
  resetAllMocks,
}; 