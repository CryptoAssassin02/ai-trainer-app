// backend/tests/setup-tests.js

// This file runs after Jest sets up the test environment but before the tests run.

// Import Jest's extended matchers (optional but common)
// import '@testing-library/jest-dom'; // If needed for DOM testing, unlikely for backend

// Mock factory functions are NOT imported at the top anymore due to hoisting issues.
// const { createMockSupabaseClient } = require('./mocks/supabase');
// const { createMockOpenAIClient } = require('./mocks/openai');
// const { createMockPerplexityClient } = require('./mocks/perplexity');

// --- Global Mocks ---

// Mock Supabase - Use require inside the factory function
jest.mock('@supabase/supabase-js', () => ({
  // Require the factory and call it inside the mock definition
  createClient: jest.fn(() => require('./mocks/supabase').createMockSupabaseClient()),
}));

// Mock Perplexity services
jest.mock('../services/perplexity-service', () => {
  const mockClient = require('./mocks/perplexity').createMockPerplexityClient();
  return {
    PerplexityService: jest.fn().mockImplementation(() => ({
      search: jest.fn().mockResolvedValue({ content: 'Mocked Perplexity response' }),
      searchQuery: jest.fn().mockResolvedValue('Mocked Perplexity query response')
    })),
    PerplexityServiceError: jest.fn().mockImplementation((message, status, details) => ({
      message,
      status,
      details,
      name: 'PerplexityServiceError'
    })),
    getPerplexityClient: jest.fn().mockReturnValue(mockClient)
  };
});

// Mock node-fetch using the external mock file
jest.mock('node-fetch', () => require('./mocks/node-fetch'));

// Mock bcrypt using the external mock file
jest.mock('bcrypt', () => require('./mocks/bcrypt'));

// Mock the logger utility
jest.mock('../utils/logger', () => require('./mocks/logger'));

// --- ADD Correct Global Mock for Config/Logger ---
// Mock the main config export used by server.js and others
jest.mock('../config', () => {
  // Re-export env mock if config/index.js normally exports it
  const mockEnv = require('./mocks/env'); 
  // Reuse the logger mock
  const mockLogger = require('./mocks/logger');
  
  // Return the structure expected by imports like: const { env, logger } = require('../config');
  return {
    env: mockEnv, // Provide the mocked env
    logger: mockLogger, // Provide the correctly structured logger mock
    // Mock other exports from ../config/index.js if necessary
  };
});

// Mock configuration files directly (Keep these if other modules import them directly)
jest.mock('../config/env', () => require('./mocks/env'));
jest.mock('../config/openai', () => ({
  MODELS: {
    GPT_4o: 'gpt-4o',
    GPT_4_TURBO: 'gpt-4-turbo',
    GPT_4o_MINI: 'gpt-4o-mini',
    GPT_3_5_TURBO: 'gpt-3.5-turbo-0125',
    TEXT_EMBEDDING_3_SMALL: 'text-embedding-3-small',
    TEXT_EMBEDDING_3_LARGE: 'text-embedding-3-large',
    TEXT_EMBEDDING_ADA_002: 'text-embedding-ada-002'
  },
  defaultChatModel: 'gpt-3.5-turbo-0125',
  defaultEmbeddingModel: 'text-embedding-3-small',
  temperature: 0.7,
  retry: {
    maxRetries: 1,
    initialDelayMs: 100,
    retryableStatusCodes: [429, 500, 502, 503, 504]
  },
  utils: {
    estimateTokens: jest.fn(text => Math.ceil(text.length / 4)),
    estimateCost: jest.fn(() => 0.001)
  }
}));
jest.mock('../config/perplexity', () => ({
  environment: 'test',
  api: {
    baseUrl: 'https://mock-perplexity-api.com',
    endpoint: '/v1/chat/completions',
    timeout: 1000,
    headers: {
      'Content-Type': 'application/json'
    }
  },
  bodyDefaults: {
    model: 'mock-perplexity-model'
  },
  retry: {
    maxRetries: 1,
    initialDelay: 100,
    backoffFactor: 1.5
  },
  mock: {
    enabled: true,
    mockResponse: {
      choices: [
        {
          message: {
            content: 'Mocked Perplexity content'
          }
        }
      ]
    }
  }
}));

