/**
 * @jest-environment node
 */

const request = require('supertest');
const express = require('express');
const notificationRoutes = require('../../routes/notifications');
const notificationController = require('../../controllers/notifications');
const { authenticate } = require('../../middleware/auth');
const { validateNotificationPreferences } = require('../../middleware/validation');

// Mock the authentication middleware
jest.mock('../../middleware/auth', () => ({
  authenticate: jest.fn((req, res, next) => {
    req.user = { id: 'test-user-id' };
    next();
  })
}));

// Mock the validation middleware
jest.mock('../../middleware/validation', () => ({
  validateNotificationPreferences: jest.fn((req, res, next) => next())
}));

// Mock the controller functions
jest.mock('../../controllers/notifications', () => ({
  updatePreferences: jest.fn(),
  getPreferences: jest.fn(),
  testNotification: jest.fn()
}));

// Express rate limit mock
jest.mock('express-rate-limit', () => {
  return jest.fn().mockImplementation(() => {
    return (req, res, next) => next();
  });
});

describe('Notification Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(notificationRoutes);
    
    // Reset mock implementation
    jest.clearAllMocks();
  });
  
  describe('POST /v1/notifications/preferences', () => {
    it('should call authenticate, validation middleware, and updatePreferences controller', async () => {
      // Setup mock response
      notificationController.updatePreferences.mockImplementation((req, res) => {
        res.status(200).json({
          status: 'success',
          message: 'Notification preferences updated successfully'
        });
      });
      
      // Test data
      const requestBody = {
        email_enabled: true,
        sms_enabled: false,
        push_enabled: true,
        in_app_enabled: true
      };
      
      // Send request
      const response = await request(app)
        .post('/v1/notifications/preferences')
        .send(requestBody)
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer mock-token');
      
      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        message: 'Notification preferences updated successfully'
      });
      
      // Verify middleware and controller were called
      expect(authenticate).toHaveBeenCalled();
      expect(validateNotificationPreferences).toHaveBeenCalled();
      expect(notificationController.updatePreferences).toHaveBeenCalled();
    });
  });
  
  describe('GET /v1/notifications/preferences', () => {
    it('should call authenticate and getPreferences controller', async () => {
      // Setup mock response
      notificationController.getPreferences.mockImplementation((req, res) => {
        res.status(200).json({
          status: 'success',
          data: {
            email_enabled: true,
            sms_enabled: false,
            push_enabled: true,
            in_app_enabled: true,
            quiet_hours_start: null,
            quiet_hours_end: null
          }
        });
      });
      
      // Send request
      const response = await request(app)
        .get('/v1/notifications/preferences')
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer mock-token');
      
      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        data: {
          email_enabled: true,
          sms_enabled: false,
          push_enabled: true,
          in_app_enabled: true,
          quiet_hours_start: null,
          quiet_hours_end: null
        }
      });
      
      // Verify middleware and controller were called
      expect(authenticate).toHaveBeenCalled();
      expect(notificationController.getPreferences).toHaveBeenCalled();
    });
  });
  
  describe('POST /v1/notifications/test', () => {
    it('should call authenticate and testNotification controller', async () => {
      // Setup mock response
      notificationController.testNotification.mockImplementation((req, res) => {
        res.status(200).json({
          status: 'success',
          data: { success: true },
          message: 'Test notification sent'
        });
      });
      
      // Test data
      const requestBody = {
        channel: 'email'
      };
      
      // Send request
      const response = await request(app)
        .post('/v1/notifications/test')
        .send(requestBody)
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer mock-token');
      
      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        data: { success: true },
        message: 'Test notification sent'
      });
      
      // Verify middleware and controller were called
      expect(authenticate).toHaveBeenCalled();
      expect(notificationController.testNotification).toHaveBeenCalled();
    });
    
    it('should handle invalid channel input', async () => {
      // Setup mock response for invalid input
      notificationController.testNotification.mockImplementation((req, res) => {
        res.status(400).json({
          status: 'error',
          message: 'Invalid notification channel. Must be one of: email, sms, push, in_app'
        });
      });
      
      // Test data with invalid channel
      const requestBody = {
        channel: 'invalid_channel'
      };
      
      // Send request
      const response = await request(app)
        .post('/v1/notifications/test')
        .send(requestBody)
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer mock-token');
      
      // Assertions
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        status: 'error',
        message: 'Invalid notification channel. Must be one of: email, sms, push, in_app'
      });
      
      // Verify middleware and controller were called
      expect(authenticate).toHaveBeenCalled();
      expect(notificationController.testNotification).toHaveBeenCalled();
    });
  });
}); 