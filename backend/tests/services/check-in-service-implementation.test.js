const { createClient } = require('@supabase/supabase-js');
const { storeCheckIn, retrieveCheckIns, retrieveCheckIn, computeMetrics } = require('../../services/check-in-service');
const logger = require('../../config/logger');
const { BadRequestError, DatabaseError, NotFoundError } = require('../../utils/errors');

// Mock dependencies
let mockSupabaseClient;
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient), // Return the mock client instance
}));

jest.mock('../../config/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// Explicitly mock config/supabase
jest.mock('../../config/supabase', () => ({
  supabaseUrl: 'mockUrl',
  supabaseKey: 'mockKey'
}));

describe('Check In Service Implementation Tests', () => {

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset and configure the mock client before each test
    mockSupabaseClient = {
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };
    // Ensure createClient mock function is reset if needed, though jest.clearAllMocks should handle it.
  });

  // --- storeCheckIn Tests ---
  describe('storeCheckIn', () => {
    const userId = 'user-123';
    const jwtToken = 'valid.jwt.token';
    const checkInData = {
      date: '2024-01-15',
      weight: 75.5,
      body_fat_percentage: 15.2,
      measurements: { waist: 80, chest: 100 },
      mood: 'Good',
      sleep_quality: 8,
      energy_level: 7,
      stress_level: 3,
      notes: 'Felt strong today'
    };
    const expectedDbInput = {
        user_id: userId,
        date: '2024-01-15',
        weight: 75.5,
        body_fat_perc: 15.2,
        measurements: { waist: 80, chest: 100 },
        mood: 'Good',
        sleep_quality: 8,
        energy_level: 7,
        stress_level: 3,
        notes: 'Felt strong today'
    };
    const mockStoredRecord = { id: 'checkin-xyz', ...expectedDbInput };

    it('should store a check-in record successfully', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({ data: mockStoredRecord, error: null });

      const result = await storeCheckIn(userId, checkInData, jwtToken);

      // Now expect the mocked URL and key
      expect(createClient).toHaveBeenCalledWith('mockUrl', 'mockKey', {
          global: { headers: { Authorization: `Bearer ${jwtToken}` } }
      });
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_check_ins');
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(expectedDbInput);
      expect(mockSupabaseClient.select).toHaveBeenCalled();
      expect(mockSupabaseClient.single).toHaveBeenCalled();
      expect(result).toEqual(mockStoredRecord);
    });

     it('should handle optional fields being null or missing', async () => {
      const minimalData = { date: '2024-01-16' };
      const expectedMinimalDbInput = {
        user_id: userId,
        date: '2024-01-16',
        weight: null,
        body_fat_perc: null,
        measurements: null,
        mood: null,
        sleep_quality: null,
        energy_level: null,
        stress_level: null,
        notes: null
      };
       const mockMinimalRecord = { id: 'checkin-abc', ...expectedMinimalDbInput };
       mockSupabaseClient.single.mockResolvedValueOnce({ data: mockMinimalRecord, error: null });

      const result = await storeCheckIn(userId, minimalData, jwtToken);

      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(expectedMinimalDbInput);
      expect(result).toEqual(mockMinimalRecord);
    });

    it('should throw BadRequestError if userId is missing', async () => {
      await expect(storeCheckIn(null, checkInData, jwtToken))
        .rejects.toThrow(BadRequestError);
      await expect(storeCheckIn(null, checkInData, jwtToken))
        .rejects.toThrow('User ID is required');
      expect(createClient).not.toHaveBeenCalled();
    });

    it('should throw BadRequestError if data or date is missing', async () => {
      await expect(storeCheckIn(userId, null, jwtToken))
        .rejects.toThrow(BadRequestError);
      await expect(storeCheckIn(userId, null, jwtToken))
        .rejects.toThrow('Check-in data with date is required');

      await expect(storeCheckIn(userId, { weight: 75 }, jwtToken)) // Missing date
        .rejects.toThrow(BadRequestError);
       await expect(storeCheckIn(userId, { weight: 75 }, jwtToken)) // Missing date
        .rejects.toThrow('Check-in data with date is required');

      expect(createClient).not.toHaveBeenCalled();
    });

    it('should throw DatabaseError if Supabase insert fails', async () => {
      const supabaseError = new Error('DB insert error');
      // Apply explicit promise fix
      const mockPromise = Promise.resolve({ data: null, error: supabaseError });
      mockSupabaseClient.single.mockReturnValue(mockPromise);

      await expect(storeCheckIn(userId, checkInData, jwtToken))
        .rejects.toThrow(DatabaseError);
       await expect(storeCheckIn(userId, checkInData, jwtToken))
        .rejects.toThrow(`Failed to store check-in: ${supabaseError.message}`);
      expect(logger.error).toHaveBeenCalledWith(`Failed to store check-in: ${supabaseError.message}`, { userId, error: supabaseError });
      // Ensure promise was awaited
      await mockPromise;
    });

    it('should throw DatabaseError for unexpected errors', async () => {
        const unexpectedError = new Error('Something broke');
        // Make the insert call itself throw
        mockSupabaseClient.insert.mockImplementation(() => {
            throw unexpectedError;
        });

        await expect(storeCheckIn(userId, checkInData, jwtToken)).rejects.toThrow(DatabaseError);
        await expect(storeCheckIn(userId, checkInData, jwtToken))
            .rejects.toThrow(`Failed to store check-in: ${unexpectedError.message}`);
        expect(logger.error).toHaveBeenCalledWith('Unexpected error storing check-in', { userId, error: unexpectedError });
    });
  });

  // --- retrieveCheckIns Tests ---
  describe('retrieveCheckIns', () => {
    const userId = 'user-123';
    const jwtToken = 'valid.jwt.token';
    const mockCheckIns = [
        { id: 'ci-1', user_id: userId, date: '2024-01-15', weight: 75 },
        { id: 'ci-2', user_id: userId, date: '2024-01-14', weight: 76 },
    ];

    it('should retrieve check-ins successfully with default pagination', async () => {
      mockSupabaseClient.range.mockReturnThis(); // Keep chaining possible before final await
      // Mock the final awaited query
      const mockQuery = Promise.resolve({ data: mockCheckIns, error: null, count: mockCheckIns.length });
      mockSupabaseClient.range.mockReturnValue(mockQuery);

      const result = await retrieveCheckIns(userId, {}, jwtToken);

      expect(createClient).toHaveBeenCalledWith('mockUrl', 'mockKey', expect.any(Object));
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_check_ins');
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('*');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('user_id', userId);
      expect(mockSupabaseClient.order).toHaveBeenCalledWith('date', { ascending: false });
      expect(mockSupabaseClient.range).toHaveBeenCalledWith(0, 9); // Default limit 10 -> range(0, 9)
      expect(result.data).toEqual(mockCheckIns);
      expect(result.pagination).toEqual({ limit: 10, offset: 0, total: mockCheckIns.length });
      await mockQuery; // Ensure promise awaited
    });

    it('should retrieve check-ins successfully with custom pagination', async () => {
      const filters = { limit: 5, offset: 10 };
      mockSupabaseClient.range.mockReturnThis();
      const mockQuery = Promise.resolve({ data: [mockCheckIns[0]], error: null, count: 1 });
      mockSupabaseClient.range.mockReturnValue(mockQuery);

      const result = await retrieveCheckIns(userId, filters, jwtToken);

      expect(mockSupabaseClient.range).toHaveBeenCalledWith(10, 14); // offset 10, limit 5 -> range(10, 14)
      expect(result.data).toEqual([mockCheckIns[0]]);
      expect(result.pagination).toEqual({ limit: 5, offset: 10, total: 1 });
      await mockQuery;
    });

    it('should retrieve check-ins successfully with date filters', async () => {
      const filters = { startDate: '2024-01-14', endDate: '2024-01-15' };
      mockSupabaseClient.range.mockReturnThis();
      const mockQuery = Promise.resolve({ data: mockCheckIns, error: null, count: mockCheckIns.length });
      mockSupabaseClient.range.mockReturnValue(mockQuery);

      await retrieveCheckIns(userId, filters, jwtToken);

      expect(mockSupabaseClient.gte).toHaveBeenCalledWith('date', filters.startDate);
      expect(mockSupabaseClient.lte).toHaveBeenCalledWith('date', filters.endDate);
      await mockQuery;
    });

    it('should return empty data array and pagination if no check-ins found', async () => {
      mockSupabaseClient.range.mockReturnThis();
      const mockQuery = Promise.resolve({ data: null, error: null, count: 0 });
      mockSupabaseClient.range.mockReturnValue(mockQuery);

      const result = await retrieveCheckIns(userId, {}, jwtToken);

      expect(result.data).toEqual([]);
      expect(result.pagination).toEqual({ limit: 10, offset: 0, total: 0 });
      await mockQuery;
    });

    it('should throw BadRequestError if userId is missing', async () => {
      await expect(retrieveCheckIns(null, {}, jwtToken))
        .rejects.toThrow(BadRequestError);
      await expect(retrieveCheckIns(null, {}, jwtToken))
        .rejects.toThrow('User ID is required');
       expect(createClient).not.toHaveBeenCalled();
    });

    it('should throw DatabaseError if Supabase select fails', async () => {
      const supabaseError = new Error('DB select error');
      mockSupabaseClient.range.mockReturnThis();
      const mockQuery = Promise.reject(supabaseError);
      mockSupabaseClient.range.mockImplementation(() => mockQuery);

      await expect(retrieveCheckIns(userId, {}, jwtToken))
        .rejects.toThrow(DatabaseError);
      await expect(retrieveCheckIns(userId, {}, jwtToken))
        .rejects.toThrow(`Failed to retrieve check-ins: ${supabaseError.message}`);
      expect(logger.error).toHaveBeenCalledWith('Unexpected error retrieving check-ins', { userId, filters: {}, error: supabaseError });
      try { await mockQuery } catch(e) {} // Consume rejection
    });

    it('should throw DatabaseError for unexpected errors', async () => {
        const unexpectedError = new Error('Something else broke');
        mockSupabaseClient.from.mockImplementation(() => { throw unexpectedError; });

        await expect(retrieveCheckIns(userId, {}, jwtToken)).rejects.toThrow(DatabaseError);
         await expect(retrieveCheckIns(userId, {}, jwtToken))
            .rejects.toThrow(`Failed to retrieve check-ins: ${unexpectedError.message}`);
        expect(logger.error).toHaveBeenCalledWith('Unexpected error retrieving check-ins', expect.any(Object));
    });
  });

  // --- retrieveCheckIn Tests ---
  describe('retrieveCheckIn', () => {
    const checkInId = 'ci-xyz';
    const userId = 'user-123';
    const jwtToken = 'valid.jwt.token';
    const mockCheckIn = { id: checkInId, user_id: userId, date: '2024-01-15' };

    it('should retrieve a specific check-in successfully', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({ data: mockCheckIn, error: null });

      const result = await retrieveCheckIn(checkInId, userId, jwtToken);

      expect(createClient).toHaveBeenCalledWith('mockUrl', 'mockKey', expect.any(Object));
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_check_ins');
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('*');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', checkInId);
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('user_id', userId);
      expect(mockSupabaseClient.single).toHaveBeenCalled();
      expect(result).toEqual(mockCheckIn);
    });

    it('should throw BadRequestError if checkInId is missing', async () => {
        await expect(retrieveCheckIn(null, userId, jwtToken)).rejects.toThrow(BadRequestError);
        await expect(retrieveCheckIn(null, userId, jwtToken)).rejects.toThrow('Check-in ID is required');
        expect(createClient).not.toHaveBeenCalled();
    });

     it('should throw BadRequestError if userId is missing', async () => {
        await expect(retrieveCheckIn(checkInId, null, jwtToken)).rejects.toThrow(BadRequestError);
        await expect(retrieveCheckIn(checkInId, null, jwtToken)).rejects.toThrow('User ID is required');
        expect(createClient).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError if Supabase returns "No rows found" error', async () => {
      const noRowsError = new Error('No rows found');
      // Apply explicit promise fix
      const mockPromise = Promise.resolve({ data: null, error: noRowsError });
      mockSupabaseClient.single.mockReturnValue(mockPromise);

      await expect(retrieveCheckIn(checkInId, userId, jwtToken))
        .rejects.toThrow(NotFoundError);
      await expect(retrieveCheckIn(checkInId, userId, jwtToken))
        .rejects.toThrow(`Check-in record not found: ${checkInId}`);
       expect(logger.error).not.toHaveBeenCalled();
       await mockPromise; // Ensure promise awaited
    });

    it('should throw NotFoundError if Supabase returns PGRST116 code', async () => {
        const noRowsError = new Error('Resource not found');
        noRowsError.code = 'PGRST116';
        // Apply explicit promise fix
        const mockPromise = Promise.resolve({ data: null, error: noRowsError });
        mockSupabaseClient.single.mockReturnValue(mockPromise);

        await expect(retrieveCheckIn(checkInId, userId, jwtToken))
          .rejects.toThrow(NotFoundError);
        await expect(retrieveCheckIn(checkInId, userId, jwtToken))
          .rejects.toThrow(`Check-in record not found: ${checkInId}`);
         expect(logger.error).not.toHaveBeenCalled();
         await mockPromise; // Ensure promise awaited
      });

    it('should throw DatabaseError if Supabase select fails with another error', async () => {
        const dbError = new Error('Connection refused');
        // Apply explicit promise fix
        const mockPromise = Promise.resolve({ data: null, error: dbError });
        mockSupabaseClient.single.mockReturnValue(mockPromise);

        await expect(retrieveCheckIn(checkInId, userId, jwtToken)).rejects.toThrow(DatabaseError);
        await expect(retrieveCheckIn(checkInId, userId, jwtToken))
            .rejects.toThrow(`Failed to retrieve check-in: ${dbError.message}`);
        expect(logger.error).toHaveBeenCalledWith(`Failed to retrieve check-in: ${dbError.message}`, { checkInId, userId, error: dbError });
        await mockPromise; // Ensure promise awaited
    });

     it('should throw DatabaseError for unexpected errors', async () => {
        const unexpectedError = new Error('Something unexpected happened');
        mockSupabaseClient.single.mockImplementation(() => { throw unexpectedError; });

        await expect(retrieveCheckIn(checkInId, userId, jwtToken)).rejects.toThrow(DatabaseError);
         await expect(retrieveCheckIn(checkInId, userId, jwtToken))
            .rejects.toThrow(`Failed to retrieve check-in: ${unexpectedError.message}`);
         expect(logger.error).toHaveBeenCalledWith('Unexpected error retrieving check-in', { checkInId, userId, error: unexpectedError });
    });

  });

  // --- computeMetrics Tests ---
  describe('computeMetrics', () => {
    const userId = 'user-123';
    const jwtToken = 'valid.jwt.token';
    const dateRange = { startDate: '2024-01-01', endDate: '2024-01-31' };
    const mockCheckInsData = [
        { id: 'ci-1', user_id: userId, date: '2024-01-05', weight: 80, body_fat_perc: 20, measurements: { waist: 90 }, energy_level: 6, stress_level: 4 },
        { id: 'ci-2', user_id: userId, date: '2024-01-15', weight: 78, body_fat_perc: 19, measurements: { waist: 88 }, energy_level: 7, stress_level: 3 },
        { id: 'ci-3', user_id: userId, date: '2024-01-25', weight: 77, body_fat_perc: 18.5, measurements: { waist: 87 }, energy_level: 8, stress_level: 2 },
    ];

    it('should compute metrics successfully with valid data', async () => {
        mockSupabaseClient.order.mockReturnThis(); // Keep chaining
        const mockQuery = Promise.resolve({ data: mockCheckInsData, error: null });
        mockSupabaseClient.order.mockReturnValue(mockQuery);

        const result = await computeMetrics(userId, dateRange, jwtToken);

        expect(createClient).toHaveBeenCalledWith('mockUrl', 'mockKey', expect.any(Object));
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_check_ins');
        expect(mockSupabaseClient.select).toHaveBeenCalledWith('*');
        expect(mockSupabaseClient.eq).toHaveBeenCalledWith('user_id', userId);
        expect(mockSupabaseClient.gte).toHaveBeenCalledWith('date', dateRange.startDate);
        expect(mockSupabaseClient.lte).toHaveBeenCalledWith('date', dateRange.endDate);
        expect(mockSupabaseClient.order).toHaveBeenCalledWith('date', { ascending: true });

        expect(result.message).toBe('Metrics calculated successfully');
        expect(result.data.period.totalDays).toBe(30);
        expect(result.data.checkInCount).toBe(3);
        // Check calculated changes (first vs last)
        expect(result.data.weightChange.absolute).toBeCloseTo(-3); // 77 - 80
        expect(result.data.weightChange.percent).toBeCloseTo(-3.75); // (-3 / 80) * 100
        expect(result.data.bodyFatChange.absolute).toBeCloseTo(-1.5);
        expect(result.data.bodyFatChange.percent).toBeCloseTo(-7.5);
        expect(result.data.measurementChanges.waist.absolute).toBeCloseTo(-3);
        // Check averages
        expect(result.data.averages.weight).toBeCloseTo(78.33); // (80+78+77)/3
        expect(result.data.averages.bodyFat).toBeCloseTo(19.17); // (20+19+18.5)/3
        expect(result.data.averages.energyLevel).toBeCloseTo(7); // (6+7+8)/3
        expect(result.data.averages.stressLevel).toBeCloseTo(3); // (4+3+2)/3
        await mockQuery;
    });

    it('should return message and null metrics if no check-ins found', async () => {
        mockSupabaseClient.order.mockReturnThis();
        const mockQuery = Promise.resolve({ data: [], error: null }); // Empty array
        mockSupabaseClient.order.mockReturnValue(mockQuery);

        const result = await computeMetrics(userId, dateRange, jwtToken);

        expect(result.message).toBe('No check-in data available for the specified period');
        expect(result.data.weightChange).toBeNull();
        expect(result.data.bodyFatChange).toBeNull();
        expect(result.data.measurementChanges).toEqual({});
        await mockQuery;
    });

    it('should throw BadRequestError if userId is missing', async () => {
        await expect(computeMetrics(null, dateRange, jwtToken)).rejects.toThrow(BadRequestError);
        await expect(computeMetrics(null, dateRange, jwtToken)).rejects.toThrow('User ID is required');
        expect(createClient).not.toHaveBeenCalled();
    });

    it('should throw BadRequestError if dateRange or its properties are missing', async () => {
        await expect(computeMetrics(userId, null, jwtToken)).rejects.toThrow(BadRequestError);
        await expect(computeMetrics(userId, { startDate: '2024-01-01' }, jwtToken)).rejects.toThrow(BadRequestError);
        await expect(computeMetrics(userId, { endDate: '2024-01-31' }, jwtToken)).rejects.toThrow(BadRequestError);
        await expect(computeMetrics(userId, {}, jwtToken)).rejects.toThrow('Start and end dates are required for metrics calculation');
        expect(createClient).not.toHaveBeenCalled();
    });

    it('should throw DatabaseError if Supabase select fails', async () => {
        const supabaseError = new Error('DB metrics error');
        mockSupabaseClient.order.mockReturnThis();
        const mockQuery = Promise.reject(supabaseError);
        mockSupabaseClient.order.mockImplementation(() => mockQuery);

        await expect(computeMetrics(userId, dateRange, jwtToken)).rejects.toThrow(DatabaseError);
        await expect(computeMetrics(userId, dateRange, jwtToken))
            .rejects.toThrow(`Failed to compute metrics: ${supabaseError.message}`);
        expect(logger.error).toHaveBeenCalledWith('Unexpected error computing metrics', { userId, dateRange, error: supabaseError });
        try { await mockQuery } catch(e) {} // Consume rejection
    });

    it('should throw DatabaseError for unexpected errors', async () => {
        const unexpectedError = new Error('Calculation exploded');
        // Make the helper function throw (or mock Supabase to throw unexpectedly)
        mockSupabaseClient.order.mockImplementation(() => { throw unexpectedError; });

        await expect(computeMetrics(userId, dateRange, jwtToken)).rejects.toThrow(DatabaseError);
        await expect(computeMetrics(userId, dateRange, jwtToken))
            .rejects.toThrow(`Failed to compute metrics: ${unexpectedError.message}`);
        expect(logger.error).toHaveBeenCalledWith('Unexpected error computing metrics', { userId, dateRange, error: unexpectedError });
    });

    // Optional: Direct tests for helper functions if complex logic warrants it
    // describe('computeMetrics helpers', () => { ... });

  });

}); 