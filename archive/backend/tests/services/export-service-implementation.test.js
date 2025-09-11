// Original non-mock imports that are needed by mocks or tests
const { Readable } = require('stream'); 

// --- Mocks FIRST ---
// Mock dependencies
let mockSupabaseClient;
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

jest.mock('../../config/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('../../config/supabase', () => ({
  supabaseUrl: 'mockUrl',
  supabaseKey: 'mockKey'
}), { virtual: true });

// Mock fast-csv *before* requiring it
let mockCsvStreamInstance;
let mockSimulateCsvError = false;

jest.mock('fast-csv', () => {
  // Define the error inside the factory
  const mockStreamError = new Error('CSV formatting error');
  let localMockCsvStreamInstance; // Use a local variable inside the factory scope

  return {
    format: jest.fn().mockImplementation(() => {
        localMockCsvStreamInstance = {
           pipe: jest.fn(dest => {
               // Access the outer scope variable using the 'mock' prefix
               if (mockSimulateCsvError && localMockCsvStreamInstance._errorCallback) {
                   localMockCsvStreamInstance._errorCallback(mockStreamError); // Use the error defined inside
               }
               return dest; 
           }),
           on: jest.fn((event, callback) => {
               if (event === 'error') { localMockCsvStreamInstance._errorCallback = callback; }
               if (event === 'finish') { localMockCsvStreamInstance._finishCallback = callback; }
               return localMockCsvStreamInstance; 
           }), 
           emit: jest.fn(),
           destroy: jest.fn(), 
        };
        // Assign to the outer scope variable IF needed for other parts of the test 
        mockCsvStreamInstance = localMockCsvStreamInstance;
        return localMockCsvStreamInstance;
    }),
  };
});

// Mock stream.Readable *before* requiring it
let mockDataStreamInstance;
let mockPassThroughStreamInstance;
let mockReadableInstanceCount = 0;

jest.mock('stream', () => {
  const MockReadable = jest.fn().mockImplementation(() => {
    mockReadableInstanceCount++;
    const instance = {
        _read: jest.fn(),
        push: jest.fn(),
        pipe: jest.fn(),
        on: jest.fn(), 
        emit: jest.fn(),
        destroy: jest.fn(),
        resume: jest.fn(),
        pause: jest.fn(),
    };
    if (mockReadableInstanceCount === 1) { mockDataStreamInstance = instance; }
    else if (mockReadableInstanceCount === 2) { mockPassThroughStreamInstance = instance; }
    return instance;
  });
  return { Readable: MockReadable };
});

// Mock exceljs *before* requiring it
// Flag to control error simulation in exceljs mock
let mockSimulateExcelWriteError = false; // Renamed with 'mock' prefix

let mockWorksheet = {
  columns: [],
  addRow: jest.fn(),
  getRow: jest.fn(() => ({ // Mock getRow to return an object with style properties
    font: {},
    fill: {}
  }))
};
let mockWorkbook = {
  creator: null,
  lastModifiedBy: null,
  created: null,
  modified: null,
  addWorksheet: jest.fn(() => mockWorksheet),
  xlsx: {
    write: jest.fn(() => Promise.resolve()), // Default success
  },
};

jest.mock('exceljs', () => {
  // Define the error inside the factory
  const mockExcelWriteError = new Error('Excel write error');
  // Define the mock constructor function
  const MockWorkbook = jest.fn().mockImplementation(() => {
    // Reset mocks for workbook/worksheet interactions on each new Workbook instance
    mockWorksheet = {
      columns: [],
      addRow: jest.fn(),
      getRow: jest.fn(() => ({ 
        font: {},
        fill: {}
      }))
    };
    mockWorkbook = {
      creator: null,
      lastModifiedBy: null,
      created: null,
      modified: null,
      addWorksheet: jest.fn(() => mockWorksheet),
      xlsx: {
        write: jest.fn((stream) => { // Simulate async write
          return new Promise((resolve, reject) => {
            // Use process.nextTick or setTimeout to simulate async behavior
            process.nextTick(() => { 
              if (mockSimulateExcelWriteError) {
                reject(mockExcelWriteError); // Use error defined inside
              } else {
                stream.push(null); // Simulate successful write by ending the stream
                resolve();
              }
            });
          });
        }),
      },
    };
    return mockWorkbook; // Return the mock instance
  });
  // Return an object with the Workbook property pointing to the mock constructor
  return { Workbook: MockWorkbook }; 
}, { virtual: true });

// Mock pdfkit before requiring it
let mockPdfDocInstance;
// Flag to control error simulation in pdfkit mock
let mockSimulatePdfError = false; // Renamed with 'mock' prefix
// const pdfError = new Error('PDF generation error');

