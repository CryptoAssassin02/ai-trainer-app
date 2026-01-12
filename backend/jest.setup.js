// Load environment variables from .env.test
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.test') });

// Set NODE_ENV to test
process.env.NODE_ENV = 'test';

// Mock environment variables for testing
process.env.SUPABASE_URL = 'https://test-url.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';

// Create a mock env object that will be used when mocking config/env
const mockEnv = {
  env: 'test',
  port: 8000,
  supabase: {
    url: 'https://test-url.supabase.co',
    anonKey: 'test-anon-key', 
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  openai: {
    apiKey: 'test-openai-key',
    organization: 'test-org',
    model: 'gpt-4'
  },
  perplexity: {
    apiKey: 'test-perplexity-key'
  },
  redis: {
    url: 'redis://localhost:6379'
  },
  jwt: {
    secret: 'test-jwt-secret',
    accessExpiration: '15m',
    refreshExpiration: '7d'
  }
};

// Mock the env module
jest.mock('./config/env', () => mockEnv);
jest.mock('./config', () => ({
  env: mockEnv,
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    fatal: jest.fn(),
    requestFormat: jest.fn().mockReturnValue({})
  }
}));

// Mock modules at the beginning
jest.mock('./utils/retry-utils', () => ({
  retryWithBackoff: jest.fn((fn) => fn())
}), { virtual: true });

// Mock node-fetch for all external API calls
jest.mock('node-fetch', () => {
  return jest.fn(() => 
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        choices: [
          { 
            message: { 
              content: JSON.stringify({ 
                result: 'Test response from Perplexity API' 
              }) 
            }
          }
        ]
      }),
      text: () => Promise.resolve('Test text response from API')
    })
  );
});

// Mock OpenAI service without using import syntax
jest.mock('./services/openai-service', () => ({
  getClient: jest.fn().mockReturnValue({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{
            message: { content: 'Test response from OpenAI' }
          }]
        })
      }
    },
    embeddings: {
      create: jest.fn().mockResolvedValue({
        data: [{ embedding: [0.1, 0.2, 0.3] }]
      })
    }
  })
}), { virtual: true });

// Mock Supabase with enhanced support for transaction and mutex operations (Step 14 - Concurrency)
jest.mock('./services/supabase', () => {
  const mockTransaction = jest.fn().mockImplementation(async (callback) => {
    // Mock transaction behavior by just calling the callback
    return await callback({ from: jest.fn().mockReturnThis() });
  });
  
  const baseQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockResolvedValue({ data: [], error: null }),
    in: jest.fn().mockResolvedValue({ data: [], error: null }),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    match: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    textSearch: jest.fn().mockReturnThis(),
    filter: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
  };
  
  const mockSupabaseClient = {
    from: jest.fn().mockReturnValue({
      ...baseQueryBuilder,
      insert: jest.fn().mockResolvedValue({ data: {}, error: null }),
      update: jest.fn().mockResolvedValue({ data: {}, error: null }),
      delete: jest.fn().mockResolvedValue({ data: {}, error: null }),
      upsert: jest.fn().mockResolvedValue({ data: {}, error: null }),
    }),
    rpc: jest.fn().mockResolvedValue({ data: {}, error: null }),
    storage: {
      from: jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({ data: {}, error: null }),
        download: jest.fn().mockResolvedValue({ data: {}, error: null }),
        getPublicUrl: jest.fn().mockReturnValue({ publicURL: 'https://example.com/file.pdf' }),
      })
    },
    auth: {
      signUp: jest.fn().mockResolvedValue({ data: {}, error: null }),
      signIn: jest.fn().mockResolvedValue({ data: {}, error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null }),
      getSession: jest.fn().mockResolvedValue({ data: { session: { access_token: 'test-token' } }, error: null }),
    }
  };
  
  return {
    getSupabaseClient: jest.fn().mockReturnValue(mockSupabaseClient),
    supabaseClient: mockSupabaseClient,
    performTransaction: mockTransaction
  };
});

// Mock mutex for testing concurrency operations (Step 14)
jest.mock('async-mutex', () => {
  return {
    Mutex: jest.fn().mockImplementation(() => ({
      acquire: jest.fn().mockImplementation(async (callback) => {
        if (callback) {
          return await callback();
        }
        return jest.fn().mockResolvedValue(true);
      }),
      release: jest.fn().mockResolvedValue(true),
      isLocked: jest.fn().mockReturnValue(false),
      waitForUnlock: jest.fn().mockResolvedValue(true),
      runExclusive: jest.fn().mockImplementation(async (callback) => {
        return await callback();
      })
    }))
  };
});

