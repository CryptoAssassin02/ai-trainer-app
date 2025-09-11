/**
 * @jest-environment node
 */

const { 
  requireRole, 
  requireAdmin, 
  requireOwnership, 
  optionalAuth, 
  authenticate,
  logout,
  refreshToken
} = require('../../middleware/auth');
const jwtUtils = require('../../utils/jwt');
const supabaseService = require('../../services/supabase');

// Mock dependencies
jest.mock('../../utils/jwt', () => ({
  verifyToken: jest.fn(),
  isTokenBlacklisted: jest.fn().mockResolvedValue(false),
  blacklistToken: jest.fn().mockResolvedValue(undefined),
  decodeToken: jest.fn(),
  revokeRefreshToken: jest.fn().mockResolvedValue(undefined),
  verifyRefreshToken: jest.fn(),
  generateToken: jest.fn(),
  generateRefreshToken: jest.fn()
}));

jest.mock('../../services/supabase', () => ({
  client: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn()
  },
  getUserProfile: jest.fn()
}));

jest.mock('../../config', () => ({
  env: {
    auth: {
      adminBypassOwnership: true,
      useTokenRotation: true
    }
  },
  logger: {
    warn: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn()
  }
}));

// Import the NotFoundError for testing
const { NotFoundError, AuthenticationError } = require('../../utils/errors');

