/** @jest-environment node */

const { recordCheckIn, getCheckIns, getCheckIn, calculateMetrics } = require('../../controllers/check-in');
const checkInService = require('../../services/check-in-service');
const logger = require('../../config/logger');
const { BadRequestError, DatabaseError, NotFoundError } = require('../../utils/errors');

// Mock dependencies
jest.mock('../../services/check-in-service');
jest.mock('../../config/logger');
jest.mock('../../utils/errors', () => ({
  BadRequestError: class extends Error { constructor(message) { super(message); this.name = 'BadRequestError'; } },
  NotFoundError: class extends Error { constructor(message) { super(message); this.name = 'NotFoundError'; } },
  DatabaseError: class extends Error { constructor(message) { super(message); this.name = 'DatabaseError'; } },
}));

describe('Check-in Controller', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Mock Express req and res objects
    mockReq = {
      user: { id: 'user-check-in-123' },
      headers: { authorization: 'Bearer test-token-check-in' },
      body: { weight: 75, mood: 'good', notes: 'Felt strong today' },
      query: {},
      params: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  describe('recordCheckIn', () => {
    it('should record a check-in successfully and return 201', async () => {
      const serviceResult = { id: 'checkin-xyz', userId: mockReq.user.id, ...mockReq.body };
      checkInService.storeCheckIn.mockResolvedValue(serviceResult);

      await recordCheckIn(mockReq, mockRes);

      expect(checkInService.storeCheckIn).toHaveBeenCalledWith(
        mockReq.user.id,
        mockReq.body,
        'test-token-check-in'
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: serviceResult,
        message: 'Check-in recorded successfully',
      });
      expect(logger.info).toHaveBeenCalledWith('Recording check-in', { userId: mockReq.user.id });
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should return 400 if checkInService.storeCheckIn throws BadRequestError', async () => {
      const errorMessage = 'Invalid check-in data';
      const badRequestError = new BadRequestError(errorMessage);
      checkInService.storeCheckIn.mockRejectedValue(badRequestError);

      await recordCheckIn(mockReq, mockRes);

      expect(checkInService.storeCheckIn).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: errorMessage });
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to record check-in',
        expect.objectContaining({ error: errorMessage })
      );
    });

    it('should return 500 if checkInService.storeCheckIn throws DatabaseError', async () => {
      const errorMessage = 'Failed to save check-in to database';
      const dbError = new DatabaseError(errorMessage); // Use specific message from controller
      checkInService.storeCheckIn.mockRejectedValue(dbError);

      await recordCheckIn(mockReq, mockRes);

      expect(checkInService.storeCheckIn).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: errorMessage });
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to record check-in',
        expect.objectContaining({ error: errorMessage })
      );
    });

    it('should return 500 if checkInService.storeCheckIn throws a generic error', async () => {
      const genericError = new Error('Something unexpected happened');
      checkInService.storeCheckIn.mockRejectedValue(genericError);

      await recordCheckIn(mockReq, mockRes);

      expect(checkInService.storeCheckIn).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'An unexpected error occurred while recording check-in',
      });
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to record check-in',
        expect.objectContaining({ error: genericError.message })
      );
    });

    // Note: Auth errors (missing user/token) are typically handled by middleware, not tested here.
  });

  describe('getCheckIns', () => {
    it('should retrieve check-ins successfully with default pagination/filters', async () => {
      const serviceResponse = {
        data: [{ id: 'ci-1', date: '2023-01-10' }, { id: 'ci-2', date: '2023-01-11' }],
        pagination: { limit: 10, offset: 0, total: 2 }
      };
      checkInService.retrieveCheckIns.mockResolvedValue(serviceResponse);

      await getCheckIns(mockReq, mockRes);

      expect(checkInService.retrieveCheckIns).toHaveBeenCalledWith(
        mockReq.user.id,
        { startDate: undefined, endDate: undefined, limit: 10, offset: 0 }, // Defaults
        'test-token-check-in'
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: serviceResponse.data,
        pagination: serviceResponse.pagination,
        message: 'Check-ins retrieved successfully',
      });
      expect(logger.info).toHaveBeenCalledWith('Retrieving check-ins', { userId: mockReq.user.id, filters: { startDate: undefined, endDate: undefined, limit: 10, offset: 0 } });
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should retrieve check-ins successfully with custom pagination and filters', async () => {
      mockReq.query = { startDate: '2023-01-01', endDate: '2023-01-31', limit: '5', offset: '5' };
      const serviceResponse = {
        data: [{ id: 'ci-3', date: '2023-01-15' }],
        pagination: { limit: 5, offset: 5, total: 6 }
      };
      checkInService.retrieveCheckIns.mockResolvedValue(serviceResponse);

      await getCheckIns(mockReq, mockRes);

      const expectedFilters = { startDate: '2023-01-01', endDate: '2023-01-31', limit: 5, offset: 5 };
      expect(checkInService.retrieveCheckIns).toHaveBeenCalledWith(
        mockReq.user.id,
        expectedFilters,
        'test-token-check-in'
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: serviceResponse.data,
        pagination: serviceResponse.pagination,
        message: 'Check-ins retrieved successfully',
      });
      expect(logger.info).toHaveBeenCalledWith('Retrieving check-ins', { userId: mockReq.user.id, filters: expectedFilters });
    });

    it('should return 400 if checkInService.retrieveCheckIns throws BadRequestError', async () => {
      const errorMessage = 'Invalid filter parameters';
      const badRequestError = new BadRequestError(errorMessage);
      checkInService.retrieveCheckIns.mockRejectedValue(badRequestError);

      await getCheckIns(mockReq, mockRes);

      expect(checkInService.retrieveCheckIns).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: errorMessage });
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to retrieve check-ins',
        expect.objectContaining({ error: errorMessage })
      );
    });

    it('should return 500 if checkInService.retrieveCheckIns throws a generic error', async () => {
      const genericError = new Error('Database connection lost');
      checkInService.retrieveCheckIns.mockRejectedValue(genericError);

      await getCheckIns(mockReq, mockRes);

      expect(checkInService.retrieveCheckIns).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'An unexpected error occurred while retrieving check-ins',
      });
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to retrieve check-ins',
        expect.objectContaining({ error: genericError.message })
      );
    });

    // Note: Auth errors handled by middleware
  });

  describe('getCheckIn', () => {
    it('should retrieve a specific check-in successfully', async () => {
      mockReq.params = { checkInId: 'ci-specific-456' };
      const serviceResult = {
        id: mockReq.params.checkInId,
        userId: mockReq.user.id,
        weight: 75,
        date: '2023-01-15'
      };
      checkInService.retrieveCheckIn.mockResolvedValue(serviceResult);

      await getCheckIn(mockReq, mockRes);

      expect(checkInService.retrieveCheckIn).toHaveBeenCalledWith(
        mockReq.params.checkInId,
        mockReq.user.id,
        'test-token-check-in'
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: serviceResult,
        message: 'Check-in retrieved successfully',
      });
      expect(logger.info).toHaveBeenCalledWith('Retrieving check-in', {
        userId: mockReq.user.id,
        checkInId: mockReq.params.checkInId
      });
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should return 400 if checkInId parameter is missing', async () => {
      // Ensure params.checkInId is undefined
      mockReq.params = {};

      await getCheckIn(mockReq, mockRes);

      expect(checkInService.retrieveCheckIn).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Check-in ID is required',
      });
    });

    it('should return 400 if checkInService.retrieveCheckIn throws BadRequestError', async () => {
      mockReq.params = { checkInId: 'ci-bad-123' };
      const errorMessage = 'Invalid check-in ID format';
      const badRequestError = new BadRequestError(errorMessage);
      checkInService.retrieveCheckIn.mockRejectedValue(badRequestError);

      await getCheckIn(mockReq, mockRes);

      expect(checkInService.retrieveCheckIn).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: errorMessage,
      });
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to retrieve check-in',
        expect.objectContaining({ error: errorMessage })
      );
    });

    it('should return 404 if checkInService.retrieveCheckIn throws NotFoundError', async () => {
      mockReq.params = { checkInId: 'ci-nonexistent-789' };
      const errorMessage = 'Check-in not found';
      const notFoundError = new NotFoundError(errorMessage);
      checkInService.retrieveCheckIn.mockRejectedValue(notFoundError);

      await getCheckIn(mockReq, mockRes);

      expect(checkInService.retrieveCheckIn).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: errorMessage,
      });
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to retrieve check-in',
        expect.objectContaining({ error: errorMessage })
      );
    });

    it('should return 500 if checkInService.retrieveCheckIn throws a generic error', async () => {
      mockReq.params = { checkInId: 'ci-error-999' };
      const genericError = new Error('Unexpected server error');
      checkInService.retrieveCheckIn.mockRejectedValue(genericError);

      await getCheckIn(mockReq, mockRes);

      expect(checkInService.retrieveCheckIn).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'An unexpected error occurred while retrieving check-in',
      });
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to retrieve check-in',
        expect.objectContaining({ error: genericError.message })
      );
    });
  });

  // TODO: Add describe block for calculateMetrics
});

