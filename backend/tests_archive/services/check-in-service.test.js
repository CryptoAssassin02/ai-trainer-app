/**
 * Tests for the check-in service
 */
const { storeCheckIn, retrieveCheckIns, retrieveCheckIn, computeMetrics } = require('../../services/check-in-service');

// Mock the logger to prevent console output during tests
jest.mock('../../config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

// Mock the error classes
jest.mock('../../utils/errors', () => ({
  BadRequestError: class BadRequestError extends Error {
    constructor(message) {
      super(message);
      this.name = 'BadRequestError';
    }
  },
  DatabaseError: class DatabaseError extends Error {
    constructor(message) {
      super(message);
      this.name = 'DatabaseError';
    }
  },
  NotFoundError: class NotFoundError extends Error {
    constructor(message) {
      super(message);
      this.name = 'NotFoundError';
    }
  }
}));

// Import the mocked error classes
const { BadRequestError, DatabaseError, NotFoundError } = require('../../utils/errors');

// Mock Supabase config
jest.mock('../../config/supabase', () => ({
  supabaseUrl: 'https://mock.supabase.co',
  supabaseKey: 'mock-key'
}));

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => {
  // Create mock functions that return proper mock objects
  const mockSingle = jest.fn();
  const mockRange = jest.fn();
  const mockOrder = jest.fn().mockImplementation(() => ({ range: mockRange }));
  const mockLte = jest.fn().mockImplementation(() => ({ order: mockOrder }));
  const mockGte = jest.fn().mockImplementation(() => ({ lte: mockLte }));
  const mockEq = jest.fn().mockImplementation(() => ({ 
    eq: mockEq, 
    gte: mockGte, 
    single: mockSingle,
    order: mockOrder
  }));
  const mockSelect = jest.fn().mockImplementation(() => ({ 
    eq: mockEq, 
    single: mockSingle 
  }));
  const mockInsert = jest.fn().mockImplementation(() => ({ 
    select: mockSelect
  }));
  const mockFrom = jest.fn().mockImplementation(() => ({
    select: mockSelect,
    insert: mockInsert
  }));
  
  return {
    createClient: jest.fn(() => ({
      from: mockFrom
    }))
  };
});

// Import the mocked module
const { createClient } = require('@supabase/supabase-js');

