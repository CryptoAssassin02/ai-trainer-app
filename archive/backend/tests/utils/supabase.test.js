const { env } = require('../../config');
const { Pool } = require('pg');
const dns = require('dns').promises;
const supabaseUtils = require('../../utils/supabase');

jest.mock('../../config', () => ({
  env: {
    supabase: {
      projectRef: undefined,
      url: 'https://test-project.supabase.co',
      serviceRoleKey: 'test-service-role-key',
      databasePassword: 'test-db-password',
      poolerHost: 'aws-0-test-region.pooler.supabase.com',
      sslRejectUnauthorized: true,
      connectionTimeout: 30000,
      // Pre-configured connection strings for testing
      databaseUrl: undefined,
      databaseUrlServiceRole: undefined,
      databaseUrlPoolerSession: undefined,
      databaseUrlPoolerTransaction: undefined,
    },
  },
}));

jest.mock('pg', () => {
  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };
  const mockPool = {
    connect: jest.fn(() => Promise.resolve(mockClient)),
    end: jest.fn(() => Promise.resolve()),
    on: jest.fn(),
  };
  return { Pool: jest.fn(() => mockPool) };
});

jest.mock('dns', () => ({
  promises: {
    lookup: jest.fn(),
  },
}));

// Helper to reset mocks before each test
const resetMocks = () => {
  jest.clearAllMocks();
  // Reset env mocks to defaults
  env.supabase.projectRef = undefined;
  env.supabase.url = 'https://test-project.supabase.co';
  env.supabase.serviceRoleKey = 'test-service-role-key';
  env.supabase.databasePassword = 'test-db-password';
  env.supabase.poolerHost = 'aws-0-test-region.pooler.supabase.com';
  env.supabase.databaseUrl = undefined;
  env.supabase.databaseUrlServiceRole = undefined;
  env.supabase.databaseUrlPoolerSession = undefined;
  env.supabase.databaseUrlPoolerTransaction = undefined;


  // Reset pg.Pool mocks
  const mockClient = Pool().connect.mock.results[0]?.value; // Get the resolved mock client
  if (mockClient) {
    mockClient.query.mockReset();
    mockClient.release.mockReset();
  }
  Pool().connect.mockClear();
  Pool().end.mockClear();
  Pool.mockClear();

  // Reset dns.lookup mock (since dns variable in test scope is already dns.promises)
  if (dns && dns.lookup) {
    dns.lookup.mockReset();
  }
};

