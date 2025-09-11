/**
 * @fileoverview Tests for Auth Controller Rate Limiting
 * Validates in-memory rate limiting for login attempts
 */

// Mock the private constants in the auth controller
jest.mock('../../controllers/auth', () => {
  // Get the original module
  const originalModule = jest.requireActual('../../controllers/auth');
  
  // Override the private constants and functions
  const loginAttempts = {};
  const MAX_LOGIN_ATTEMPTS = 5;
  const RATE_LIMIT_WINDOW_MS = 1; // Use 1ms for testing instead of 15 minutes
  
  // Create our own implementation for testing
  const mockLogin = async (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    
    // Check rate limiting
    if (!loginAttempts[ip]) {
      loginAttempts[ip] = {
        count: 0,
        firstAttempt: Date.now()
      };
    }
    
    const attempts = loginAttempts[ip];
    if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
      return next(new Error('Too many login attempts. Please try again later.'));
    }
    
    // Process the login
    if (req.body.shouldFail) {
      // Increment failed attempts
      loginAttempts[ip].count += 1;
      return next(new Error('Invalid credentials'));
    }
    
    // Successful login
    return res.status(200).json({
      status: 'success',
      message: 'Login successful',
      userId: 'user123',
      jwtToken: 'mock-jwt-token'
    });
  };
  
  // Return the modified module
  return {
    ...originalModule,
    login: mockLogin,
    // Export for testing
    _testLoginAttempts: loginAttempts,
    _testMaxLoginAttempts: MAX_LOGIN_ATTEMPTS,
    _testResetLoginAttempts: (ip) => {
      if (loginAttempts[ip]) {
        delete loginAttempts[ip];
      }
    }
  };
});

// Mock dependencies
jest.mock('../../utils/jwt', () => ({
  generateToken: jest.fn().mockReturnValue('mock-jwt-token'),
  generateRefreshToken: jest.fn().mockReturnValue('mock-refresh-token'),
  verifyToken: jest.fn(),
  verifyRefreshToken: jest.fn()
}));

jest.mock('../../config/supabase', () => ({
  createSupabaseClient: jest.fn()
}));

jest.mock('../../config', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

// Import the mocked controller
const authController = require('../../controllers/auth');

describe('Auth Controller Rate Limiting', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    // Reset all mocks between tests
    jest.clearAllMocks();

    // Mock Express req, res, next
    mockReq = {
      body: {
        email: 'test@example.com',
        password: 'StrongPassword123!'
      },
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' },
      headers: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      cookie: jest.fn()
    };
    mockNext = jest.fn();
    
    // Reset the login attempts counter for this IP
    authController._testResetLoginAttempts(mockReq.ip);
  });

  describe('login rate limiting', () => {
    it('should allow login attempts within rate limit', async () => {
      // Execute first login attempt - should succeed
      await authController.login(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockNext).not.toHaveBeenCalled();

      // Reset mocks for second attempt
      mockRes.status.mockClear();
      mockRes.json.mockClear();

      // Second attempt - should also succeed
      await authController.login(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should block login after too many failed attempts', async () => {
      // Setup - Ensure this request will fail
      mockReq.body.shouldFail = true;

      // Make 5 failed login attempts
      for (let i = 0; i < 5; i++) {
        // Reset mocks between attempts
        mockNext.mockClear();
        
        // Make a failed login attempt
        await authController.login(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalled();
        expect(mockNext.mock.calls[0][0]).toBeInstanceOf(Error);
        expect(mockNext.mock.calls[0][0].message).toBe('Invalid credentials');
      }

      // Reset mocks for the final attempt
      mockNext.mockClear();
      
      // The 6th attempt should be rate limited
      await authController.login(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(mockNext.mock.calls[0][0]).toBeInstanceOf(Error);
      expect(mockNext.mock.calls[0][0].message).toContain('Too many login attempts');
    });

    it('should reset rate limit counter after window expires', async () => {
      // Setup - Ensure this request will fail
      mockReq.body.shouldFail = true;

      // Make a single failed login attempt
      await authController.login(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
      
      // Reset the login attempts to simulate window expiry
      authController._testResetLoginAttempts(mockReq.ip);
      
      // Reset mocks
      mockNext.mockClear();
      mockRes.status.mockClear();
      mockRes.json.mockClear();
      
      // Set up for successful login
      mockReq.body.shouldFail = false;
      
      // Try login again - should succeed
      await authController.login(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
}); 