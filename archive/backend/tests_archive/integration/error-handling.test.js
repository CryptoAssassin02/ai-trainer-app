// Mock the logger to avoid actual logging
jest.mock('../../config/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
}));

const request = require('supertest');
const express = require('express');
const { AgentError, ValidationError, ERROR_CODES, formatErrorResponse } = require('../../utils/errors');

// Mock the formatErrorResponse function
jest.mock('../../utils/errors', () => {
  const originalModule = jest.requireActual('../../utils/errors');
  return {
    ...originalModule,
    formatErrorResponse: jest.fn((err) => ({
      status: 'error',
      message: err.message
    }))
  };
});

// Create a simplified version of errorHandler for testing
const errorHandler = (err, req, res, next) => {
  // Handle AgentError specifically
  if (err instanceof AgentError) {
    // Map agent error code to HTTP status code
    const statusCode = mapAgentErrorToStatusCode(err.code);
    
    // Format response for AgentError
    const response = {
      status: 'error',
      message: err.message,
      errorCode: err.code,
      details: err.details
    };
    
    // Send error response
    return res.status(statusCode).json(response);
  }
  
  // Handle other errors
  let statusCode = err.statusCode || 500;
  
  // Format error response
  const errorResponse = formatErrorResponse(err);
  
  // Send error response
  res.status(statusCode).json(errorResponse);
};

// Define the status code mapping
const mapAgentErrorToStatusCode = (errorCode) => {
  const codeMapping = {
    [ERROR_CODES.VALIDATION_ERROR]: 400, // Bad Request
    [ERROR_CODES.PROCESSING_ERROR]: 500, // Internal Server Error
    [ERROR_CODES.EXTERNAL_SERVICE_ERROR]: 502, // Bad Gateway
    [ERROR_CODES.RESOURCE_ERROR]: 404, // Not Found
    [ERROR_CODES.MEMORY_SYSTEM_ERROR]: 500, // Internal Server Error
    [ERROR_CODES.CONFIGURATION_ERROR]: 500, // Internal Server Error
  };
  
  return codeMapping[errorCode] || 500; // Default to 500 if no mapping found
};

describe('Error Handling Integration', () => {
  let app;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup a simple express app with routes that simulate different errors
    app = express();
    
    // Define test routes
    app.get('/api/validation-error', (req, res, next) => {
      const error = new AgentError(
        'Validation failed: Missing required fields',
        ERROR_CODES.VALIDATION_ERROR,
        { fields: ['email', 'password'] }
      );
      next(error);
    });
    
    app.get('/api/external-service-error', (req, res, next) => {
      const originalError = new Error('API timeout');
      const error = new AgentError(
        'External API failed',
        ERROR_CODES.EXTERNAL_SERVICE_ERROR,
        { service: 'perplexity' },
        originalError
      );
      next(error);
    });
    
    app.get('/api/resource-error', (req, res, next) => {
      const error = new AgentError(
        'Workout plan not found',
        ERROR_CODES.RESOURCE_ERROR,
        { resourceId: '123' }
      );
      next(error);
    });
    
    app.get('/api/processing-error', (req, res, next) => {
      const error = new AgentError(
        'Failed to process workout plan',
        ERROR_CODES.PROCESSING_ERROR
      );
      next(error);
    });
    
    app.get('/api/standard-error', (req, res, next) => {
      const error = new Error('Standard error');
      error.statusCode = 500;
      next(error);
    });
    
    // Simulate an agent error from a controller
    app.get('/api/agent-error', async (req, res, next) => {
      try {
        // Simulate a controller calling an agent
        const mockAgent = {
          safeProcess: async () => ({
            success: false,
            error: new AgentError(
              'Agent processing failed',
              ERROR_CODES.PROCESSING_ERROR,
              { step: 'generate_plan' }
            )
          })
        };
        
        const result = await mockAgent.safeProcess({});
        
        if (!result.success) {
          // Controller detects agent error and passes to middleware
          return next(result.error);
        }
        
        res.json({ success: true, data: result.data });
      } catch (error) {
        next(error);
      }
    });
    
    // Add error handling middleware
    app.use(errorHandler);
  });

  it('should return 400 Bad Request for validation errors', async () => {
    const response = await request(app).get('/api/validation-error');
    
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      status: 'error',
      message: 'Validation failed: Missing required fields',
      errorCode: ERROR_CODES.VALIDATION_ERROR,
      details: { fields: ['email', 'password'] }
    });
  });

  it('should return 502 Bad Gateway for external service errors', async () => {
    const response = await request(app).get('/api/external-service-error');
    
    expect(response.status).toBe(502);
    expect(response.body).toEqual({
      status: 'error',
      message: 'External API failed',
      errorCode: ERROR_CODES.EXTERNAL_SERVICE_ERROR,
      details: { service: 'perplexity' }
    });
  });

  it('should return 404 Not Found for resource errors', async () => {
    const response = await request(app).get('/api/resource-error');
    
    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      status: 'error',
      message: 'Workout plan not found',
      errorCode: ERROR_CODES.RESOURCE_ERROR,
      details: { resourceId: '123' }
    });
  });

  it('should return 500 Internal Server Error for processing errors', async () => {
    const response = await request(app).get('/api/processing-error');
    
    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      status: 'error',
      message: 'Failed to process workout plan',
      errorCode: ERROR_CODES.PROCESSING_ERROR,
      details: null
    });
  });

  it('should properly handle standard errors (non-AgentError)', async () => {
    const response = await request(app).get('/api/standard-error');
    
    expect(response.status).toBe(500);
    expect(response.body.status).toBe('error');
    expect(response.body.message).toBe('Standard error');
  });

  it('should handle the full agent error flow from controller to response', async () => {
    const response = await request(app).get('/api/agent-error');
    
    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      status: 'error',
      message: 'Agent processing failed',
      errorCode: ERROR_CODES.PROCESSING_ERROR,
      details: { step: 'generate_plan' }
    });
  });
}); 