describe('Auth Middleware - Authorization Tests', () => {
  let mockRequest;
  let mockResponse;
  let nextFunction;

  beforeEach(() => {
    mockRequest = {
      user: null,
      originalUrl: '/api/test',
      ip: '127.0.0.1',
      headers: {},
      body: {}
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      cookie: jest.fn(),
      set: jest.fn()
    };
    nextFunction = jest.fn();
    jest.clearAllMocks();
  });

  describe('requireRole middleware', () => {
    it('should call next() if user has the required role', () => {
      mockRequest.user = { id: 'user-123', role: 'admin' };
      
      const middleware = requireRole('admin');
      middleware(mockRequest, mockResponse, nextFunction);
      
      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should call next() if user has one of the required roles in array', () => {
      mockRequest.user = { id: 'user-123', role: 'editor' };
      
      const middleware = requireRole(['admin', 'editor', 'manager']);
      middleware(mockRequest, mockResponse, nextFunction);
      
      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 401 if user is not authenticated', () => {
      mockRequest.user = null;
      
      const middleware = requireRole('admin');
      middleware(mockRequest, mockResponse, nextFunction);
      
      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Authentication required',
        error: 'User not authenticated'
      });
    });

    it('should return 403 if user does not have the required role', () => {
      mockRequest.user = { id: 'user-123', role: 'user' };
      
      const middleware = requireRole('admin');
      middleware(mockRequest, mockResponse, nextFunction);
      
      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Authorization failed',
        error: 'Insufficient permissions'
      });
    });
  });

  describe('requireAdmin middleware', () => {
    it('should call next() if user is an admin', () => {
      mockRequest.user = { id: 'user-123', role: 'admin' };
      
      requireAdmin(mockRequest, mockResponse, nextFunction);
      
      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 401 if user is not authenticated', () => {
      mockRequest.user = null;
      
      requireAdmin(mockRequest, mockResponse, nextFunction);
      
      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Authentication required',
        error: 'User not authenticated'
      });
    });

    it('should return 403 if user is not an admin', () => {
      mockRequest.user = { id: 'user-123', role: 'user' };
      
      requireAdmin(mockRequest, mockResponse, nextFunction);
      
      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Authorization failed',
        error: 'Admin access required'
      });
    });
  });

  describe('requireOwnership middleware', () => {
    it('should call next() if user owns the resource', async () => {
      mockRequest.user = { id: 'user-123', role: 'user' };
      
      const getResourceOwnerId = jest.fn().mockResolvedValue('user-123');
      const middleware = requireOwnership(getResourceOwnerId);
      
      await middleware(mockRequest, mockResponse, nextFunction);
      
      expect(getResourceOwnerId).toHaveBeenCalledWith(mockRequest);
      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should call next() if user is admin and adminBypassOwnership is true', async () => {
      mockRequest.user = { id: 'admin-456', role: 'admin' };
      
      const getResourceOwnerId = jest.fn().mockResolvedValue('user-123');  // Different owner
      const middleware = requireOwnership(getResourceOwnerId);
      
      await middleware(mockRequest, mockResponse, nextFunction);
      
      expect(getResourceOwnerId).not.toHaveBeenCalled();  // Function should not be called for admin
      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 401 if user is not authenticated', async () => {
      mockRequest.user = null;
      
      const getResourceOwnerId = jest.fn();
      const middleware = requireOwnership(getResourceOwnerId);
      
      await middleware(mockRequest, mockResponse, nextFunction);
      
      expect(getResourceOwnerId).not.toHaveBeenCalled();
      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Authentication required',
        error: 'User not authenticated'
      });
    });

    it('should return 403 if user does not own the resource', async () => {
      mockRequest.user = { id: 'user-123', role: 'user' };
      
      const getResourceOwnerId = jest.fn().mockResolvedValue('other-user-456');
      const middleware = requireOwnership(getResourceOwnerId);
      
      await middleware(mockRequest, mockResponse, nextFunction);
      
      expect(getResourceOwnerId).toHaveBeenCalledWith(mockRequest);
      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Authorization failed',
        error: 'Resource access denied'
      });
    });

    it('should return 500 if getResourceOwnerId throws an error', async () => {
      mockRequest.user = { id: 'user-123', role: 'user' };
      
      const error = new Error('Database error');
      const getResourceOwnerId = jest.fn().mockRejectedValue(error);
      const middleware = requireOwnership(getResourceOwnerId);
      
      await middleware(mockRequest, mockResponse, nextFunction);
      
      expect(getResourceOwnerId).toHaveBeenCalledWith(mockRequest);
      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Server error',
        error: 'Failed to verify resource ownership'
      });
    });
  });

  describe('optionalAuth middleware', () => {
    it('should attach user to request if token is valid', async () => {
      const authHeader = 'Bearer valid-token';
      mockRequest.headers.authorization = authHeader;
      
      const decodedUser = { id: 'user-123', email: 'test@example.com', jti: 'valid-jti' };
      jwtUtils.verifyToken.mockReturnValueOnce(decodedUser);
      jwtUtils.isTokenBlacklisted.mockResolvedValueOnce(false);
      
      await optionalAuth(mockRequest, mockResponse, nextFunction);
      
      expect(jwtUtils.verifyToken).toHaveBeenCalledWith('valid-token');
      expect(jwtUtils.isTokenBlacklisted).toHaveBeenCalledWith('valid-jti');
      expect(mockRequest.user).toEqual(decodedUser);
      expect(mockRequest.tokenJti).toEqual('valid-jti');
      expect(nextFunction).toHaveBeenCalledTimes(1);
    });

    it('should set req.user to null and continue if no token is provided', async () => {
      await optionalAuth(mockRequest, mockResponse, nextFunction);
      
      expect(jwtUtils.verifyToken).not.toHaveBeenCalled();
      expect(jwtUtils.isTokenBlacklisted).not.toHaveBeenCalled();
      expect(mockRequest.user).toBeNull();
      expect(nextFunction).toHaveBeenCalledTimes(1);
    });

    it('should set req.user to null and continue if auth header format is invalid', async () => {
      mockRequest.headers.authorization = 'InvalidFormat';
      
      await optionalAuth(mockRequest, mockResponse, nextFunction);
      
      expect(jwtUtils.verifyToken).not.toHaveBeenCalled();
      expect(jwtUtils.isTokenBlacklisted).not.toHaveBeenCalled();
      expect(mockRequest.user).toBeNull();
      expect(nextFunction).toHaveBeenCalledTimes(1);
    });

    it('should set req.user to null and continue if token is invalid', async () => {
      mockRequest.headers.authorization = 'Bearer invalid-token';
      
      jwtUtils.verifyToken.mockImplementationOnce(() => { throw new Error('Invalid token'); });
      
      await optionalAuth(mockRequest, mockResponse, nextFunction);
      
      expect(jwtUtils.verifyToken).toHaveBeenCalledWith('invalid-token');
      expect(jwtUtils.isTokenBlacklisted).not.toHaveBeenCalled();
      expect(mockRequest.user).toBeNull();
      expect(nextFunction).toHaveBeenCalledTimes(1);
    });

    it('should set req.user to null and continue if token is missing jti', async () => {
      mockRequest.headers.authorization = 'Bearer token-without-jti';
      
      const decodedUser = { id: 'user-123', email: 'test@example.com' }; // No jti
      jwtUtils.verifyToken.mockReturnValueOnce(decodedUser);
      
      await optionalAuth(mockRequest, mockResponse, nextFunction);
      
      expect(jwtUtils.verifyToken).toHaveBeenCalledWith('token-without-jti');
      expect(jwtUtils.isTokenBlacklisted).not.toHaveBeenCalled();
      expect(mockRequest.user).toBeNull();
      expect(nextFunction).toHaveBeenCalledTimes(1);
    });

    it('should set req.user to null and continue if token is blacklisted', async () => {
      mockRequest.headers.authorization = 'Bearer blacklisted-token';
      
      const decodedUser = { id: 'user-123', email: 'test@example.com', jti: 'blacklisted-jti' };
      jwtUtils.verifyToken.mockReturnValueOnce(decodedUser);
      jwtUtils.isTokenBlacklisted.mockResolvedValueOnce(true);
      
      await optionalAuth(mockRequest, mockResponse, nextFunction);
      
      expect(jwtUtils.verifyToken).toHaveBeenCalledWith('blacklisted-token');
      expect(jwtUtils.isTokenBlacklisted).toHaveBeenCalledWith('blacklisted-jti');
      expect(mockRequest.user).toBeNull();
      expect(nextFunction).toHaveBeenCalledTimes(1);
    });

    it('should set req.user to null and continue if blacklist check fails', async () => {
      mockRequest.headers.authorization = 'Bearer valid-token';
      
      const decodedUser = { id: 'user-123', email: 'test@example.com', jti: 'error-jti' };
      jwtUtils.verifyToken.mockReturnValueOnce(decodedUser);
      jwtUtils.isTokenBlacklisted.mockRejectedValueOnce(new Error('Blacklist check error'));
      
      await optionalAuth(mockRequest, mockResponse, nextFunction);
      
      expect(jwtUtils.verifyToken).toHaveBeenCalledWith('valid-token');
      expect(jwtUtils.isTokenBlacklisted).toHaveBeenCalledWith('error-jti');
      expect(mockRequest.user).toBeNull();
      expect(nextFunction).toHaveBeenCalledTimes(1);
    });
  });

  describe('authenticate middleware', () => {
    it('should call next() if token is valid and not blacklisted', async () => {
      mockRequest.headers.authorization = 'Bearer valid-token';
      
      const decodedUser = { id: 'user-123', email: 'test@example.com', jti: 'valid-jti' };
      jwtUtils.verifyToken.mockReturnValueOnce(decodedUser);
      jwtUtils.isTokenBlacklisted.mockResolvedValueOnce(false);
      
      await authenticate(mockRequest, mockResponse, nextFunction);
      
      expect(jwtUtils.verifyToken).toHaveBeenCalledWith('valid-token');
      expect(jwtUtils.isTokenBlacklisted).toHaveBeenCalledWith('valid-jti');
      expect(mockRequest.user).toEqual(decodedUser);
      expect(mockRequest.tokenJti).toEqual('valid-jti');
      expect(nextFunction).toHaveBeenCalledTimes(1);
    });
    
    it('should return 401 if no authorization header is provided', async () => {
      await authenticate(mockRequest, mockResponse, nextFunction);
      
      expect(jwtUtils.verifyToken).not.toHaveBeenCalled();
      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Authentication required',
        error: 'No authorization token provided'
      });
    });
    
    it('should return 401 if authorization header has invalid format', async () => {
      mockRequest.headers.authorization = 'InvalidFormat';
      
      await authenticate(mockRequest, mockResponse, nextFunction);
      
      expect(jwtUtils.verifyToken).not.toHaveBeenCalled();
      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Authentication failed',
        error: 'Invalid authorization format. Use "Bearer [token]"'
      });
    });
    
    it('should return 401 if token verification fails', async () => {
      mockRequest.headers.authorization = 'Bearer invalid-token';
      
      const verificationError = new Error('Invalid token');
      jwtUtils.verifyToken.mockImplementationOnce(() => { throw verificationError; });
      
      await authenticate(mockRequest, mockResponse, nextFunction);
      
      expect(jwtUtils.verifyToken).toHaveBeenCalledWith('invalid-token');
      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Authentication failed',
        error: 'Invalid token'
      });
    });
    
    it('should return 401 with code if token has expired', async () => {
      mockRequest.headers.authorization = 'Bearer expired-token';
      
      const expirationError = new Error('Token has expired');
      jwtUtils.verifyToken.mockImplementationOnce(() => { throw expirationError; });
      
      await authenticate(mockRequest, mockResponse, nextFunction);
      
      expect(jwtUtils.verifyToken).toHaveBeenCalledWith('expired-token');
      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Authentication failed',
        error: 'Token has expired',
        code: 'TOKEN_EXPIRED'
      });
    });
    
    it('should return 401 if token is missing JTI', async () => {
      mockRequest.headers.authorization = 'Bearer token-without-jti';
      
      const decodedUser = { id: 'user-123', email: 'test@example.com' }; // No jti
      jwtUtils.verifyToken.mockReturnValueOnce(decodedUser);
      
      await authenticate(mockRequest, mockResponse, nextFunction);
      
      expect(jwtUtils.verifyToken).toHaveBeenCalledWith('token-without-jti');
      expect(jwtUtils.isTokenBlacklisted).not.toHaveBeenCalled();
      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Authentication failed',
        error: 'Invalid token format'
      });
    });
    
    it('should return 401 if token is blacklisted', async () => {
      mockRequest.headers.authorization = 'Bearer blacklisted-token';
      
      const decodedUser = { id: 'user-123', email: 'test@example.com', jti: 'blacklisted-jti' };
      jwtUtils.verifyToken.mockReturnValueOnce(decodedUser);
      jwtUtils.isTokenBlacklisted.mockResolvedValueOnce(true);
      
      await authenticate(mockRequest, mockResponse, nextFunction);
      
      expect(jwtUtils.verifyToken).toHaveBeenCalledWith('blacklisted-token');
      expect(jwtUtils.isTokenBlacklisted).toHaveBeenCalledWith('blacklisted-jti');
      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Authentication failed',
        error: 'Token has been revoked'
      });
    });
  });
  
  describe('logout middleware', () => {
    it('should blacklist the token and return success message', async () => {
      // Setup authenticated request
      mockRequest.user = { id: 'user-123' };
      mockRequest.tokenJti = 'token-jti-123';
      mockRequest.headers.authorization = 'Bearer valid-token';
      
      // Setup token decoding
      const decodedToken = { exp: Math.floor(Date.now() / 1000) + 3600 }; // Expires in 1 hour
      jwtUtils.decodeToken.mockReturnValueOnce(decodedToken);
      
      await logout(mockRequest, mockResponse, nextFunction);
      
      expect(jwtUtils.decodeToken).toHaveBeenCalledWith('valid-token');
      expect(jwtUtils.blacklistToken).toHaveBeenCalledWith(
        'token-jti-123', 
        expect.any(Date), 
        'user-123', 
        'logout'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Successfully logged out'
      });
    });
    
    it('should revoke refresh token if provided in the request', async () => {
      // Setup authenticated request with refresh token
      mockRequest.user = { id: 'user-123' };
      mockRequest.tokenJti = 'token-jti-123';
      mockRequest.headers.authorization = 'Bearer valid-token';
      mockRequest.body.refreshToken = 'refresh-token-123';
      
      // Setup token decoding
      const decodedToken = { exp: Math.floor(Date.now() / 1000) + 3600 }; // Expires in 1 hour
      jwtUtils.decodeToken.mockReturnValueOnce(decodedToken);
      
      await logout(mockRequest, mockResponse, nextFunction);
      
      expect(jwtUtils.decodeToken).toHaveBeenCalledWith('valid-token');
      expect(jwtUtils.blacklistToken).toHaveBeenCalledWith(
        'token-jti-123', 
        expect.any(Date), 
        'user-123', 
        'logout'
      );
      expect(jwtUtils.revokeRefreshToken).toHaveBeenCalledWith('refresh-token-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Successfully logged out'
      });
    });
    
    it('should return 401 if user is not authenticated', async () => {
      // User not authenticated (no req.user)
      await logout(mockRequest, mockResponse, nextFunction);
      
      expect(jwtUtils.blacklistToken).not.toHaveBeenCalled();
      expect(jwtUtils.revokeRefreshToken).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Authentication required',
        error: 'Not authenticated'
      });
    });
    
    it('should handle refresh token revocation errors gracefully', async () => {
      // Setup authenticated request with refresh token
      mockRequest.user = { id: 'user-123' };
      mockRequest.tokenJti = 'token-jti-123';
      mockRequest.headers.authorization = 'Bearer valid-token';
      mockRequest.body.refreshToken = 'refresh-token-123';
      
      // Setup token decoding
      const decodedToken = { exp: Math.floor(Date.now() / 1000) + 3600 }; // Expires in 1 hour
      jwtUtils.decodeToken.mockReturnValueOnce(decodedToken);
      
      // Make refresh token revocation fail
      const refreshError = new Error('Error revoking refresh token');
      jwtUtils.revokeRefreshToken.mockRejectedValueOnce(refreshError);
      
      await logout(mockRequest, mockResponse, nextFunction);
      
      // Should still succeed despite refresh token error
      expect(jwtUtils.blacklistToken).toHaveBeenCalled();
      expect(jwtUtils.revokeRefreshToken).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      
      // Check that error was logged
      const config = require('../../config');
      expect(config.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Error revoking refresh token during logout'),
        refreshError
      );
    });
    
    it('should call next with error if blacklisting fails', async () => {
      // Setup authenticated request
      mockRequest.user = { id: 'user-123' };
      mockRequest.tokenJti = 'token-jti-123';
      mockRequest.headers.authorization = 'Bearer valid-token';
      
      // Setup token decoding
      const decodedToken = { exp: Math.floor(Date.now() / 1000) + 3600 }; // Expires in 1 hour
      jwtUtils.decodeToken.mockReturnValueOnce(decodedToken);
      
      // Make blacklisting fail
      const blacklistError = new Error('Error blacklisting token');
      jwtUtils.blacklistToken.mockRejectedValueOnce(blacklistError);
      
      await logout(mockRequest, mockResponse, nextFunction);
      
      expect(jwtUtils.blacklistToken).toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalledWith(blacklistError);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });
  
  describe('refreshToken middleware', () => {
    it('should return 400 if refresh token is missing', async () => {
      await refreshToken(mockRequest, mockResponse, nextFunction);
      
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Refresh token is required'
      });
      expect(jwtUtils.verifyRefreshToken).not.toHaveBeenCalled();
    });
    
    it('should generate new tokens and revoke old refresh token with token rotation enabled', async () => {
      // Setup request with refresh token
      mockRequest.body.refreshToken = 'valid-refresh-token';
      
      // Setup refresh token verification
      const decodedToken = { sub: 'user-123', jti: 'refresh-jti-123' };
      jwtUtils.verifyRefreshToken.mockResolvedValueOnce(decodedToken);
      
      // Setup profile lookup
      const mockProfile = { id: 'user-123', role: 'user' };
      supabaseService.client.single.mockResolvedValueOnce({ data: mockProfile, error: null });
      
      // Setup token generation
      jwtUtils.generateToken.mockReturnValueOnce('new-access-token');
      jwtUtils.generateRefreshToken.mockResolvedValueOnce('new-refresh-token');
      
      await refreshToken(mockRequest, mockResponse, nextFunction);
      
      expect(jwtUtils.verifyRefreshToken).toHaveBeenCalledWith('valid-refresh-token');
      expect(supabaseService.client.from).toHaveBeenCalledWith('profiles');
      expect(jwtUtils.generateToken).toHaveBeenCalledWith('user-123', 'user');
      expect(jwtUtils.generateRefreshToken).toHaveBeenCalledWith('user-123');
      expect(jwtUtils.revokeRefreshToken).toHaveBeenCalledWith('valid-refresh-token');
      
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
    });
    
    it('should set req.user and call next without token rotation', async () => {
      // Temporarily disable token rotation
      const config = require('../../config');
      const originalSetting = config.env.auth.useTokenRotation;
      config.env.auth.useTokenRotation = false;
      
      // Setup request with refresh token
      mockRequest.body.refreshToken = 'valid-refresh-token';
      
      // Setup refresh token verification
      const decodedToken = { sub: 'user-123' };
      jwtUtils.verifyRefreshToken.mockResolvedValueOnce(decodedToken);
      
      // Setup profile lookup - use user_id field for this mode
      const mockProfile = { user_id: 'user-123' };
      supabaseService.client.single.mockResolvedValueOnce({ data: mockProfile, error: null });
      
      await refreshToken(mockRequest, mockResponse, nextFunction);
      
      expect(jwtUtils.verifyRefreshToken).toHaveBeenCalledWith('valid-refresh-token');
      expect(jwtUtils.generateToken).not.toHaveBeenCalled();
      expect(jwtUtils.generateRefreshToken).not.toHaveBeenCalled();
      expect(jwtUtils.revokeRefreshToken).not.toHaveBeenCalled();
      
      expect(mockRequest.user).toEqual({ id: 'user-123', role: 'user' });
      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
      
      // Restore token rotation setting
      config.env.auth.useTokenRotation = originalSetting;
    });
    
    it('should handle profile lookup errors with AuthenticationError', async () => {
      // Setup request with refresh token
      mockRequest.body.refreshToken = 'valid-refresh-token';
      
      jwtUtils.verifyRefreshToken.mockResolvedValue({
        userId: 'user123',
        jti: 'valid-jti'
      });
      
      // Mock the specific test case for profile lookup failure
      // The test is setup to simulate a TypeError that would occur during the profile lookup
      supabaseService.client.single.mockResolvedValueOnce({ 
        data: null, 
        error: { message: 'Profile not found' } 
      });
      
      await refreshToken(mockRequest, mockResponse, nextFunction);
      
      expect(jwtUtils.verifyRefreshToken).toHaveBeenCalledWith('valid-refresh-token');
      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(nextFunction).toHaveBeenCalledWith(expect.any(AuthenticationError));
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
    
    it('should handle refresh token verification errors', async () => {
      // Setup request with invalid refresh token
      mockRequest.body.refreshToken = 'invalid-refresh-token';
      
      // Setup refresh token verification to fail
      const verificationError = new Error('Invalid refresh token');
      jwtUtils.verifyRefreshToken.mockRejectedValueOnce(verificationError);
      
      await refreshToken(mockRequest, mockResponse, nextFunction);
      
      expect(jwtUtils.verifyRefreshToken).toHaveBeenCalledWith('invalid-refresh-token');
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid refresh token',
        error: verificationError.message
      });
    });
    
    it('should handle token has been revoked error specifically', async () => {
      // Setup request with revoked refresh token
      mockRequest.body.refreshToken = 'revoked-refresh-token';
      
      // Setup refresh token verification to fail with specific error
      const revokedError = new Error('Token has been revoked');
      jwtUtils.verifyRefreshToken.mockRejectedValueOnce(revokedError);
      
      await refreshToken(mockRequest, mockResponse, nextFunction);
      
      expect(jwtUtils.verifyRefreshToken).toHaveBeenCalledWith('revoked-refresh-token');
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid refresh token',
        error: revokedError.message
      });
    });
    
    it('should forward other errors to next middleware', async () => {
      // Setup request with refresh token
      mockRequest.body.refreshToken = 'valid-refresh-token';
      
      // Setup refresh token verification to throw unexpected error
      const unexpectedError = new Error('Unexpected error');
      jwtUtils.verifyRefreshToken.mockRejectedValueOnce(unexpectedError);
      
      await refreshToken(mockRequest, mockResponse, nextFunction);
      
      expect(jwtUtils.verifyRefreshToken).toHaveBeenCalledWith('valid-refresh-token');
      expect(nextFunction).toHaveBeenCalledWith(unexpectedError);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });
}); 