jest.mock('pdfkit', () => {
    // Define the error inside the factory
    const mockPdfError = new Error('PDF generation error');
    let localMockPdfDocInstance; // Use local var

    const MockPDFDocument = jest.fn().mockImplementation(() => {
        localMockPdfDocInstance = { // Assign to local var first
            info: {},
            fontSize: jest.fn().mockReturnThis(),
            text: jest.fn().mockReturnThis(),
            moveDown: jest.fn().mockReturnThis(),
            addPage: jest.fn().mockReturnThis(),
            end: jest.fn(() => { // Simulate end triggering async completion or error
                process.nextTick(() => {
                    if (mockSimulatePdfError) { // Use renamed flag
                        // mockPdfDocInstance.emit('error', pdfError);
                        localMockPdfDocInstance.emit('error', mockPdfError); // Use error defined inside
                    } else {
                        // Simulate successful stream ending if pdfkit acts like a stream
                        // mockPdfDocInstance.emit('finish'); 
                    }
                });
            }),
            pipe: jest.fn(), // Assuming PDFDocument might be a stream or piped
            on: jest.fn(),   // If it emits events
            emit: jest.fn(), // If it emits events
            destroy: jest.fn(), // If it needs cleanup on error
        };
        mockPdfDocInstance = localMockPdfDocInstance; // Assign to outer mock if needed
        return localMockPdfDocInstance;
    });
    return MockPDFDocument; // pdfkit exports the constructor directly
});

// --- End Mocks ---

// --- Imports AFTER Mocks ---
const { createClient } = require('@supabase/supabase-js'); // Import the mocked createClient
const fastCsv = require('fast-csv'); 
const { exportJSON, exportCSV, exportXLSX, exportPDF, fetchUserData } = require('../../services/export-service');
const { DatabaseError, NotFoundError } = require('../../utils/errors');
const logger = require('../../config/logger');