describe('calculateMetrics', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Mock Express req and res objects
    mockReq = {
      user: { id: 'user-check-in-123' },
      headers: { authorization: 'Bearer test-token-check-in' },
      body: {
        startDate: '2023-01-01',
        endDate: '2023-01-31'
      },
      query: {},
      params: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  it('should calculate metrics successfully and return 200', async () => {
    const serviceResult = {
      data: {
        weightChange: -2.5,
        averageMood: 'good',
        totalWorkouts: 12
      },
      message: 'Metrics calculated successfully'
    };
    checkInService.computeMetrics.mockResolvedValue(serviceResult);

    await calculateMetrics(mockReq, mockRes);

    expect(checkInService.computeMetrics).toHaveBeenCalledWith(
      mockReq.user.id,
      { startDate: '2023-01-01', endDate: '2023-01-31' },
      'test-token-check-in'
    );
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      status: 'success',
      data: serviceResult.data,
      message: serviceResult.message
    });
    expect(logger.info).toHaveBeenCalledWith('Calculating metrics', {
      userId: mockReq.user.id,
      dateRange: { startDate: '2023-01-01', endDate: '2023-01-31' }
    });
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should return 400 if checkInService.computeMetrics throws BadRequestError', async () => {
    const errorMessage = 'Invalid date range for metrics calculation';
    const badRequestError = new BadRequestError(errorMessage);
    checkInService.computeMetrics.mockRejectedValue(badRequestError);

    await calculateMetrics(mockReq, mockRes);

    expect(checkInService.computeMetrics).toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      status: 'error',
      message: errorMessage
    });
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to calculate metrics',
      expect.objectContaining({ error: errorMessage })
    );
  });

  it('should return 500 if checkInService.computeMetrics throws a generic error', async () => {
    const genericError = new Error('Calculation service unavailable');
    checkInService.computeMetrics.mockRejectedValue(genericError);

    await calculateMetrics(mockReq, mockRes);

    expect(checkInService.computeMetrics).toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'An unexpected error occurred while calculating metrics'
    });
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to calculate metrics',
      expect.objectContaining({ error: genericError.message })
    );
  });

  // Note: Auth errors handled by middleware
}); 