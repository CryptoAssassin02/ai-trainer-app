/**
 * @fileoverview Tests for the Export Service
 */

const exportService = require('../../services/export-service');
const { createClient } = require('@supabase/supabase-js');
const { Readable, Writable } = require('stream');

// Mock environment variables
process.env.SUPABASE_URL = 'https://mock-supabase-url.supabase.co';
process.env.SUPABASE_KEY = 'mock-supabase-key';

// Mock dependencies
jest.mock('@supabase/supabase-js');

// Mock fast-csv without referencing out-of-scope variables
jest.mock('fast-csv', () => {
  return {
    format: jest.fn(() => {
      const mockStream = {
        read: jest.fn(),
        pipe: jest.fn().mockReturnThis()
      };
      return mockStream;
    })
  };
});

// Mock exceljs without directly requiring stream
jest.mock('exceljs', () => {
  const mockWorkbook = {
    creator: '',
    lastModifiedBy: '',
    created: null,
    modified: null,
    addWorksheet: jest.fn().mockReturnValue({
      columns: [],
      getRow: jest.fn().mockReturnValue({
        font: {},
        fill: {},
        getCell: jest.fn(),
        commit: jest.fn()
      }),
      addRow: jest.fn()
    }),
    xlsx: {
      write: jest.fn().mockImplementation((stream) => {
        // Simulate writing to stream and ending it
        if (stream && typeof stream.end === 'function') {
          process.nextTick(() => {
            stream.emit('data', Buffer.from('mock-excel-data'));
            stream.emit('end');
          });
        }
        return Promise.resolve();
      })
    },
    writeToBuffer: jest.fn().mockResolvedValue(Buffer.from('mock-excel-buffer'))
  };
  
  return {
    Workbook: jest.fn(() => mockWorkbook)
  };
});

// Mock pdfkit without directly requiring stream
jest.mock('pdfkit', () => {
  return jest.fn().mockImplementation(() => {
    // Create a mock stream with PDFKit methods
    const mockStream = {
      _read: jest.fn(),
      pipe: jest.fn(function(destination) {
        // Handle the pipe properly without doing actual I/O
        if (destination && typeof destination.write === 'function') {
          process.nextTick(() => {
            destination.write(Buffer.from('mock-pdf-data'));
            if (typeof destination.end === 'function') {
              destination.end();
            }
          });
        }
        return destination;
      }),
      on: jest.fn((event, callback) => {
        // Store the callback for later triggering
        if (!mockStream._events) mockStream._events = {};
        mockStream._events[event] = callback;
        return mockStream;
      }),
      emit: jest.fn((event, data) => {
        if (mockStream._events && mockStream._events[event]) {
          mockStream._events[event](data);
        }
        return true;
      }),
      fontSize: jest.fn().mockReturnThis(),
      text: jest.fn().mockReturnThis(),
      moveDown: jest.fn().mockReturnThis(),
      addPage: jest.fn().mockReturnThis(),
      end: jest.fn(function() {
        process.nextTick(() => {
          mockStream.emit('data', Buffer.from('mock-pdf-data'));
          mockStream.emit('end');
        });
      }),
      info: {},
      write: jest.fn().mockReturnValue(true),
      toString: jest.fn().mockReturnValue('MockPDFDocument')
    };
    
    return mockStream;
  });
});

jest.mock('../../config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
}));

