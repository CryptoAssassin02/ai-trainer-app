const { notFoundHandler, globalErrorHandler } = require('../../middleware/error-middleware');
const { ApiError, ValidationError, AgentError, ERROR_CODES } = require('../../utils/errors');

// Create a production-like environment for tests
process.env.NODE_ENV = 'production';

// Mock logger
jest.mock('../../config', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    fatal: jest.fn()
  },
  env: {
    server: {
      isDevelopment: false
    }
  }
}));

// Mock Express objects
const mockRequest = () => {
  return {
    method: 'GET',
    originalUrl: '/test',
    ip: '127.0.0.1',
    headers: {
      'user-agent': 'Jest Test'
    }
  };
};

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.headersSent = false;
  return res;
};

describe('Error Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('notFoundHandler', () => {
    it('should create a NotFoundError and pass to next', () => {
      const req = mockRequest();
      const res = mockResponse();
      const next = jest.fn();

      notFoundHandler(req, res, next);

      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(404);
      expect(error.message).toContain('Resource not found');
    });
  });

  describe('globalErrorHandler', () => {
    it('should handle ApiError correctly', () => {
      const req = mockRequest();
      const res = mockResponse();
      const next = jest.fn();
      const error = new ApiError('Test error', 400);

      globalErrorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Test error'
      });
    });

    it('should handle ValidationError with details', () => {
      const req = mockRequest();
      const res = mockResponse();
      const next = jest.fn();
      const details = [{ field: 'email', message: 'Invalid email' }];
      const error = new ValidationError('Validation failed', details);

      globalErrorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        message: 'Validation failed',
        errors: details,
        errorCode: 'VALIDATION_ERROR'
      }));
    });

    it('should handle AgentError correctly', () => {
      const req = mockRequest();
      const res = mockResponse();
      const next = jest.fn();
      const error = new AgentError('Agent error', ERROR_CODES.VALIDATION_ERROR);

      globalErrorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400); // Mapped from VALIDATION_ERROR
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Agent error',
        errorCode: ERROR_CODES.VALIDATION_ERROR,
        details: null
      });
    });

    it('should handle generic Error with 500 status', () => {
      const req = mockRequest();
      const res = mockResponse();
      const next = jest.fn();
      const error = new Error('Generic error');

      globalErrorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Internal server error' // In production, generic error message is used
      });
    });

    it('should call next if headers already sent', () => {
      const req = mockRequest();
      const res = mockResponse();
      res.headersSent = true;
      const next = jest.fn();
      const error = new Error('Some error');

      globalErrorHandler(error, req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });
}); 