describe('Check-In Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('storeCheckIn', () => {
    it('should throw BadRequestError when userId is missing', async () => {
      await expect(storeCheckIn(null, { date: '2023-01-01' }, 'token')).rejects.toThrow(BadRequestError);
    });

    it('should throw BadRequestError when data is missing', async () => {
      await expect(storeCheckIn('user123', null, 'token')).rejects.toThrow(BadRequestError);
    });

    it('should throw BadRequestError when date is missing', async () => {
      await expect(storeCheckIn('user123', {}, 'token')).rejects.toThrow(BadRequestError);
    });

    it('should successfully store a check-in record', async () => {
      const mockResponse = {
        data: {
          id: 'checkin123',
          user_id: 'user123',
          date: '2023-01-01',
          weight: 70
        },
        error: null
      };

      // Get the mock single function and set its implementation
      const mockSingle = createClient().from().insert().select().single;
      mockSingle.mockResolvedValue(mockResponse);

      const result = await storeCheckIn('user123', { date: '2023-01-01', weight: 70 }, 'token');

      expect(createClient).toHaveBeenCalled();
      expect(result).toEqual(mockResponse.data);
    });

    it('should throw DatabaseError when Supabase returns an error', async () => {
      const mockResponse = {
        data: null,
        error: { message: 'Database error' }
      };

      // Get the mock single function and set its implementation
      const mockSingle = createClient().from().insert().select().single;
      mockSingle.mockResolvedValue(mockResponse);

      await expect(storeCheckIn('user123', { date: '2023-01-01' }, 'token')).rejects.toThrow(DatabaseError);
    });
  });

  describe('retrieveCheckIns', () => {
    it('should throw BadRequestError when userId is missing', async () => {
      await expect(retrieveCheckIns(null, {}, 'token')).rejects.toThrow(BadRequestError);
    });

    it('should successfully retrieve check-in records', async () => {
      const mockResponse = {
        data: [
          { id: 'checkin1', user_id: 'user123', date: '2023-01-01' },
          { id: 'checkin2', user_id: 'user123', date: '2023-01-02' }
        ],
        error: null,
        count: 2
      };

      // Mock the range function
      const mockRange = createClient().from().select().eq().order().range;
      mockRange.mockResolvedValue(mockResponse);

      const result = await retrieveCheckIns('user123', {}, 'token');

      expect(createClient).toHaveBeenCalled();
      expect(result.data).toEqual(mockResponse.data);
    });
  });

  describe('retrieveCheckIn', () => {
    it('should throw BadRequestError when checkInId is missing', async () => {
      await expect(retrieveCheckIn(null, 'user123', 'token')).rejects.toThrow(BadRequestError);
    });

    it('should throw BadRequestError when userId is missing', async () => {
      await expect(retrieveCheckIn('checkin123', null, 'token')).rejects.toThrow(BadRequestError);
    });

    it('should successfully retrieve a specific check-in record', async () => {
      const mockResponse = {
        data: { id: 'checkin123', user_id: 'user123', date: '2023-01-01' },
        error: null
      };

      // Get the mock single function and set its implementation
      const mockSingle = createClient().from().select().eq().eq().single;
      mockSingle.mockResolvedValue(mockResponse);

      const result = await retrieveCheckIn('checkin123', 'user123', 'token');

      expect(createClient).toHaveBeenCalled();
      expect(result).toEqual(mockResponse.data);
    });

    it('should throw NotFoundError when check-in is not found', async () => {
      const mockResponse = {
        data: null,
        error: { message: 'No rows found', code: 'PGRST116' }
      };

      // Get the mock single function and set its implementation
      const mockSingle = createClient().from().select().eq().eq().single;
      mockSingle.mockResolvedValue(mockResponse);

      await expect(retrieveCheckIn('checkin123', 'user123', 'token')).rejects.toThrow(NotFoundError);
    });
  });

  describe('computeMetrics', () => {
    it('should throw BadRequestError when userId is missing', async () => {
      await expect(computeMetrics(null, { startDate: '2023-01-01', endDate: '2023-01-31' }, 'token')).rejects.toThrow(BadRequestError);
    });

    it('should throw BadRequestError when dateRange is missing', async () => {
      await expect(computeMetrics('user123', null, 'token')).rejects.toThrow(BadRequestError);
    });

    it('should throw BadRequestError when startDate is missing', async () => {
      await expect(computeMetrics('user123', { endDate: '2023-01-31' }, 'token')).rejects.toThrow(BadRequestError);
    });

    it('should throw BadRequestError when endDate is missing', async () => {
      await expect(computeMetrics('user123', { startDate: '2023-01-01' }, 'token')).rejects.toThrow(BadRequestError);
    });

    it('should return a message when no check-ins are available', async () => {
      const mockResponse = {
        data: [],
        error: null
      };

      // Mock the order function
      const mockOrder = createClient().from().select().eq().gte().lte().order;
      mockOrder.mockResolvedValue(mockResponse);

      const result = await computeMetrics('user123', { startDate: '2023-01-01', endDate: '2023-01-31' }, 'token');

      expect(createClient).toHaveBeenCalled();
      expect(result.message).toContain('No check-in data available');
    });

    it('should successfully compute metrics', async () => {
      const mockResponse = {
        data: [
          { 
            id: 'checkin1', 
            user_id: 'user123', 
            date: '2023-01-01', 
            weight: 70, 
            body_fat_perc: 20,
            measurements: { waist: 80, chest: 100 }
          },
          { 
            id: 'checkin2', 
            user_id: 'user123', 
            date: '2023-01-31', 
            weight: 68, 
            body_fat_perc: 18,
            measurements: { waist: 78, chest: 102 }
          }
        ],
        error: null
      };

      // Mock the order function
      const mockOrder = createClient().from().select().eq().gte().lte().order;
      mockOrder.mockResolvedValue(mockResponse);

      const result = await computeMetrics('user123', { startDate: '2023-01-01', endDate: '2023-01-31' }, 'token');

      expect(createClient).toHaveBeenCalled();
      expect(result.message).toContain('Metrics calculated successfully');
      expect(result.data.weightChange.absolute).toBe(-2);
      expect(result.data.bodyFatChange.absolute).toBe(-2);
      expect(result.data.measurementChanges.waist.absolute).toBe(-2);
      expect(result.data.measurementChanges.chest.absolute).toBe(2);
    });
  });
}); 