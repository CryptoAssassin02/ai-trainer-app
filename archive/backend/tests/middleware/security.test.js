/**
 * @jest-environment node
 */

const express = require('express');
const request = require('supertest');
const helmet = require('helmet');
const cors = require('cors');
const { randomBytes } = require('crypto');
const cookieParser = require('cookie-parser');

// Mock the dependencies
jest.mock('helmet', () => {
  return jest.fn(() => (req, res, next) => {
    next();
  });
});

jest.mock('cors', () => {
  return jest.fn(() => (req, res, next) => {
    next();
  });
});

jest.mock('crypto', () => {
  return {
    randomBytes: jest.fn().mockReturnValue({
      toString: jest.fn().mockReturnValue('mock-csrf-token')
    })
  };
});

// Mock the config
jest.mock('../../config', () => {
  return {
    env: {
      env: 'test',
      cors: {
        origin: 'http://localhost:3000,https://trainer-app.com'
      },
      supabase: {
        url: 'https://mock-supabase-url.com'
      },
      security: {
        csrfProtection: true
      }
    },
    logger: {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    }
  };
});

// Import the module under test after mocks
const securityMiddleware = require('../../middleware/security');

describe('Security Middleware', () => {
  let app;
  let server;
  
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Create a fresh Express app for each test
    app = express();
    app.use(express.json());
    
    // Add cookie-parser middleware for CSRF tests
    app.use(cookieParser());
  });
  
  afterEach(() => {
    if (server) {
      server.close();
    }
  });
  
  describe('configureHelmet', () => {
    it('should configure helmet with appropriate security headers', () => {
      // Call the function
      const helmetMiddleware = securityMiddleware.configureHelmet();
      
      // Apply it to our test app
      app.use(helmetMiddleware);
      
      // Check that helmet was called with the correct options
      expect(helmet).toHaveBeenCalledTimes(1);
      
      // Verify the options passed to helmet
      const helmetOptions = helmet.mock.calls[0][0];
      expect(helmetOptions).toHaveProperty('contentSecurityPolicy');
      expect(helmetOptions).toHaveProperty('hsts');
      expect(helmetOptions.hsts.maxAge).toBe(31536000);
      expect(helmetOptions.hidePoweredBy).toBe(true);
      expect(helmetOptions.xssFilter).toBe(true);
      expect(helmetOptions.noSniff).toBe(true);
      expect(helmetOptions.frameguard.action).toBe('deny');
    });
  });
  
  describe('configureCors', () => {
    it('should configure cors with environment-aware settings', () => {
      // Call the function
      const corsMiddleware = securityMiddleware.configureCors();
      
      // Apply it to our test app
      app.use(corsMiddleware);
      
      // Check that cors was called once
      expect(cors).toHaveBeenCalledTimes(1);
      
      // Verify the options passed to cors
      const corsOptions = cors.mock.calls[0][0];
      expect(corsOptions).toHaveProperty('origin');
      expect(corsOptions).toHaveProperty('methods');
      expect(corsOptions).toHaveProperty('allowedHeaders');
      expect(corsOptions.credentials).toBe(true);
      expect(corsOptions.maxAge).toBe(86400);
      
      // Test the origin function
      const callback = jest.fn();
      
      // Test allowed origin
      corsOptions.origin('http://localhost:3000', callback);
      expect(callback).toHaveBeenCalledWith(null, true);
      
      // Test non-allowed origin
      corsOptions.origin('http://evil-site.com', callback);
      expect(callback).toHaveBeenCalledWith(null, true); // Should be true in test environment
      
      // Test undefined origin (like from curl)
      corsOptions.origin(undefined, callback);
      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('should properly parse allowed origins from environment', () => {
      const corsMiddleware = securityMiddleware.configureCors();
      app.use(corsMiddleware);
      
      const corsOptions = cors.mock.calls[0][0];
      const callback = jest.fn();
      
      // Both origins should be allowed
      corsOptions.origin('http://localhost:3000', callback);
      expect(callback).toHaveBeenCalledWith(null, true);
      
      corsOptions.origin('https://trainer-app.com', callback);
      expect(callback).toHaveBeenCalledWith(null, true);
    });
  });
  
  describe('csrfProtection', () => {
    // We'll test the function itself in isolation first
    it('should return token generation and verification functions', () => {
      const csrf = securityMiddleware.csrfProtection();
      expect(typeof csrf.generateToken).toBe('function');
      expect(typeof csrf.verifyToken).toBe('function');
    });
    
    // Test token generation function
    it('should generate a CSRF token and set it in cookies', () => {
      // Create mocks
      const req = {};
      const res = { cookie: jest.fn() };
      const next = jest.fn();
      
      // Reset mocks
      randomBytes.mockImplementation(() => ({
        toString: jest.fn().mockReturnValue('test-csrf-token')
      }));
      
      // Get the CSRF middleware
      const csrf = securityMiddleware.csrfProtection();
      
      // Call the generate token function
      csrf.generateToken(req, res, next);
      
      // Verify the token was set in the cookie
      expect(res.cookie).toHaveBeenCalledWith(
        'XSRF-TOKEN', 
        'test-csrf-token', 
        expect.objectContaining({
          httpOnly: false,
          sameSite: 'strict'
        })
      );
      
      // Verify the token was set in the request
      expect(req.csrfToken).toBe('test-csrf-token');
      
      // Verify next was called
      expect(next).toHaveBeenCalled();
    });
    
    // Test verifyToken function skipping GET requests
    it('should skip CSRF verification for GET requests', () => {
      // Create mocks
      const req = { method: 'GET' };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();
      
      // Get the CSRF middleware
      const csrf = securityMiddleware.csrfProtection();
      
      // Call the verify token function
      csrf.verifyToken(req, res, next);
      
      // Verify next was called without checking token
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
    
    // Test verifyToken function with valid token
    it('should pass verification with valid CSRF token', () => {
      // Create mocks
      const req = {
        method: 'POST',
        headers: { 'x-csrf-token': 'valid-token' },
        cookies: { 'XSRF-TOKEN': 'valid-token' },
        ip: '127.0.0.1',
        originalUrl: '/test'
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();
      
      // Get the CSRF middleware
      const csrf = securityMiddleware.csrfProtection();
      
      // Call the verify token function
      csrf.verifyToken(req, res, next);
      
      // Verify next was called
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
    
    // Test verifyToken function with invalid token
    it('should reject requests with invalid CSRF token', () => {
      // Create mocks
      const req = {
        method: 'POST',
        headers: { 'x-csrf-token': 'invalid-token' },
        cookies: { 'XSRF-TOKEN': 'valid-token' },
        ip: '127.0.0.1',
        originalUrl: '/test'
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();
      
      // Get the CSRF middleware
      const csrf = securityMiddleware.csrfProtection();
      
      // Call the verify token function
      csrf.verifyToken(req, res, next);
      
      // Verify response was 403
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        message: 'CSRF validation failed'
      }));
    });
    
    // Test with CSRF protection disabled
    it('should return dummy middlewares if CSRF protection is disabled', () => {
      // Override mock to disable CSRF
      const originalSecurity = { ...require('../../config').env.security };
      require('../../config').env.security = { csrfProtection: false };
      
      // Get the CSRF middleware
      const csrf = securityMiddleware.csrfProtection();
      
      // Verify dummy functions
      expect(typeof csrf.generateToken).toBe('function');
      expect(typeof csrf.verifyToken).toBe('function');
      
      // Test dummy functions
      const req = {};
      const res = {};
      const next = jest.fn();
      
      // Generate token should just call next
      csrf.generateToken(req, res, next);
      expect(next).toHaveBeenCalled();
      
      // Reset and test verify token
      next.mockClear();
      csrf.verifyToken(req, res, next);
      expect(next).toHaveBeenCalled();
      
      // Restore mock
      require('../../config').env.security = originalSecurity;
    });
  });
  
  describe('sqlInjectionProtection', () => {
    // Create a function to test sqlInjectionProtection middleware directly 
    const testSqlInjection = (input) => {
      // Get the SQL injection middleware
      const middleware = securityMiddleware.sqlInjectionProtection();
      
      // Build a mock request based on the input type
      let req;
      if (typeof input === 'object' && input !== null) {
        // Use the input as the request body
        req = { 
          body: input, 
          params: {}, 
          query: {}, 
          ip: '127.0.0.1', 
          originalUrl: '/test', 
          method: 'POST' 
        };
      } else if (typeof input === 'string') {
        // Put the string in the body
        req = { 
          body: { test: input }, 
          params: {}, 
          query: {}, 
          ip: '127.0.0.1', 
          originalUrl: '/test', 
          method: 'POST' 
        };
      }
      
      // Create mock response and next function
      const res = { 
        status: jest.fn().mockReturnThis(), 
        json: jest.fn() 
      };
      const next = jest.fn();
      
      // Call the middleware
      middleware(req, res, next);
      
      // Return the test result
      return {
        passed: next.mock.calls.length > 0,
        statusCode: res.status.mock.calls.length ? res.status.mock.calls[0][0] : null,
        response: res.json.mock.calls.length ? res.json.mock.calls[0][0] : null
      };
    };
    
    it('should allow valid input', () => {
      const result = testSqlInjection({
        name: 'John Doe',
        email: 'john@example.com',
        message: 'This is a normal message'
      });
      
      expect(result.passed).toBe(true);
    });
    
    it('should block basic SQL injection patterns', () => {
      const result = testSqlInjection("Robert'); DROP TABLE Users;--");
      
      expect(result.passed).toBe(false);
      expect(result.statusCode).toBe(403);
      expect(result.response).toHaveProperty('message', 'Request contains disallowed characters or patterns');
    });
    
    it('should block SQL commands', () => {
      const result = testSqlInjection("SELECT * FROM users");
      
      expect(result.passed).toBe(false);
      expect(result.statusCode).toBe(403);
    });
    
    it('should block SQL stored procedures', () => {
      const result = testSqlInjection("EXEC sp_MSforeachtable 'DROP TABLE ?'");
      
      expect(result.passed).toBe(false);
      expect(result.statusCode).toBe(403);
    });
    
    it('should detect SQL injection in query parameters', () => {
      // Get the SQL injection middleware
      const middleware = securityMiddleware.sqlInjectionProtection();
      
      // Create a mock request with SQL injection in query params
      const req = { 
        body: {}, 
        params: {}, 
        query: { id: "1' OR '1'='1" }, 
        ip: '127.0.0.1', 
        originalUrl: '/test?id=1%27%20OR%20%271%27=%271%27', 
        method: 'GET' 
      };
      
      // Create mock response and next function
      const res = { 
        status: jest.fn().mockReturnThis(), 
        json: jest.fn() 
      };
      const next = jest.fn();
      
      // Call the middleware
      middleware(req, res, next);
      
      // Verify the response
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        message: 'Request contains disallowed characters or patterns'
      }));
    });
    
    it('should detect SQL injection in nested objects', () => {
      const result = testSqlInjection({
        user: {
          name: 'John',
          preferences: {
            theme: "dark'); INSERT INTO malicious_table VALUES('hack"
          }
        }
      });
      
      expect(result.passed).toBe(false);
      expect(result.statusCode).toBe(403);
    });
    
    it('should ignore non-string values', () => {
      const result = testSqlInjection({
        name: 'John',
        age: 30,
        verified: true,
        scores: [95, 87, 92]
      });
      
      expect(result.passed).toBe(true);
    });
  });
  
  describe('setupSecurityMiddleware', () => {
    it('should apply all security middleware to the app', () => {
      // Create a spy for Express app.use
      const app = {
        use: jest.fn()
      };
      
      // Call the function
      securityMiddleware.setupSecurityMiddleware(app);
      
      // Should have called app.use for each middleware
      // 1. Helmet
      // 2. CORS
      // 3. CSRF generateToken (if enabled)
      // 4. CSRF verifyToken (if enabled)
      // 5. SQL injection protection
      // 6. Cache-Control headers
      expect(app.use).toHaveBeenCalledTimes(6);
      
      // First call should be with Helmet
      expect(helmet).toHaveBeenCalled();
      
      // Second call should be with CORS
      expect(cors).toHaveBeenCalled();
    });
  });
}); 