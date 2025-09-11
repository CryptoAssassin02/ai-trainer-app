/**
 * @jest-environment node
 */
// const { createClient } = require('@supabase/supabase-js'); // Not needed directly in test
// const jwt = require('jsonwebtoken'); // Not needed directly in test

// Mock return values
const MOCK_SUPABASE_URL = 'http://mock-supabase.co';
const MOCK_SUPABASE_ANON_KEY = 'mock-anon-key';
const mockSupabaseClientInstance = { 
    from: jest.fn().mockReturnThis(), 
    select: jest.fn(),
    // Add other chained methods if needed by the service functions being tested indirectly
};

// Mock pg client and pool needed for rawQuery tests
const mockPgClient = {
    query: jest.fn().mockResolvedValue({ rows: [] }), // Default mock implementation
    release: jest.fn(),
};
const mockPgPool = {
    connect: jest.fn().mockResolvedValue(mockPgClient), // Default mock implementation
    end: jest.fn(),
};

// --- Mocks (Apply BEFORE describe block) ---

// Mock pg FIRST to ensure it's mocked before any other module might require it
jest.mock('pg', () => ({
    Pool: jest.fn(() => mockPgPool)
}));

// Mock logger first (as config/index might depend on it)
jest.doMock('../../utils/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    // Add other methods if used
}));

// Mock config/index
jest.doMock('../../config/index.js', () => ({
    env: {
        nodeEnv: 'test',
        env: 'test', // Add the env property used by the service
        supabase: {
             url: MOCK_SUPABASE_URL,
             anonKey: MOCK_SUPABASE_ANON_KEY,
             serviceRoleKey: 'mock-service-key',
             databaseUrl: 'postgresql://mock:mock@valid-mock-host.com:5432/postgres' // Add mock DB URL
        }
        // Add other env parts if needed by config/supabase
    },
    // Provide the mocked logger instance
    logger: require('../../utils/logger'), 
}));

// Mock config/supabase
jest.doMock('../../config/supabase', () => ({
    createSupabaseClient: jest.fn(() => mockSupabaseClientInstance), // Default mock implementation
    isTest: jest.fn(() => true), // Default to test environment
}));

// --- Test Suite ---

