/**
 * @jest-environment node
 */

const express = require('express');
const request = require('supertest');

// Mock express-rate-limit
jest.mock('express-rate-limit', () => {
  return jest.fn((options) => {
    // Save the options for later inspection
    const mockRateLimiter = (req, res, next) => {
      // If testing rate limit exceeded scenario
      if (req.headers['x-test-exceed-limit'] === 'true') {
        return options.handler(req, res);
      }
      next();
    };
    
    // Store options for test inspection
    mockRateLimiter.options = options;
    return mockRateLimiter;
  });
});

// Mock the config
jest.mock('../../config', () => {
  return {
    logger: {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    }
  };
});

// Import the module under test
const rateLimiterMiddleware = require('../../middleware/rateLimit');
const expressRateLimit = require('express-rate-limit');

describe('Rate Limiting Middleware', () => {
  let app;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create a fresh Express app for each test
    app = express();
    app.use(express.json());
  });
  
  describe('createRateLimiter', () => {
    it('should create a rate limiter with default options', () => {
      const limiter = rateLimiterMiddleware.createRateLimiter();
      
      // Check that express-rate-limit was called
      expect(expressRateLimit).toHaveBeenCalledTimes(1);
      
      // Verify default options
      const options = limiter.options;
      expect(options.windowMs).toBe(60 * 1000); // 1 minute
      expect(options.max).toBe(60); // 60 requests per minute
      expect(options.standardHeaders).toBe(true);
      expect(options.legacyHeaders).toBe(false);
      expect(options.message).toEqual({
        status: 'error',
        message: 'Too many requests. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED'
      });
    });
    
    it('should create a rate limiter with custom options', () => {
      const customOptions = {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // 100 requests per 15 minutes
        message: {
          status: 'error',
          message: 'Custom rate limit message',
          code: 'CUSTOM_RATE_LIMIT'
        }
      };
      
      const limiter = rateLimiterMiddleware.createRateLimiter(customOptions);
      
      // Verify custom options merged with defaults
      const options = limiter.options;
      expect(options.windowMs).toBe(15 * 60 * 1000);
      expect(options.max).toBe(100);
      expect(options.message).toEqual({
        status: 'error',
        message: 'Custom rate limit message',
        code: 'CUSTOM_RATE_LIMIT'
      });
      // Default options should still be present
      expect(options.standardHeaders).toBe(true);
      expect(options.legacyHeaders).toBe(false);
    });
    
    it('should use the custom key generator to handle user ID if available', () => {
      const limiter = rateLimiterMiddleware.createRateLimiter();
      const keyGenerator = limiter.options.keyGenerator;
      
      // Test with user object
      const reqWithUser = {
        ip: '127.0.0.1',
        user: { id: 'user123' }
      };
      expect(keyGenerator(reqWithUser)).toBe('127.0.0.1_user123');
      
      // Test with JWT sub property
      const reqWithSub = {
        ip: '127.0.0.1',
        user: { sub: 'sub456' }
      };
      expect(keyGenerator(reqWithSub)).toBe('127.0.0.1_sub456');
      
      // Test without user
      const reqWithoutUser = {
        ip: '127.0.0.1'
      };
      expect(keyGenerator(reqWithoutUser)).toBe('127.0.0.1_anonymous');
    });
    
    it('should handle rate limit exceeded with proper response', async () => {
      const limiter = rateLimiterMiddleware.createRateLimiter();
      app.use(limiter);
      
      // Configure a test route
      app.get('/test', (req, res) => {
        res.json({ success: true });
      });
      
      // Test rate limit exceeded scenario
      const res = await request(app)
        .get('/test')
        .set('x-test-exceed-limit', 'true');
      
      expect(res.statusCode).toBe(429);
      expect(res.body).toEqual({
        status: 'error',
        message: 'Too many requests. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED'
      });
    });
  });
  
  describe('createAuthLimiter', () => {
    it('should create an auth-specific rate limiter with default values', () => {
      const authLimiter = rateLimiterMiddleware.createAuthLimiter();
      
      // Verify options
      const options = authLimiter.options;
      expect(options.windowMs).toBe(15 * 60 * 1000); // 15 minutes
      expect(options.max).toBe(5); // 5 attempts per 15 minutes
      expect(options.message).toEqual({
        status: 'error',
        message: 'Too many authentication attempts. Please try again later.',
        code: 'AUTH_RATE_LIMIT_EXCEEDED'
      });
    });
    
    it('should create an auth-specific rate limiter with custom values', () => {
      const authLimiter = rateLimiterMiddleware.createAuthLimiter(30 * 60 * 1000, 10);
      
      // Verify options
      const options = authLimiter.options;
      expect(options.windowMs).toBe(30 * 60 * 1000); // 30 minutes
      expect(options.max).toBe(10); // 10 attempts per 30 minutes
    });
    
    it('should use IP address only for key generation in auth limiter', () => {
      const authLimiter = rateLimiterMiddleware.createAuthLimiter();
      const keyGenerator = authLimiter.options.keyGenerator;
      
      // User info should be ignored for auth endpoints
      const req = {
        ip: '127.0.0.1',
        user: { id: 'user123' },
        headers: { 'x-forwarded-for': '192.168.1.1' }
      };
      
      expect(keyGenerator(req)).toBe('127.0.0.1');
      
      // Test with x-forwarded-for when IP is undefined
      const reqWithForwardedHeader = {
        headers: { 'x-forwarded-for': '192.168.1.1' }
      };
      
      expect(keyGenerator(reqWithForwardedHeader)).toBe('192.168.1.1');
      
      // Test with no IP info
      const reqWithNoIP = {
        headers: {}
      };
      
      expect(keyGenerator(reqWithNoIP)).toBe('unknown');
    });
  });
  
  describe('createApiLimiter', () => {
    it('should create an API-specific rate limiter with default values', () => {
      const apiLimiter = rateLimiterMiddleware.createApiLimiter();
      
      // Verify options
      const options = apiLimiter.options;
      expect(options.windowMs).toBe(60 * 1000); // 1 minute
      expect(options.max).toBe(100); // 100 requests per minute
      expect(options.message).toEqual({
        status: 'error',
        message: 'API rate limit exceeded. Please try again later.',
        code: 'API_RATE_LIMIT_EXCEEDED'
      });
    });
    
    it('should create an API-specific rate limiter with custom values', () => {
      const apiLimiter = rateLimiterMiddleware.createApiLimiter(50, 2 * 60 * 1000);
      
      // Verify options
      const options = apiLimiter.options;
      expect(options.windowMs).toBe(2 * 60 * 1000); // 2 minutes
      expect(options.max).toBe(50); // 50 requests per 2 minutes
    });
  });
  
  describe('createWorkoutGenLimiter', () => {
    it('should create a workout generation specific rate limiter with default values', () => {
      const workoutLimiter = rateLimiterMiddleware.createWorkoutGenLimiter();
      
      // Verify options
      const options = workoutLimiter.options;
      expect(options.windowMs).toBe(60 * 60 * 1000); // 1 hour
      expect(options.max).toBe(10); // 10 requests per hour
      expect(options.message).toEqual({
        status: 'error',
        message: 'Workout generation rate limit exceeded. Please try again later.',
        code: 'WORKOUT_GEN_LIMIT_EXCEEDED'
      });
    });
    
    it('should create a workout generation specific rate limiter with custom values', () => {
      const workoutLimiter = rateLimiterMiddleware.createWorkoutGenLimiter(5, 30 * 60 * 1000);
      
      // Verify options
      const options = workoutLimiter.options;
      expect(options.windowMs).toBe(30 * 60 * 1000); // 30 minutes
      expect(options.max).toBe(5); // 5 requests per 30 minutes
    });
  });
  
  describe('createAiOperationLimiter', () => {
    it('should create an AI operation specific rate limiter with default values', () => {
      const aiLimiter = rateLimiterMiddleware.createAiOperationLimiter();
      
      // Verify options
      const options = aiLimiter.options;
      expect(options.windowMs).toBe(60 * 60 * 1000); // 1 hour
      expect(options.max).toBe(20); // 20 requests per hour
      expect(options.message).toEqual({
        status: 'error',
        message: 'AI operation rate limit exceeded. Please try again later.',
        code: 'AI_OPERATION_LIMIT_EXCEEDED'
      });
    });
    
    it('should create an AI operation specific rate limiter with custom values', () => {
      const aiLimiter = rateLimiterMiddleware.createAiOperationLimiter(15, 2 * 60 * 60 * 1000);
      
      // Verify options
      const options = aiLimiter.options;
      expect(options.windowMs).toBe(2 * 60 * 60 * 1000); // 2 hours
      expect(options.max).toBe(15); // 15 requests per 2 hours
    });
  });
  
  describe('Auth Limiters', () => {
    it('should export predefined auth limiters', () => {
      const { authLimiters } = rateLimiterMiddleware;
      
      // Check that all auth limiters are exported
      expect(authLimiters).toHaveProperty('signup');
      expect(authLimiters).toHaveProperty('login');
      expect(authLimiters).toHaveProperty('refresh');
      expect(authLimiters).toHaveProperty('passwordReset');
      
      // Check specific configuration
      expect(authLimiters.signup.options.max).toBe(10); // 10 signups per hour
      expect(authLimiters.login.options.max).toBe(5); // 5 login attempts per 15 minutes
      expect(authLimiters.refresh.options.max).toBe(10); // 10 refresh attempts per 15 minutes
      expect(authLimiters.passwordReset.options.max).toBe(3); // 3 password reset requests per hour
    });
  });
  
  describe('API Limiters', () => {
    it('should export predefined API limiters', () => {
      const { apiLimiters } = rateLimiterMiddleware;
      
      // Check that all API limiters are exported
      expect(apiLimiters).toHaveProperty('standard');
      expect(apiLimiters).toHaveProperty('workoutGen');
      expect(apiLimiters).toHaveProperty('aiOperations');
      
      // Check specific configuration
      expect(apiLimiters.standard.options.max).toBe(100); // 100 requests per minute
      expect(apiLimiters.workoutGen.options.max).toBe(10); // 10 workout generations per hour
      expect(apiLimiters.aiOperations.options.max).toBe(20); // 20 AI operations per hour
    });
  });
}); 