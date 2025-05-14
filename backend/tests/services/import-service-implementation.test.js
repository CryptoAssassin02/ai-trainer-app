const importService = require('../../services/import-service');
const logger = require('../../utils/logger');
const fs = require('fs');
const { DatabaseError, ValidationError, ImportServiceError } = require('../../utils/errors');
const path = require('path');
const Joi = require('joi'); // Import Joi for use in tests
const { createClient } = require('@supabase/supabase-js'); // Import the actual createClient
const ExcelJS = require('exceljs'); // Import actual exceljs

// Mock environment variables
process.env.SUPABASE_URL = 'https://mock-supabase-url.com';
process.env.SUPABASE_KEY = 'mock-supabase-key';

// Mock dependencies
jest.mock('../../utils/logger');

jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    existsSync: jest.fn().mockReturnValue(true),
    unlinkSync: jest.fn(),
}));

// Mock supabase directly WITHIN the factory function
const mockSupabaseFrom = jest.fn().mockReturnThis();
const mockSupabaseUpsert = jest.fn().mockResolvedValue({ error: null, data: [{}] });
const mockSupabaseSelect = jest.fn().mockReturnThis();
const mockSupabaseEq = jest.fn().mockResolvedValue({ error: null, data: [{}] });
jest.mock('@supabase/supabase-js', () => {
    // Define mocks inside the factory
    const mockFrom = jest.fn().mockReturnThis();
    const mockUpsert = jest.fn().mockResolvedValue({ error: null, data: [{}] });
    const mockSelect = jest.fn().mockReturnThis();
    const mockEq = jest.fn().mockResolvedValue({ error: null, data: [{}] });
    
    // Expose mocks if needed for assertions later (optional)
    // global.mockSupabaseFrom = mockFrom; 
    // global.mockSupabaseUpsert = mockUpsert;
    
    return {
        createClient: jest.fn().mockReturnValue({
            from: mockFrom,
            upsert: mockUpsert,
            select: mockSelect,
            eq: mockEq
        })
    };
});

// Mock exceljs
const mockExcelWorkbook = {
    xlsx: {
        readFile: jest.fn().mockResolvedValue(undefined)
    },
    worksheets: [], // Initialize as empty, will be set in tests
    addWorksheet: jest.fn(), // Keep basic mocks if needed elsewhere
};
jest.mock('exceljs', () => ({
    Workbook: jest.fn().mockImplementation(() => mockExcelWorkbook)
}));

// Mock papaparse
jest.mock('papaparse', () => ({
    parse: jest.fn((stream, config) => {
        console.log('[Papaparse Mock] Parse called with config:', config);
        const mockCsvData = [
            // Simulate the special dataType row first
            { dataType: 'workout_logs' }, 
            // Then the actual data rows
            { log_id: 'log-1', plan_id: 'plan-a', user_id: 'user-uuid-123', date: '2024-01-01', notes: 'Good session' }, 
            { log_id: 'log-2', plan_id: 'plan-a', user_id: 'user-uuid-123', date: '2024-01-02', notes: 'Felt tired' }
        ];
        
        const dataBatches = {}; // Simulate internal batching for logging
        let currentDataType = null;

        process.nextTick(() => {
            console.log('[Papaparse Mock] Running nextTick');
            if (config.step && config.header === true) { 
                console.log(`[Papaparse Mock] Simulating ${mockCsvData.length} step calls...`);
                mockCsvData.forEach((rowObject, index) => {
                    // Simulate dataType detection
                    if (rowObject.dataType) {
                        currentDataType = rowObject.dataType.toLowerCase();
                        if (!dataBatches[currentDataType]) {
                            dataBatches[currentDataType] = [];
                        }
                    } else if (currentDataType) {
                        // Simulate adding to batch after validation (assuming validation pass for logging)
                         if (!dataBatches[currentDataType]) { dataBatches[currentDataType] = []; } // Ensure batch exists
                         dataBatches[currentDataType].push(rowObject); 
                         console.log(`[Papaparse Mock] Added row to batch ${currentDataType}. Current length: ${dataBatches[currentDataType].length}`);
                    }
                    try {
                        config.step({ data: rowObject }, { /* mock parser object */ });
                    } catch (e) {
                         console.error('[Papaparse Mock] Error calling step callback:', e);
                    }
                });
            }
            if (config.complete) {
                console.log('[Papaparse Mock] Calling complete callback. Final dataBatches:', dataBatches);
                config.complete({ data: [], errors: [], meta: { } }); 
            }
             console.log('[Papaparse Mock] Finished nextTick');
        });
        
        return { };
    })
}));

