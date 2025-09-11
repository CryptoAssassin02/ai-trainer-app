const {
  notFoundHandler,
  globalErrorHandler,
  handleFatalError
} = require('../../middleware/error-middleware');
const { logger } = require('../../config');
const {
  ApiError,
  AgentError,
  NotFoundError,
  ERROR_CODES,
  formatErrorResponse
} = require('../../utils/errors');

// Mock dependencies
jest.mock('../../config', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    fatal: jest.fn(),
    info: jest.fn(), // Added for completeness if any path uses it
    debug: jest.fn() // Added for completeness
  }
}));

jest.mock('../../utils/errors', () => {
  const originalErrors = jest.requireActual('../../utils/errors');
  return {
    ...originalErrors, // Preserve actual error classes and ERROR_CODES
    formatErrorResponse: jest.fn((err) => ({ // Mock formatErrorResponse
      status: 'error',
      message: err.message || 'An unexpected error occurred',
      errorCode: err.errorCode || 'UNKNOWN_ERROR'
    }))
  };
});

describe('Error Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;
  let originalProcessEnv;
  let originalGlobalServer;
  let mockProcessExit;

  beforeEach(() => {
    mockReq = {
      originalUrl: '/test/path',
      method: 'GET'
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      headersSent: false
    };
    mockNext = jest.fn();

    // Backup and mock process.env
    originalProcessEnv = { ...process.env };
    process.env.NODE_ENV = 'test';

    // Backup and mock global.server
    originalGlobalServer = global.server;
    global.server = undefined; // Default to no server

    // Mock process.exit
    mockProcessExit = jest.spyOn(process, 'exit').mockImplementation((code) => {
      // console.log(`Mock process.exit called with code ${code}`);
      // throw new Error(`process.exit called with ${code}`); // Optional: throw to catch unintended exits
    });


    // Clear all mocks before each test
    logger.error.mockClear();
    logger.warn.mockClear();
    logger.fatal.mockClear();
    formatErrorResponse.mockClear();
    mockProcessExit.mockClear();
    if (global.server && global.server.close) {
      global.server.close.mockClear();
    }
  });

  afterEach(() => {
    // Restore original process.env
    process.env = originalProcessEnv;
    // Restore original global.server
    global.server = originalGlobalServer;
    // Restore process.exit
    mockProcessExit.mockRestore();
    jest.clearAllMocks();
  });

  describe('notFoundHandler', () => {
    it('should call next with a NotFoundError including the originalUrl', () => {
      notFoundHandler(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
      const errorPassedToNext = mockNext.mock.calls[0][0];
      expect(errorPassedToNext.message).toBe('Resource not found: /test/path');
      expect(errorPassedToNext.statusCode).toBe(404);
    });
  });

  // mapAgentErrorToStatusCode is not directly exported or used by other functions in error-middleware,
  // but it's a helper within globalErrorHandler. We can test it implicitly via globalErrorHandler tests for AgentErrors
  // or explicitly if we decide to export it for testing (currently not exported).
  // For now, testing its logic via globalErrorHandler scenarios.
  // If we were to test it directly:
  // const { mapAgentErrorToStatusCode } // if it were exported
  // describe('mapAgentErrorToStatusCode', () => {
  //   it('should map known ERROR_CODES.VALIDATION_ERROR to 400', () => {
  //     expect(mapAgentErrorToStatusCode(ERROR_CODES.VALIDATION_ERROR)).toBe(400);
  //   });
  // it('should map known ERROR_CODES.PROCESSING_ERROR to 500', () => {
  //     expect(mapAgentErrorToStatusCode(ERROR_CODES.PROCESSING_ERROR)).toBe(500);
  //   });
  //   // ... other mappings
  //   it('should map an unknown error code to 500', () => {
  //     expect(mapAgentErrorToStatusCode('UNKNOWN_AGENT_ERROR')).toBe(500);
  //   });
  // });

  describe('globalErrorHandler', () => {
    it('should call next with the error if headersSent is true', () => {
      mockRes.headersSent = true;
      const error = new Error('Test error');
      globalErrorHandler(error, mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
    });

    describe('AgentError Handling', () => {
      it('should handle AgentError correctly (operational, warn)', () => {
        const agentError = new AgentError(
          'Validation failed',
          ERROR_CODES.VALIDATION_ERROR, // Results in 400 status
          { field: 'email' },
          true // isOperational
        );

        globalErrorHandler(agentError, mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          status: 'error',
          message: 'Validation failed',
          errorCode: ERROR_CODES.VALIDATION_ERROR,
          details: { field: 'email' }
        });
        expect(logger.warn).toHaveBeenCalledTimes(1);
        expect(logger.warn).toHaveBeenCalledWith(
          expect.stringContaining('[AgentError]'),
          expect.objectContaining({
            statusCode: 400,
            errorCode: ERROR_CODES.VALIDATION_ERROR,
            message: 'Validation failed',
            details: { field: 'email' },
            isOperational: true
          })
        );
        expect(logger.error).not.toHaveBeenCalled();
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should handle AgentError correctly (non-operational, error)', () => {
        const agentError = new AgentError(
          'Processing issue',
          ERROR_CODES.PROCESSING_ERROR // Results in 500 status
        );
        agentError.details = { internalCode: 'X123' };
        agentError.isOperational = false; // Explicitly set

        globalErrorHandler(agentError, mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          status: 'error',
          message: 'Processing issue',
          errorCode: ERROR_CODES.PROCESSING_ERROR,
          details: { internalCode: 'X123' }
        });
        expect(logger.error).toHaveBeenCalledTimes(1);
        expect(logger.error).toHaveBeenCalledWith(
          expect.stringContaining('[AgentError]'),
          expect.objectContaining({
            statusCode: 500,
            errorCode: ERROR_CODES.PROCESSING_ERROR,
            message: 'Processing issue',
            details: { internalCode: 'X123' },
            isOperational: false
          })
        );
        expect(logger.warn).not.toHaveBeenCalled();
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should log stack and originalError for AgentError in development mode', () => {
        process.env.NODE_ENV = 'development';
        const originalErrorInstance = new Error('Original cause');
        const agentError = new AgentError(
          'Dev mode error',
          ERROR_CODES.EXTERNAL_SERVICE_ERROR // results in 502
        );
        agentError.details = { info: 'some info' };
        agentError.isOperational = false;
        agentError.originalError = originalErrorInstance;
        agentError.stack = 'agent error stack';

        globalErrorHandler(agentError, mockReq, mockRes, mockNext);

        expect(logger.error).toHaveBeenCalledTimes(1);
        expect(logger.error).toHaveBeenCalledWith(
          expect.stringContaining('[AgentError]'),
          expect.objectContaining({
            statusCode: 502,
            errorCode: ERROR_CODES.EXTERNAL_SERVICE_ERROR,
            message: 'Dev mode error',
            isOperational: false,
            stack: 'agent error stack',
            originalError: {
              message: 'Original cause',
              name: 'Error'
            }
          })
        );
      });

      it('should NOT log stack and originalError for AgentError in non-development mode', () => {
        process.env.NODE_ENV = 'production'; // or 'test' as per default beforeEach
        const originalErrorInstance = new Error('Original cause');
        const agentError = new AgentError(
          'Prod mode error',
          ERROR_CODES.PROCESSING_ERROR // results in 500
        );
        agentError.details = { info: 'some info' };
        agentError.isOperational = false;
        agentError.originalError = originalErrorInstance;
        agentError.stack = 'agent error stack';

        globalErrorHandler(agentError, mockReq, mockRes, mockNext);

        expect(logger.error).toHaveBeenCalledTimes(1);
        const loggedObject = logger.error.mock.calls[0][1];
        expect(loggedObject.stack).toBeUndefined();
        expect(loggedObject.originalError).toBeUndefined();
        expect(loggedObject).toEqual(expect.objectContaining({
            statusCode: 500,
            errorCode: ERROR_CODES.PROCESSING_ERROR,
            message: 'Prod mode error',
            isOperational: false
          })
        );
      });

      // Test for each ERROR_CODE to ensure mapAgentErrorToStatusCode is working implicitly
      Object.keys(ERROR_CODES).forEach(errorCodeKey => {
        const errorCode = ERROR_CODES[errorCodeKey];
        // Determine expected status code (simplified, actual mapping is in the implementation)
        let expectedStatusCode;
        switch(errorCode) {
          case ERROR_CODES.VALIDATION_ERROR: expectedStatusCode = 400; break;
          case ERROR_CODES.PROCESSING_ERROR: expectedStatusCode = 500; break;
          case ERROR_CODES.EXTERNAL_SERVICE_ERROR: expectedStatusCode = 502; break;
          case ERROR_CODES.RESOURCE_ERROR: expectedStatusCode = 404; break;
          case ERROR_CODES.MEMORY_SYSTEM_ERROR: expectedStatusCode = 500; break;
          case ERROR_CODES.CONFIGURATION_ERROR: expectedStatusCode = 500; break;
          case ERROR_CODES.CONCURRENCY_ERROR: expectedStatusCode = 409; break;
          default: expectedStatusCode = 500; // Fallback
        }

        it(`should handle AgentError with ${errorCodeKey} mapping to status ${expectedStatusCode}`, () => {
          const agentError = new AgentError(
            `Test for ${errorCodeKey}`,
            errorCode,
            { codeDetail: errorCodeKey },
            expectedStatusCode < 500 // Make operational if status is not 5xx for variety
          );

          globalErrorHandler(agentError, mockReq, mockRes, mockNext);
          expect(mockRes.status).toHaveBeenCalledWith(expectedStatusCode);
          expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            message: `Test for ${errorCodeKey}`,
            errorCode: errorCode
          }));
          if (expectedStatusCode < 500) {
            expect(logger.warn).toHaveBeenCalled();
          } else {
            expect(logger.error).toHaveBeenCalled();
          }
        });
      });
    });

    describe('ApiError/Generic Error Handling', () => {
      it('should handle ApiError correctly (operational, warn)', () => {
        const apiError = new ApiError('Invalid input', 400);
        apiError.isOperational = true;
        apiError.details = { field: 'query' };

        globalErrorHandler(apiError, mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        // Verify formatErrorResponse was called and its (mocked) result was used
        expect(formatErrorResponse).toHaveBeenCalledWith(apiError);
        expect(mockRes.json).toHaveBeenCalledWith(formatErrorResponse(apiError)); 
        
        expect(logger.warn).toHaveBeenCalledTimes(1);
        expect(logger.warn).toHaveBeenCalledWith(
          expect.stringContaining('GET /test/path'),
          expect.objectContaining({
            statusCode: 400,
            error: 'Invalid input',
            isOperational: true,
            details: { field: 'query' }
          })
        );
        expect(logger.error).not.toHaveBeenCalled();
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should handle ApiError correctly (non-operational, error)', () => {
        const apiError = new ApiError('DB connection failed', 503);
        apiError.isOperational = false; // Explicitly set

        globalErrorHandler(apiError, mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(503);
        expect(formatErrorResponse).toHaveBeenCalledWith(apiError);
        expect(mockRes.json).toHaveBeenCalledWith(formatErrorResponse(apiError));

        expect(logger.error).toHaveBeenCalledTimes(1);
        expect(logger.error).toHaveBeenCalledWith(
          expect.stringContaining('GET /test/path'),
          expect.objectContaining({
            statusCode: 503,
            error: 'DB connection failed',
            isOperational: false
          })
        );
        expect(logger.warn).not.toHaveBeenCalled();
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should handle generic Error correctly (defaults to 500, error log)', () => {
        const genericError = new Error('Something broke!');

        globalErrorHandler(genericError, mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(formatErrorResponse).toHaveBeenCalledWith(genericError);
        expect(mockRes.json).toHaveBeenCalledWith(formatErrorResponse(genericError));

        expect(logger.error).toHaveBeenCalledTimes(1);
        expect(logger.error).toHaveBeenCalledWith(
          expect.stringContaining('GET /test/path'),
          expect.objectContaining({
            statusCode: 500, // Default status
            error: 'Something broke!',
            isOperational: undefined // Generic errors have undefined isOperational
          })
        );
        expect(logger.warn).not.toHaveBeenCalled();
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should log stack for ApiError/Generic Error in development mode', () => {
        process.env.NODE_ENV = 'development';
        const errorWithStack = new ApiError('Dev error', 500);
        errorWithStack.stack = 'api error stack';

        globalErrorHandler(errorWithStack, mockReq, mockRes, mockNext);

        expect(logger.error).toHaveBeenCalledTimes(1);
        expect(logger.error).toHaveBeenCalledWith(
          expect.stringContaining('GET /test/path'),
          expect.objectContaining({ stack: 'api error stack' })
        );
      });

      it('should NOT log stack for ApiError/Generic Error in non-development mode', () => {
        process.env.NODE_ENV = 'production';
        const errorWithStack = new ApiError('Prod error', 500);
        errorWithStack.stack = 'api error stack';

        globalErrorHandler(errorWithStack, mockReq, mockRes, mockNext);

        expect(logger.error).toHaveBeenCalledTimes(1);
        const loggedObject = logger.error.mock.calls[0][1];
        expect(loggedObject.stack).toBeUndefined();
      });

      it('should log error details if present', () => {
        const errorWithDetails = new Error('Error with details');
        errorWithDetails.details = { info: 'extra data' };

        globalErrorHandler(errorWithDetails, mockReq, mockRes, mockNext);

        expect(logger.error).toHaveBeenCalledTimes(1);
        expect(logger.error).toHaveBeenCalledWith(
          expect.stringContaining('GET /test/path'),
          expect.objectContaining({ details: { info: 'extra data' } })
        );
      });
    });
  });

  describe('handleFatalError', () => {
    const fatalError = new Error('Fatal crash!');
    fatalError.stack = 'fatal stack trace';

    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should log fatal error with correct source and details', () => {
      handleFatalError(fatalError, 'testSource');
      expect(logger.fatal).toHaveBeenCalledWith(
        expect.stringContaining('UNHANDLED ERROR (testSource): Fatal crash!'),
        expect.objectContaining({
          error: 'Fatal crash!',
          stack: 'fatal stack trace',
          source: 'testSource'
        })
      );
    });

    it('should attempt to close server, log, and exit if server exists', () => {
      const mockClose = jest.fn((callback) => callback()); // Simulate immediate close
      global.server = { close: mockClose };

      handleFatalError(fatalError, 'testSource');

      expect(mockClose).toHaveBeenCalledTimes(1);
      // Check logger calls - first for the error, second for successful close
      expect(logger.fatal).toHaveBeenCalledTimes(2);
      expect(logger.fatal).toHaveBeenCalledWith('Server closed due to unhandled error. Exiting process.');
      expect(mockProcessExit).toHaveBeenCalledWith(1);
      expect(mockProcessExit).toHaveBeenCalledTimes(1);
    });

    it('should handle server close timeout, log, and force exit', () => {
      const mockClose = jest.fn(); // Simulate close never calling callback
      global.server = { close: mockClose };

      handleFatalError(fatalError, 'testSource');

      expect(mockClose).toHaveBeenCalledTimes(1);
      expect(logger.fatal).toHaveBeenCalledTimes(1); // Initial fatal log
      expect(mockProcessExit).not.toHaveBeenCalled(); // Shouldn't exit immediately

      // Advance timer past the 5000ms timeout
      jest.advanceTimersByTime(5001);

      expect(logger.fatal).toHaveBeenCalledTimes(2); // Second fatal log for timeout
      expect(logger.fatal).toHaveBeenCalledWith('Graceful shutdown timed out. Forcing exit.');
      expect(mockProcessExit).toHaveBeenCalledWith(1);
      expect(mockProcessExit).toHaveBeenCalledTimes(1);
    });

    it('should log and exit immediately if server does not exist', () => {
      global.server = undefined; // Ensure server is undefined

      handleFatalError(fatalError, 'testSource');

      expect(logger.fatal).toHaveBeenCalledTimes(2); // Initial and immediate exit log

      // Check the first call (error details)
      expect(logger.fatal).toHaveBeenNthCalledWith(1,
        expect.stringContaining('UNHANDLED ERROR (testSource): Fatal crash!'), // Match the full message part
        expect.objectContaining({ // Match the details object
          error: 'Fatal crash!',
          source: 'testSource',
          stack: 'fatal stack trace'
        })
      );

      // Check the second call (exit message)
      expect(logger.fatal).toHaveBeenNthCalledWith(2,
        'Exiting process due to unhandled error.'
      );

      expect(mockProcessExit).toHaveBeenCalledWith(1);
      expect(mockProcessExit).toHaveBeenCalledTimes(1);
    });
  });
}); 