describe('Supabase Client Service Implementation Tests', () => {

    let supabaseService;
    let supabaseConfigMock; // Reference to the mocked config/supabase module
    let loggerMock; // Reference to the mocked logger
    let mockEnvRef; // Reference to the mocked env
    let Pool; // Variable to hold the actual Pool constructor IF needed
    let pgPoolInstanceMock; // Variable to hold the instance returned by the real Pool

    beforeEach(() => {
        jest.resetModules();
        // Re-require modules AFTER resetting and AFTER mocks are defined
        supabaseService = require('../../services/supabase');
        supabaseConfigMock = require('../../config/supabase');
        loggerMock = require('../../utils/logger');
        mockEnvRef = require('../../config/index.js').env; // Get reference to mocked env
        Pool = require('pg').Pool; // Get the mocked Pool constructor

        jest.clearAllMocks();

        // Reset default mock implementations (important after resetModules)
        supabaseConfigMock.createSupabaseClient.mockReturnValue(mockSupabaseClientInstance);
        supabaseConfigMock.isTest.mockReturnValue(true);

        // Reset our separate mock objects for assertion checking
        mockPgClient.query.mockClear().mockResolvedValue({ rows: [] }); // Reset query mock
        mockPgClient.release.mockClear();
        mockPgPool.connect.mockClear().mockResolvedValue(mockPgClient); // Reset pool mocks too
        mockPgPool.end.mockClear();
        // Reset the Pool constructor mock itself
        Pool.mockClear(); 
        Pool.mockReturnValue(mockPgPool); // Ensure it returns the mock pool instance

        // Reset internal service state
        supabaseService._resetForTests(); 
    });

    // --- getSupabaseClient Tests ---
    describe('getSupabaseClient', () => {
        it('should initialize and return the client successfully', () => {
            const client = supabaseService.getSupabaseClient();
            expect(client).toBe(mockSupabaseClientInstance);
            expect(supabaseConfigMock.createSupabaseClient).toHaveBeenCalledTimes(1);
            // Verify the call to the HELPER in config/supabase
            expect(supabaseConfigMock.createSupabaseClient).toHaveBeenCalledWith(mockEnvRef, loggerMock, 'test', false);
            expect(loggerMock.info).toHaveBeenCalledWith('Initializing Supabase client');
            expect(loggerMock.info).toHaveBeenCalledWith('Supabase client initialized successfully');
        });

        it('should call createSupabaseClient helper with correct args', () => {
            supabaseService.getSupabaseClient();
            expect(supabaseConfigMock.createSupabaseClient).toHaveBeenCalledWith(mockEnvRef, loggerMock, 'test', false);
        });

        it('should return the existing instance on subsequent calls (singleton)', () => {
            const client1 = supabaseService.getSupabaseClient();
            expect(supabaseConfigMock.createSupabaseClient).toHaveBeenCalledTimes(1);
            loggerMock.info.mockClear(); // Clear calls before second check

            const client2 = supabaseService.getSupabaseClient();
            expect(client2).toBe(client1); // Key check for singleton
            expect(supabaseConfigMock.createSupabaseClient).toHaveBeenCalledTimes(1); // No second call
            expect(loggerMock.info).not.toHaveBeenCalledWith('Initializing Supabase client');
        });

        it('should re-initialize if called after _resetForTests', () => {
            supabaseService.getSupabaseClient(); // Call 1
            expect(supabaseConfigMock.createSupabaseClient).toHaveBeenCalledTimes(1);
            loggerMock.info.mockClear();

            supabaseService._resetForTests(); // Reset internal singleton

            const client2 = supabaseService.getSupabaseClient(); // Call 2 (should init again)
            expect(client2).toBe(mockSupabaseClientInstance);
            // Called again because singleton was reset
            expect(supabaseConfigMock.createSupabaseClient).toHaveBeenCalledTimes(2); 
            expect(loggerMock.info).toHaveBeenCalledWith('Initializing Supabase client');
        });

        it('should throw error if createSupabaseClient helper fails', () => {
            const initError = new Error('Config helper failed');
            supabaseConfigMock.createSupabaseClient.mockImplementation(() => {
                throw initError;
            });

            expect(() => supabaseService.getSupabaseClient()).toThrow('Failed to initialize database connection');
            expect(loggerMock.error).toHaveBeenCalledWith('Failed to initialize Supabase client:', initError);
        });
    });

     // --- getSupabaseAdminClient Tests ---
    describe('getSupabaseAdminClient', () => {
         it('should be defined', () => {
             expect(supabaseService.getSupabaseAdminClient).toBeDefined();
        });

        it('should initialize and return the admin client successfully', () => {
            const client = supabaseService.getSupabaseAdminClient();
            expect(client).toBe(mockSupabaseClientInstance);
            expect(supabaseConfigMock.createSupabaseClient).toHaveBeenCalledTimes(1);
             // Verify the call to the HELPER in config/supabase
            expect(supabaseConfigMock.createSupabaseClient).toHaveBeenCalledWith(mockEnvRef, loggerMock, 'test', true);
            expect(loggerMock.info).toHaveBeenCalledWith('Initializing Supabase admin client');
            expect(loggerMock.info).toHaveBeenCalledWith('Supabase admin client initialized successfully');
        });

        it('should return the existing admin instance on subsequent calls (singleton)', () => {
            const client1 = supabaseService.getSupabaseAdminClient();
            expect(supabaseConfigMock.createSupabaseClient).toHaveBeenCalledTimes(1);
            loggerMock.info.mockClear();

            const client2 = supabaseService.getSupabaseAdminClient();
            expect(client2).toBe(client1);
            expect(supabaseConfigMock.createSupabaseClient).toHaveBeenCalledTimes(1);
            expect(loggerMock.info).not.toHaveBeenCalledWith('Initializing Supabase admin client');
        });

        it('should throw error if createSupabaseClient helper fails for admin', () => {
            const initError = new Error('Admin Config helper failed');
            supabaseConfigMock.createSupabaseClient.mockImplementation(() => {
                throw initError;
            });

            expect(() => supabaseService.getSupabaseAdminClient()).toThrow('Failed to initialize admin database connection');
            expect(loggerMock.error).toHaveBeenCalledWith('Failed to initialize Supabase admin client:', initError);
        });

        it('should reset singletons when _resetForTests is called', () => {
            supabaseService.getSupabaseClient();       // call 1
            supabaseService.getSupabaseAdminClient();  // call 2
            expect(supabaseConfigMock.createSupabaseClient).toHaveBeenCalledTimes(2);

            supabaseService._resetForTests(); // Reset

            supabaseService.getSupabaseClient();       // call 3
            supabaseService.getSupabaseAdminClient();  // call 4

            // Should be called 4 times total because reset cleared singletons
            expect(supabaseConfigMock.createSupabaseClient).toHaveBeenCalledTimes(4);
        });
    });

    // --- query Tests ---
    describe('query', () => {
        const MOCK_TABLE = 'test_table';
        const mockData = [{ id: 1, col: 'a' }, { id: 2, col: 'b' }];
        let mockQueryBuilder;

        beforeEach(() => {
            // Reset the mock query builder chain before each query test
            mockQueryBuilder = {
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                order: jest.fn().mockReturnThis(),
                range: jest.fn().mockResolvedValue({ data: mockData, error: null }), // Default success
            };
            // Ensure mockSupabaseClientInstance.from() returns this specific mock builder
            mockSupabaseClientInstance.from.mockReturnValue(mockQueryBuilder);
        });

        it('should call select * from the specified table', async () => {
            await supabaseService.query(MOCK_TABLE);
            expect(mockSupabaseClientInstance.from).toHaveBeenCalledWith(MOCK_TABLE);
            expect(mockQueryBuilder.select).toHaveBeenCalledWith('*');
            expect(mockQueryBuilder.range).toHaveBeenCalledWith(0, 99); // Default limit=100 -> range(0, 99)
        });

        it('should apply limit and offset correctly', async () => {
            await supabaseService.query(MOCK_TABLE, { limit: 10, offset: 5 });
            expect(mockQueryBuilder.range).toHaveBeenCalledWith(5, 14); // offset 5, limit 10 -> range(5, 14)
        });

        it('should apply filters correctly', async () => {
            const filters = { column_a: 'value1', column_b: 123 };
            await supabaseService.query(MOCK_TABLE, { filters });
            expect(mockQueryBuilder.eq).toHaveBeenCalledWith('column_a', 'value1');
            expect(mockQueryBuilder.eq).toHaveBeenCalledWith('column_b', 123);
            expect(mockQueryBuilder.eq).toHaveBeenCalledTimes(2);
        });

        it('should apply ordering correctly (ascending)', async () => {
            await supabaseService.query(MOCK_TABLE, { orderBy: 'created_at', ascending: true });
            expect(mockQueryBuilder.order).toHaveBeenCalledWith('created_at', { ascending: true });
        });

        it('should apply ordering correctly (descending)', async () => {
            await supabaseService.query(MOCK_TABLE, { orderBy: 'updated_at', ascending: false });
            expect(mockQueryBuilder.order).toHaveBeenCalledWith('updated_at', { ascending: false });
        });

        it('should return data on successful query', async () => {
            const result = await supabaseService.query(MOCK_TABLE);
            expect(result).toEqual(mockData);
        });

        it('should throw standardized error on database failure', async () => {
            const dbError = new Error('DB read failed');
            dbError.code = 'XXYYY'; // Example code
            // Simulate error from the final step in the query chain
            mockQueryBuilder.range.mockRejectedValue(dbError);

            await expect(supabaseService.query(MOCK_TABLE)).rejects.toMatchObject({
                message: 'DB read failed', // Original message might be preserved or wrapped
                code: 'XXYYY',
                status: 500, // Default status added by handler
                retryable: true // Because status 500 is retryable
            });
            expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining('Supabase error during Query on test_table'), dbError);
        });

        it('should retry on retryable errors and eventually succeed', async () => {
            jest.useFakeTimers();
            const retryableError = new Error('Temporary network issue');
            retryableError.status = 503; // Retryable status code
            retryableError.retryable = true; // Set by handleSupabaseError

            // Fail twice, then succeed
            mockQueryBuilder.range
                .mockRejectedValueOnce(retryableError)
                .mockRejectedValueOnce(retryableError)
                .mockResolvedValue({ data: mockData, error: null });

            const promise = supabaseService.query(MOCK_TABLE);

            // Advance timers past the delays (1s, then 2s)
            await jest.advanceTimersByTimeAsync(1000 + 50); // 1st delay + buffer
            await jest.advanceTimersByTimeAsync(2000 + 50); // 2nd delay + buffer

            await expect(promise).resolves.toEqual(mockData);
            expect(mockQueryBuilder.range).toHaveBeenCalledTimes(3);
            expect(loggerMock.warn).toHaveBeenCalledWith(expect.stringContaining('Retry attempt 1/3 for Query on test_table in 1000ms'));
            expect(loggerMock.warn).toHaveBeenCalledWith(expect.stringContaining('Retry attempt 2/3 for Query on test_table in 2000ms'));
            expect(loggerMock.error).not.toHaveBeenCalledWith(expect.stringContaining('All retry attempts failed'));

            jest.useRealTimers();
        });

         it('should throw error after max retries', async () => {
            // jest.useFakeTimers(); // REMOVE FAKE TIMERS
            const retryableError = new Error('Persistent connection error');
            retryableError.status = 500; 
            // handleSupabaseError will mark it retryable

            // Fail all three times
            mockQueryBuilder.range.mockRejectedValue(retryableError);

            try {
                // This await will now take ~3 seconds due to real delays
                await supabaseService.query(MOCK_TABLE);
                throw new Error('Promise should have rejected but resolved.');
            } catch (error) {
                expect(error).toBeDefined();
                expect(error.message).toBe('Persistent connection error');
                expect(error.status).toBe(500);
                expect(error.retryable).toBe(true);
                expect(error.code).toBe('SUPABASE_ERROR');
            }

            // Verify mock calls - should still be 3 attempts
            expect(mockQueryBuilder.range).toHaveBeenCalledTimes(3);
            expect(loggerMock.warn).toHaveBeenCalledTimes(2);
            expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining('All retry attempts failed for Query on test_table'));

            // jest.useRealTimers(); // REMOVE FAKE TIMERS
        }, 10000); // Keep increased timeout

        it('should use admin client if useAdmin is true', async () => {
            // Reset the call count for the underlying factory
            supabaseConfigMock.createSupabaseClient.mockClear();
            
            await supabaseService.query(MOCK_TABLE, {}, true); // useAdmin = true

            // Verify the underlying createSupabaseClient was called with useServiceRole=true
            // This confirms getSupabaseAdminClient was used internally
            expect(supabaseConfigMock.createSupabaseClient).toHaveBeenCalledTimes(1);
            expect(supabaseConfigMock.createSupabaseClient).toHaveBeenCalledWith(mockEnvRef, loggerMock, 'test', true);
            
            // Ensure the normal client wasn't initialized in this call (it might have been by previous tests)
            // We can check the specific call args rather than just not.toHaveBeenCalled()
            const calls = supabaseConfigMock.createSupabaseClient.mock.calls;
            const adminCall = calls.find(call => call[3] === true); // Find call where useServiceRole is true
            expect(adminCall).toBeDefined();

            // Ensure the mocked client methods were still called via the admin instance path
            expect(mockSupabaseClientInstance.from).toHaveBeenCalledWith(MOCK_TABLE);
            expect(mockQueryBuilder.select).toHaveBeenCalledWith('*');
        });

    });

    // --- getById Tests ---
    describe('getById', () => {
        const MOCK_TABLE = 'items';
        const MOCK_ID = 'item-123';
        const mockSingleItem = { id: MOCK_ID, name: 'Test Item' };
        let mockGetByIdBuilder;

        beforeEach(() => {
            mockGetByIdBuilder = {
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({ data: mockSingleItem, error: null }) // Default success
            };
            mockSupabaseClientInstance.from.mockReturnValue(mockGetByIdBuilder);
        });

        it('should call from, select, eq, and single with correct args', async () => {
            await supabaseService.getById(MOCK_TABLE, MOCK_ID);
            expect(mockSupabaseClientInstance.from).toHaveBeenCalledWith(MOCK_TABLE);
            expect(mockGetByIdBuilder.select).toHaveBeenCalledWith('*');
            expect(mockGetByIdBuilder.eq).toHaveBeenCalledWith('id', MOCK_ID);
            expect(mockGetByIdBuilder.single).toHaveBeenCalledTimes(1);
        });

        it('should return the item on success', async () => {
            const result = await supabaseService.getById(MOCK_TABLE, MOCK_ID);
            expect(result).toEqual(mockSingleItem);
        });

        it('should return null if item not found (PGRST116)', async () => {
            const notFoundError = new Error('No rows found');
            notFoundError.code = 'PGRST116';
            mockGetByIdBuilder.single.mockResolvedValue({ data: null, error: notFoundError });

            const result = await supabaseService.getById(MOCK_TABLE, MOCK_ID);
            expect(result).toBeNull();
        });

        it('should throw standardized error for other database errors', async () => {
            const dbError = new Error('Something went wrong');
            dbError.status = 500;
            mockGetByIdBuilder.single.mockResolvedValue({ data: null, error: dbError });

            await expect(supabaseService.getById(MOCK_TABLE, MOCK_ID)).rejects.toMatchObject({
                message: 'Something went wrong',
                status: 500,
                retryable: true // Status 500 is retryable
            });
             expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining('Supabase error during GetById on items'), dbError);
        });

        it('should use admin client if useAdmin is true', async () => {
            supabaseConfigMock.createSupabaseClient.mockClear(); // Clear calls
            await supabaseService.getById(MOCK_TABLE, MOCK_ID, true);
            expect(supabaseConfigMock.createSupabaseClient).toHaveBeenCalledTimes(1); 
            expect(supabaseConfigMock.createSupabaseClient).toHaveBeenCalledWith(mockEnvRef, loggerMock, 'test', true);
            // Verify the chain was still called on the instance returned by the admin path
            expect(mockSupabaseClientInstance.from).toHaveBeenCalledWith(MOCK_TABLE);
            expect(mockGetByIdBuilder.single).toHaveBeenCalledTimes(1);
        });

    });

    // --- insert Tests ---
    describe('insert', () => {
        const MOCK_TABLE = 'widgets';
        const singleRecord = { name: 'Widget A', value: 100 };
        const multipleRecords = [
            { name: 'Widget B', value: 200 },
            { name: 'Widget C', value: 300 },
        ];
        const mockInsertedData = [{ id: 'new-id-1', ...singleRecord }];
        const mockMultiInsertedData = [
            { id: 'new-id-2', ...multipleRecords[0] },
            { id: 'new-id-3', ...multipleRecords[1] },
        ];
        let mockInsertBuilder;

        beforeEach(() => {
            mockInsertBuilder = {
                insert: jest.fn().mockReturnThis(),
                select: jest.fn().mockResolvedValue({ data: mockInsertedData, error: null }), // Default success
            };
            mockSupabaseClientInstance.from.mockReturnValue(mockInsertBuilder);
        });

        it('should call from, insert, and select for a single record', async () => {
            await supabaseService.insert(MOCK_TABLE, singleRecord);
            expect(mockSupabaseClientInstance.from).toHaveBeenCalledWith(MOCK_TABLE);
            expect(mockInsertBuilder.insert).toHaveBeenCalledWith([singleRecord]); // Ensures it wraps single record in array
            expect(mockInsertBuilder.select).toHaveBeenCalledTimes(1);
        });

        it('should call from, insert, and select for multiple records', async () => {
             mockInsertBuilder.select.mockResolvedValue({ data: mockMultiInsertedData, error: null });
            await supabaseService.insert(MOCK_TABLE, multipleRecords);
            expect(mockSupabaseClientInstance.from).toHaveBeenCalledWith(MOCK_TABLE);
            expect(mockInsertBuilder.insert).toHaveBeenCalledWith(multipleRecords);
            expect(mockInsertBuilder.select).toHaveBeenCalledTimes(1);
        });

        it('should return inserted data on success (single)', async () => {
            const result = await supabaseService.insert(MOCK_TABLE, singleRecord);
            expect(result).toEqual(mockInsertedData);
        });

        it('should return inserted data on success (multiple)', async () => {
            mockInsertBuilder.select.mockResolvedValue({ data: mockMultiInsertedData, error: null });
            const result = await supabaseService.insert(MOCK_TABLE, multipleRecords);
            expect(result).toEqual(mockMultiInsertedData);
        });

        it('should throw error if no records are provided', async () => {
            await expect(supabaseService.insert(MOCK_TABLE, [])).rejects.toThrow('No records provided for insert operation');
            await expect(supabaseService.insert(MOCK_TABLE)).rejects.toThrow('No records provided for insert operation'); // Test undefined
        });

        it('should throw standardized error on database insert failure', async () => {
            const dbError = new Error('Insert failed - constraint violation');
            dbError.status = 409; // Example status
            mockInsertBuilder.select.mockResolvedValue({ data: null, error: dbError }); // Error on select after insert

            await expect(supabaseService.insert(MOCK_TABLE, singleRecord)).rejects.toMatchObject({
                message: 'Insert failed - constraint violation',
                status: 409,
                retryable: false // 409 is typically not retryable
            });
            expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining('Supabase error during Insert into widgets'), dbError);
        });
        
         it('should use admin client if useAdmin is true', async () => {
            supabaseConfigMock.createSupabaseClient.mockClear();
            await supabaseService.insert(MOCK_TABLE, singleRecord, true);
            expect(supabaseConfigMock.createSupabaseClient).toHaveBeenCalledTimes(1);
            expect(supabaseConfigMock.createSupabaseClient).toHaveBeenCalledWith(mockEnvRef, loggerMock, 'test', true);
            expect(mockSupabaseClientInstance.from).toHaveBeenCalledWith(MOCK_TABLE);
            expect(mockInsertBuilder.insert).toHaveBeenCalledTimes(1);
        });

    });

    // --- update Tests ---
    describe('update', () => {
        const MOCK_TABLE = 'products';
        const MOCK_ID = 'prod-456';
        const updates = { price: 99.99, status: 'active' };
        const mockUpdatedData = { id: MOCK_ID, name: 'Old Product', ...updates };
        let mockUpdateBuilder;

        beforeEach(() => {
            mockUpdateBuilder = {
                update: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({ data: mockUpdatedData, error: null }) // Default success
            };
            mockSupabaseClientInstance.from.mockReturnValue(mockUpdateBuilder);
        });

        it('should call from, update, eq, select, and single with correct args', async () => {
            await supabaseService.update(MOCK_TABLE, MOCK_ID, updates);
            expect(mockSupabaseClientInstance.from).toHaveBeenCalledWith(MOCK_TABLE);
            expect(mockUpdateBuilder.update).toHaveBeenCalledWith(updates);
            expect(mockUpdateBuilder.eq).toHaveBeenCalledWith('id', MOCK_ID);
            expect(mockUpdateBuilder.select).toHaveBeenCalledTimes(1);
            expect(mockUpdateBuilder.single).toHaveBeenCalledTimes(1);
        });

        it('should return updated data on success', async () => {
            const result = await supabaseService.update(MOCK_TABLE, MOCK_ID, updates);
            expect(result).toEqual(mockUpdatedData);
        });

        it('should throw error if ID is not provided', async () => {
            await expect(supabaseService.update(MOCK_TABLE, null, updates)).rejects.toThrow('ID is required for update operation');
            await expect(supabaseService.update(MOCK_TABLE, undefined, updates)).rejects.toThrow('ID is required for update operation');
        });

        it('should throw error if updates object is missing or empty', async () => {
            await expect(supabaseService.update(MOCK_TABLE, MOCK_ID, null)).rejects.toThrow('No update data provided');
            await expect(supabaseService.update(MOCK_TABLE, MOCK_ID, {})).rejects.toThrow('No update data provided');
        });

        it('should throw standardized error on database update failure', async () => {
            const dbError = new Error('Update conflict');
            dbError.status = 409;
            mockUpdateBuilder.single.mockResolvedValue({ data: null, error: dbError });

            await expect(supabaseService.update(MOCK_TABLE, MOCK_ID, updates)).rejects.toMatchObject({
                message: 'Update conflict',
                status: 409,
                retryable: false // 409 not retryable
            });
             expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining('Supabase error during Update in products'), dbError);
        });
        
        it('should use admin client if useAdmin is true', async () => {
            supabaseConfigMock.createSupabaseClient.mockClear();
            await supabaseService.update(MOCK_TABLE, MOCK_ID, updates, true);
            expect(supabaseConfigMock.createSupabaseClient).toHaveBeenCalledTimes(1);
            expect(supabaseConfigMock.createSupabaseClient).toHaveBeenCalledWith(mockEnvRef, loggerMock, 'test', true);
            expect(mockSupabaseClientInstance.from).toHaveBeenCalledWith(MOCK_TABLE);
            expect(mockUpdateBuilder.update).toHaveBeenCalledTimes(1);
        });

    });

    // --- remove Tests ---
    describe('remove', () => {
        const MOCK_TABLE = 'tasks';
        const MOCK_ID = 'task-789';
        let mockDeleteBuilder;

        beforeEach(() => {
            mockDeleteBuilder = {
                delete: jest.fn().mockReturnThis(),
                eq: jest.fn().mockResolvedValue({ error: null }) // Default success
            };
            mockSupabaseClientInstance.from.mockReturnValue(mockDeleteBuilder);
        });

        it('should call from, delete, and eq with correct args', async () => {
            await supabaseService.remove(MOCK_TABLE, MOCK_ID);
            expect(mockSupabaseClientInstance.from).toHaveBeenCalledWith(MOCK_TABLE);
            expect(mockDeleteBuilder.delete).toHaveBeenCalledTimes(1);
            expect(mockDeleteBuilder.eq).toHaveBeenCalledWith('id', MOCK_ID);
        });

        it('should return { success: true } on successful deletion', async () => {
            const result = await supabaseService.remove(MOCK_TABLE, MOCK_ID);
            expect(result).toEqual({ success: true });
        });

        it('should throw error if ID is not provided', async () => {
            await expect(supabaseService.remove(MOCK_TABLE, null)).rejects.toThrow('ID is required for delete operation');
            await expect(supabaseService.remove(MOCK_TABLE, undefined)).rejects.toThrow('ID is required for delete operation');
        });

        it('should throw standardized error on database delete failure', async () => {
            const dbError = new Error('Delete failed - foreign key constraint');
            dbError.status = 500;
            mockDeleteBuilder.eq.mockResolvedValue({ error: dbError }); // Simulate error

            await expect(supabaseService.remove(MOCK_TABLE, MOCK_ID)).rejects.toMatchObject({
                message: 'Delete failed - foreign key constraint',
                status: 500,
                retryable: true // 500 is retryable
            });
            expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining('Supabase error during Delete from tasks'), dbError);
        });
        
        it('should use admin client if useAdmin is true', async () => {
             supabaseConfigMock.createSupabaseClient.mockClear();
            await supabaseService.remove(MOCK_TABLE, MOCK_ID, true);
            expect(supabaseConfigMock.createSupabaseClient).toHaveBeenCalledTimes(1);
            expect(supabaseConfigMock.createSupabaseClient).toHaveBeenCalledWith(mockEnvRef, loggerMock, 'test', true);
            expect(mockSupabaseClientInstance.from).toHaveBeenCalledWith(MOCK_TABLE);
            expect(mockDeleteBuilder.delete).toHaveBeenCalledTimes(1);
        });

    });

    // --- rawQuery Tests ---
    describe('rawQuery', () => {
        const MOCK_SQL = 'SELECT * FROM users WHERE email = $1;';
        const MOCK_PARAMS = ['test@example.com'];
        const mockRawData = [{ id: 1, email: 'test@example.com' }];

        beforeEach(() => {
            // Reset default success behavior for pg client query mock
            mockPgClient.query.mockResolvedValue({ rows: mockRawData });
             // Ensure admin client mock is clear for the admin client test
             supabaseConfigMock.createSupabaseClient.mockClear(); 
        });

        it('should only use the admin client', async () => {
            await supabaseService.rawQuery(MOCK_SQL, MOCK_PARAMS);
            expect(supabaseConfigMock.createSupabaseClient).toHaveBeenCalledTimes(1);
            expect(supabaseConfigMock.createSupabaseClient).toHaveBeenCalledWith(mockEnvRef, loggerMock, 'test', true);
        });

        it('should create a pg Pool, connect, query, release, and end', async () => {
            await supabaseService.rawQuery(MOCK_SQL, MOCK_PARAMS);
            
            expect(Pool).toHaveBeenCalledTimes(1); // Check the MOCKED Pool constructor
            expect(Pool).toHaveBeenCalledWith(expect.objectContaining({ connectionString: expect.any(String) }));
            expect(mockPgPool.connect).toHaveBeenCalledTimes(1); // Check connect on the MOCK INSTANCE
            expect(mockPgClient.query).toHaveBeenCalledWith(MOCK_SQL, MOCK_PARAMS);
            expect(mockPgClient.release).toHaveBeenCalledTimes(1);
            expect(mockPgPool.end).toHaveBeenCalledTimes(1); // Check end on the MOCK INSTANCE
        });

        it('should return query rows on success', async () => {
            const result = await supabaseService.rawQuery(MOCK_SQL, MOCK_PARAMS);
            expect(result).toEqual(mockRawData);
        });

        it('should throw standardized error on pg query failure', async () => {
            const dbError = new Error('Raw query execution failed');
            dbError.code = 'PG_ERR';
            mockPgClient.query.mockRejectedValue(dbError);

            await expect(supabaseService.rawQuery(MOCK_SQL, MOCK_PARAMS)).rejects.toMatchObject({
                message: 'Raw query execution failed',
                status: 500,
                retryable: true, 
                code: 'PG_ERR' 
            });
            expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining('Supabase error during Raw SQL query'), dbError);
            // Check resources are released even on query error
            expect(mockPgClient.release).toHaveBeenCalledTimes(3); // Should be called 3 times in finally
            expect(mockPgPool.end).toHaveBeenCalledTimes(3); // Should be called 3 times in finally
        });

        it('should throw standardized error on pg connect failure', async () => {
            const connectError = new Error('Pool connection failed');
            // Make the MOCK pool's connect method reject
            mockPgPool.connect.mockRejectedValue(connectError);

             await expect(supabaseService.rawQuery(MOCK_SQL, MOCK_PARAMS)).rejects.toMatchObject({
                message: 'Pool connection failed',
                status: 500,
                retryable: true 
            });
            expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining('Supabase error during Raw SQL query'), connectError);
            expect(mockPgClient.query).not.toHaveBeenCalled();
            expect(mockPgClient.release).not.toHaveBeenCalled();
            expect(mockPgPool.end).not.toHaveBeenCalled(); // End not called if connect fails
        });

    });

}); 