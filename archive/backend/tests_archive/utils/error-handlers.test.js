// Mock config and logger
jest.mock('../../config', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock errors.js with the required classes and functions
const mockApiError = jest.fn().mockImplementation((message, statusCode) => {
  return {
    message,
    statusCode,
    name: 'ApiError'
  };
});

const mockValidationError = jest.fn().mockImplementation((message, details) => {
  return {
    message,
    statusCode: 400,
    name: 'ValidationError',
    errors: details,
    code: 'VALIDATION_ERROR'
  };
});

const mockFormatErrorResponse = jest.fn().mockImplementation((error) => {
  if (error.name === 'ApiError') {
    return {
      status: 'error',
      message: error.message
    };
  }
  if (error.name === 'ValidationError') {
    return {
      status: 'error',
      message: error.message,
      errors: error.errors,
      errorCode: error.code
    };
  }
  return {
    status: 'error',
    message: error.message,
    error: error.message
  };
});

jest.mock('../../utils/errors', () => ({
  ApiError: mockApiError,
  ValidationError: mockValidationError,
  formatErrorResponse: mockFormatErrorResponse
}));

const { asyncHandler, errorResponse, successResponse } = require('../../utils/error-handlers');
const { ApiError, ValidationError } = require('../../utils/errors');

// Mock Express response
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('Error Handler Utilities', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
  });
  
  describe('asyncHandler', () => {
    it('should handle resolved promises', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const req = {};
      const res = mockRes();
      const next = jest.fn();

      await asyncHandler(fn)(req, res, next);

      expect(fn).toHaveBeenCalledWith(req, res, next);
      expect(next).not.toHaveBeenCalled();
    });

    it('should forward errors to next middleware', async () => {
      const error = new Error('Test error');
      const fn = jest.fn().mockRejectedValue(error);
      const req = {};
      const res = mockRes();
      const next = jest.fn();

      await asyncHandler(fn)(req, res, next);

      expect(fn).toHaveBeenCalledWith(req, res, next);
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('errorResponse', () => {
    it('should format ApiError correctly', () => {
      const error = new ApiError('Test API error', 400);
      const res = mockRes();
      
      // Create expected response format
      const expectedResponse = {
        status: 'error',
        message: 'Test API error'
      };
      
      // Configure our mock to return the expected response
      mockFormatErrorResponse.mockReturnValueOnce(expectedResponse);

      errorResponse(res, error);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expectedResponse);
    });

    it('should format ValidationError with errors array', () => {
      const details = [{ field: 'email', message: 'Invalid email' }];
      const error = new ValidationError('Validation failed', details);
      const res = mockRes();
      
      // Create expected response format
      const expectedResponse = {
        status: 'error',
        message: 'Validation failed',
        errors: details,
        errorCode: 'VALIDATION_ERROR'
      };
      
      // Configure our mock to return the expected response
      mockFormatErrorResponse.mockReturnValueOnce(expectedResponse);

      errorResponse(res, error);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expectedResponse);
    });

    it('should default to 500 for non-ApiError errors', () => {
      const error = new Error('Generic error');
      const res = mockRes();
      
      // Create expected response format
      const expectedResponse = {
        status: 'error',
        message: 'Generic error',
        error: 'Generic error'
      };
      
      // Configure our mock to return the expected response
      mockFormatErrorResponse.mockReturnValueOnce(expectedResponse);

      errorResponse(res, error);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expectedResponse);
    });
  });

  describe('successResponse', () => {
    it('should format success response with data', () => {
      const data = { id: 1, name: 'Test' };
      const res = mockRes();

      successResponse(res, data, 'Success message');

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Success message',
        data
      });
    });

    it('should format success response without data', () => {
      const res = mockRes();

      successResponse(res, undefined, 'Success message');

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Success message'
      });
    });

    it('should use custom status code if provided', () => {
      const data = { id: 1 };
      const res = mockRes();

      successResponse(res, data, 'Created', 201);

      expect(res.status).toHaveBeenCalledWith(201);
    });
  });
}); 