/**
 * @fileoverview Tests for Authentication Middleware
 */

const jwt = require('jsonwebtoken');
const { authenticate, requireRole, requireAdmin, requireOwnership, optionalAuth } = require('../../middleware/auth');
const jwtUtils = require('../../utils/jwt');
const { env } = require('../../config');

// Mock dependencies
jest.mock('../../utils/jwt');
jest.mock('../../config', () => ({
  env: {
    auth: {
      jwtSecret: 'test-secret',
      adminBypassOwnership: true
    }
  },
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  }
}));

describe('Authentication Middleware', () => {
  let req, res, next;
  let getResourceOwnerId;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup request, response, and next function mocks
    req = {
      headers: {},
      originalUrl: '/test/resource'
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    next = jest.fn();

    // Setup resource owner ID getter mock
    getResourceOwnerId = jest.fn().mockResolvedValue('123');
  });

  describe('authenticate middleware', () => {
    test('should pass when valid token is provided', () => {
      // Setup
      req.headers.authorization = 'Bearer valid-token';
      const mockUser = { sub: '123', email: 'test@example.com', role: 'user' };
      jwtUtils.verifyToken.mockReturnValue(mockUser);
      
      // Execute
      authenticate(req, res, next);
      
      // Assert
      expect(jwtUtils.verifyToken).toHaveBeenCalledWith('valid-token');
      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalled();
    });
    
    test('should return 401 when no authorization header is provided', () => {
      // Execute
      authenticate(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Authentication required',
        error: 'No authorization token provided'
      });
      expect(next).not.toHaveBeenCalled();
    });
    
    test('should return 401 when authorization format is invalid', () => {
      // Setup
      req.headers.authorization = 'invalid-format';
      
      // Execute
      authenticate(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Authentication failed',
        error: 'Invalid authorization format. Use "Bearer [token]"'
      });
      expect(next).not.toHaveBeenCalled();
    });
    
    test('should return 401 when token is expired', () => {
      // Setup
      req.headers.authorization = 'Bearer expired-token';
      jwtUtils.verifyToken.mockImplementation(() => {
        throw new Error('Token has expired');
      });
      
      // Execute
      authenticate(req, res, next);
      
      // Assert
      expect(jwtUtils.verifyToken).toHaveBeenCalledWith('expired-token');
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Authentication failed',
        error: 'Token has expired'
      });
      expect(next).not.toHaveBeenCalled();
    });
    
    test('should return 401 when token is invalid', () => {
      // Setup
      req.headers.authorization = 'Bearer invalid-token';
      jwtUtils.verifyToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });
      
      // Execute
      authenticate(req, res, next);
      
      // Assert
      expect(jwtUtils.verifyToken).toHaveBeenCalledWith('invalid-token');
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Authentication failed',
        error: 'Invalid token'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireRole middleware', () => {
    beforeEach(() => {
      // Setup authenticated user
      req.user = { sub: '123', email: 'test@example.com', role: 'user' };
    });
    
    test('should pass when user has the required role', () => {
      // Execute
      const middleware = requireRole('user');
      middleware(req, res, next);
      
      // Assert
      expect(next).toHaveBeenCalled();
    });
    
    test('should pass when user has one of the required roles', () => {
      // Execute
      const middleware = requireRole(['admin', 'user', 'editor']);
      middleware(req, res, next);
      
      // Assert
      expect(next).toHaveBeenCalled();
    });
    
    test('should return 403 when user does not have the required role', () => {
      // Execute
      const middleware = requireRole('admin');
      middleware(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Authorization failed',
        error: 'Insufficient permissions'
      });
      expect(next).not.toHaveBeenCalled();
    });
    
    test('should return 401 when user is not authenticated', () => {
      // Setup
      req.user = null;
      
      // Execute
      const middleware = requireRole('user');
      middleware(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Authentication required',
        error: 'User not authenticated'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireAdmin middleware', () => {
    test('should pass when user is an admin', () => {
      // Setup
      req.user = { sub: '123', email: 'admin@example.com', role: 'admin' };
      
      // Execute
      requireAdmin(req, res, next);
      
      // Assert
      expect(next).toHaveBeenCalled();
    });
    
    test('should return 403 when user is not an admin', () => {
      // Setup
      req.user = { sub: '123', email: 'user@example.com', role: 'user' };
      
      // Execute
      requireAdmin(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Authorization failed',
        error: 'Admin access required'
      });
      expect(next).not.toHaveBeenCalled();
    });
    
    test('should return 401 when user is not authenticated', () => {
      // Setup
      req.user = null;
      
      // Execute
      requireAdmin(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Authentication required',
        error: 'User not authenticated'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireOwnership middleware', () => {
    test('should pass when user owns the resource', async () => {
      // Setup
      req.user = { sub: '123', email: 'test@example.com', role: 'user' };
      const middleware = requireOwnership(getResourceOwnerId);
      
      // Execute
      await middleware(req, res, next);
      
      // Assert
      expect(getResourceOwnerId).toHaveBeenCalledWith(req);
      expect(next).toHaveBeenCalled();
    });
    
    test('should pass when user is admin even if not owner', async () => {
      // Setup
      req.user = { sub: '456', email: 'test@example.com', role: 'admin' };
      getResourceOwnerId.mockResolvedValue('123');
      const middleware = requireOwnership(getResourceOwnerId);
      
      // Execute
      await middleware(req, res, next);
      
      // Assert
      expect(getResourceOwnerId).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });
    
    test('should return 403 when user does not own the resource', async () => {
      // Setup
      req.user = { sub: '456', email: 'test@example.com', role: 'user' };
      getResourceOwnerId.mockResolvedValue('123');
      const middleware = requireOwnership(getResourceOwnerId);
      
      // Execute
      await middleware(req, res, next);
      
      // Assert
      expect(getResourceOwnerId).toHaveBeenCalledWith(req);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Authorization failed',
        error: 'Resource access denied'
      });
      expect(next).not.toHaveBeenCalled();
    });
    
    test('should return 401 when user is not authenticated', async () => {
      // Setup
      req.user = null;
      const middleware = requireOwnership(getResourceOwnerId);
      
      // Execute
      await middleware(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Authentication required',
        error: 'User not authenticated'
      });
      expect(next).not.toHaveBeenCalled();
    });
    
    test('should handle errors from resource owner ID getter', async () => {
      // Setup
      req.user = { sub: '123', email: 'test@example.com', role: 'user' };
      getResourceOwnerId.mockRejectedValue(new Error('Database error'));
      const middleware = requireOwnership(getResourceOwnerId);
      
      // Execute
      await middleware(req, res, next);
      
      // Assert
      expect(getResourceOwnerId).toHaveBeenCalledWith(req);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Server error',
        error: 'Failed to verify resource ownership'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuth middleware', () => {
    test('should set user when valid token is provided', () => {
      // Setup
      req.headers.authorization = 'Bearer valid-token';
      const mockUser = { sub: '123', email: 'test@example.com', role: 'user' };
      jwtUtils.verifyToken.mockReturnValue(mockUser);
      
      // Execute
      optionalAuth(req, res, next);
      
      // Assert
      expect(jwtUtils.verifyToken).toHaveBeenCalledWith('valid-token');
      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalled();
    });
    
    test('should pass without user when no token is provided', () => {
      // Execute
      optionalAuth(req, res, next);
      
      // Assert
      expect(req.user).toBeNull();
      expect(next).toHaveBeenCalled();
    });
    
    test('should pass without user when token is invalid', () => {
      // Setup
      req.headers.authorization = 'Bearer invalid-token';
      jwtUtils.verifyToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });
      
      // Execute
      optionalAuth(req, res, next);
      
      // Assert
      expect(req.user).toBeNull();
      expect(next).toHaveBeenCalled();
    });
  });
}); 