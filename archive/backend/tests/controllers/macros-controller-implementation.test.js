/** @jest-environment node */

const { calculateMacros, storeMacros, getMacros, getLatestMacros, updateMacros } = require('../../controllers/macros');
const macroService = require('../../services/macro-service');
const logger = require('../../config/logger');
const { BadRequestError, NotFoundError, DatabaseError } = require('../../utils/errors');

// Mock dependencies
jest.mock('../../services/macro-service');
jest.mock('../../config/logger');
jest.mock('../../utils/errors', () => ({
  BadRequestError: class extends Error { constructor(message) { super(message); this.name = 'BadRequestError'; } },
  NotFoundError: class extends Error { constructor(message) { super(message); this.name = 'NotFoundError'; } },
  DatabaseError: class extends Error { constructor(message) { super(message); this.name = 'DatabaseError'; } },
}));

describe('Macros Controller', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Mock Express req and res objects
    mockReq = {
      user: { id: 'user-123' },
      headers: { authorization: 'Bearer test-token' },
      body: { goal: 'weight_loss', useExternalApi: false },
      query: {},
      params: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(), // Allows chaining .json()
      json: jest.fn(),
      send: jest.fn(), // Added for completeness, though not used by macros.js
    };
  });

  describe('calculateMacros', () => {
    it('should calculate and store macros successfully, returning 201', async () => {
      const calculatedMacros = { calories: 2000, protein: 150, carbs: 200, fat: 67 };
      const storedPlanId = 'plan-abc';

      macroService.calculateMacros.mockResolvedValue(calculatedMacros);
      macroService.storeMacros.mockResolvedValue(storedPlanId);

      await calculateMacros(mockReq, mockRes);

      expect(macroService.calculateMacros).toHaveBeenCalledWith(
        { ...mockReq.body, userId: mockReq.user.id },
        mockReq.body.useExternalApi
      );
      expect(macroService.storeMacros).toHaveBeenCalledWith(
        mockReq.user.id,
        calculatedMacros,
        'test-token'
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          id: storedPlanId,
          ...calculatedMacros,
        },
        message: 'Macros calculated and stored successfully',
      });
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should return 400 if macroService.calculateMacros throws BadRequestError', async () => {
      const errorMessage = 'Invalid input data';
      const badRequestError = new BadRequestError(errorMessage);
      macroService.calculateMacros.mockRejectedValue(badRequestError);

      await calculateMacros(mockReq, mockRes);

      expect(macroService.calculateMacros).toHaveBeenCalledWith(
        { ...mockReq.body, userId: mockReq.user.id },
        mockReq.body.useExternalApi
      );
      expect(macroService.storeMacros).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: errorMessage,
      });
      expect(logger.error).toHaveBeenCalledWith(
        'Error in calculateMacros controller',
        expect.objectContaining({ error: errorMessage, userId: mockReq.user.id })
      );
    });

    it('should return 500 if macroService.calculateMacros throws a generic error', async () => {
      const genericError = new Error('Something went wrong during calculation');
      macroService.calculateMacros.mockRejectedValue(genericError);

      await calculateMacros(mockReq, mockRes);

      expect(macroService.calculateMacros).toHaveBeenCalledWith(
        { ...mockReq.body, userId: mockReq.user.id },
        mockReq.body.useExternalApi
      );
      expect(macroService.storeMacros).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Failed to calculate macros. Please try again later.',
      });
      expect(logger.error).toHaveBeenCalledWith(
        'Error in calculateMacros controller',
        expect.objectContaining({ error: genericError.message, userId: mockReq.user.id })
      );
    });

    it('should return 500 if macroService.storeMacros throws an error after calculation', async () => {
      const calculatedMacros = { calories: 2100 };
      const storeError = new Error('Failed to store macros');

      macroService.calculateMacros.mockResolvedValue(calculatedMacros);
      macroService.storeMacros.mockRejectedValue(storeError);

      await calculateMacros(mockReq, mockRes);

      expect(macroService.calculateMacros).toHaveBeenCalled();
      expect(macroService.storeMacros).toHaveBeenCalledWith(
        mockReq.user.id,
        calculatedMacros,
        'test-token'
      );
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Failed to calculate macros. Please try again later.',
      });
      expect(logger.error).toHaveBeenCalledWith(
        'Error in calculateMacros controller',
        expect.objectContaining({ error: storeError.message, userId: mockReq.user.id })
      );
    });

    // TODO: Add test for missing req.user or req.headers.authorization (though typically handled by middleware)

  });

  describe('storeMacros', () => {
    beforeEach(() => {
      // Modify req for this specific describe block if needed
      mockReq.body = { calories: 1800, protein: 140, carbs: 180, fat: 60 }; // Example custom data
    });

    it('should store custom macros successfully and return 201', async () => {
      const storedPlanId = 'plan-xyz';
      macroService.storeMacros.mockResolvedValue(storedPlanId);

      await storeMacros(mockReq, mockRes);

      expect(macroService.storeMacros).toHaveBeenCalledWith(
        mockReq.user.id,
        mockReq.body,
        'test-token'
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: { id: storedPlanId },
        message: 'Custom macro plan stored successfully',
      });
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should return 400 if macroService.storeMacros throws BadRequestError', async () => {
      const errorMessage = 'Invalid macro data';
      const badRequestError = new BadRequestError(errorMessage);
      macroService.storeMacros.mockRejectedValue(badRequestError);

      await storeMacros(mockReq, mockRes);

      expect(macroService.storeMacros).toHaveBeenCalledWith(
        mockReq.user.id,
        mockReq.body,
        'test-token'
      );
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: errorMessage,
      });
      expect(logger.error).toHaveBeenCalledWith(
        'Error in storeMacros controller',
        expect.objectContaining({ error: errorMessage, userId: mockReq.user.id })
      );
    });

    it('should return 500 if macroService.storeMacros throws DatabaseError', async () => {
      const dbError = new DatabaseError('DB connection failed');
      macroService.storeMacros.mockRejectedValue(dbError);

      await storeMacros(mockReq, mockRes);

      expect(macroService.storeMacros).toHaveBeenCalledWith(
        mockReq.user.id,
        mockReq.body,
        'test-token'
      );
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Database error occurred while storing macros',
      });
      expect(logger.error).toHaveBeenCalledWith(
        'Error in storeMacros controller',
        expect.objectContaining({ error: dbError.message, userId: mockReq.user.id })
      );
    });

    it('should return 500 if macroService.storeMacros throws a generic error', async () => {
      const genericError = new Error('Something else failed');
      macroService.storeMacros.mockRejectedValue(genericError);

      await storeMacros(mockReq, mockRes);

      expect(macroService.storeMacros).toHaveBeenCalledWith(
        mockReq.user.id,
        mockReq.body,
        'test-token'
      );
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Failed to store macros. Please try again later.',
      });
      expect(logger.error).toHaveBeenCalledWith(
        'Error in storeMacros controller',
        expect.objectContaining({ error: genericError.message, userId: mockReq.user.id })
      );
    });

    // TODO: Add test for missing req.user or req.headers.authorization (if controller logic changes)
  });

  describe('getMacros', () => {
    it('should retrieve macros successfully with default pagination', async () => {
      const serviceResponse = {
        data: [{ id: 'plan-1', calories: 2000 }, { id: 'plan-2', calories: 2100 }],
        pagination: { currentPage: 1, pageSize: 10, totalItems: 2, totalPages: 1 },
      };
      macroService.retrieveMacros.mockResolvedValue(serviceResponse);

      await getMacros(mockReq, mockRes);

      expect(macroService.retrieveMacros).toHaveBeenCalledWith(
        mockReq.user.id,
        { page: 1, pageSize: 10, startDate: undefined, endDate: undefined, status: undefined }, // Default filters
        'test-token'
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: serviceResponse.data,
        pagination: serviceResponse.pagination,
        message: 'Macro plans retrieved successfully',
      });
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should retrieve macros successfully with custom pagination and filters', async () => {
      mockReq.query = { page: '2', pageSize: '5', startDate: '2023-01-01', endDate: '2023-12-31', status: 'active' };
      const serviceResponse = {
        data: [{ id: 'plan-3', calories: 2200 }],
        pagination: { currentPage: 2, pageSize: 5, totalItems: 6, totalPages: 2 },
      };
      macroService.retrieveMacros.mockResolvedValue(serviceResponse);

      await getMacros(mockReq, mockRes);

      expect(macroService.retrieveMacros).toHaveBeenCalledWith(
        mockReq.user.id,
        { page: 2, pageSize: 5, startDate: '2023-01-01', endDate: '2023-12-31', status: 'active' },
        'test-token'
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: serviceResponse.data,
        pagination: serviceResponse.pagination,
        message: 'Macro plans retrieved successfully',
      });
    });

    it('should return 404 if macroService.retrieveMacros throws NotFoundError', async () => {
      const errorMessage = 'No macros found for this user';
      const notFoundError = new NotFoundError(errorMessage);
      macroService.retrieveMacros.mockRejectedValue(notFoundError);

      await getMacros(mockReq, mockRes);

      expect(macroService.retrieveMacros).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: errorMessage,
      });
      expect(logger.error).toHaveBeenCalledWith(
        'Error in getMacros controller',
        expect.objectContaining({ error: errorMessage, userId: mockReq.user.id })
      );
    });

    it('should return 500 if macroService.retrieveMacros throws DatabaseError', async () => {
      const dbError = new DatabaseError('Failed to query database');
      macroService.retrieveMacros.mockRejectedValue(dbError);

      await getMacros(mockReq, mockRes);

      expect(macroService.retrieveMacros).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Database error occurred while retrieving macros',
      });
      expect(logger.error).toHaveBeenCalledWith(
        'Error in getMacros controller',
        expect.objectContaining({ error: dbError.message, userId: mockReq.user.id })
      );
    });

    it('should return 500 if macroService.retrieveMacros throws a generic error', async () => {
      const genericError = new Error('Unexpected retrieval error');
      macroService.retrieveMacros.mockRejectedValue(genericError);

      await getMacros(mockReq, mockRes);

      expect(macroService.retrieveMacros).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Failed to retrieve macros. Please try again later.',
      });
      expect(logger.error).toHaveBeenCalledWith(
        'Error in getMacros controller',
        expect.objectContaining({ error: genericError.message, userId: mockReq.user.id })
      );
    });

    // TODO: Add test for missing req.user or req.headers.authorization (if controller logic changes)
  });

  describe('getLatestMacros', () => {
    it('should retrieve the latest macros successfully', async () => {
      const latestMacros = { id: 'plan-latest', calories: 2300 };
      macroService.retrieveLatestMacros.mockResolvedValue(latestMacros);

      await getLatestMacros(mockReq, mockRes);

      expect(macroService.retrieveLatestMacros).toHaveBeenCalledWith(
        mockReq.user.id,
        'test-token'
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: latestMacros,
        message: 'Latest macro plan retrieved successfully',
      });
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should return 404 if macroService.retrieveLatestMacros throws NotFoundError', async () => {
      const errorMessage = 'No macro plan found';
      const notFoundError = new NotFoundError(errorMessage);
      macroService.retrieveLatestMacros.mockRejectedValue(notFoundError);

      await getLatestMacros(mockReq, mockRes);

      expect(macroService.retrieveLatestMacros).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: errorMessage,
      });
      expect(logger.error).toHaveBeenCalledWith(
        'Error in getLatestMacros controller',
        expect.objectContaining({ error: errorMessage, userId: mockReq.user.id })
      );
    });

    it('should return 500 if macroService.retrieveLatestMacros throws DatabaseError', async () => {
      const dbError = new DatabaseError('Database lookup failed');
      macroService.retrieveLatestMacros.mockRejectedValue(dbError);

      await getLatestMacros(mockReq, mockRes);

      expect(macroService.retrieveLatestMacros).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Database error occurred while retrieving latest macros',
      });
      expect(logger.error).toHaveBeenCalledWith(
        'Error in getLatestMacros controller',
        expect.objectContaining({ error: dbError.message, userId: mockReq.user.id })
      );
    });

    it('should return 500 if macroService.retrieveLatestMacros throws a generic error', async () => {
      const genericError = new Error('Something unexpected happened');
      macroService.retrieveLatestMacros.mockRejectedValue(genericError);

      await getLatestMacros(mockReq, mockRes);

      expect(macroService.retrieveLatestMacros).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Failed to retrieve latest macros. Please try again later.',
      });
      expect(logger.error).toHaveBeenCalledWith(
        'Error in getLatestMacros controller',
        expect.objectContaining({ error: genericError.message, userId: mockReq.user.id })
      );
    });

    // TODO: Add test for missing req.user or req.headers.authorization (if controller logic changes)
  });

  describe('updateMacros', () => {
    beforeEach(() => {
      mockReq.params = { planId: 'plan-to-update' };
      mockReq.body = { calories: 2400, version: 1 }; // Include version
    });

    it('should update macros successfully and return 200', async () => {
      macroService.updateMacroPlan.mockResolvedValue(); // updateMacroPlan doesn't return data

      await updateMacros(mockReq, mockRes);

      expect(macroService.updateMacroPlan).toHaveBeenCalledWith(
        mockReq.params.planId,
        mockReq.body, // Pass the whole body including version
        mockReq.body.version,
        'test-token'
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Macro plan updated successfully',
      });
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should return 404 if macroService.updateMacroPlan throws NotFoundError', async () => {
      const errorMessage = 'Plan not found';
      const notFoundError = new NotFoundError(errorMessage);
      macroService.updateMacroPlan.mockRejectedValue(notFoundError);

      await updateMacros(mockReq, mockRes);

      expect(macroService.updateMacroPlan).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: errorMessage });
      expect(logger.error).toHaveBeenCalledWith(
        'Error in updateMacros controller',
        expect.objectContaining({ error: errorMessage, userId: mockReq.user.id, planId: mockReq.params.planId })
      );
    });

    it('should return 400 if macroService.updateMacroPlan throws BadRequestError', async () => {
      const errorMessage = 'Invalid update data';
      const badRequestError = new BadRequestError(errorMessage);
      macroService.updateMacroPlan.mockRejectedValue(badRequestError);

      await updateMacros(mockReq, mockRes);

      expect(macroService.updateMacroPlan).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: errorMessage });
      expect(logger.error).toHaveBeenCalledWith(
        'Error in updateMacros controller',
        expect.objectContaining({ error: errorMessage, userId: mockReq.user.id, planId: mockReq.params.planId })
      );
    });

    it('should return 500 if macroService.updateMacroPlan throws DatabaseError', async () => {
      const dbError = new DatabaseError('Update failed in DB');
      macroService.updateMacroPlan.mockRejectedValue(dbError);

      await updateMacros(mockReq, mockRes);

      expect(macroService.updateMacroPlan).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Database error occurred while updating macros',
      });
      expect(logger.error).toHaveBeenCalledWith(
        'Error in updateMacros controller',
        expect.objectContaining({ error: dbError.message, userId: mockReq.user.id, planId: mockReq.params.planId })
      );
    });

    it('should return 500 if macroService.updateMacroPlan throws a generic error', async () => {
      const genericError = new Error('Generic update failure');
      macroService.updateMacroPlan.mockRejectedValue(genericError);

      await updateMacros(mockReq, mockRes);

      expect(macroService.updateMacroPlan).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Failed to update macros. Please try again later.',
      });
      expect(logger.error).toHaveBeenCalledWith(
        'Error in updateMacros controller',
        expect.objectContaining({ error: genericError.message, userId: mockReq.user.id, planId: mockReq.params.planId })
      );
    });

    // Note: Missing planId param test is difficult here as Express routing typically handles this before the controller
    // Note: Missing req.user/authorization tests are omitted as they are handled by middleware
  });
}); 