const { logger } = require('../../config');
const { formatErrorResponse } = require('../../utils/errors'); // Use the real formatter
const { asyncHandler, errorResponse, successResponse } = require('../../utils/error-handlers');
const { ApiError } = require('../../utils/errors'); // Need ApiError

// Mock logger
jest.mock('../../config', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
  // Mock env if needed, or set process.env directly in tests
  env: {}
}));

// Mock Express req, res, next objects for testing
const mockRequest = () => ({});
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res); // Chainable
  res.json = jest.fn().mockReturnValue(res);   // Chainable
  return res;
};
const mockNext = jest.fn();

describe('Utility: error-handlers', () => {
  let req, res, next;

  beforeEach(() => {
    // Reset mocks and create fresh req, res, next for each test
    jest.clearAllMocks();
    req = mockRequest();
    res = mockResponse();
    next = mockNext;
  });

  describe('asyncHandler()', () => {
    it('should call next() with the error if the wrapped function rejects', async () => {
      const mockError = new Error('Async function failed');
      const failingAsyncFn = jest.fn().mockRejectedValue(mockError);
      const wrappedHandler = asyncHandler(failingAsyncFn);

      await wrappedHandler(req, res, next);

      expect(failingAsyncFn).toHaveBeenCalledWith(req, res, next);
      expect(next).toHaveBeenCalledWith(mockError);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should not call next() with an error if the wrapped function resolves', async () => {
      const successResult = { message: 'Success' };
      const succeedingAsyncFn = jest.fn().mockResolvedValue(successResult);
      const wrappedHandler = asyncHandler(succeedingAsyncFn);

      await wrappedHandler(req, res, next);

      expect(succeedingAsyncFn).toHaveBeenCalledWith(req, res, next);
      expect(next).not.toHaveBeenCalledWith(expect.any(Error)); // Ensure it wasn't called with an error
      // Note: asyncHandler doesn't explicitly call next() on success, it relies on the wrapped function doing so if needed.
      // We are primarily testing that it *catches* errors and calls next(error).
    });
  });

  describe('errorResponse()', () => {
    it('should log as error and send 500 for generic Error', () => {
      const error = new Error('Something broke');
      errorResponse(res, error);

      expect(logger.error).toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        message: 'Something broke',
        errorCode: 'INTERNAL_SERVER_ERROR'
      }));
    });

    it('should log as error and send correct status for ApiError >= 500', () => {
      const error = new ApiError('Service Unavailable', 503);
      errorResponse(res, error);

      expect(logger.error).toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        message: 'Service Unavailable'
      }));
    });

    it('should log as warn and send correct status for ApiError < 500', () => {
      const error = new ApiError('Bad Request', 400);
      errorResponse(res, error);

      expect(logger.warn).toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        message: 'Bad Request'
      }));
    });

    it('should include error.details in the log message if present', () => {
        const error = new ApiError('Validation Failed', 422);
        error.details = { field: 'email', issue: 'invalid format' };
        errorResponse(res, error);

        expect(logger.warn).toHaveBeenCalledWith(
            expect.stringContaining('API Error Response [422]'),
            expect.objectContaining({ details: error.details })
        );
        expect(res.status).toHaveBeenCalledWith(422);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Validation Failed' }));
    });

    it('should include stack trace in log ONLY when NODE_ENV is development', () => {
        const error = new Error('Detailed crash');
        const originalNodeEnv = process.env.NODE_ENV;

        // Test in development
        process.env.NODE_ENV = 'development';
        errorResponse(res, error);
        expect(logger.error).toHaveBeenCalledWith(
            expect.stringContaining('API Error Response [500]'),
            expect.objectContaining({ stack: expect.any(String) }) // Check if stack exists
        );
        jest.clearAllMocks(); // Clear mocks before next call

        // Test in production
        process.env.NODE_ENV = 'production';
        errorResponse(res, error);
        expect(logger.error).toHaveBeenCalledWith(
            expect.stringContaining('API Error Response [500]'),
            expect.not.objectContaining({ stack: expect.any(String) }) // Check stack does NOT exist
        );

        // Restore original NODE_ENV
        process.env.NODE_ENV = originalNodeEnv;
    });
  });

  describe('successResponse()', () => {
    const mockData = { id: 1, name: 'Test Data' };

    it('should send response with status 200 and default message when only data is provided', () => {
      successResponse(res, mockData);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Success', // Default message
        data: mockData
      });
    });

    it('should send response with specified status, message, and data', () => {
      const message = 'Resource created';
      const statusCode = 201;
      successResponse(res, mockData, message, statusCode);

      expect(res.status).toHaveBeenCalledWith(statusCode);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: message,
        data: mockData
      });
    });

    it('should send response without data field if data is undefined', () => {
      const message = 'Operation successful';
      const statusCode = 200;
      successResponse(res, undefined, message, statusCode);

      expect(res.status).toHaveBeenCalledWith(statusCode);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: message
        // No data field expected
      });
      // Verify data field is not present
      expect(res.json.mock.calls[0][0]).not.toHaveProperty('data');
    });

    it('should use default status and message when not provided', () => {
        successResponse(res, mockData); // Only data provided
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Success' }));

        jest.clearAllMocks();
        successResponse(res, undefined); // No data, message or status
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ status: 'success', message: 'Success'});

    });

     it('should handle null data correctly (treat as undefined)', () => {
      successResponse(res, null, 'Null data', 200);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Null data'
      });
      expect(res.json.mock.calls[0][0]).not.toHaveProperty('data');
    });
  });
}); 