// Mock OpenAI
jest.mock('openai', () => {
  const _mockChatCompletionsCreate = jest.fn().mockResolvedValue({
    choices: [{
      message: { content: 'Test response from OpenAI' }
    }]
  });
  
  const _mockEmbeddingsCreate = jest.fn().mockResolvedValue({
    data: [{ embedding: [0.1, 0.2, 0.3] }]
  });
  
  const OpenAIApi = jest.fn().mockImplementation(() => {
    return {
      createChatCompletion: _mockChatCompletionsCreate,
      createEmbedding: _mockEmbeddingsCreate
    };
  });
  
  return {
    Configuration: jest.fn(),
    OpenAIApi,
    _mockChatCompletionsCreate,
    _mockEmbeddingsCreate,
    APIError: class extends Error {}
  };
});

// Mock security modules (Step 15)
jest.mock('express-rate-limit', () => {
  return jest.fn().mockImplementation(() => (req, res, next) => next());
});

jest.mock('helmet', () => {
  return jest.fn().mockImplementation(() => (req, res, next) => next());
});

jest.mock('cors', () => {
  return jest.fn().mockImplementation(() => (req, res, next) => next());
});

jest.mock('jsonwebtoken', () => {
  return {
    sign: jest.fn().mockImplementation(() => 'mock-token'),
    verify: jest.fn().mockImplementation((token, secret, callback) => {
      if (token === 'invalid-token') {
        const error = new Error('jwt malformed');
        error.name = 'JsonWebTokenError';
        if (callback) {
          return callback(error);
        }
        throw error;
      } else if (token === 'expired-token') {
        const error = new Error('jwt expired');
        error.name = 'TokenExpiredError';
        if (callback) {
          return callback(error);
        }
        throw error;
      }
      
      const decoded = { userId: 'test-user-id', role: 'user' };
      if (callback) {
        return callback(null, decoded);
      }
      return decoded;
    })
  };
});

// Mock Redis for caching and token blacklisting (Step 15)
jest.mock('redis', () => {
  const mockRedisClient = {
    connect: jest.fn().mockResolvedValue(true),
    quit: jest.fn().mockResolvedValue(true),
    on: jest.fn(),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    setEx: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    exists: jest.fn().mockResolvedValue(0),
    scan: jest.fn().mockResolvedValue({ keys: [], cursor: '0' }),
  };
  
  return {
    createClient: jest.fn().mockReturnValue(mockRedisClient)
  };
});

// Mock bcrypt for password hashing
jest.mock('bcryptjs', () => {
  return {
    hash: jest.fn().mockImplementation((password, saltRounds) => Promise.resolve(`hashed_${password}`)),
    compare: jest.fn().mockImplementation((password, hash) => Promise.resolve(hash === `hashed_${password}`)),
    genSalt: jest.fn().mockResolvedValue('mocksalt')
  };
});

