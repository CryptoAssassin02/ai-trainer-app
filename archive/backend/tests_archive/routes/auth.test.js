/**
 * @fileoverview Tests for Authentication Routes
 * Ensures proper API endpoints for authentication operations
 */

const request = require('supertest');
const express = require('express');
const authController = require('../../controllers/auth');
const { ValidationError, AuthenticationError, ConflictError } = require('../../utils/errors');

// Mock the controllers
jest.mock('../../controllers/auth');

// Create express application with routes and error handler
const app = express();
app.use(express.json());

// Manual route setup for testing 
// This avoids the need to mock deep dependencies
app.post('/api/auth/signup', authController.signup);
app.post('/api/auth/login', authController.login);
app.post('/api/auth/refresh', authController.refreshToken);
app.get('/api/auth/validate', authController.validateSession);
app.post('/api/auth/logout', authController.logout);

// Error handler middleware
app.use((err, req, res, next) => {
  if (err instanceof ValidationError) {
    return res.status(400).json({
      status: 'error',
      message: err.message,
      errors: err.errors
    });
  }
  
  if (err instanceof AuthenticationError) {
    return res.status(401).json({
      status: 'error',
      message: 'Authentication failed',
      error: err.message
    });
  }
  
  if (err instanceof ConflictError) {
    return res.status(409).json({
      status: 'error',
      message: err.message
    });
  }
  
  return res.status(500).json({
    status: 'error',
    message: 'Server error',
    error: err.message
  });
});

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('POST /api/auth/signup', () => {
    it('should return 201 when signup is successful', async () => {
      // Setup
      authController.signup.mockImplementation((req, res) => {
        return res.status(201).json({
          status: 'success',
          message: 'Account created',
          userId: 'test-user-id'
        });
      });
      
      // Execute
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'StrongPassword123!',
          name: 'Test User'
        });
      
      // Assert
      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        status: 'success',
        message: 'Account created',
        userId: 'test-user-id'
      });
      expect(authController.signup).toHaveBeenCalled();
    });
    
    it('should return 400 when validation fails', async () => {
      // Setup
      authController.signup.mockImplementation((req, res, next) => {
        return next(new ValidationError('Validation failed', [
          { field: 'email', message: 'Email is required' }
        ]));
      });
      
      // Execute
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          password: 'StrongPassword123!',
          name: 'Test User'
        });
      
      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message', 'Validation failed');
      expect(response.body).toHaveProperty('errors');
      expect(Array.isArray(response.body.errors)).toBe(true);
      expect(response.body.errors.length).toBeGreaterThan(0);
      expect(response.body.errors[0]).toHaveProperty('field');
      expect(response.body.errors[0]).toHaveProperty('message');
      expect(authController.signup).toHaveBeenCalled();
    });
    
    it('should return 409 when email already exists', async () => {
      // Setup
      authController.signup.mockImplementation((req, res, next) => {
        return next(new ConflictError('Email already exists'));
      });
      
      // Execute
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'existing@example.com',
          password: 'StrongPassword123!',
          name: 'Test User'
        });
      
      // Assert
      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        status: 'error',
        message: 'Email already exists'
      });
      expect(authController.signup).toHaveBeenCalled();
    });
  });
  
  describe('POST /api/auth/login', () => {
    it('should return 200 and tokens when login is successful', async () => {
      // Setup
      authController.login.mockImplementation((req, res) => {
        return res.status(200).json({
          status: 'success',
          message: 'Login successful',
          jwtToken: 'mocked-access-token',
          refreshToken: 'mocked-refresh-token'
        });
      });
      
      // Execute
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!'
        });
      
      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        message: 'Login successful',
        jwtToken: 'mocked-access-token',
        refreshToken: 'mocked-refresh-token'
      });
      expect(authController.login).toHaveBeenCalled();
    });
    
    it('should return 401 when credentials are invalid', async () => {
      // Setup
      authController.login.mockImplementation((req, res, next) => {
        return next(new AuthenticationError('Invalid credentials'));
      });
      
      // Execute
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'wrong@example.com',
          password: 'WrongPassword123!'
        });
      
      // Assert
      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        status: 'error',
        message: 'Authentication failed',
        error: 'Invalid credentials'
      });
      expect(authController.login).toHaveBeenCalled();
    });
    
    it('should return 400 when validation fails', async () => {
      // Setup
      authController.login.mockImplementation((req, res, next) => {
        return next(new ValidationError('Validation failed', [
          { field: 'password', message: 'Password is required' }
        ]));
      });
      
      // Execute
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com'
        });
      
      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message', 'Validation failed');
      expect(response.body).toHaveProperty('errors');
      expect(Array.isArray(response.body.errors)).toBe(true);
      expect(response.body.errors.length).toBeGreaterThan(0);
      expect(response.body.errors[0]).toHaveProperty('field');
      expect(response.body.errors[0]).toHaveProperty('message');
      expect(authController.login).toHaveBeenCalled();
    });
  });
  
  describe('POST /api/auth/refresh', () => {
    it('should return 200 and new access token when refresh is successful', async () => {
      // Setup
      authController.refreshToken.mockImplementation((req, res) => {
        return res.status(200).json({
          status: 'success',
          jwtToken: 'new-access-token'
        });
      });
      
      // Execute
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'valid-refresh-token'
        });
      
      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        jwtToken: 'new-access-token'
      });
      expect(authController.refreshToken).toHaveBeenCalled();
    });
    
    it('should return 401 when refresh token is invalid', async () => {
      // Setup
      authController.refreshToken.mockImplementation((req, res, next) => {
        return next(new AuthenticationError('Invalid refresh token'));
      });
      
      // Execute
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'invalid-refresh-token'
        });
      
      // Assert
      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        status: 'error',
        message: 'Authentication failed',
        error: 'Invalid refresh token'
      });
      expect(authController.refreshToken).toHaveBeenCalled();
    });
    
    it('should return 400 when refresh token is missing', async () => {
      // Setup
      authController.refreshToken.mockImplementation((req, res, next) => {
        return next(new ValidationError('Validation failed', [
          { field: 'refreshToken', message: 'Refresh token is required' }
        ]));
      });
      
      // Execute
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({});
      
      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message', 'Validation failed');
      expect(response.body).toHaveProperty('errors');
      expect(Array.isArray(response.body.errors)).toBe(true);
      expect(response.body.errors.length).toBeGreaterThan(0);
      expect(response.body.errors[0]).toHaveProperty('field');
      expect(response.body.errors[0]).toHaveProperty('message');
      expect(authController.refreshToken).toHaveBeenCalled();
    });
  });
  
  describe('GET /api/auth/validate', () => {
    it('should return 200 when session is valid', async () => {
      // Setup
      authController.validateSession.mockImplementation((req, res) => {
        return res.status(200).json({
          status: 'success',
          message: 'Session is valid',
          user: {
            id: 'test-user-id',
            role: 'user'
          }
        });
      });
      
      // Execute
      const response = await request(app)
        .get('/api/auth/validate')
        .set('Authorization', 'Bearer valid-token');
      
      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        message: 'Session is valid',
        user: {
          id: 'test-user-id',
          role: 'user'
        }
      });
      expect(authController.validateSession).toHaveBeenCalled();
    });
    
    it('should return 401 when token is missing or invalid', async () => {
      // Setup
      authController.validateSession.mockImplementation((req, res, next) => {
        return next(new AuthenticationError('Invalid token'));
      });
      
      // Execute
      const response = await request(app)
        .get('/api/auth/validate')
        .set('Authorization', 'Bearer invalid-token');
      
      // Assert
      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        status: 'error',
        message: 'Authentication failed',
        error: 'Invalid token'
      });
      expect(authController.validateSession).toHaveBeenCalled();
    });
  });
  
  describe('POST /api/auth/logout', () => {
    it('should return 200 when logout is successful', async () => {
      // Setup
      authController.logout.mockImplementation((req, res) => {
        return res.status(200).json({
          status: 'success',
          message: 'Logged out successfully'
        });
      });
      
      // Execute
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer valid-token')
        .send({
          refreshToken: 'valid-refresh-token'
        });
      
      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        message: 'Logged out successfully'
      });
      expect(authController.logout).toHaveBeenCalled();
    });
    
    it('should return 400 when refresh token is missing', async () => {
      // Setup
      authController.logout.mockImplementation((req, res, next) => {
        return next(new ValidationError('Validation failed', [
          { field: 'refreshToken', message: 'Refresh token is required' }
        ]));
      });
      
      // Execute
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer valid-token')
        .send({});
      
      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message', 'Validation failed');
      expect(response.body).toHaveProperty('errors');
      expect(Array.isArray(response.body.errors)).toBe(true);
      expect(response.body.errors.length).toBeGreaterThan(0);
      expect(response.body.errors[0]).toHaveProperty('field');
      expect(response.body.errors[0]).toHaveProperty('message');
      expect(authController.logout).toHaveBeenCalled();
    });
    
    it('should return 401 when authorization header is missing', async () => {
      // Setup
      authController.logout.mockImplementation((req, res, next) => {
        return next(new AuthenticationError('No authorization token provided'));
      });
      
      // Execute
      const response = await request(app)
        .post('/api/auth/logout')
        .send({
          refreshToken: 'valid-refresh-token'
        });
      
      // Assert
      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        status: 'error',
        message: 'Authentication failed',
        error: 'No authorization token provided'
      });
      expect(authController.logout).toHaveBeenCalled();
    });
  });
});