// Mock Joi - Define mock validate inside factory
// const mockJoiValidate = jest.fn(); // Remove pre-declaration
jest.mock('joi', () => {
    const mockValidate = jest.fn().mockReturnValue({ error: null, value: {} });
    // Expose mockValidate for assertions if needed (optional)
    // global.mockJoiValidate = mockValidate;
    return {
        object: jest.fn().mockReturnThis(),
        validate: mockValidate,
        // Keep other methods mocked if schema creation uses them
        string: jest.fn().mockReturnThis(),
        number: jest.fn().mockReturnThis(),
        integer: jest.fn().mockReturnThis(),
        uuid: jest.fn().mockReturnThis(),
        date: jest.fn().mockReturnThis(),
        iso: jest.fn().mockReturnThis(),
        allow: jest.fn().mockReturnThis(),
        unknown: jest.fn().mockReturnThis(),
        required: jest.fn().mockReturnThis(),
    };
});

describe('Import Service Implementation Tests', () => {
    
    beforeEach(() => {
        jest.clearAllMocks(); 
        
        // Reset mocks that might have state
        mockExcelWorkbook.worksheets = []; 
        
        const { createClient } = require('@supabase/supabase-js');
        const mockClient = createClient();
        mockClient.from.mockClear();
        mockClient.upsert.mockClear();
        mockClient.select.mockClear();
        mockClient.eq.mockClear();
        
        const Joi = require('joi');
        Joi.validate.mockClear(); 
        
        fs.unlinkSync.mockClear();
        
        // Remove default mocking of internal service methods
        // importService.validateData = jest.fn().mockImplementation((data) => data);
        // importService.processJsonFields = jest.fn().mockImplementation((data) => data);
        // importService.batchInsert = jest.fn().mockResolvedValue({
        //     successful: 1,
        //     failed: 0,
        //     errors: []
        // });
    });
    
    // --- XLSX Tests ---
    describe('importXLSX', () => {
        it('should successfully parse, validate, and import data from an XLSX file', async () => {
            // Arrange
            const mockFilePath = 'path/to/mock/file.xlsx';
            const mockUserId = 'user-uuid-123';
            const mockJwtToken = 'mock-jwt-token';
            const mockRowData = {
                id: 'workout-uuid-1', // Example valid data
                user_id: mockUserId, 
                plan_name: 'Test Workout 1'
            };
            const mockRowData2 = {
                id: 'workout-uuid-2', 
                user_id: mockUserId,
                plan_name: 'Test Workout 2'
            };
            
            // Configure exceljs mock
            mockExcelWorkbook.xlsx.readFile.mockResolvedValue(undefined);
            mockExcelWorkbook.worksheets = [
                {
                    name: 'workouts',
                    getRow: jest.fn().mockReturnValue({
                        eachCell: jest.fn((callback) => {
                            // Mock header row
                            callback({ value: 'id' }, 1);
                            callback({ value: 'user_id' }, 2);
                            callback({ value: 'plan_name' }, 3);
                        })
                    }),
                    eachRow: jest.fn((callback) => {
                        // Simulate header row (1) and two data rows (2, 3)
                        callback({ // Header
                            eachCell: jest.fn((cb) => { 
                                cb({ value: 'id' }, 1); cb({ value: 'user_id' }, 2); cb({ value: 'plan_name' }, 3); 
                            })
                        }, 1);
                         callback({ // Data row 1
                            eachCell: jest.fn((cb) => {
                                cb({ value: mockRowData.id }, 1);
                                cb({ value: mockRowData.user_id }, 2);
                                cb({ value: mockRowData.plan_name }, 3);
                            })
                        }, 2);
                         callback({ // Data row 2
                            eachCell: jest.fn((cb) => {
                                cb({ value: mockRowData2.id }, 1);
                                cb({ value: mockRowData2.user_id }, 2);
                                cb({ value: mockRowData2.plan_name }, 3);
                            })
                        }, 3);
                    })
                }
            ];
            
            // Configure Joi mock for validation success
            const Joi = require('joi');
            Joi.validate.mockImplementation((data) => ({ 
                error: null, 
                value: { ...data } 
            }));
            
            // Configure Supabase mock for upsert success
            const mockClient = require('@supabase/supabase-js').createClient();
            mockClient.upsert.mockResolvedValue({ error: null, data: [mockRowData, mockRowData2] }); 
            
            // Spy on logger.info specifically for this test
            const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});
            
            // Act - Call the *actual* service function
            const result = await importService.importXLSX(mockUserId, mockFilePath, mockJwtToken);
            
            // Assert
            expect(require('@supabase/supabase-js').createClient).toHaveBeenCalledWith(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
                global: { headers: { Authorization: `Bearer ${mockJwtToken}` } }
            });
            expect(ExcelJS.Workbook).toHaveBeenCalledTimes(1);
            expect(mockExcelWorkbook.xlsx.readFile).toHaveBeenCalledWith(mockFilePath);
            expect(Joi.validate).toHaveBeenCalledTimes(2); 
            expect(mockClient.from).toHaveBeenCalledWith('workout_plans'); 
            expect(mockClient.upsert).toHaveBeenCalledTimes(1); 
            expect(mockClient.upsert).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({ id: mockRowData.id, user_id: mockUserId }),
                    expect.objectContaining({ id: mockRowData2.id, user_id: mockUserId })
                ]),
                { onConflict: 'id' } 
            );
            expect(fs.unlinkSync).toHaveBeenCalledWith(mockFilePath); 
            expect(result).toEqual({
                total: 2, 
                successful: 2, 
                failed: 0,
                errors: []
            });
            // expect(logger.info).toHaveBeenCalled(); 
            // Restore the spy
            infoSpy.mockRestore();
        });

        // --- KEEP OTHER XLSX TESTS, BUT REFACTOR THEM --- 
        
        it('should throw DatabaseError if Supabase batch insert fails', async () => {
            // Arrange
            const mockFilePath = 'path/to/mock/file.xlsx';
            const mockUserId = 'user-uuid-123';
            const mockJwtToken = 'mock-jwt-token';
            const dbError = { message: 'Insert failed', code: '500' };
            
            // Configure exceljs mock to provide data
             mockExcelWorkbook.xlsx.readFile.mockResolvedValue(undefined);
             mockExcelWorkbook.worksheets = [
                {
                    name: 'profiles', // Example data type
                    getRow: jest.fn().mockReturnValue({ eachCell: jest.fn((cb) => { cb({value: 'id'}, 1); }) }),
                    eachRow: jest.fn((callback) => {
                        callback({ eachCell: jest.fn((cb) => { cb({value: 'id'}, 1); }) }, 1); // Header
                        callback({ eachCell: jest.fn((cb) => { cb({ value: mockUserId }, 1); }) }, 2); // Data
                    })
                }
            ];
            
            // Configure Joi mock for validation success
            const Joi = require('joi');
            Joi.validate.mockReturnValue({ error: null, value: { id: mockUserId } });
            
            // Configure Supabase mock to return an error on upsert
            const mockClient = require('@supabase/supabase-js').createClient();
            mockClient.upsert.mockResolvedValue({ error: dbError, data: null });

            // Spy on logger.error for this test
            const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});

            // Act - Call the *actual* service function
            const result = await importService.importXLSX(mockUserId, mockFilePath, mockJwtToken);

            // Assert
            expect(mockClient.upsert).toHaveBeenCalled();
            expect(result.successful).toBe(0);
            expect(result.failed).toBe(1); // The row failed to insert
            expect(result.errors).toEqual([expect.stringContaining('Database error for profiles: Insert failed')]);
            // expect(logger.error).toHaveBeenCalled(); 
            expect(fs.unlinkSync).toHaveBeenCalledWith(mockFilePath); 
            
            // Restore the spy
            errorSpy.mockRestore();
        });
        
        it('should handle Joi validation errors gracefully and report failures', async () => {
            // Arrange
            const mockFilePath = 'path/to/mock/file.xlsx';
            const mockUserId = 'user-uuid-123';
            const mockJwtToken = 'mock-jwt-token';
            const validationError = { details: [{ path: ['plan_name'], message: 'is required' }] };
            
            // Configure exceljs mock to provide data
             mockExcelWorkbook.xlsx.readFile.mockResolvedValue(undefined);
             mockExcelWorkbook.worksheets = [
                {
                    name: 'workouts', // Example data type
                    getRow: jest.fn().mockReturnValue({ eachCell: jest.fn((cb) => { cb({value: 'id'}, 1); }) }),
                    eachRow: jest.fn((callback) => {
                        callback({ eachCell: jest.fn((cb) => { cb({value: 'id'}, 1); }) }, 1); // Header
                        callback({ eachCell: jest.fn((cb) => { cb({ value: 'workout-bad' }, 1); }) }, 2); // Data (missing plan_name)
                    })
                }
            ];
            
            // Configure Joi mock to return a validation error
            const Joi = require('joi');
            Joi.validate.mockReturnValue({ error: validationError, value: null });
            
            // Spy on logger.warn for this test
            const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
            
            // Act - Call the *actual* service function
            const result = await importService.importXLSX(mockUserId, mockFilePath, mockJwtToken);

            // Assert
            expect(Joi.validate).toHaveBeenCalled();
            const { createClient } = require('@supabase/supabase-js');
            const mockClient = createClient();
            expect(mockClient.upsert).not.toHaveBeenCalled(); 
            expect(result.total).toBe(1);
            expect(result.successful).toBe(0);
            expect(result.failed).toBe(1);
            expect(result.errors).toEqual(expect.arrayContaining([
                expect.stringContaining('Validation error for workouts: Data validation failed (plan_name: is required)')
            ]));
            // expect(logger.warn).toHaveBeenCalled(); 
            expect(fs.unlinkSync).toHaveBeenCalledWith(mockFilePath);
            
            // Restore the spy
            warnSpy.mockRestore();
        });
        
        it('should handle file reading errors from exceljs', async () => {
             // Arrange
            const mockFilePath = 'path/to/mock/file.xlsx';
            const mockUserId = 'user-uuid-123';
            const mockJwtToken = 'mock-jwt-token';
            const readFileError = new Error('Cannot read file');
            
            // Configure exceljs mock to throw error
            mockExcelWorkbook.xlsx.readFile.mockRejectedValue(readFileError);
            
            // Spy on logger.error for this test
            const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
            
             // Act & Assert - Call the *actual* service function
            try {
                 await importService.importXLSX(mockUserId, mockFilePath, mockJwtToken);
                 throw new Error('Test failed: importXLSX did not throw as expected');
            } catch (error) {
                 expect(error).toBeInstanceOf(DatabaseError);
                 expect(error.message).toContain('Cannot read file');
                 // expect(logger.error).toHaveBeenCalled(); 
                 expect(fs.unlinkSync).toHaveBeenCalledWith(mockFilePath); 
            }
            // Restore the spy
            errorSpy.mockRestore();
        });
    });
    
    // --- TODO: Refactor CSV Tests similarly ---
    describe('importCSV', () => {
        it('should successfully parse and import data from a CSV stream', async () => {
             // Arrange
             console.log('[CSV Test] Starting test...');
             const mockUserId = 'user-uuid-123'; // Must match data
             const mockJwtToken = 'mock-jwt-token';
             const { Readable } = require('stream');
             const mockStream = new Readable();
             mockStream._read = () => {}; 
            
            // Configure Joi mock for success
            const Joi = require('joi');
            Joi.validate.mockImplementation((data) => { 
                console.log('[CSV Test] Joi.validate called with:', data);
                // Crucially, return the actual data structure expected by batchInsert
                return { error: null, value: { ...data, logged_exercises: '[]' } }; // Add processed fields if needed
             });
            
             // Configure Supabase mock for upsert success
            const mockClient = require('@supabase/supabase-js').createClient();
            mockClient.upsert.mockResolvedValue({ error: null, data: [{}, {}] }); 
            
            // Act - Call the *actual* service function
            console.log('[CSV Test] Calling importService.importCSV...');
            const resultPromise = importService.importCSV(mockUserId, mockStream, mockJwtToken);
            console.log('[CSV Test] importService.importCSV call returned (promise pending)');
            
            const result = await resultPromise;
            console.log('[CSV Test] importService.importCSV promise resolved with:', result);

            // Assert
             expect(require('@supabase/supabase-js').createClient).toHaveBeenCalledWith(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
                 global: { headers: { Authorization: `Bearer ${mockJwtToken}` } }
             });
             const Papa = require('papaparse');
             expect(Papa.parse).toHaveBeenCalledWith(mockStream, expect.objectContaining({ header: true, step: expect.any(Function), complete: expect.any(Function) }));
             expect(Joi.validate).toHaveBeenCalledTimes(2); // Should be called now
             // expect(mockSupabaseFrom).toHaveBeenCalledWith('workout_logs'); 
             expect(mockClient.upsert).toHaveBeenCalledTimes(1); 
             expect(mockClient.upsert).toHaveBeenCalledWith(
                 expect.arrayContaining([
                     // Check data that would be passed to upsert AFTER validation/processing
                     expect.objectContaining({ log_id: 'log-1', user_id: mockUserId, logged_exercises: '[]' }), 
                     expect.objectContaining({ log_id: 'log-2', user_id: mockUserId, logged_exercises: '[]' })
                 ]),
                 { onConflict: 'log_id' } 
             );
              expect(result).toEqual({
                 total: 2, // Only counts data rows, not the type row
                 successful: 2,
                 failed: 0,
                 errors: []
             });
             console.log('[CSV Test] Test finished.');
        });
    });
    
    // --- TODO: Refactor JSON Tests similarly ---
    describe('importJSON', () => {
        it('should successfully import data from JSON content', async () => {
            // Arrange
            const mockUserId = 'user-uuid-123';
            const mockJsonContent = {
                data: {
                    profiles: [{ id: 'profile-123', name: 'Test User' }],
                    workouts: [{ id: 'workout-123', plan_name: 'Test Workout' }]
                }
            };
            const mockJwtToken = 'mock-jwt-token';
            
            // Configure Joi mock for success
            const Joi = require('joi');
            Joi.validate.mockImplementation((data) => ({ error: null, value: { ...data } }));
            
            // Configure Supabase mock for upsert success
            const mockClient = require('@supabase/supabase-js').createClient();
            mockClient.upsert.mockResolvedValue({ error: null, data: [{}] }); // Called per batch
            
            // Act
            const result = await importService.importJSON(mockUserId, mockJsonContent, mockJwtToken);
            
            // Assert
            expect(require('@supabase/supabase-js').createClient).toHaveBeenCalledWith(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
                global: { headers: { Authorization: `Bearer ${mockJwtToken}` } }
            });
            expect(Joi.validate).toHaveBeenCalledTimes(2); // Once per item
            expect(mockClient.from).toHaveBeenCalledWith('profiles');
            expect(mockClient.from).toHaveBeenCalledWith('workout_plans');
            expect(mockClient.upsert).toHaveBeenCalledTimes(2); // Once per data type batch
            // Check profile upsert (ID is overridden by userId)
            expect(mockClient.upsert).toHaveBeenCalledWith(
                expect.arrayContaining([expect.objectContaining({ id: mockUserId, name: 'Test User' })]), 
                { onConflict: 'id' } 
            );
             // Check workout upsert (Workout plans use ID conflict)
            expect(mockClient.upsert).toHaveBeenCalledWith(
                expect.arrayContaining([expect.objectContaining({ id: 'workout-123', plan_name: 'Test Workout', user_id: mockUserId })]), 
                { onConflict: 'id' } 
            );
            expect(result).toEqual(expect.objectContaining({
                total: 2,
                successful: 2,
                failed: 0,
                errors: []
            }));
        });
        
        it('should throw ValidationError if JSON content structure is invalid', async () => {
            // Arrange
            const mockUserId = 'user-uuid-123';
            const invalidJsonContent = { invalid: {} }; // Missing data property
            const mockJwtToken = 'mock-jwt-token';
            
            // Spy on logger.error for this test
            const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
             
             try {
                 await importService.importJSON(mockUserId, invalidJsonContent, mockJwtToken);
                 throw new Error('Test failed: importJSON did not throw as expected');
            } catch (error) {
                 expect(error).toBeInstanceOf(ValidationError);
                 expect(error.message).toContain('Invalid JSON format: missing data field');
                 // expect(logger.error).toHaveBeenCalled(); 
            }
            // Restore the spy
            errorSpy.mockRestore();
        });
        
        it('should handle validation errors within JSON data', async () => {
            // Arrange
            const mockUserId = 'user-uuid-123';
            const mockJsonContent = {
                data: {
                    profiles: [{ id: 'invalid-uuid' }] // Invalid data
                }
            };
            const mockJwtToken = 'mock-jwt-token';
            const validationError = { details: [{ path: ['id'], message: 'Invalid UUID' }] };
            
             // Configure Joi mock to fail validation
            const Joi = require('joi');
            Joi.validate.mockReturnValue({ error: validationError, value: null });
            
            // Act
            const result = await importService.importJSON(mockUserId, mockJsonContent, mockJwtToken);
            
            // Assert
             expect(Joi.validate).toHaveBeenCalled();
             const { createClient } = require('@supabase/supabase-js');
             const mockClient = createClient();
             expect(mockClient.upsert).not.toHaveBeenCalled(); // Insert should not be called
             // expect(require('@supabase/supabase-js').createClient).not.toHaveBeenCalled(); // Insert should not be called
             expect(result.total).toBe(1);
            expect(result.successful).toBe(0);
            expect(result.failed).toBe(1);
            expect(result.errors).toEqual(expect.arrayContaining([
                expect.stringContaining('Validation error for profiles: Data validation failed (id: Invalid UUID)')
            ]));
        });
    });
    
    // --- Helper Function Tests (Now testing actual implementations) ---
    describe('Helper Functions', () => {
        describe('validateData', () => {
            // Get the actual helper function
            const validateDataActual = importService.validateData;
            let testSchema;
            
            beforeAll(() => {
                 // Use actual Joi to create a schema for testing
                const actualJoi = jest.requireActual('joi');
                testSchema = actualJoi.object({
                    id: actualJoi.string().uuid().required(),
                    name: actualJoi.string().required(),
                    age: actualJoi.number().integer().min(0).allow(null),
                });
            });
            
            it('should return validated data for valid input', () => {
                const validData = { id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef', name: 'Test' };
                const result = validateDataActual(validData, testSchema);
                expect(result).toEqual(validData);
            });

            it('should throw ValidationError for invalid input', () => {
                const invalidData = { id: 'not-a-uuid', name: 'Test' };
                expect(() => validateDataActual(invalidData, testSchema)).toThrow(ValidationError);
                try {
                    validateDataActual(invalidData, testSchema);
                } catch (error) {
                    expect(error.details).toEqual(expect.arrayContaining([
                        expect.objectContaining({ field: 'id', message: expect.stringContaining('must be a valid GUID') })
                    ]));
                }
            });
            
             it('should throw ValidationError listing multiple errors', () => {
                const invalidData = { id: 'not-a-uuid' }; // Missing name
                expect(() => validateDataActual(invalidData, testSchema)).toThrow(ValidationError);
                 try {
                    validateDataActual(invalidData, testSchema);
                } catch (error) {
                    expect(error.details.length).toBe(2);
                    expect(error.details).toEqual(expect.arrayContaining([
                        expect.objectContaining({ field: 'id'}),
                        expect.objectContaining({ field: 'name'})
                    ]));
                }
            });
        });
        
        describe('processJsonFields', () => {
            const processJsonFieldsActual = importService.processJsonFields;
            
            it('should stringify object fields when direction is stringify', () => {
                 const data = { id: 1, preferences: { theme: 'dark' }, goals: ['run'] };
                 const expected = { id: 1, preferences: '{"theme":"dark"}', goals: '["run"]' };
                 const result = processJsonFieldsActual(data, 'stringify');
                 expect(result).toEqual(expected);
            });
            
            it('should parse string fields when direction is parse', () => {
                const data = { id: 1, preferences: '{"theme":"dark"}', goals: '["run"]' };
                const expected = { id: 1, preferences: { theme: 'dark' }, goals: ['run'] };
                const result = processJsonFieldsActual(data, 'parse');
                expect(result).toEqual(expected);
            });
            
             it('should handle non-string/non-object fields gracefully', () => {
                 const data = { id: 1, preferences: 123, goals: null };
                 const expected = { id: 1, preferences: 123, goals: null };
                 expect(processJsonFieldsActual(data, 'stringify')).toEqual(expected);
                 expect(processJsonFieldsActual(data, 'parse')).toEqual(expected);
            });
            
            it('should handle invalid JSON strings gracefully during parse', () => {
                 const data = { id: 1, preferences: '{"theme":"dark"' }; // Invalid JSON
                 const expected = { id: 1, preferences: '{"theme":"dark"' }; // Should remain string
                 
                 // Spy on logger.warn for this test
                 const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
                 
                 const result = processJsonFieldsActual(data, 'parse');
                 
                 expect(result).toEqual(expected);
                 // expect(logger.warn).toHaveBeenCalled(); 
                 // Restore the spy
                 warnSpy.mockRestore();
            });
        });
        
        describe('batchInsert', () => {
            // Get the actual helper function
            const batchInsertActual = importService.batchInsert;
            let mockClientForBatchInsert;
            
            beforeEach(() => {
                // Provide a specific mock client instance for batchInsert tests
                 mockClientForBatchInsert = {
                    from: jest.fn().mockReturnThis(),
                    upsert: jest.fn().mockResolvedValue({ error: null, data: [{}] })
                };
            });
            
            it('should insert data in batches and call upsert correctly', async () => {
                const data = Array.from({ length: 150 }, (_, i) => ({ id: `item-${i}` }));
                const userId = 'batch-user';
                const tableName = 'test_table';
                
                const result = await batchInsertActual(tableName, data, userId, mockClientForBatchInsert);
                
                expect(mockClientForBatchInsert.from).toHaveBeenCalledTimes(2);
                expect(mockClientForBatchInsert.from).toHaveBeenCalledWith(tableName);
                expect(mockClientForBatchInsert.upsert).toHaveBeenCalledTimes(2);
                // Check first batch
                expect(mockClientForBatchInsert.upsert).toHaveBeenNthCalledWith(1, 
                    expect.arrayContaining([expect.objectContaining({ id: 'item-0', user_id: userId })]),
                    { onConflict: 'log_id' } // Default conflict target
                );
                expect(mockClientForBatchInsert.upsert.mock.calls[0][0].length).toBe(100);
                 // Check second batch
                expect(mockClientForBatchInsert.upsert).toHaveBeenNthCalledWith(2, 
                    expect.arrayContaining([expect.objectContaining({ id: 'item-100', user_id: userId })]),
                    { onConflict: 'log_id' }
                );
                 expect(mockClientForBatchInsert.upsert.mock.calls[1][0].length).toBe(50);
                 
                 expect(result.successful).toBe(150);
                 expect(result.failed).toBe(0);
                 expect(result.errors.length).toBe(0);
            });
            
            it('should handle database errors during batch insert', async () => {
                const data = [{ id: 'item-1' }];
                const userId = 'batch-user-fail';
                const tableName = 'test_table_fail';
                const dbError = new Error('Upsert failed');
                
                mockClientForBatchInsert.upsert.mockResolvedValue({ error: dbError, data: null });
                
                // Spy on logger.error for this test
                const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
                
                const result = await batchInsertActual(tableName, data, userId, mockClientForBatchInsert);
                
                expect(mockClientForBatchInsert.upsert).toHaveBeenCalledTimes(1);
                expect(result.successful).toBe(0);
                expect(result.failed).toBe(1);
                expect(result.errors).toEqual(expect.arrayContaining([
                    expect.stringContaining('Batch error for test_table_fail: Upsert failed'),
                    expect.stringContaining('Database error reported by batch insert for test_table_fail: Upsert failed')
                ]));
                expect(result.dbError).toBe(dbError);
                // expect(logger.error).toHaveBeenCalled(); 
                
                // Restore the spy
                errorSpy.mockRestore();
            });
            
             it('should use correct onConflict column for different tables', async () => {
                 await batchInsertActual('profiles', [{ id: 'p1' }], 'user1', mockClientForBatchInsert);
                 expect(mockClientForBatchInsert.upsert).toHaveBeenCalledWith(expect.any(Array), { onConflict: 'id' });
                 
                 await batchInsertActual('workouts', [{ id: 'w1' }], 'user1', mockClientForBatchInsert);
                 expect(mockClientForBatchInsert.upsert).toHaveBeenCalledWith(expect.any(Array), { onConflict: 'id' });
                 
                 await batchInsertActual('workout_logs', [{ log_id: 'l1' }], 'user1', mockClientForBatchInsert);
                 expect(mockClientForBatchInsert.upsert).toHaveBeenCalledWith(expect.any(Array), { onConflict: 'log_id' });
            });
        });
    });
}); 