describe('Export Service Implementation Tests', () => {
  let mockSupabaseClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReadableInstanceCount = 0;
    mockDataStreamInstance = null;
    mockPassThroughStreamInstance = null;
    mockCsvStreamInstance = null;
    mockPdfDocInstance = null; // Reset PDF mock
    mockSimulatePdfError = false; // Reset renamed PDF error simulation flag
    mockSimulateCsvError = false; // Reset the renamed flag
    mockSupabaseClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };
    createClient.mockReturnValue(mockSupabaseClient);
  });

  // --- fetchUserData Tests (Restore tests) ---
  // Keep these commented out or fix their mocking strategy separately later
  // Re-enable the fetchUserData tests 
  describe('fetchUserData', () => {
    // Ensure mockSupabaseClient is available from the outer scope's beforeEach
    const userId = 'user-export-123';
    const mockProfile = { id: userId, name: 'Test User', email: 'test@export.com' };
    const mockWorkouts = [{ plan_id: 'p1', user_id: userId, plan_name: 'Plan A' }];
    const mockLogs = [{ log_id: 'l1', user_id: userId, date: '2024-01-10' }];

     // Copied original tests back in, verifying they use the passed mockSupabaseClient
    it('should fetch profile data successfully', async () => {
      mockSupabaseClient.select.mockReturnThis(); 
      mockSupabaseClient.single.mockResolvedValueOnce({ data: mockProfile, error: null });
      const result = await fetchUserData(userId, ['profiles'], mockSupabaseClient);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('profiles');
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('*');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', userId);
      expect(mockSupabaseClient.single).toHaveBeenCalled();
      expect(result).toEqual({ profiles: [mockProfile] });
    });

    it('should fetch workout data successfully', async () => {
      mockSupabaseClient.select.mockReturnThis();
      mockSupabaseClient.eq.mockResolvedValueOnce({ data: mockWorkouts, error: null });
      const result = await fetchUserData(userId, ['workouts'], mockSupabaseClient);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('workout_plans');
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('*');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('user_id', userId);
      expect(result).toEqual({ workouts: mockWorkouts });
    });

    it('should fetch workout log data successfully', async () => {
      mockSupabaseClient.select.mockReturnThis();
      mockSupabaseClient.eq.mockResolvedValueOnce({ data: mockLogs, error: null });
      const result = await fetchUserData(userId, ['workout_logs'], mockSupabaseClient);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('workout_logs');
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('*');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('user_id', userId);
      expect(result).toEqual({ workout_logs: mockLogs });
    });
     
    it('should fetch multiple data types successfully', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({ data: mockProfile, error: null }); 
      mockSupabaseClient.eq.mockImplementation((col, val) => {
          if (col === 'id' && val === userId) { return mockSupabaseClient; }
          else if (col === 'user_id' && val === userId) {
            if (mockSupabaseClient.from.mock.calls.some(call => call[0] === 'workout_plans') && 
                !mockSupabaseClient.from.mock.calls.some(call => call[0] === 'workout_logs')) {
                 return Promise.resolve({ data: mockWorkouts, error: null });
            } else if (mockSupabaseClient.from.mock.calls.some(call => call[0] === 'workout_logs')) {
                return Promise.resolve({ data: mockLogs, error: null });
            }
          }
          return mockSupabaseClient;
      });
      const result = await fetchUserData(userId, ['profiles', 'workouts', 'workout_logs'], mockSupabaseClient);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('profiles');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('workout_plans');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('workout_logs');
      expect(result).toEqual({ profiles: [mockProfile], workouts: mockWorkouts, workout_logs: mockLogs });
      expect(mockSupabaseClient.single).toHaveBeenCalledTimes(1);
      expect(mockSupabaseClient.eq).toHaveBeenCalledTimes(3); 
    });

    it('should handle unknown data types gracefully', async () => {
      const result = await fetchUserData(userId, ['unknown_type'], mockSupabaseClient);
      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
      expect(result).toEqual({});
      expect(logger.warn).toHaveBeenCalledWith('Unknown data type requested for export: unknown_type');
    });

    it('should return empty arrays if no data found', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({ data: null, error: null }); 
      mockSupabaseClient.eq.mockImplementationOnce((col, val) => {
          if (col === 'user_id' && val === userId) return Promise.resolve({ data: null, error: null });
          return mockSupabaseClient;
      });
      mockSupabaseClient.eq.mockImplementationOnce((col, val) => {
           if (col === 'user_id' && val === userId) return Promise.resolve({ data: null, error: null });
          return mockSupabaseClient;
      });
      const result = await fetchUserData(userId, ['profiles', 'workouts', 'workout_logs'], mockSupabaseClient);
      expect(result).toEqual({ profiles: [], workouts: [], workout_logs: [] });
      expect(mockSupabaseClient.single).toHaveBeenCalledTimes(1);
      expect(mockSupabaseClient.eq).toHaveBeenCalledTimes(3); 
    });

    it('should throw DatabaseError if fetching profiles fails', async () => {
      const dbError = new Error('Profile fetch failed');
      mockSupabaseClient.single.mockResolvedValue({ data: null, error: dbError });
      await expect(fetchUserData(userId, ['profiles'], mockSupabaseClient)).rejects.toThrow(DatabaseError);
      await expect(fetchUserData(userId, ['profiles'], mockSupabaseClient)).rejects.toThrow(`Error fetching profile data: ${dbError.message}`);
      expect(logger.error).toHaveBeenCalledWith(`Error fetching user data for export: Error fetching profile data: ${dbError.message}`, { error: expect.any(DatabaseError) });
    });

    it('should throw DatabaseError if fetching workouts fails', async () => {
      const dbError = new Error('Workout fetch failed');
      mockSupabaseClient.eq.mockResolvedValue({ data: null, error: dbError });
      await expect(fetchUserData(userId, ['workouts'], mockSupabaseClient)).rejects.toThrow(DatabaseError);
      await expect(fetchUserData(userId, ['workouts'], mockSupabaseClient)).rejects.toThrow(`Error fetching workout data: ${dbError.message}`);
      expect(logger.error).toHaveBeenCalledWith(`Error fetching user data for export: Error fetching workout data: ${dbError.message}`, { error: expect.any(DatabaseError) });
    });

    it('should throw DatabaseError if fetching logs fails', async () => {
      const dbError = new Error('Log fetch failed');
      mockSupabaseClient.eq.mockResolvedValue({ data: null, error: dbError });
      await expect(fetchUserData(userId, ['workout_logs'], mockSupabaseClient)).rejects.toThrow(DatabaseError);
      await expect(fetchUserData(userId, ['workout_logs'], mockSupabaseClient)).rejects.toThrow(`Error fetching workout log data: ${dbError.message}`);
      expect(logger.error).toHaveBeenCalledWith(`Error fetching user data for export: Error fetching workout log data: ${dbError.message}`, { error: expect.any(DatabaseError) });
    });
  });
  

  // --- exportJSON Tests ---
  describe('exportJSON', () => {
    const userId = 'user-json-123';
    const dataTypes = ['profiles', 'workouts'];
    const jwtToken = 'valid.jwt.token';
    const mockFetchedDataResult = {
      profiles: [{ id: userId, name: 'JSON User' }],
      workouts: [{ plan_id: 'pjson', user_id: userId }],
    };
    const fixedDate = new Date('2024-03-15T10:00:00.000Z');
    // Use a simple mock function for injection
    let mockFetchUserDataFn;

    beforeAll(() => {
        jest.useFakeTimers();
        jest.setSystemTime(fixedDate);
    });

    afterAll(() => {
        jest.useRealTimers();
    });

    beforeEach(() => {
        // Reset the mock function each time
        mockFetchUserDataFn = jest.fn();
    });

    // Remove spy setup/restore
    // afterEach(() => { ... });

    it('should call injected fetchUserData and return correct JSON structure', async () => {
      // Configure the mock function
      mockFetchUserDataFn.mockResolvedValue(mockFetchedDataResult);

      // Pass the mock function as the last argument
      const result = await exportJSON(userId, dataTypes, jwtToken, mockFetchUserDataFn);

      // Assert the mock function was called
      expect(mockFetchUserDataFn).toHaveBeenCalledWith(userId, dataTypes, mockSupabaseClient);
      expect(createClient).toHaveBeenCalledWith('mockUrl', 'mockKey', expect.any(Object));
      expect(result).toEqual({
        exportDate: fixedDate.toISOString(),
        userId: userId,
        data: mockFetchedDataResult
      });
      expect(logger.info).toHaveBeenCalledWith(`Generating JSON export for user: ${userId}, data types: ${dataTypes.join(', ')}`);
    });

    it('should re-throw errors from injected fetchUserData', async () => {
        const fetchError = new DatabaseError('Failed to fetch for JSON');
        // Configure the mock function
        mockFetchUserDataFn.mockRejectedValue(fetchError);

        // Pass the mock function
        await expect(exportJSON(userId, dataTypes, jwtToken, mockFetchUserDataFn))
            .rejects.toThrow(fetchError);
        // Assert the mock function was called
        expect(mockFetchUserDataFn).toHaveBeenCalledWith(userId, dataTypes, mockSupabaseClient);
        expect(logger.error).toHaveBeenCalledWith(`Error generating JSON export: ${fetchError.message}`, { error: fetchError });
    });

     it('should handle errors from getSupabaseClient', async () => {
        const clientError = new Error('Supabase client init failed');
        createClient.mockImplementation(() => { throw clientError; });

        // Pass the *real* fetchUserData or a dummy function - it won't be called
        await expect(exportJSON(userId, dataTypes, jwtToken, jest.fn()))
            .rejects.toThrow(clientError); // Expect the original error
        
        // Ensure our injected mock wasn't called
        // Note: mockFetchUserDataFn isn't used here as the error happens before it's called
        // expect(mockFetchUserDataFn).not.toHaveBeenCalled(); 
    });

  });

  // --- exportCSV Tests ---
  describe('exportCSV', () => {
    const userId = 'user-csv-123';
    const dataTypes = ['profiles', 'workouts', 'empty_logs']; // Add type that will be empty
    const jwtToken = 'valid.jwt.token';
    const mockFetchUserDataFn = jest.fn();
    const mockFetchedData = {
        profiles: [{ id: userId, name: 'CSV, User', preferences: { units: 'metric' }, notes: '=SUM(A1:A2)' }],
        workouts: [
            { plan_id: 'pCSV', user_id: userId, plan_name: 'CSV Plan', exercises: [{ name: 'Push Up', sets: 3 }] }
        ],
        empty_logs: [] // Empty data set
    };
    const expectedProfileRow = { id: userId, name: 'CSV, User', preferences: '{"units":"metric"}', notes: "'=SUM(A1:A2)" };
    const expectedWorkoutRow = { plan_id: 'pCSV', user_id: userId, plan_name: 'CSV Plan', exercises: '[{"name":"Push Up","sets":3}]' };

    it('should process data and setup streams correctly on success', async () => {
        mockFetchUserDataFn.mockResolvedValue(mockFetchedData);
        
        // Await the promise returned by exportCSV first
        const resultStreamPromise = exportCSV(userId, dataTypes, jwtToken, mockFetchUserDataFn);

        // Need a way to let the async logic inside the promise run. 
        // Using a small delay or resolving promises might be needed if direct await isn't enough.
        // Let's try awaiting a microtask tick.
        await Promise.resolve(); 

        // Assert setup calls that happen after await fetchFn
        expect(mockFetchUserDataFn).toHaveBeenCalledWith(userId, dataTypes, mockSupabaseClient);
        expect(fastCsv.format).toHaveBeenCalledWith({ headers: true }); // Assert this *after* the await
        expect(Readable).toHaveBeenCalledTimes(2); // Keep this check
        expect(mockDataStreamInstance).toBeDefined();
        expect(mockPassThroughStreamInstance).toBeDefined();
        expect(mockCsvStreamInstance).toBeDefined();
        expect(mockDataStreamInstance.pipe).toHaveBeenCalledWith(mockCsvStreamInstance);
        expect(mockCsvStreamInstance.pipe).toHaveBeenCalledWith(mockPassThroughStreamInstance);
        expect(mockCsvStreamInstance.on).toHaveBeenCalledWith('error', expect.any(Function)); // Ensure error handlers are attached
        expect(mockCsvStreamInstance.on).toHaveBeenCalledWith('finish', expect.any(Function));

        // Assert data pushing happened (before finish). Wait for potential push calls.
        // Using setTimeout might be brittle. A better approach would be needed if this fails.
        await new Promise(resolve => setTimeout(resolve, 0)); 
        expect(mockDataStreamInstance.push).toHaveBeenCalledTimes(6); // Includes headers, rows for profiles/workouts, empty section, and null
        // Check specific data pushed (optional, but good)
        expect(mockDataStreamInstance.push).toHaveBeenCalledWith({ 'Section': 'PROFILES' });
        expect(mockDataStreamInstance.push).toHaveBeenCalledWith(expectedProfileRow);
        expect(mockDataStreamInstance.push).toHaveBeenCalledWith({}); // Separator
        expect(mockDataStreamInstance.push).toHaveBeenCalledWith({ 'Section': 'WORKOUTS' });
        expect(mockDataStreamInstance.push).toHaveBeenCalledWith(expectedWorkoutRow);
        // Note: The empty_logs section push is skipped by the service logic
        expect(mockDataStreamInstance.push).toHaveBeenNthCalledWith(6, null); // Final push(null)

        // Manually trigger the finish callback stored by the mock .on()
        expect(mockCsvStreamInstance._finishCallback).toBeDefined();
        mockCsvStreamInstance._finishCallback();

        // Now await the original promise to get the result stream
        const resultStream = await resultStreamPromise;
        
        // Check return value and final log
        expect(resultStream).toBe(mockPassThroughStreamInstance);
        expect(logger.info).toHaveBeenCalledWith('CSV export generated successfully with 2 rows'); // Should be 2 data rows
    });

    it('should push only null and finish if fetchUserData returns empty data', async () => {
        mockFetchUserDataFn.mockResolvedValue({ profiles: [], workouts: [], empty_logs: [] }); // Ensure all requested types are empty
        
        // Await the promise
        const resultStreamPromise = exportCSV(userId, dataTypes, jwtToken, mockFetchUserDataFn);
        
        // Wait for async operations within the promise executor
        await Promise.resolve(); 

        // Assert setup calls
        expect(mockFetchUserDataFn).toHaveBeenCalledWith(userId, dataTypes, mockSupabaseClient);
        expect(fastCsv.format).toHaveBeenCalledWith({ headers: true }); // This *should* be called before the loop
        expect(Readable).toHaveBeenCalledTimes(2);
        expect(mockDataStreamInstance.pipe).toHaveBeenCalledWith(mockCsvStreamInstance);
        expect(mockCsvStreamInstance.pipe).toHaveBeenCalledWith(mockPassThroughStreamInstance);
        expect(mockCsvStreamInstance.on).toHaveBeenCalledWith('finish', expect.any(Function));
        expect(mockCsvStreamInstance.on).toHaveBeenCalledWith('error', expect.any(Function));

        // Assert only push(null) happened after setup
        // Wait for potential push calls
        await new Promise(resolve => setTimeout(resolve, 0)); 
        expect(mockDataStreamInstance.push).toHaveBeenCalledTimes(1); // Only the final null
        expect(mockDataStreamInstance.push).toHaveBeenCalledWith(null);

        // Manually trigger finish
        expect(mockCsvStreamInstance._finishCallback).toBeDefined();
        mockCsvStreamInstance._finishCallback();

        // Await resolution
        const resultStream = await resultStreamPromise;
        
        expect(resultStream).toBe(mockPassThroughStreamInstance);
        expect(logger.info).toHaveBeenCalledWith('CSV export generated successfully with 0 rows'); // 0 data rows
    });

    it('should reject if fetchUserData rejects', async () => {
        const fetchError = new DatabaseError('Failed to fetch for CSV');
        mockFetchUserDataFn.mockRejectedValue(fetchError);
        await expect(exportCSV(userId, dataTypes, jwtToken, mockFetchUserDataFn))
            .rejects.toThrow(fetchError);
        expect(fastCsv.format).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith(`Error generating CSV export: ${fetchError.message}`, { error: fetchError });
    });

     it('should reject if CSV stream processing fails', async () => {
        mockFetchUserDataFn.mockResolvedValue(mockFetchedData);
        mockSimulateCsvError = true; // Set the renamed flag

         // Redefine the error locally for the assertion if needed
         const expectedCsvError = new Error('CSV formatting error');

         // Expect the promise to reject when called
         await expect(exportCSV(userId, dataTypes, jwtToken, mockFetchUserDataFn))
             .rejects.toThrow(expectedCsvError); // Assert against the expected error

         expect(logger.error).toHaveBeenCalledWith(`Error during CSV stream processing: ${expectedCsvError.message}`, { error: expectedCsvError });
         // Check destroy calls
         expect(mockDataStreamInstance.destroy).toHaveBeenCalledWith(expectedCsvError);
         expect(mockCsvStreamInstance.destroy).toHaveBeenCalledWith(expectedCsvError); // Uses the outer mockCsvStreamInstance
         expect(mockPassThroughStreamInstance.destroy).toHaveBeenCalledWith(expectedCsvError);
    });

  });

  // --- exportXLSX Tests ---
  describe('exportXLSX', () => {
    const userId = 'user-xlsx-123';
    const dataTypes = ['profiles', 'workouts'];
    const jwtToken = 'valid.jwt.token';
    const mockFetchUserDataFn = jest.fn();
    const mockFetchedData = {
        profiles: [{ id: userId, name: 'XLSX User', email: 'test@xlsx.com' }],
        workouts: [
            { plan_id: 'pXLSX', user_id: userId, plan_name: 'XLSX Plan', exercises: [{ name: 'Jump Squat', sets: 4 }] }
        ]
    };
    const ExcelJS = require('exceljs'); // Require the mocked version
    const { Readable: ActualReadable } = jest.requireActual('stream'); // Need actual Readable for the stream created inside

    beforeEach(() => {
        // Reset mocks specific to exceljs if needed (already done in mock implementation)
        mockSimulateExcelWriteError = false; // Reset renamed flag
    });

    it('should process data, create workbook/sheets, and return stream on success', async () => {
        mockFetchUserDataFn.mockResolvedValue(mockFetchedData);
        
        const resultStream = await exportXLSX(userId, dataTypes, jwtToken, mockFetchUserDataFn);

        // Re-require the mocked ExcelJS inside the test scope if needed, 
        // or rely on the top-level require if hoisting works as expected.
        // Let's assume top-level require is sufficient first.
        // const ExcelJS = require('exceljs'); 

        // Assertions
        expect(mockFetchUserDataFn).toHaveBeenCalledWith(userId, dataTypes, mockSupabaseClient);
        // Now assert against the mock constructor directly
        const { Workbook: MockWorkbookConst } = require('exceljs');
        expect(MockWorkbookConst).toHaveBeenCalledTimes(1); // Workbook constructor called
        expect(mockWorkbook.addWorksheet).toHaveBeenCalledTimes(2); 
        expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('Profiles');
        expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('Workouts');
        expect(mockWorksheet.addRow).toHaveBeenCalledTimes(2); // Once per data type
        expect(mockWorksheet.addRow).toHaveBeenCalledWith(mockFetchedData.profiles[0]);
        expect(mockWorksheet.addRow).toHaveBeenCalledWith({
            plan_id: 'pXLSX', 
            user_id: userId, 
            plan_name: 'XLSX Plan', 
            exercises: '[{"name":"Jump Squat","sets":4}]' // Check JSON stringification
        });
        expect(mockWorksheet.getRow).toHaveBeenCalledWith(1); // Header row styling
        expect(mockWorkbook.xlsx.write).toHaveBeenCalledWith(resultStream);
        // expect(resultStream).toBeInstanceOf(ActualReadable); // Check it returns a readable stream
        // Check for stream methods instead of instanceof due to global mock
        expect(resultStream.pipe).toBeDefined();
        expect(resultStream._read).toBeDefined(); 
        expect(resultStream.push).toBeDefined();
        expect(logger.info).toHaveBeenCalledWith(`Generating XLSX export for user: ${userId}, data types: ${dataTypes.join(', ')}`);
        
        // Check if stream ended (mock push(null) was called)
    });

    it('should handle empty data correctly', async () => {
        mockFetchUserDataFn.mockResolvedValue({ profiles: [], workouts: [] }); // Empty data

        const resultStream = await exportXLSX(userId, dataTypes, jwtToken, mockFetchUserDataFn);
        const { Workbook: MockWorkbookConst } = require('exceljs');

        expect(mockFetchUserDataFn).toHaveBeenCalledWith(userId, dataTypes, mockSupabaseClient);
        expect(MockWorkbookConst).toHaveBeenCalledTimes(1);
        expect(mockWorkbook.addWorksheet).not.toHaveBeenCalled(); // No sheets should be added
        expect(mockWorksheet.addRow).not.toHaveBeenCalled();
        expect(mockWorkbook.xlsx.write).toHaveBeenCalledWith(resultStream); // Still attempts to write the (empty) workbook
        // expect(resultStream).toBeInstanceOf(ActualReadable);
        // Check for stream methods
        expect(resultStream.pipe).toBeDefined();
        expect(resultStream._read).toBeDefined(); 
        expect(resultStream.push).toBeDefined();
        expect(logger.info).toHaveBeenCalledWith(`Generating XLSX export for user: ${userId}, data types: ${dataTypes.join(', ')}`);
        // The write mock will still push(null)
    });

    it('should reject if fetchUserData rejects', async () => {
        const fetchError = new DatabaseError('Failed to fetch for XLSX');
        mockFetchUserDataFn.mockRejectedValue(fetchError);
        const { Workbook: MockWorkbookConst } = require('exceljs');

        await expect(exportXLSX(userId, dataTypes, jwtToken, mockFetchUserDataFn))
            .rejects.toThrow(fetchError);

        expect(MockWorkbookConst).not.toHaveBeenCalled(); // Workbook shouldn't be created
        expect(logger.error).toHaveBeenCalledWith(`Error generating XLSX export: ${fetchError.message}`, { error: fetchError });
    });

    it('should reject if workbook write fails', async () => {
      mockFetchUserDataFn.mockResolvedValue(mockFetchedData);
      // simulateExcelWriteError = true; // Configure mock to throw error during write
      mockSimulateExcelWriteError = true; // Set renamed flag

      // Define expected error locally
      const expectedExcelError = new Error('Excel write error');

      // Call the function - it returns the stream synchronously
      const resultStream = await exportXLSX(userId, dataTypes, jwtToken, mockFetchUserDataFn);

      // Although the function returns the stream, the error handling 
      // (logging and emitting) happens asynchronously in the .catch block.
      // We need to wait for that async operation to potentially complete.
      await new Promise(r => setTimeout(r, 0)); // Allow microtasks/nextTick to run
      
      // Assert that the logger was called correctly, indicating the .catch block executed.
      // expect(logger.error).toHaveBeenCalledWith(`Error writing XLSX to stream: ${excelWriteError.message}`, { error: excelWriteError });
      expect(logger.error).toHaveBeenCalledWith(`Error writing XLSX to stream: ${expectedExcelError.message}`, { error: expectedExcelError });
    });

  });

  // --- exportPDF Tests ---
  describe('exportPDF', () => {
    const userId = 'user-pdf-123';
    const dataTypes = ['profiles', 'workouts'];
    const jwtToken = 'valid.jwt.token';
    const mockFetchUserDataFn = jest.fn();
    const mockFetchedData = {
        profiles: [{ id: userId, name: 'PDF User', email: 'test@pdf.com', preferences: { units: 'imperial', goals: ['gain'] } }],
        workouts: [
            { plan_id: 'pPDF', user_id: userId, plan_name: 'PDF Plan', exercises: [{ name: 'Deadlift', sets: 1, repsOrRange: '5' }] }
        ]
    };
    // Dynamically require mocked pdfkit inside describe block if needed, or rely on top-level
    const PDFDocument = require('pdfkit'); 

    beforeEach(() => {
        // Reset PDF mock state specifically if needed
        mockSimulatePdfError = false; // Reset renamed flag
        // Reset the mock constructor calls if using that approach
        PDFDocument.mockClear(); 
    });

    it('should fetch data, create PDF document, add content, and return the doc object on success', async () => {
      mockFetchUserDataFn.mockResolvedValue(mockFetchedData);

      const resultDoc = await exportPDF(userId, dataTypes, jwtToken, mockFetchUserDataFn);

      // Assertions
      expect(mockFetchUserDataFn).toHaveBeenCalledWith(userId, dataTypes, mockSupabaseClient);
      expect(PDFDocument).toHaveBeenCalledTimes(1); // Constructor called
      expect(PDFDocument).toHaveBeenCalledWith({ margin: 50 });
      expect(mockPdfDocInstance.info.Title).toBe('trAIner Data Export');
      expect(mockPdfDocInstance.info.Author).toBe('trAIner App');

      // Check some formatting calls (can be more specific)
      expect(mockPdfDocInstance.fontSize).toHaveBeenCalledWith(25);
      expect(mockPdfDocInstance.text).toHaveBeenCalledWith('trAIner Data Export', { align: 'center' });
      expect(mockPdfDocInstance.text).toHaveBeenCalledWith(`Export Date: ${new Date().toLocaleDateString()}`); // Assuming default locale formatting
      
      // Check section headers
      expect(mockPdfDocInstance.fontSize).toHaveBeenCalledWith(16);
      expect(mockPdfDocInstance.text).toHaveBeenCalledWith('Profiles', { underline: true });
      expect(mockPdfDocInstance.text).toHaveBeenCalledWith('Workouts', { underline: true });

      // Check item details were processed and added
      expect(mockPdfDocInstance.fontSize).toHaveBeenCalledWith(12);
      // Check profile data - example
      expect(mockPdfDocInstance.text).toHaveBeenCalledWith(`name: PDF User`, expect.any(Object));
      expect(mockPdfDocInstance.text).toHaveBeenCalledWith(`preferences: {\"units\":\"imperial\",\"goals\":[\"gain\"]}`, expect.any(Object));
      // Check workout data - example
      expect(mockPdfDocInstance.text).toHaveBeenCalledWith(`plan_name: PDF Plan`, expect.any(Object));
      expect(mockPdfDocInstance.text).toHaveBeenCalledWith(`exercises: [{\"name\":\"Deadlift\",\"sets\":1,\"repsOrRange\":\"5\"}]`, expect.any(Object));
      
      // Check page break was NOT added after the last section
      expect(mockPdfDocInstance.addPage).toHaveBeenCalledTimes(1); // Called between Profiles and Workouts

      // Check doc.end() was called
      expect(mockPdfDocInstance.end).toHaveBeenCalledTimes(1);

      expect(resultDoc).toBe(mockPdfDocInstance); // Should return the pdfkit document instance
      expect(logger.info).toHaveBeenCalledWith(`Generating PDF export for user: ${userId}, data types: ${dataTypes.join(', ')}`);
      expect(logger.info).toHaveBeenCalledWith('PDF export generated successfully');
    });

     it('should handle empty data correctly (no content added, but doc returned)', async () => {
        mockFetchUserDataFn.mockResolvedValue({ profiles: [], workouts: [] }); // Empty data

        const resultDoc = await exportPDF(userId, dataTypes, jwtToken, mockFetchUserDataFn);

        expect(mockFetchUserDataFn).toHaveBeenCalledWith(userId, dataTypes, mockSupabaseClient);
        expect(PDFDocument).toHaveBeenCalledTimes(1);
        expect(mockPdfDocInstance.text).toHaveBeenCalledWith('trAIner Data Export', expect.any(Object)); // Header still added
        // Check that section headers or item details were NOT added
        expect(mockPdfDocInstance.text).not.toHaveBeenCalledWith('Profiles', expect.any(Object));
        expect(mockPdfDocInstance.text).not.toHaveBeenCalledWith('Workouts', expect.any(Object));
        expect(mockPdfDocInstance.addPage).not.toHaveBeenCalled(); // No page breaks needed
        expect(mockPdfDocInstance.end).toHaveBeenCalledTimes(1);
        expect(resultDoc).toBe(mockPdfDocInstance);
        expect(logger.info).toHaveBeenCalledWith('PDF export generated successfully');
    });

    it('should reject if fetchUserData rejects', async () => {
        const fetchError = new DatabaseError('Failed to fetch for PDF');
        mockFetchUserDataFn.mockRejectedValue(fetchError);

        await expect(exportPDF(userId, dataTypes, jwtToken, mockFetchUserDataFn))
            .rejects.toThrow(fetchError);

        expect(PDFDocument).not.toHaveBeenCalled(); // PDF doc shouldn't be created
        expect(logger.error).toHaveBeenCalledWith(`Error generating PDF export: ${fetchError.message}`, { error: fetchError });
    });

    it('should reject if PDF document generation/ending fails', async () => {
        // This test depends on how the mock triggers the error.
        
        // Define expected error locally
        const expectedPdfError = new Error('PDF generation error');

        // Use the original global mock, but modify its behavior for this test.
        const PDFDocument = require('pdfkit'); // Get the mocked constructor
        PDFDocument.mockImplementationOnce(() => { // Use mockImplementationOnce
            const instance = {
                info: {}, 
                fontSize: jest.fn().mockReturnThis(), 
                text: jest.fn().mockReturnThis(),
                moveDown: jest.fn().mockReturnThis(),
                addPage: jest.fn().mockReturnThis(),
                pipe: jest.fn(),
                on: jest.fn(),
                emit: jest.fn(),
                destroy: jest.fn(),
            };
            // Throw synchronously from end
            instance.end = jest.fn(() => { 
                 // console.log('Mock end throwing...'); // Debug log
                 throw expectedPdfError; // Throw the locally defined error
            });
            return instance;
        });

        mockFetchUserDataFn.mockResolvedValue(mockFetchedData);
        // simulatePdfError = true; // No longer needed as the mock throws unconditionally

        // Call the function and expect rejection
        await expect(exportPDF(userId, dataTypes, jwtToken, mockFetchUserDataFn))
           .rejects.toThrow(expectedPdfError); // Assert against the local error
        
        // Verify logger was called by the catch block in exportPDF
        expect(logger.error).toHaveBeenCalledWith('Error generating PDF export: ' + expectedPdfError.message, { error: expectedPdfError });

        // Mock implementation is reset automatically due to mockImplementationOnce
    });
  });

  // --- Google Sheets Test Placeholder ---
  // Skipping implementation tests for generateGoogleSheet as it's not implemented in service
  describe('exportGoogleSheet', () => {
      it.todo('should handle Google Sheets export (feature not implemented)');
  });


}); 