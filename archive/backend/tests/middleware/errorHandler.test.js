const {
  notFoundHandler,
  errorHandler,
  supabaseErrorHandler,
  mapAgentErrorToStatusCode // Although internal, import if needed for direct test or comparison
} = require('../../middleware/errorHandler');
const { logger } = require('../../config');
const {
  ApiError,
  AgentError,
  ERROR_CODES,
  formatErrorResponse
} = require('../../utils/errors');

// Mock dependencies
jest.mock('../../config', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    fatal: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  }
}));

jest.mock('../../utils/errors', () => {
  const originalErrors = jest.requireActual('../../utils/errors');
  return {
    ...originalErrors,
    formatErrorResponse: jest.fn((err) => ({ // Mock for non-AgentError paths
      status: 'error',
      message: err.message || 'Formatted: An unexpected error occurred',
      errorCode: err.code || err.statusCode || 'GENERIC_ERROR' // Include code/statusCode if available
    }))
  };
});

describe('errorHandler Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;
  let originalProcessEnv;

  beforeEach(() => {
    mockReq = {
      originalUrl: '/api/resource/not/found',
      method: 'GET'
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn(); // Although not used by these handlers, keep for consistency

    // Backup and mock process.env
    originalProcessEnv = { ...process.env };
    process.env.NODE_ENV = 'test';

    // Clear mocks
    logger.error.mockClear();
    logger.warn.mockClear();
    formatErrorResponse.mockClear();
  });

  afterEach(() => {
    // Restore original process.env
    process.env = originalProcessEnv;
    jest.clearAllMocks();
  });

  describe('notFoundHandler', () => {
    it('should send a 404 JSON response with specific structure', () => {
      notFoundHandler(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Resource not found',
        error: 'Route not found: GET /api/resource/not/found'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('errorHandler', () => {
    it('should handle AgentError with warn level (status < 500)', () => {
      const agentError = new AgentError(
        'Resource not found',
        ERROR_CODES.RESOURCE_ERROR, // Maps to 404
        { resourceId: 'abc' }
        // isOperational defaults to true for AgentError unless specified
      );

      errorHandler(agentError, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404); // Status from mapAgentErrorToStatusCode
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Resource not found',
        errorCode: ERROR_CODES.RESOURCE_ERROR,
        details: { resourceId: 'abc' }
      });
      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('[AgentError]'),
        expect.objectContaining({
          statusCode: 404,
          errorCode: ERROR_CODES.RESOURCE_ERROR,
          message: 'Resource not found',
          details: { resourceId: 'abc' }
          // stack and originalError should not be logged in test env by default
        })
      );
      expect(logger.error).not.toHaveBeenCalled();
      expect(formatErrorResponse).not.toHaveBeenCalled(); // Should not call this for AgentError
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle AgentError with error level (status >= 500)', () => {
      const agentError = new AgentError(
        'Service unavailable',
        ERROR_CODES.EXTERNAL_SERVICE_ERROR, // Maps to 502
        { service: 'externalAPI' }
      );

      errorHandler(agentError, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(502);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Service unavailable',
        errorCode: ERROR_CODES.EXTERNAL_SERVICE_ERROR,
        details: { service: 'externalAPI' }
      });
      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('[AgentError]'),
        expect.objectContaining({
          statusCode: 502,
          errorCode: ERROR_CODES.EXTERNAL_SERVICE_ERROR,
          message: 'Service unavailable',
          details: { service: 'externalAPI' }
        })
      );
      expect(logger.warn).not.toHaveBeenCalled();
      expect(formatErrorResponse).not.toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should log stack and originalError for AgentError in development mode', () => {
      process.env.NODE_ENV = 'development';
      const originalCause = new Error('Root cause');
      const agentError = new AgentError(
        'Config error',
        ERROR_CODES.CONFIGURATION_ERROR, // Maps to 500
        { file: 'config.yml' },
        true // isOperational
        // originalCause - will set explicitly below
      );
      agentError.originalError = originalCause; // Explicitly set originalError
      agentError.stack = 'agent stack trace';

      errorHandler(agentError, mockReq, mockRes, mockNext);

      expect(logger.error).toHaveBeenCalledTimes(1); // 500 status -> error log
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('[AgentError]'),
        expect.objectContaining({
          statusCode: 500,
          errorCode: ERROR_CODES.CONFIGURATION_ERROR,
          message: 'Config error',
          details: { file: 'config.yml' },
          stack: 'agent stack trace',
          originalError: {
            message: 'Root cause',
            name: 'Error'
          }
        })
      );
    });

    it('should NOT log stack and originalError for AgentError in non-development mode', () => {
      process.env.NODE_ENV = 'test'; // Default from beforeEach
      const originalCause = new Error('Root cause');
      const agentError = new AgentError(
        'Config error',
        ERROR_CODES.CONFIGURATION_ERROR, // Maps to 500
        { file: 'config.yml' },
        true, // isOperational
        originalCause
      );
      agentError.stack = 'agent stack trace';

      errorHandler(agentError, mockReq, mockRes, mockNext);

      expect(logger.error).toHaveBeenCalledTimes(1);
      const loggedObject = logger.error.mock.calls[0][1];
      expect(loggedObject.stack).toBeUndefined();
      expect(loggedObject.originalError).toBeUndefined();
      expect(loggedObject).toEqual(expect.objectContaining({
          statusCode: 500,
          errorCode: ERROR_CODES.CONFIGURATION_ERROR,
          message: 'Config error'
          // details should still be logged
        })
      );
    });

    describe('ApiError/Generic Error Handling', () => {
      it('should handle ApiError with warn level (status < 500)', () => {
        const apiError = new ApiError('Bad Request Data', 400);

        errorHandler(apiError, mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(formatErrorResponse).toHaveBeenCalledWith(apiError);
        expect(mockRes.json).toHaveBeenCalledWith(formatErrorResponse(apiError)); // Check response uses mocked format

        expect(logger.warn).toHaveBeenCalledTimes(1);
        expect(logger.warn).toHaveBeenCalledWith(
          expect.stringContaining('GET /api/resource/not/found'),
          expect.objectContaining({
            statusCode: 400,
            error: 'Bad Request Data'
            // isOperational is not logged here, stack only in dev
          })
        );
        expect(logger.error).not.toHaveBeenCalled();
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should handle ApiError with error level (status >= 500)', () => {
        const apiError = new ApiError('Internal Server Issue', 503);

        errorHandler(apiError, mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(503);
        expect(formatErrorResponse).toHaveBeenCalledWith(apiError);
        expect(mockRes.json).toHaveBeenCalledWith(formatErrorResponse(apiError));

        expect(logger.error).toHaveBeenCalledTimes(1);
        expect(logger.error).toHaveBeenCalledWith(
          expect.stringContaining('GET /api/resource/not/found'),
          expect.objectContaining({
            statusCode: 503,
            error: 'Internal Server Issue'
          })
        );
        expect(logger.warn).not.toHaveBeenCalled();
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should handle generic Error (default 500, error log)', () => {
        const genericError = new Error('Plain error');

        errorHandler(genericError, mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(formatErrorResponse).toHaveBeenCalledWith(genericError);
        expect(mockRes.json).toHaveBeenCalledWith(formatErrorResponse(genericError));

        expect(logger.error).toHaveBeenCalledTimes(1);
        expect(logger.error).toHaveBeenCalledWith(
          expect.stringContaining('GET /api/resource/not/found'),
          expect.objectContaining({
            statusCode: 500,
            error: 'Plain error'
          })
        );
        expect(logger.warn).not.toHaveBeenCalled();
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should log stack for ApiError/Generic Error in development mode', () => {
        process.env.NODE_ENV = 'development';
        const errorWithStack = new Error('Dev generic error');
        errorWithStack.stack = 'generic stack trace';

        errorHandler(errorWithStack, mockReq, mockRes, mockNext);

        expect(logger.error).toHaveBeenCalledTimes(1);
        expect(logger.error).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ stack: 'generic stack trace' })
        );
      });

      it('should NOT log stack for ApiError/Generic Error in non-development mode', () => {
        process.env.NODE_ENV = 'test';
        const errorWithStack = new Error('Test generic error');
        errorWithStack.stack = 'generic stack trace';

        errorHandler(errorWithStack, mockReq, mockRes, mockNext);

        expect(logger.error).toHaveBeenCalledTimes(1);
        const loggedObject = logger.error.mock.calls[0][1];
        expect(loggedObject.stack).toBeUndefined();
      });

      it('should log err.details if present on ApiError/Generic Error', () => {
        const errorWithDetails = new ApiError('Error with details', 400);
        errorWithDetails.details = { code: 'XYZ' };

        errorHandler(errorWithDetails, mockReq, mockRes, mockNext);

        expect(logger.warn).toHaveBeenCalledTimes(1); // 400 -> warn
        expect(logger.warn).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ details: { code: 'XYZ' } })
        );
      });
    });
  });

  describe('supabaseErrorHandler', () => {
    it('should map PGRST301 to AgentError (RESOURCE_ERROR)', () => {
      const dbError = { code: 'PGRST301', message: 'DB resource not found' };
      const mappedError = supabaseErrorHandler(dbError);
      expect(mappedError).toBeInstanceOf(AgentError);
      expect(mappedError.code).toBe(ERROR_CODES.RESOURCE_ERROR);
      expect(mappedError.message).toBe('Resource not found');
      expect(mappedError.details).toEqual({ code: 'PGRST301' });
      expect(mappedError.originalError).toBe(dbError);
    });

    it('should return null for PGRST204 (No content)', () => {
      const dbError = { code: 'PGRST204', message: 'No content' };
      const mappedError = supabaseErrorHandler(dbError);
      expect(mappedError).toBeNull();
    });

    it('should map 23505 (Unique violation) to ApiError (409)', () => {
      const dbError = { code: '23505', message: 'DB unique constraint violation' };
      const mappedError = supabaseErrorHandler(dbError);
      expect(mappedError).toBeInstanceOf(ApiError);
      expect(mappedError.statusCode).toBe(409);
      expect(mappedError.message).toBe('Resource already exists');
      expect(mappedError.details).toBe('DB unique constraint violation'); // Uses original message as details
    });

    it('should map 23503 (FK violation) to AgentError (VALIDATION_ERROR)', () => {
      const dbError = { code: '23503', message: 'DB FK violation' };
      const mappedError = supabaseErrorHandler(dbError);
      expect(mappedError).toBeInstanceOf(AgentError);
      expect(mappedError.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(mappedError.message).toBe('Related resource not found');
      expect(mappedError.details).toEqual({ code: '23503' });
      expect(mappedError.originalError).toBe(dbError);
    });

    it('should map 23502 (Not null violation) to AgentError (VALIDATION_ERROR)', () => {
      const dbError = { code: '23502', message: 'DB not null violation' };
      const mappedError = supabaseErrorHandler(dbError);
      expect(mappedError).toBeInstanceOf(AgentError);
      expect(mappedError.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(mappedError.message).toBe('Missing required field');
      expect(mappedError.details).toEqual({ code: '23502' });
      expect(mappedError.originalError).toBe(dbError);
    });

    it('should map 23514 (Check violation) to AgentError (VALIDATION_ERROR)', () => {
      const dbError = { code: '23514', message: 'DB check violation' };
      const mappedError = supabaseErrorHandler(dbError);
      expect(mappedError).toBeInstanceOf(AgentError);
      expect(mappedError.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(mappedError.message).toBe('Validation constraint failed');
      expect(mappedError.details).toEqual({ code: '23514' });
      expect(mappedError.originalError).toBe(dbError);
    });

    it('should map 42601 (Syntax error) to AgentError (EXTERNAL_SERVICE_ERROR)', () => {
      const dbError = { code: '42601', message: 'DB syntax error' };
      const mappedError = supabaseErrorHandler(dbError);
      expect(mappedError).toBeInstanceOf(AgentError);
      expect(mappedError.code).toBe(ERROR_CODES.EXTERNAL_SERVICE_ERROR);
      expect(mappedError.message).toBe('Invalid query syntax');
      expect(mappedError.details).toEqual({ code: '42601' });
      expect(mappedError.originalError).toBe(dbError);
    });

    it('should map 42501 (Insufficient privilege) to ApiError (403)', () => {
      const dbError = { code: '42501', message: 'DB permission denied' };
      const mappedError = supabaseErrorHandler(dbError);
      expect(mappedError).toBeInstanceOf(ApiError);
      expect(mappedError.statusCode).toBe(403);
      expect(mappedError.message).toBe('Insufficient database permissions');
      expect(mappedError.details).toBe('DB permission denied');
    });

    it('should map other DB errors to AgentError (EXTERNAL_SERVICE_ERROR)', () => {
      const dbError = { code: 'XX000', message: 'Some other DB error' };
      const mappedError = supabaseErrorHandler(dbError);
      expect(mappedError).toBeInstanceOf(AgentError);
      expect(mappedError.code).toBe(ERROR_CODES.EXTERNAL_SERVICE_ERROR);
      expect(mappedError.message).toBe('Database operation failed');
      expect(mappedError.details).toEqual({ code: 'XX000' });
      expect(mappedError.originalError).toBe(dbError);
    });

    it('should map generic error without code to ApiError (500)', () => {
        const genericDbError = new Error('Generic DB connection failure');
        const mappedError = supabaseErrorHandler(genericDbError);
        expect(mappedError).toBeInstanceOf(AgentError);
        expect(mappedError.code).toBe(ERROR_CODES.EXTERNAL_SERVICE_ERROR);
        expect(mappedError.message).toBe('Database operation failed');
        expect(mappedError.details).toEqual({ code: undefined });
        expect(mappedError.originalError).toBe(genericDbError);
      });
  });
}); 