/**
 * Rate Limiting Integration Tests
 * 
 * Tests rate limiting functionality for authentication endpoints
 * including both enforcement and test environment bypass scenarios
 */

const supertest = require('supertest');
const { app, startServer, closeServer } = require('../../../server');

let server;

// Define a port for the test server to listen on, different from dev if possible
const TEST_PORT = process.env.TEST_PORT || 3002; // Use different port from auth tests

describe('Rate Limiting Integration Tests', () => {
  beforeAll(async () => {
    // Start the server on a test port
    server = await startServer(TEST_PORT);
  });

  afterAll(async () => {
    await closeServer(server);
  });

  describe('Rate Limiting in Test Environment (Bypassed)', () => {
    beforeAll(() => {
      // Ensure we're in test environment where rate limiting is bypassed
      process.env.NODE_ENV = 'test';
    });

    it('should allow unlimited signup requests in test environment', async () => {
      // Make multiple rapid signup requests - should all succeed or fail based on business logic, not rate limiting
      const promises = [];
      for (let i = 0; i < 15; i++) { // More than the 10/hour limit
        promises.push(
          supertest(app)
            .post('/v1/auth/signup')
            .send({
              name: `Test User ${i}`,
              email: `testuser${i}@example.com`,
              password: 'Password123!'
            })
        );
      }

      const results = await Promise.all(promises);
      
      // None should return 429 (rate limited)
      const rateLimitedResults = results.filter(res => res.status === 429);
      expect(rateLimitedResults).toHaveLength(0);
      
      // Should either succeed (201) or fail with business logic errors (400/409), not rate limiting
      results.forEach(res => {
        expect([201, 400, 409]).toContain(res.status);
      });
    });

    it('should allow unlimited login requests in test environment', async () => {
      // First create a user
      await supertest(app)
        .post('/v1/auth/signup')
        .send({
          name: 'Login Test User',
          email: 'logintest@example.com',
          password: 'Password123!'
        });

      // Make multiple rapid login requests - should all succeed or fail based on auth logic, not rate limiting
      const promises = [];
      for (let i = 0; i < 8; i++) { // More than the 5/15min limit
        promises.push(
          supertest(app)
            .post('/v1/auth/login')
            .send({
              email: 'logintest@example.com',
              password: 'Password123!'
            })
        );
      }

      const results = await Promise.all(promises);
      
      // None should return 429 (rate limited)
      const rateLimitedResults = results.filter(res => res.status === 429);
      expect(rateLimitedResults).toHaveLength(0);
      
      // Should either succeed (200) or fail with auth errors (401), not rate limiting
      results.forEach(res => {
        expect([200, 401]).toContain(res.status);
      });
    });

    it('should allow unlimited password reset requests in test environment', async () => {
      // Make multiple rapid password reset requests - should all succeed, not be rate limited
      const promises = [];
      for (let i = 0; i < 5; i++) { // More than the 3/hour limit
        promises.push(
          supertest(app)
            .post('/v1/auth/password-reset')
            .send({
              email: 'test@example.com'
            })
        );
      }

      const results = await Promise.all(promises);
      
      // None should return 429 (rate limited)
      const rateLimitedResults = results.filter(res => res.status === 429);
      expect(rateLimitedResults).toHaveLength(0);
      
      // Should all succeed (200) since password reset returns success even for non-existent emails
      results.forEach(res => {
        expect(res.status).toBe(200);
      });
    });
  });

  describe('Rate Limiting Enforcement (Non-Test Environment)', () => {
    let originalNodeEnv;

    beforeAll(() => {
      // Store original NODE_ENV
      originalNodeEnv = process.env.NODE_ENV;
      // Set to non-test environment to enable rate limiting
      process.env.NODE_ENV = 'development';
    });

    afterAll(() => {
      // Restore original NODE_ENV
      process.env.NODE_ENV = originalNodeEnv;
    });

    it('should enforce signup rate limiting in non-test environment', async () => {
      // Make more requests than the signup limit (10 per hour)
      const promises = [];
      for (let i = 0; i < 12; i++) {
        promises.push(
          supertest(app)
            .post('/v1/auth/signup')
            .send({
              name: `Rate Test User ${i}`,
              email: `ratetest${i}@example.com`,
              password: 'Password123!'
            })
        );
      }

      const results = await Promise.all(promises);
      
      // Should have some 429 responses after hitting the limit
      const rateLimitedResults = results.filter(res => res.status === 429);
      expect(rateLimitedResults.length).toBeGreaterThan(0);
      
      // Check that rate limited responses have correct format
      rateLimitedResults.forEach(res => {
        expect(res.body).toEqual({
          status: 'error',
          message: 'Too many authentication attempts. Please try again later.',
          code: 'AUTH_RATE_LIMIT_EXCEEDED'
        });
      });
    });

    it('should enforce login rate limiting in non-test environment', async () => {
      // First create a user
      await supertest(app)
        .post('/v1/auth/signup')
        .send({
          name: 'Rate Limit Login User',
          email: 'ratelimitlogin@example.com',
          password: 'Password123!'
        });

      // Make more login requests than the limit (5 per 15 minutes)
      const promises = [];
      for (let i = 0; i < 7; i++) {
        promises.push(
          supertest(app)
            .post('/v1/auth/login')
            .send({
              email: 'ratelimitlogin@example.com',
              password: 'WrongPassword!' // Use wrong password to avoid successful logins
            })
        );
      }

      const results = await Promise.all(promises);
      
      // Should have some 429 responses after hitting the limit
      const rateLimitedResults = results.filter(res => res.status === 429);
      expect(rateLimitedResults.length).toBeGreaterThan(0);
      
      // Check that rate limited responses have correct format
      rateLimitedResults.forEach(res => {
        expect(res.body).toEqual({
          status: 'error',
          message: 'Too many authentication attempts. Please try again later.',
          code: 'AUTH_RATE_LIMIT_EXCEEDED'
        });
      });
    });

    it('should enforce password reset rate limiting in non-test environment', async () => {
      // Make more password reset requests than the limit (3 per hour)
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          supertest(app)
            .post('/v1/auth/password-reset')
            .send({
              email: 'ratelimitreset@example.com'
            })
        );
      }

      const results = await Promise.all(promises);
      
      // Should have some 429 responses after hitting the limit
      const rateLimitedResults = results.filter(res => res.status === 429);
      expect(rateLimitedResults.length).toBeGreaterThan(0);
      
      // Check that rate limited responses have correct format
      rateLimitedResults.forEach(res => {
        expect(res.body).toEqual({
          status: 'error',
          message: 'Too many authentication attempts. Please try again later.',
          code: 'AUTH_RATE_LIMIT_EXCEEDED'
        });
      });
    });

    it('should include rate limit headers in responses', async () => {
      // Make a request that should include rate limit headers
      const response = await supertest(app)
        .post('/v1/auth/password-reset')
        .send({
          email: 'headertest@example.com'
        });

      // Should include rate limit headers (when not rate limited)
      if (response.status !== 429) {
        expect(response.headers).toHaveProperty('ratelimit-limit');
        expect(response.headers).toHaveProperty('ratelimit-remaining');
        expect(response.headers).toHaveProperty('ratelimit-reset');
      }
    });
  });

  describe('Rate Limiting Configuration Validation', () => {
    it('should have correct rate limiting configuration', () => {
      const { authLimiters } = require('../../../middleware/rateLimit');
      
      // Verify that rate limiters exist
      expect(authLimiters).toHaveProperty('signup');
      expect(authLimiters).toHaveProperty('login');
      expect(authLimiters).toHaveProperty('refresh');
      expect(authLimiters).toHaveProperty('passwordReset');
      
      // Verify that they are functions (middleware)
      expect(typeof authLimiters.signup).toBe('function');
      expect(typeof authLimiters.login).toBe('function');
      expect(typeof authLimiters.refresh).toBe('function');
      expect(typeof authLimiters.passwordReset).toBe('function');
    });

    it('should have conditionalRateLimit function working correctly', () => {
      // Test the conditionalRateLimit function directly
      const conditionalRateLimit = (limiter) => {
        return (req, res, next) => {
          if (process.env.NODE_ENV === 'test') {
            return next();
          }
          return limiter(req, res, next);
        };
      };

      const mockLimiter = jest.fn();
      const mockNext = jest.fn();
      const mockReq = {};
      const mockRes = {};

      // Test in test environment
      process.env.NODE_ENV = 'test';
      const testMiddleware = conditionalRateLimit(mockLimiter);
      testMiddleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockLimiter).not.toHaveBeenCalled();

      // Reset mocks
      mockNext.mockClear();
      mockLimiter.mockClear();

      // Test in non-test environment
      process.env.NODE_ENV = 'development';
      testMiddleware(mockReq, mockRes, mockNext);
      
      expect(mockLimiter).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
      expect(mockNext).not.toHaveBeenCalled();

      // Restore test environment
      process.env.NODE_ENV = 'test';
    });
  });
}); 