// --- Environment Variable Management ---

const originalEnv = process.env;

beforeAll(() => {
  // Set default mock environment variables for tests
  process.env = {
    ...originalEnv, // Keep original env vars
    NODE_ENV: 'test', // Standard practice
    SUPABASE_URL: 'MOCK_SUPABASE_URL',
    SUPABASE_ANON_KEY: 'MOCK_SUPABASE_ANON_KEY',
    OPENAI_API_KEY: 'MOCK_OPENAI_KEY',
    PERPLEXITY_API_KEY: 'MOCK_PERPLEXITY_KEY',
    JWT_SECRET: 'MOCK_JWT_SECRET_FOR_TESTING',
    // Add other required env vars
  };
});

afterAll(() => {
  // Restore original environment variables
  process.env = originalEnv;
});

// --- Jest Lifecycle Hooks ---

beforeEach(() => {
  // Reset mocks before each test. jest.clearAllMocks() is called automatically
  // due to `clearMocks: true` in jest.config.js.
  // However, if mocks need specific state resets beyond clearing calls, do it here.
  jest.clearAllMocks();
});

// Global setup before all tests (if needed)
beforeAll(() => {
  // Example: Set up a mock database connection pool or other global resource
  // console.log('Running global beforeAll setup...');
});

// Global teardown after all tests (if needed)
afterAll(() => {
  // Example: Close database connections or clean up global resources
  // console.log('Running global afterAll teardown...');
});

// Here we will add global mocks for external dependencies like Supabase, OpenAI, etc.
// This ensures a consistent mocking strategy across all tests.

// Example (to be implemented properly later):
// jest.mock('@supabase/supabase-js', () => ({
//   createClient: jest.fn(() => ({
//     from: jest.fn().mockReturnThis(),
//     select: jest.fn().mockResolvedValue({ data: [], error: null }),
//     insert: jest.fn().mockResolvedValue({ data: [], error: null }),
//     update: jest.fn().mockResolvedValue({ data: [], error: null }),
//     delete: jest.fn().mockResolvedValue({ data: [], error: null }),
//     rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
//     auth: {
//       signUp: jest.fn().mockResolvedValue({ user: { id: 'mock-user-id' }, session: null, error: null }),
//       signInWithPassword: jest.fn().mockResolvedValue({ user: { id: 'mock-user-id' }, session: { access_token: 'mock-token' }, error: null }),
//       // ... other auth methods
//     }
//   }))
// }));

// Mock environment variables (important for security and consistency)
// process.env.SUPABASE_URL = 'mock_url';
// process.env.SUPABASE_ANON_KEY = 'mock_key';
// process.env.OPENAI_API_KEY = 'mock_openai_key';
// process.env.PERPLEXITY_API_KEY = 'mock_perplexity_key';
// // It might be better to manage mock env vars centrally, e.g., using jest.config.js or a helper 

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'MOCK_SUPABASE_URL';
process.env.SUPABASE_ANON_KEY = 'MOCK_SUPABASE_ANON_KEY';
process.env.OPENAI_API_KEY = 'MOCK_OPENAI_KEY';
process.env.PERPLEXITY_API_KEY = 'MOCK_PERPLEXITY_KEY';
process.env.JWT_SECRET = 'test-jwt-secret';

// Properly mock getPerplexityClient
jest.mock('../config/perplexity', () => {
  const mockResearch = jest.fn().mockResolvedValue({
    text: 'Mock Perplexity research response'
  });
  
  const mockClient = {
    research: mockResearch
  };
  
  return {
    getPerplexityClient: jest.fn().mockReturnValue(mockClient)
  };
});

// Mock bcrypt
jest.mock('bcrypt', () => ({
  compare: jest.fn().mockResolvedValue(true),
  hash: jest.fn().mockResolvedValue('mocked-hash-value')
}));

// Mock logger
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
})); 