describe('Supabase Utils', () => {
  beforeEach(() => {
    resetMocks();
  });

  describe('getProjectRef', () => {
    it('should return projectRef from env if present', () => {
      env.supabase.projectRef = 'env-project-ref';
      expect(supabaseUtils.getProjectRef('https://some-other.supabase.co')).toBe('env-project-ref');
    });

    it('should extract projectRef from valid Supabase URL', () => {
      env.supabase.projectRef = undefined; // Ensure it's not using env
      env.supabase.url = 'https://abc-def_ghi.supabase.co';
      expect(supabaseUtils.getProjectRef(env.supabase.url)).toBe('abc-def_ghi');
    });

    it('should extract projectRef from another valid Supabase URL format', () => {
      env.supabase.projectRef = undefined;
      env.supabase.url = 'https://xyz.supabase.com'; // common format for older projects/custom domains
      expect(supabaseUtils.getProjectRef(env.supabase.url)).toBe('xyz');
    });

    it('should throw error if env var is missing and URL is invalid', () => {
      env.supabase.projectRef = undefined;
      env.supabase.url = 'invalid-url';
      expect(() => supabaseUtils.getProjectRef(env.supabase.url)).toThrow('Could not determine project reference. Please set SUPABASE_PROJECT_REF in .env');
    });

    it('should throw error if env var is missing and URL does not contain a parsable projectRef', () => {
      env.supabase.projectRef = undefined;
      env.supabase.url = 'https://supabase.co'; // Too few parts, ambiguous
      expect(() => supabaseUtils.getProjectRef(env.supabase.url))
        .toThrow('Invalid Supabase URL format or ambiguous project reference.');
    });

    it('should throw error if env var is missing and URL hostname has no projectRef part', () => {
      env.supabase.projectRef = undefined;
      env.supabase.url = 'https://db.supabase.co'; // Missing the ref part like db.[PROJECT-REF].supabase.co
      expect(() => supabaseUtils.getProjectRef(env.supabase.url))
        .toThrow('Invalid Supabase URL format');
    });
  });

  describe('createConnectionString', () => {
    // Test Env Var Precedence
    it('should use pre-configured direct service role URL from env if available', () => {
      env.supabase.databaseUrlServiceRole = 'postgresql://env.direct.service.role';
      const connectionString = supabaseUtils.createConnectionString({ type: 'direct', useServiceRole: true });
      expect(connectionString).toBe('postgresql://env.direct.service.role');
    });

    it('should use pre-configured direct URL from env if service role not requested or not available', () => {
      env.supabase.databaseUrl = 'postgresql://env.direct.user';
      const connectionString = supabaseUtils.createConnectionString({ type: 'direct', useServiceRole: false });
      expect(connectionString).toBe('postgresql://env.direct.user');
    });

    it('should use pre-configured session pooler URL from env if available', () => {
      env.supabase.databaseUrlPoolerSession = 'postgresql://env.session.pooler';
      const connectionString = supabaseUtils.createConnectionString({ type: 'sessionPooler' });
      expect(connectionString).toBe('postgresql://env.session.pooler');
    });

    it('should use pre-configured transaction pooler URL from env if available', () => {
      env.supabase.databaseUrlPoolerTransaction = 'postgresql://env.transaction.pooler';
      const connectionString = supabaseUtils.createConnectionString({ type: 'transactionPooler' });
      expect(connectionString).toBe('postgresql://env.transaction.pooler');
    });

    // Test Manual Construction when env vars for connection strings are not set
    it('should manually construct direct connection string with service role key by default', () => {
      env.supabase.projectRef = 'manual-project';
      // Ensure specific connection string env vars are undefined
      env.supabase.databaseUrlServiceRole = undefined;
      env.supabase.databaseUrl = undefined;
      const expected = `postgresql://postgres:${env.supabase.serviceRoleKey}@db.manual-project.supabase.co:5432/postgres`;
      expect(supabaseUtils.createConnectionString({ type: 'direct' })).toBe(expected);
    });

    it('should manually construct direct connection string with database password', () => {
      env.supabase.projectRef = 'manual-project';
      env.supabase.databaseUrlServiceRole = undefined;
      env.supabase.databaseUrl = undefined;
      const expected = `postgresql://postgres:${env.supabase.databasePassword}@db.manual-project.supabase.co:5432/postgres`;
      expect(supabaseUtils.createConnectionString({ type: 'direct', useServiceRole: false })).toBe(expected);
    });

    it('should manually construct session pooler connection string', () => {
      env.supabase.projectRef = 'manual-project';
      env.supabase.databaseUrlPoolerSession = undefined;
      const expected = `postgresql://postgres.manual-project:${env.supabase.serviceRoleKey}@${env.supabase.poolerHost}:5432/postgres`;
      expect(supabaseUtils.createConnectionString({ type: 'sessionPooler' })).toBe(expected);
    });

    it('should manually construct transaction pooler connection string', () => {
      env.supabase.projectRef = 'manual-project';
      env.supabase.databaseUrlPoolerTransaction = undefined;
      const expected = `postgresql://postgres.manual-project:${env.supabase.serviceRoleKey}@${env.supabase.poolerHost}:6543/postgres`;
      expect(supabaseUtils.createConnectionString({ type: 'transactionPooler' })).toBe(expected);
    });

    // Test Options
    it('should handle default options (direct, useServiceRole=true) for manual construction', () => {
      env.supabase.projectRef = 'default-opts-project';
      const expected = `postgresql://postgres:${env.supabase.serviceRoleKey}@db.default-opts-project.supabase.co:5432/postgres`;
      expect(supabaseUtils.createConnectionString()).toBe(expected);
    });

    // Test Error Handling
    it('should throw error for invalid connection type', () => {
      expect(() => supabaseUtils.createConnectionString({ type: 'invalidType' }))
        .toThrow('Invalid connection type: invalidType');
    });

    it('should throw error if getProjectRef fails during manual construction', () => {
      env.supabase.projectRef = undefined;
      env.supabase.url = 'invalid-url-for-ref-extraction'; // This will make getProjectRef throw
      expect(() => supabaseUtils.createConnectionString({ type: 'direct' }))
        .toThrow('Could not determine project reference. Please set SUPABASE_PROJECT_REF in .env');
    });
  });

  describe('getPoolConfig', () => {
    const expectedBaseConfig = {
      ssl: { rejectUnauthorized: true }, // Assuming default env.supabase.sslRejectUnauthorized !== false
      connectionTimeoutMillis: 30000, // Default from mock env
      idleTimeoutMillis: 120000,
      statement_timeout: 30000,
      max_retries: 3,
      retry_interval: 1000,
    };

    beforeEach(() => {
      // Ensure env.supabase.sslRejectUnauthorized uses the default mock value for consistency
      env.supabase.sslRejectUnauthorized = true; 
      env.supabase.connectionTimeout = 30000; // Default from mock env
    });

    it('should return correct base config and specifics for "direct" type', () => {
      const config = supabaseUtils.getPoolConfig('direct');
      expect(config).toEqual({
        ...expectedBaseConfig,
        max: 10,
        min: 1,
        connectionTimeoutMillis: 20000, // Overridden for direct
        statement_timeout: 20000,     // Overridden for direct
      });
    });

    it('should return correct base config and specifics for "sessionPooler" type', () => {
      const config = supabaseUtils.getPoolConfig('sessionPooler');
      expect(config).toEqual({
        ...expectedBaseConfig,
        max: 20,
        min: 2,
        statement_timeout: 60000, // Overridden for sessionPooler
        application_name: 'session_pooler',
        keepalive: true,
      });
    });

    it('should return correct base config and specifics for "transactionPooler" type', () => {
      const config = supabaseUtils.getPoolConfig('transactionPooler');
      expect(config).toEqual({
        ...expectedBaseConfig,
        max: 15,
        min: 1,
        // statement_timeout remains from baseConfig (30000)
        application_name: 'transaction_pooler',
      });
    });

    it('should use default "direct" type if no type is provided', () => {
      const config = supabaseUtils.getPoolConfig(); // No type
      expect(config).toEqual({
        ...expectedBaseConfig,
        max: 10,
        min: 1,
        connectionTimeoutMillis: 20000,
        statement_timeout: 20000,
      });
    });

    it('should throw error for invalid connection type', () => {
      expect(() => supabaseUtils.getPoolConfig('invalidType'))
        .toThrow('Invalid connection type: invalidType');
    });

    it('should respect env.supabase.sslRejectUnauthorized when false', () => {
      env.supabase.sslRejectUnauthorized = false;
      const config = supabaseUtils.getPoolConfig('direct');
      expect(config.ssl.rejectUnauthorized).toBe(false);
    });

    it('should respect env.supabase.connectionTimeout when set', () => {
      env.supabase.connectionTimeout = 50000;
      // For direct type, connectionTimeoutMillis is specifically 20000, so this won't affect it.
      // Let's test with sessionPooler where connectionTimeoutMillis is not overridden from the base.
      const baseConfigForSessionPooler = supabaseUtils.getPoolConfig('sessionPooler');
      // The baseConfig within getPoolConfig will pick up env.supabase.connectionTimeout
      // So, the returned config.connectionTimeoutMillis should be 50000 for sessionPooler.
      expect(baseConfigForSessionPooler.connectionTimeoutMillis).toBe(50000);
    });
  });

  describe('testConnection', () => {
    const mockConnectionString = 'postgresql://postgres:password@db.test-project.supabase.co:5432/postgres'; // Direct type

    it('should return success if DNS lookup, pool connection, and query succeed', async () => {
      dns.lookup.mockResolvedValue([{ address: '127.0.0.1', family: 4 }]);
      const mockClient = await Pool().connect(); 
      mockClient.query.mockResolvedValue({ rows: [{ version: 'PostgreSQL 14.0' }] });

      const result = await supabaseUtils.testConnection(mockConnectionString);

      expect(dns.lookup).toHaveBeenCalledWith('db.test-project.supabase.co', { all: true });
      expect(Pool).toHaveBeenCalledWith(expect.objectContaining({ connectionString: mockConnectionString }));
      expect(Pool().connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('SELECT version()');
      expect(mockClient.release).toHaveBeenCalled();
      expect(Pool().end).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        version: 'PostgreSQL 14.0',
        type: 'direct',
      });
    });

    it('should return DNS_RESOLUTION_ERROR if dns.lookup rejects', async () => {
      const dnsErrorMessage = 'DNS lookup failed';
      dns.lookup.mockRejectedValue(new Error(dnsErrorMessage));

      const result = await supabaseUtils.testConnection(mockConnectionString);

      expect(dns.lookup).toHaveBeenCalledWith('db.test-project.supabase.co', { all: true });
      expect(Pool().connect).not.toHaveBeenCalled(); // Should not proceed to connect
      expect(result).toEqual({
        success: false,
        error: `DNS resolution error: ${dnsErrorMessage}`,
        errorType: 'DNS_RESOLUTION_ERROR',
      });
    });

    it('should return DNS_RESOLUTION_FAILED if dns.lookup returns empty addresses', async () => {
      dns.lookup.mockResolvedValue([]); // Empty array

      const result = await supabaseUtils.testConnection(mockConnectionString);

      expect(dns.lookup).toHaveBeenCalledWith('db.test-project.supabase.co', { all: true });
      expect(Pool().connect).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        error: 'DNS resolution failed for db.test-project.supabase.co',
        errorType: 'DNS_RESOLUTION_FAILED',
      });
    });

    it('should return DNS_RESOLUTION_FAILED if dns.lookup returns null addresses', async () => {
      dns.lookup.mockResolvedValue(null); // Null response

      const result = await supabaseUtils.testConnection(mockConnectionString);

      expect(dns.lookup).toHaveBeenCalledWith('db.test-project.supabase.co', { all: true });
      expect(Pool().connect).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        error: 'DNS resolution failed for db.test-project.supabase.co',
        errorType: 'DNS_RESOLUTION_FAILED',
      });
    });

    it('should return connection error if pool.connect fails', async () => {
      dns.lookup.mockResolvedValue([{ address: '127.0.0.1', family: 4 }]);
      const connectError = new Error('Failed to connect to DB');
      connectError.code = 'ECONNREFUSED'; // Example error code
      Pool().connect.mockRejectedValueOnce(connectError);

      const result = await supabaseUtils.testConnection(mockConnectionString);

      expect(dns.lookup).toHaveBeenCalledTimes(1);
      expect(Pool().connect).toHaveBeenCalledTimes(1);
      expect(Pool().end).not.toHaveBeenCalled(); // Corrected: Pool().end should not be called if connect fails at this stage
      
      // Cannot reliably get mockClient if Pool().connect itself fails before returning it.
      // We are testing the scenario where the connect promise itself rejects.
      // const mockClient = await Pool().connect.mock.results[0]?.value || {}; 
      // expect(mockClient.query).not.toHaveBeenCalled();
      // expect(mockClient.release).not.toHaveBeenCalled();

      expect(result).toEqual({
        success: false,
        error: connectError.message,
        errorType: connectError.code,
      });
    });

    it('should return query error if client.query fails', async () => {
      dns.lookup.mockResolvedValue([{ address: '127.0.0.1', family: 4 }]);
      
      // Get the mock client instance that Pool().connect will resolve to
      const mockClientInstance = Pool().connect.mock.results[0]?.value || (await Pool().connect());
      // Ensure Pool().connect is clear for the SUT call, then set up its next resolution for SUT
      Pool().connect.mockClear(); 
      Pool().connect.mockResolvedValueOnce(mockClientInstance); // SUT call will resolve to this client

      const queryError = new Error('Query execution failed');
      queryError.code = '42P01'; // Example PostgreSQL error code (undefined table)
      mockClientInstance.query.mockRejectedValueOnce(queryError);

      const result = await supabaseUtils.testConnection(mockConnectionString);

      expect(dns.lookup).toHaveBeenCalledTimes(1);
      expect(Pool().connect).toHaveBeenCalledTimes(1); // Corrected: Only counts SUT's call due to mockClear
      expect(mockClientInstance.query).toHaveBeenCalledWith('SELECT version()');
      expect(mockClientInstance.release).toHaveBeenCalledTimes(1); // Should be called in finally
      expect(Pool().end).toHaveBeenCalledTimes(1); // Should be called in finally
      expect(result).toEqual({
        success: false,
        error: queryError.message,
        errorType: queryError.code,
      });
    });

    it('should correctly identify "sessionPooler" type from connection string', async () => {
      const sessionPoolerConnectionString = 'postgresql://postgres.project:password@aws-0-region.pooler.supabase.com:5432/postgres';
      dns.lookup.mockResolvedValue([{ address: '127.0.0.1', family: 4 }]);
      const mockClient = await Pool().connect();
      mockClient.query.mockResolvedValue({ rows: [{ version: 'PostgreSQL 14.0' }] });

      const result = await supabaseUtils.testConnection(sessionPoolerConnectionString);
      expect(result.success).toBe(true);
      expect(result.type).toBe('sessionPooler');
      expect(Pool).toHaveBeenCalledWith(expect.objectContaining({ connectionString: sessionPoolerConnectionString }));
      // Assuming we spy on getPoolConfig if needed
    });

    it('should correctly identify "transactionPooler" type from connection string', async () => {
      const transactionPoolerConnectionString = 'postgresql://postgres.project:password@aws-0-region.pooler.supabase.com:6543/postgres';
      dns.lookup.mockResolvedValue([{ address: '127.0.0.1', family: 4 }]);
      const mockClient = await Pool().connect();
      mockClient.query.mockResolvedValue({ rows: [{ version: 'PostgreSQL 14.0' }] });

      const result = await supabaseUtils.testConnection(transactionPoolerConnectionString);
      expect(result.success).toBe(true);
      expect(result.type).toBe('transactionPooler');
      expect(Pool).toHaveBeenCalledWith(expect.objectContaining({ connectionString: transactionPoolerConnectionString }));
      // We might also want to spy on getPoolConfig to ensure it's called with the correct type
      // const getPoolConfigSpy = jest.spyOn(supabaseUtils, 'getPoolConfig');
      // expect(getPoolConfigSpy).toHaveBeenCalledWith('transactionPooler');
      // getPoolConfigSpy.mockRestore(); // if we spy
    });

    // Test for a malformed connection string that might fail URL parsing
    it('should return connection error if connectionString is unparsable by URL constructor', async () => {
      const unparsableConnectionString = 'this-is-not-a-url';
      // dns.lookup will not be called if new URL() fails first.

      const result = await supabaseUtils.testConnection(unparsableConnectionString);

      expect(dns.lookup).not.toHaveBeenCalled();
      expect(Pool().connect).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        error: "Invalid URL", // This is the typical error from new URL() for such strings
        errorType: 'ERR_INVALID_URL', // Corrected expected errorType
      });
    });
  });

  describe('createConnectionWithFallback', () => {
    let createConnectionStringSpy;
    let testConnectionSpy;

    beforeEach(() => {
      // Spy on the functions within the same module
      createConnectionStringSpy = jest.spyOn(supabaseUtils, 'createConnectionString');
      testConnectionSpy = jest.spyOn(supabaseUtils, 'testConnection');
    });

    afterEach(() => {
      // Restore original implementations after each test
      createConnectionStringSpy.mockRestore();
      testConnectionSpy.mockRestore();
    });

    it('should succeed on the first type if testConnection is successful', async () => {
      const mockDirectCS = 'direct_cs';
      const mockTestResult = { success: true, version: '14.0', type: 'direct' };

      createConnectionStringSpy.mockReturnValueOnce(mockDirectCS);
      testConnectionSpy.mockResolvedValueOnce(mockTestResult);

      const result = await supabaseUtils.createConnectionWithFallback(); // Use default types

      expect(createConnectionStringSpy).toHaveBeenCalledWith({ type: 'direct', useServiceRole: true });
      expect(testConnectionSpy).toHaveBeenCalledWith(mockDirectCS);
      expect(result).toEqual({
        success: true,
        connectionString: mockDirectCS,
        type: 'direct',
        testResult: mockTestResult,
      });
      expect(createConnectionStringSpy).toHaveBeenCalledTimes(1);
      expect(testConnectionSpy).toHaveBeenCalledTimes(1);
    });

    it('should succeed on a fallback type if initial types fail testConnection', async () => {
      const mockDirectCS = 'direct_cs';
      const mockSessionCS = 'session_cs';
      const directFailResult = { success: false, error: 'direct failed', errorType: 'TEST_FAIL' };
      const sessionSuccessResult = { success: true, version: '14.0', type: 'sessionPooler' };

      createConnectionStringSpy
        .mockReturnValueOnce(mockDirectCS)    // For 'direct'
        .mockReturnValueOnce(mockSessionCS); // For 'sessionPooler'
      
      testConnectionSpy
        .mockResolvedValueOnce(directFailResult) // 'direct' fails
        .mockResolvedValueOnce(sessionSuccessResult); // 'sessionPooler' succeeds

      const result = await supabaseUtils.createConnectionWithFallback(); // Uses default types ['direct', 'sessionPooler', 'transactionPooler']

      expect(createConnectionStringSpy).toHaveBeenCalledWith({ type: 'direct', useServiceRole: true });
      expect(createConnectionStringSpy).toHaveBeenCalledWith({ type: 'sessionPooler', useServiceRole: true });
      expect(testConnectionSpy).toHaveBeenCalledWith(mockDirectCS);
      expect(testConnectionSpy).toHaveBeenCalledWith(mockSessionCS);
      expect(result).toEqual({
        success: true,
        connectionString: mockSessionCS,
        type: 'sessionPooler',
        testResult: sessionSuccessResult,
      });
      expect(createConnectionStringSpy).toHaveBeenCalledTimes(2);
      expect(testConnectionSpy).toHaveBeenCalledTimes(2);
    });

    it('should return the last error if all types fail testConnection', async () => {
      const cs1 = 'cs1', cs2 = 'cs2', cs3 = 'cs3';
      const err1 = { success: false, error: 'err1', errorType: 'FAIL1' };
      const err2 = { success: false, error: 'err2', errorType: 'FAIL2' };
      const err3 = { success: false, error: 'err3', errorType: 'FAIL3' };
      const defaultTypes = ['direct', 'sessionPooler', 'transactionPooler'];

      createConnectionStringSpy
        .mockReturnValueOnce(cs1)
        .mockReturnValueOnce(cs2)
        .mockReturnValueOnce(cs3);
      
      testConnectionSpy
        .mockResolvedValueOnce(err1)
        .mockResolvedValueOnce(err2)
        .mockResolvedValueOnce(err3);

      const result = await supabaseUtils.createConnectionWithFallback();

      expect(createConnectionStringSpy).toHaveBeenCalledTimes(3);
      expect(testConnectionSpy).toHaveBeenCalledTimes(3);
      expect(result).toEqual({
        success: false,
        error: err3.error, // Last error message
        errorType: err3.errorType, // Last error type
        attemptedTypes: defaultTypes,
      });
    });

    it('should return connection string error if createConnectionString throws', async () => {
      const creationError = new Error('Failed to create CS');
      // Mock to throw for all calls in this test
      createConnectionStringSpy.mockImplementation(() => {
        throw creationError;
      });
      // testConnectionSpy should not be called

      const result = await supabaseUtils.createConnectionWithFallback(); // Uses default types ['direct', 'sessionPooler', 'transactionPooler']

      // It will attempt to create for each type, failing each time
      expect(createConnectionStringSpy).toHaveBeenCalledTimes(3);
      expect(testConnectionSpy).not.toHaveBeenCalled();
      // The lastError will be set in the catch block on the final iteration
      expect(result).toEqual({
        success: false,
        error: creationError.message,
        errorType: 'CONNECTION_STRING_ERROR',
        attemptedTypes: ['direct', 'sessionPooler', 'transactionPooler'], // Should reflect all attempted types
      });
    });

    it('should respect custom types and useServiceRole options', async () => {
      const customTypes = ['sessionPooler', 'direct'];
      const useCustomServiceRole = false;
      const mockSessionCS = 'session_cs_custom';
      const mockDirectCS = 'direct_cs_custom';
      const sessionFailResult = { success: false, error: 'session failed', errorType: 'TEST_FAIL' };
      const directSuccessResult = { success: true, version: '14.0', type: 'direct' };

      createConnectionStringSpy
        .mockReturnValueOnce(mockSessionCS) // For 'sessionPooler'
        .mockReturnValueOnce(mockDirectCS);  // For 'direct'
      
      testConnectionSpy
        .mockResolvedValueOnce(sessionFailResult) // 'sessionPooler' fails
        .mockResolvedValueOnce(directSuccessResult); // 'direct' succeeds

      const result = await supabaseUtils.createConnectionWithFallback({ 
        types: customTypes, 
        useServiceRole: useCustomServiceRole 
      });

      // Check that createConnectionString was called with the correct options
      expect(createConnectionStringSpy).toHaveBeenCalledWith({ type: 'sessionPooler', useServiceRole: false });
      expect(createConnectionStringSpy).toHaveBeenCalledWith({ type: 'direct', useServiceRole: false });
      
      // Check testConnection calls
      expect(testConnectionSpy).toHaveBeenCalledWith(mockSessionCS);
      expect(testConnectionSpy).toHaveBeenCalledWith(mockDirectCS);

      // Check final result
      expect(result).toEqual({
        success: true,
        connectionString: mockDirectCS,
        type: 'direct',
        testResult: directSuccessResult,
      });
      expect(createConnectionStringSpy).toHaveBeenCalledTimes(2);
      expect(testConnectionSpy).toHaveBeenCalledTimes(2);
    });
  });

  // Tests will go here
}); 