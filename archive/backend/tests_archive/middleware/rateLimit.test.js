/**
 * @fileoverview Tests for Rate Limiting Middleware
 * Validates rate limiting functionality for API endpoints
 */

const express = require('express');
const request = require('supertest');
const { 
  createRateLimiter, 
  createAuthLimiter, 
  createApiLimiter, 
  createWorkoutGenLimiter,
  createAiOperationLimiter,
  authLimiters,
  apiLimiters
} = require('../../middleware/rateLimit');

// Mock express-rate-limit
jest.mock('express-rate-limit', () => {
  return jest.fn().mockImplementation((options) => {
    // Return a middleware function that mocks rate limiting behavior
    return (req, res, next) => {
      // Mock implementation to enable testing
      if (req.get('x-test-exceed-limit') === 'true') {
        // Simulate hitting the rate limit
        if (options.handler) {
          return options.handler(req, res);
        }
        return res.status(429).json({
          status: 'error',
          message: 'Rate limit exceeded'
        });
      }
      
      // Add rate limit headers to response
      res.set('ratelimit-limit', options.max || 60);
      res.set('ratelimit-remaining', 59);
      
      // Call key generator for testing
      if (options.keyGenerator) {
        options.keyGenerator(req);
      }
      
      next();
    };
  });
});

// Mock the logger to prevent console output during tests
jest.mock('../../config', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  }
}));

describe('Rate Limiting Middleware', () => {
  let app;

  beforeEach(() => {
    // Create a new express app for each test
    app = express();
    app.use(express.json());
    
    // Reset all mocks between tests
    jest.clearAllMocks();
  });

  describe('createRateLimiter', () => {
    it('should create a rate limiter with default options', async () => {
      // Setup
      const limiter = createRateLimiter();
      app.use('/test', limiter, (req, res) => res.status(200).json({ success: true }));

      // Execute - First request should pass
      const response1 = await request(app).get('/test');
      expect(response1.status).toBe(200);

      // Check rate limit headers are present
      expect(response1.headers).toHaveProperty('ratelimit-limit');
      expect(response1.headers).toHaveProperty('ratelimit-remaining');
    });

    it('should return 429 when rate limit is exceeded', async () => {
      // Setup - Create a rate limiter
      const limiter = createRateLimiter({ max: 1, windowMs: 15 * 60 * 1000 });
      app.use('/test', limiter, (req, res) => res.status(200).json({ success: true }));

      // Execute - Simulate hitting the rate limit
      const response = await request(app)
        .get('/test')
        .set('x-test-exceed-limit', 'true');
      
      // Assert
      expect(response.status).toBe(429);
      expect(response.body).toEqual({
        status: 'error',
        message: 'Too many requests. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED'
      });
    });

    it('should use custom key generator when provided', async () => {
      // Setup - Create a limiter with a custom key generator
      const customKeyGen = jest.fn().mockReturnValue('custom-key');
      const limiter = createRateLimiter({ 
        max: 1, 
        windowMs: 15 * 60 * 1000,
        keyGenerator: customKeyGen
      });
      
      app.use('/test', limiter, (req, res) => res.status(200).json({ success: true }));

      // Execute
      await request(app).get('/test');

      // Assert
      expect(customKeyGen).toHaveBeenCalled();
    });
  });

  describe('createAuthLimiter', () => {
    it('should create a rate limiter for auth endpoints', async () => {
      // Setup
      const authLimiter = createAuthLimiter(60 * 1000, 2); // 2 requests per minute
      app.use('/auth', authLimiter, (req, res) => res.status(200).json({ success: true }));

      // Execute - First request should pass
      const response1 = await request(app).get('/auth');
      expect(response1.status).toBe(200);

      // Simulate hitting the rate limit
      const response2 = await request(app)
        .get('/auth')
        .set('x-test-exceed-limit', 'true');
      
      expect(response2.status).toBe(429);
      expect(response2.body).toEqual({
        status: 'error',
        message: 'Too many authentication attempts. Please try again later.',
        code: 'AUTH_RATE_LIMIT_EXCEEDED'
      });
    });
  });

  describe('createApiLimiter', () => {
    it('should create a rate limiter for API endpoints', async () => {
      // Setup
      const apiLimiter = createApiLimiter(2, 60 * 1000); // 2 requests per minute
      app.use('/api', apiLimiter, (req, res) => res.status(200).json({ success: true }));

      // Execute - First request should pass
      const response1 = await request(app).get('/api');
      expect(response1.status).toBe(200);

      // Simulate hitting the rate limit
      const response2 = await request(app)
        .get('/api')
        .set('x-test-exceed-limit', 'true');
      
      expect(response2.status).toBe(429);
      expect(response2.body).toEqual({
        status: 'error',
        message: 'API rate limit exceeded. Please try again later.',
        code: 'API_RATE_LIMIT_EXCEEDED'
      });
    });
  });

  describe('createWorkoutGenLimiter', () => {
    it('should create a rate limiter for workout generation endpoints', async () => {
      // Setup
      const workoutLimiter = createWorkoutGenLimiter(2, 60 * 1000); // 2 requests per minute
      app.use('/workout', workoutLimiter, (req, res) => res.status(200).json({ success: true }));

      // Execute - First request should pass
      const response1 = await request(app).get('/workout');
      expect(response1.status).toBe(200);

      // Simulate hitting the rate limit
      const response2 = await request(app)
        .get('/workout')
        .set('x-test-exceed-limit', 'true');
      
      expect(response2.status).toBe(429);
      expect(response2.body).toEqual({
        status: 'error',
        message: 'Workout generation rate limit exceeded. Please try again later.',
        code: 'WORKOUT_GEN_LIMIT_EXCEEDED'
      });
    });
  });

  describe('createAiOperationLimiter', () => {
    it('should create a rate limiter for AI operation endpoints', async () => {
      // Setup
      const aiLimiter = createAiOperationLimiter(2, 60 * 1000); // 2 requests per minute
      app.use('/ai', aiLimiter, (req, res) => res.status(200).json({ success: true }));

      // Execute - First request should pass
      const response1 = await request(app).get('/ai');
      expect(response1.status).toBe(200);

      // Simulate hitting the rate limit
      const response2 = await request(app)
        .get('/ai')
        .set('x-test-exceed-limit', 'true');
      
      expect(response2.status).toBe(429);
      expect(response2.body).toEqual({
        status: 'error',
        message: 'AI operation rate limit exceeded. Please try again later.',
        code: 'AI_OPERATION_LIMIT_EXCEEDED'
      });
    });
  });

  describe('authLimiters', () => {
    it('should have predefined auth limiters', () => {
      expect(authLimiters).toHaveProperty('signup');
      expect(authLimiters).toHaveProperty('login');
      expect(authLimiters).toHaveProperty('refresh');
      expect(authLimiters).toHaveProperty('passwordReset');
    });
  });

  describe('apiLimiters', () => {
    it('should have predefined API limiters', () => {
      expect(apiLimiters).toHaveProperty('standard');
      expect(apiLimiters).toHaveProperty('workoutGen');
      expect(apiLimiters).toHaveProperty('aiOperations');
    });
  });
}); 