// Mock the Errors module for typed errors from Step 16
jest.mock('./utils/errors', () => {
  // Define ERROR_CODES constant to match the real implementation
  const ERROR_CODES = {
    VALIDATION_ERROR: 'AGENT_VALIDATION_ERROR',
    PROCESSING_ERROR: 'AGENT_PROCESSING_ERROR',
    EXTERNAL_SERVICE_ERROR: 'AGENT_EXTERNAL_SERVICE_ERROR',
    RESOURCE_ERROR: 'AGENT_RESOURCE_ERROR',
    MEMORY_SYSTEM_ERROR: 'AGENT_MEMORY_SYSTEM_ERROR',
    CONFIGURATION_ERROR: 'AGENT_CONFIGURATION_ERROR',
    CONCURRENCY_ERROR: 'AGENT_CONCURRENCY_ERROR'
  };

  // Base API Error class that matches the real implementation
  class ApiError extends Error {
    constructor(message, statusCode, details = null, isOperational = true) {
      super(message);
      this.name = this.constructor.name;
      this.statusCode = statusCode;
      this.details = details;
      this.isOperational = isOperational;
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  // AgentError implementation that matches the real implementation
  class AgentError extends Error {
    constructor(message, code = ERROR_CODES.PROCESSING_ERROR, details = null, originalError = null, isOperational = true) {
      super(message);
      this.name = this.constructor.name;
      this.code = code;
      this.details = details;
      this.originalError = originalError;
      this.isOperational = isOperational;
      
      // Combine stack traces if originalError is provided
      if (originalError && originalError.stack) {
        this.stack = `${this.stack}\nCaused by: ${originalError.stack}`;
      } else {
        // Maintain proper stack trace otherwise
        Error.captureStackTrace(this, this.constructor);
      }
    }
  }
  
  class ValidationError extends ApiError {
    constructor(message = 'Validation failed', details = null) {
      super(message, 400, details);
      this.code = 'VALIDATION_ERROR';
      
      // Ensure errors is properly formatted as an array of {field, message} objects
      if (details) {
        if (Array.isArray(details)) {
          this.errors = details.map(item => {
            if (typeof item === 'object' && item !== null) {
              return {
                field: item.field || 'unknown',
                message: item.message || String(item)
              };
            } else {
              return { field: 'unknown', message: String(item) };
            }
          });
        } else if (typeof details === 'object' && details !== null && details.field) {
          this.errors = [{
            field: details.field, 
            message: details.message || message
          }];
        } else {
          this.errors = [{ field: 'unknown', message: String(details) }];
        }
      } else {
        this.errors = [{ field: 'unknown', message }];
      }
    }
  }
  
  class AuthenticationError extends ApiError {
    constructor(message = 'Authentication required', details = null) {
      super(message, 401, details);
    }
  }
  
  class AuthorizationError extends ApiError {
    constructor(message = 'Insufficient permissions', details = null) {
      super(message, 403, details);
    }
  }
  
  class NotFoundError extends ApiError {
    constructor(message = 'Resource not found', details = null) {
      super(message, 404, details);
    }
  }
  
  class ConflictError extends ApiError {
    constructor(message = 'Resource conflict', details = null) {
      super(message, 409, details);
    }
  }
  
  class ConcurrencyConflictError extends ApiError {
    constructor(message = 'Resource was modified by another process', details = null) {
      super(message, 409, details, true);
      this.code = ERROR_CODES.CONCURRENCY_ERROR;
    }
  }
  
  class RateLimitError extends ApiError {
    constructor(message = 'Rate limit exceeded', details = null) {
      super(message, 429, details);
    }
  }
  
  class DatabaseError extends ApiError {
    constructor(message = 'Database operation failed', details = null) {
      super(message, 500, details);
      this.code = 'DATABASE_ERROR';
    }
  }
  
  class ApplicationError extends ApiError {
    constructor(message = 'Application error', details = null) {
      super(message, 500, details);
    }
  }
  
  class InternalError extends ApiError {
    constructor(message = 'Internal server error', details = null) {
      super(message, 500, details);
    }
  }
  
  class ServiceUnavailableError extends ApiError {
    constructor(message = 'Service unavailable', details = null) {
      super(message, 503, details);
    }
  }
  
  // Mock JWT-related errors for improved error verification
  const jwt = {
    JsonWebTokenError: class JsonWebTokenError extends Error {
      constructor(message) {
        super(message);
        this.name = 'JsonWebTokenError';
      }
    },
    TokenExpiredError: class TokenExpiredError extends Error {
      constructor(message) {
        super(message);
        this.name = 'TokenExpiredError';
      }
    }
  };
  
  return {
    ApiError,
    AgentError,
    ERROR_CODES,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ConflictError,
    ConcurrencyConflictError,
    RateLimitError,
    DatabaseError,
    ApplicationError,
    InternalError,
    ServiceUnavailableError,
    jwt,
    formatErrorResponse: jest.fn((err) => {
      // Default to 500 internal server error for unknown errors
      if (!(err instanceof ApiError)) {
        const isOperational = err.isOperational !== undefined ? err.isOperational : false;
        return {
          status: 'error',
          message: isOperational || process.env.NODE_ENV !== 'production' 
            ? err.message 
            : 'Internal server error',
          error: process.env.NODE_ENV === 'production' ? undefined : err.message
        };
      }
      
      // Format API error response
      const response = {
        status: 'error',
        message: err.message
      };
      
      // Add ValidationError's errors array if present
      if (err instanceof ValidationError && err.errors) {
        response.errors = err.errors;
      }
      // Add error details if available
      else if (err.details) {
        if (Array.isArray(err.details)) {
          response.errors = err.details;
        } else {
          response.error = err.details;
        }
      }
      
      // Add error code if available (e.g., for ConcurrencyConflictError)
      if (err.code) {
        response.errorCode = err.code;
      }
      
      return response;
    }),
  };
});

// Handle console output during tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

console.error = (...args) => {
  // Keep this for debugging but don't output during tests
  if (process.env.DEBUG_TESTS) {
    originalConsoleError(...args);
  }
};

console.warn = (...args) => {
  // Keep this for debugging but don't output during tests
  if (process.env.DEBUG_TESTS) {
    originalConsoleWarn(...args);
  }
};

console.log = (...args) => {
  // Keep this for debugging but don't output during tests
  if (process.env.DEBUG_TESTS) {
    originalConsoleLog(...args);
  }
};

// Set up global Jest hooks
global.beforeEach = jest.fn((fn) => {
  if (typeof jest.beforeEach === 'function') {
    jest.beforeEach(fn);
  }
});

global.afterEach = jest.fn((fn) => {
  if (typeof jest.afterEach === 'function') {
    jest.afterEach(fn);
  }
});

global.beforeAll = jest.fn((fn) => {
  if (typeof jest.beforeAll === 'function') {
    jest.beforeAll(fn);
  }
});

global.afterAll = jest.fn((fn) => {
  if (typeof jest.afterAll === 'function') {
    jest.afterAll(fn);
  }
});

// Don't register global hooks here, as Jest already provides them
// Just use this setup file to configure mocks and environment 