describe('Export Service', () => {
  // Setup mock data and spies
  const userId = 'test-user-id';
  const dataTypes = ['profiles', 'workouts', 'workout_logs'];
  const jwtToken = 'mock-jwt-token';
  
  // Mock Supabase responses
  const mockProfileData = { id: userId, name: 'Test User', height: 180 };
  const mockWorkoutData = [
    { id: 'workout1', user_id: userId, plan_name: 'Workout 1' },
    { id: 'workout2', user_id: userId, plan_name: 'Workout 2' }
  ];
  const mockLogData = [
    { log_id: 'log1', user_id: userId, plan_id: 'workout1', date: '2023-01-01' },
    { log_id: 'log2', user_id: userId, plan_id: 'workout2', date: '2023-01-02' }
  ];
  
  // Mock implementation for fetchUserData
  const setupMockSupabase = () => {
    const mockFrom = jest.fn((table) => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn((field, value) => {
          // Profiles needs single()
          if (table === 'profiles') {
            return {
              single: jest.fn().mockResolvedValue({ 
                data: mockProfileData, 
                error: null 
              })
            };
          }
          
          // Workouts and logs return array
          if (table === 'workout_plans') {
            return Promise.resolve({ 
              data: mockWorkoutData, 
              error: null 
            });
          }
          
          if (table === 'workout_logs') {
            return Promise.resolve({ 
              data: mockLogData, 
              error: null 
            });
          }
          
          return Promise.resolve({ data: null, error: null });
        })
      });
      
      return { select: mockSelect };
    });
    
    createClient.mockReturnValue({
      from: mockFrom
    });
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    setupMockSupabase();
    
    // Create a safer mock for pipe that doesn't interfere with other tests
    jest.spyOn(Readable.prototype, 'pipe').mockImplementation(function(dest) {
      if (dest && typeof dest.write === 'function') {
        // Simulate piping in next tick to avoid sync issues
        process.nextTick(() => {
          dest.write(Buffer.from('mock-piped-data'));
          if (typeof dest.end === 'function') {
            dest.end();
          }
        });
      }
      return dest;
    });
  });
  
  afterEach(() => {
    jest.restoreAllMocks(); // This will restore the original pipe method
  });
  
  describe('exportJSON', () => {
    it('should export JSON data with user data', async () => {
      // Create a copy of the original function to restore later
      const originalFetchUserData = exportService.fetchUserData;
      
      // Define our mock user data
      const mockUserData = {
        profiles: [mockProfileData],
        workouts: mockWorkoutData,
        workout_logs: mockLogData
      };
      
      // Use a different approach - replace the function temporarily
      exportService.fetchUserData = jest.fn().mockResolvedValue(mockUserData);
      
      try {
        // Call exportJSON
        const result = await exportService.exportJSON(userId, dataTypes, jwtToken);
        
        // Verify Supabase client was created correctly
        expect(createClient).toHaveBeenCalled();
        
        // Verify result structure and data - this implicitly verifies fetchUserData was called properly
        expect(result).toHaveProperty('exportDate');
        expect(result).toHaveProperty('userId', userId);
        expect(result).toHaveProperty('data', mockUserData);
      } finally {
        // Restore the original function to avoid affecting other tests
        exportService.fetchUserData = originalFetchUserData;
      }
    });
    
    it('should throw an error if JWT token is missing', async () => {
      await expect(exportService.exportJSON(userId, dataTypes, null))
        .rejects.toThrow('Authentication token is required');
    });
  });
  
  describe('exportCSV', () => {
    it('should return a CSV stream', async () => {
      // Mock fetchUserData
      jest.spyOn(exportService, 'fetchUserData').mockResolvedValue({
        profiles: [mockProfileData],
        workouts: mockWorkoutData,
        workout_logs: mockLogData
      });
      
      // Call exportCSV
      const result = await exportService.exportCSV(userId, dataTypes, jwtToken);
      
      // Verify result is a Readable or has pipe method
      expect(result).toBeTruthy();
      expect(typeof result.pipe).toBe('function');
    });
  });
  
  describe('exportXLSX', () => {
    it('should return an XLSX stream', async () => {
      // Mock fetchUserData
      jest.spyOn(exportService, 'fetchUserData').mockResolvedValue({
        profiles: [mockProfileData],
        workouts: mockWorkoutData,
        workout_logs: mockLogData
      });
      
      // Call exportXLSX
      const result = await exportService.exportXLSX(userId, dataTypes, jwtToken);
      
      // Verify result is a Readable
      expect(result).toBeTruthy();
      expect(typeof result.pipe).toBe('function');
    });
  });
  
  describe('exportPDF', () => {
    it('should return a PDF stream', async () => {
      // Mock fetchUserData
      jest.spyOn(exportService, 'fetchUserData').mockResolvedValue({
        profiles: [mockProfileData],
        workouts: mockWorkoutData,
        workout_logs: mockLogData
      });
      
      // Call exportPDF
      const result = await exportService.exportPDF(userId, dataTypes, jwtToken);
      
      // Verify result has pipe method
      expect(result).toBeTruthy();
      expect(typeof result.pipe).toBe('function');
    });
  });
}); 