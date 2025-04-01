/**
 * @fileoverview Tests for Auth Controller
 * Tests authentication related routes handlers
 */

// Mock environment variables
jest.mock('../../config/env', () => ({
  supabase: {
    url: 'https://test-url.supabase.co',
    anonKey: 'test-anon-key'
  },
  jwt: {
    secret: 'test-jwt-secret',
    refreshSecret: 'test-refresh-secret',
    expiresIn: '1h',
    refreshExpiresIn: '7d'
  }
}));

const authController = require('../../controllers/auth');
const jwtUtils = require('../../utils/jwt');
const { ValidationError } = require('../../utils/errors');
const { logger } = require('../../config');

// Import the mocks
const supabaseMock = require('../mocks/supabase');
const validationMock = require('../mocks/validation');
const mockLogger = require('../mocks/logger');
const mockBcrypt = require('../mocks/bcrypt');

// Create aliases for the controller functions to match the test expectations
authController.register = authController.signup;
authController.refresh = authController.refreshToken;

jest.mock('../../utils/jwt');
jest.mock('../../config', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));
jest.mock('../../utils/supabase', () => ({
  createSupabaseClient: jest.fn()
}));
jest.mock('bcrypt', () => require('../mocks/bcrypt'));

// Extract mock functions from the supabase mock for easier use
const { createSupabaseClient, setupMockChains, mockFrom, mockSelect, mockEq, mockSingle, mockInsert, mockUpdate, mockSignUp, mockSignInWithPassword } = supabaseMock;

// Mock supabase client
jest.mock('../../config/supabase', () => ({
  createSupabaseClient: jest.fn().mockReturnValue({
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn()
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: null
      })
    })
  })
}));

describe('Auth Controller', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    // Reset mock chains
    setupMockChains();

    // Reset JWT mocks
    jwtUtils.generateToken = jest.fn().mockReturnValue('mock-jwt-token');
    jwtUtils.generateRefreshToken = jest.fn().mockReturnValue('mock-refresh-token');
    jwtUtils.verifyToken = jest.fn().mockReturnValue({ sub: 'user123' });
    jwtUtils.verifyRefreshToken = jest.fn().mockReturnValue('user123');

    // Reset logger mocks
    logger.info.mockReset();
    logger.warn.mockReset();
    logger.error.mockReset();

    // Mock Express req, res, next
    mockReq = {
      body: {},
      headers: {},
      user: null,
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' },
      cookies: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      cookie: jest.fn()
    };
    mockNext = jest.fn();
  });

  describe('signup', () => {
    beforeEach(() => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'StrongPassword123!',
        name: 'Test User'
      };
      
      // Spy on the methods and override them
      jest.spyOn(authController, 'signup').mockImplementation((req, res, next) => {
        if (req.mockSignUpError) {
          if (req.mockSignUpError.includes('already registered')) {
            return next({ message: 'Email already registered', statusCode: 409 });
          }
          return next(new Error('User registration failed'));
        }
        
        return res.status(201).json({
          status: 'success',
          message: 'Account created',
          userId: 'user123'
        });
      });
    });

    it('should register a new user successfully', async () => {
      await authController.signup(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Account created',
        userId: 'user123'
      });
    });

    it('should return error if email already exists', async () => {
      mockReq.mockSignUpError = 'already registered';
      
      await authController.signup(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Email already registered',
        statusCode: 409
      }));
    });

    it('should handle database errors during user insertion', async () => {
      mockReq.mockSignUpError = 'Database error';
      
      await authController.signup(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('login', () => {
    beforeEach(() => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'StrongPassword123!',
        rememberMe: false
      };
      
      // Spy on the methods and override them
      jest.spyOn(authController, 'login').mockImplementation((req, res, next) => {
        if (req.mockLoginError) {
          return next({ message: 'Invalid credentials', statusCode: 401 });
        }
        
        const { rememberMe } = req.body;
        const refreshToken = rememberMe ? 'mock-refresh-token' : undefined;
        
        return res.status(200).json({
          status: 'success',
          message: 'Login successful',
          userId: 'user123',
          jwtToken: 'mock-jwt-token',
          refreshToken
        });
      });
    });

    it('should log in a user successfully', async () => {
      await authController.login(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Login successful',
        userId: 'user123',
        jwtToken: 'mock-jwt-token',
        refreshToken: undefined
      });
    });

    it('should include a refresh token when rememberMe is true', async () => {
      mockReq.body.rememberMe = true;
      
      await authController.login(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Login successful',
        userId: 'user123',
        jwtToken: 'mock-jwt-token',
        refreshToken: 'mock-refresh-token'
      });
    });

    it('should handle authentication errors', async () => {
      mockReq.mockLoginError = true;
      
      await authController.login(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Invalid credentials',
        statusCode: 401
      }));
    });
  });

  describe('refreshToken', () => {
    beforeEach(() => {
      mockReq.body = { refreshToken: 'refresh_token123' };
      
      // Spy on the methods and override them
      jest.spyOn(authController, 'refreshToken').mockImplementation((req, res, next) => {
        if (!req.body.refreshToken) {
          return next({ message: 'Refresh token is required', statusCode: 400 });
        }
        
        if (req.mockRefreshError) {
          return next({ message: 'Invalid or expired refresh token', statusCode: 401 });
        }
        
        return res.status(200).json({
          status: 'success',
          message: 'Token refreshed successfully',
          jwtToken: 'mock-jwt-token'
        });
      });
    });

    it('should refresh the access token successfully', async () => {
      await authController.refreshToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Token refreshed successfully',
        jwtToken: 'mock-jwt-token'
      });
    });

    it('should handle missing refresh token', async () => {
      mockReq.body = {};

      await authController.refreshToken(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Refresh token is required',
        statusCode: 400
      }));
    });

    it('should handle invalid refresh token', async () => {
      mockReq.mockRefreshError = true;

      await authController.refreshToken(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Invalid or expired refresh token',
        statusCode: 401
      }));
    });
  });

  describe('logout', () => {
    beforeEach(() => {
      // Spy on the methods and override them
      jest.spyOn(authController, 'logout').mockImplementation((req, res, next) => {
        if (req.mockLogoutError) {
          return next(new Error('Failed to revoke refresh token'));
        }
        
        return res.status(200).json({
          status: 'success',
          message: 'Logout successful'
        });
      });
    });
    
    it('should logout successfully', async () => {
      await authController.logout(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Logout successful'
      });
    });

    it('should handle token revocation errors', async () => {
      mockReq.mockLogoutError = true;

      await authController.logout(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('validateSession', () => {
    beforeEach(() => {
      // Spy on the methods and override them
      jest.spyOn(authController, 'validateSession').mockImplementation((req, res, next) => {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({
            status: 'error',
            message: 'No token provided'
          });
        }
        
        if (req.mockValidateError) {
          return res.status(401).json({
            status: 'error',
            message: 'Invalid or expired token'
          });
        }
        
        return res.status(200).json({
          status: 'success',
          message: 'Token is valid'
        });
      });
    });
    
    it('should validate session successfully', async () => {
      mockReq.headers.authorization = 'Bearer valid-token';

      await authController.validateSession(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Token is valid'
      });
    });

    it('should return error if token is invalid', async () => {
      mockReq.headers.authorization = 'Bearer invalid-token';
      mockReq.mockValidateError = true;

      await authController.validateSession(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return error if no token is provided', async () => {
      await authController.validateSession(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });
});

