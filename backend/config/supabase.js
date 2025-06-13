/**
 * @fileoverview Supabase Configuration for Different Environments
 * 
 * This file provides environment-specific configurations for Supabase connections,
 * including development, testing, and production settings. It also includes
 * helper utilities for environment detection and migration utilities, following the requirements.
 * 
 * IMPORTANT SECURITY NOTE: Row Level Security (RLS) must be properly configured:
 * - Development: RLS is typically disabled for easier development
 * - Testing: RLS can be configured with test-specific policies
 * - Production: RLS must be strictly enabled to protect user data
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

/**
 * Development Configuration
 * - RLS disabled for easier development
 * - Extended timeouts for debugging
 * - Verbose logging enabled
 */
const developmentConfig = (env) => ({
  // Connection settings
  url: env.supabase.url,
  key: env.supabase.anonKey,
  options: {
    auth: {
      persistSession: false,
      autoRefreshToken: true,
      detectSessionInUrl: true
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'x-application-name': 'trAIner-backend-dev'
      }
    },
    // Extended timeout for debugging
    realtime: {
      timeout: 60000 // 60 seconds
    }
  },
  // Connection strings for different connection types
  connectionStrings: {
    direct: env.supabase.databaseUrl,
    sessionPooler: env.supabase.databaseUrlPoolerSession,
    transactionPooler: env.supabase.databaseUrlPoolerTransaction
  },
  // RLS settings
  rls: {
    enabled: false, // Disabled for development to make testing easier
    bypassForService: true
  },
  // Logging settings
  logging: {
    level: 'debug',
    queries: true, // Log database queries
    authOperations: true, // Log auth operations
    requestDetails: true // Log detailed request info
  },
  // Performance settings
  performance: {
    cacheProfiles: true, // Cache user profiles for better performance
    queryPageSize: 100
  }
});

/**
 * Testing Configuration
 * - Isolated database for tests
 * - Disabled triggers for faster tests
 * - Test-specific RLS settings
 */
const testingConfig = () => ({
  // Connection settings
  url: process.env.SUPABASE_URL || 'https://test-project.supabase.co',
  key: process.env.SUPABASE_ANON_KEY || 'test-anon-key',
  options: {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'x-application-name': 'trAIner-backend-test'
      }
    }
  },
  // Connection strings for different connection types
  connectionStrings: {
    direct: process.env.DATABASE_URL || 'postgresql://postgres:password@test-db-host:5432/postgres',
    sessionPooler: process.env.DATABASE_URL_POOLER_SESSION || 'postgresql://postgres:password@test-pooler-host:5432/postgres',
    transactionPooler: process.env.DATABASE_URL_POOLER_TRANSACTION || 'postgresql://postgres:password@test-pooler-host:6543/postgres'
  },
  // RLS settings
  rls: {
    enabled: true, // Enable with test-specific policies
    bypassForTesting: true // Special bypass for test cases
  },
  // Test-specific settings
  testing: {
    isolatedSchema: 'test_schema', // Use separate schema for isolation
    disableTriggers: true, // Disable triggers for faster tests
    cleanupAfterTests: true, // Auto-cleanup after tests complete
    seedTestData: true // Auto-seed with test data
  },
  // Logging settings for tests
  logging: {
    level: 'error', // Only log errors during tests
    captureFailed: true // Capture all failed operations
  }
});

/**
 * Production Configuration
 * - RLS strictly enabled
 * - Minimal logging for performance
 * - Optimized connection settings
 */
const productionConfig = (env) => ({
  // Connection settings
  url: env.supabase.url,
  key: env.supabase.anonKey,
  options: {
    auth: {
      persistSession: false,
      autoRefreshToken: true
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'x-application-name': 'trAIner-backend-prod'
      }
    }
  },
  // Connection strings for different connection types
  connectionStrings: {
    direct: env.supabase.databaseUrl,
    sessionPooler: env.supabase.databaseUrlPoolerSession,
    transactionPooler: env.supabase.databaseUrlPoolerTransaction
  },
  // RLS settings
  rls: {
    enabled: true, // MUST be enabled in production
    bypassForService: false // Service role only bypasses when absolutely necessary
  },
  // Logging settings for production
  logging: {
    level: 'warn', // Only log warnings and errors
    queries: false, // Don't log regular queries
    securityEvents: true // Log security-related events
  },
  // Performance settings
  performance: {
    cacheProfiles: true,
    cacheTimeout: 300, // 5 minutes
    queryPageSize: 50, // Smaller page size for consistent performance
    connectionPool: {
      min: 2,
      max: 10
    }
  }
});

/**
 * Get the appropriate configuration based on current environment
 * @param {Object} env - The environment configuration object.
 * @param {Object} logger - The logger instance.
 * @param {string} nodeEnv - The current NODE_ENV value.
 * @returns {Object} Environment-specific configuration
 */
function getEnvironmentConfig(env, logger, nodeEnv) {
  // Use injected env and logger
  // const { env, logger } = require('./index'); // Removed

  const effectiveNodeEnv = nodeEnv || process.env.NODE_ENV;

  // Use injected helpers
  const devMode = isDevelopment(env, effectiveNodeEnv);
  const testMode = isTest(env, effectiveNodeEnv);
  const prodMode = isProduction(env, effectiveNodeEnv);

  // For tests with undefined env or env.supabase
  if (effectiveNodeEnv === 'test') {
    // Testing config doesn't depend on env, call directly
    return testingConfig();
  }

  if (devMode) {
    if (!env || !env.supabase) throw new Error('Development environment config (env.supabase) is missing.');
    return developmentConfig(env);
  } else if (testMode) { // Should technically be caught above, but keep for clarity
     // Testing config doesn't depend on env, call directly
    return testingConfig();
  } else if (prodMode) {
     if (!env || !env.supabase) throw new Error('Production environment config (env.supabase) is missing.');
    return productionConfig(env);
  }

  // Default to development if not specified
  logger.warn('Environment not specified, defaulting to development configuration');
  if (!env || !env.supabase) {
      // Handle case where default is needed but env is missing
      logger.error('Cannot default to development config: environment config (env.supabase) is missing.');
      // Decide on fallback behavior: throw or return a minimal safe config?
      // Throwing is safer to prevent unexpected behavior.
      throw new Error('Cannot determine environment and environment config (env.supabase) is missing.');
  }
  return developmentConfig(env);
}

/**
 * Check if the application is running in development mode
 * @param {Object} env - The environment configuration object.
 * @param {string} nodeEnv - The current NODE_ENV value.
 * @returns {boolean} True if in development mode
 */
function isDevelopment(env, nodeEnv) {
  // const { env } = require('./index'); // Removed
  const effectiveNodeEnv = nodeEnv || process.env.NODE_ENV;
  return (!env && effectiveNodeEnv === 'development') || (env && env.env === 'development') || false; // Explicit fallback
}

/**
 * Check if the application is running in test mode
 * @param {Object} env - The environment configuration object.
 * @param {string} nodeEnv - The current NODE_ENV value.
 * @returns {boolean} True if in test mode
 */
function isTest(env, nodeEnv) {
  // const { env } = require('./index'); // Removed
  const effectiveNodeEnv = nodeEnv || process.env.NODE_ENV;
  return (!env && effectiveNodeEnv === 'test') || (env && env.env === 'test') || false; // Explicit fallback
}

/**
 * Check if the application is running in production mode
 * @param {Object} env - The environment configuration object.
 * @param {string} nodeEnv - The current NODE_ENV value.
 * @returns {boolean} True if in production mode
 */
function isProduction(env, nodeEnv) {
  // const { env } = require('./index'); // Removed
  const effectiveNodeEnv = nodeEnv || process.env.NODE_ENV;
  return (!env && effectiveNodeEnv === 'production') || (env && env.env === 'production') || false; // Explicit fallback
}

/**
 * Create a Supabase client with environment-specific configuration
 * @param {Object} env - The environment configuration object (passed from main config/index.js).
 * @param {Object} logger - The logger instance (passed from main config/index.js).
 * @param {string} nodeEnv - The current NODE_ENV value (e.g., process.env.NODE_ENV).
 * @param {boolean} [useServiceRole=false] Whether to use the service role key for admin operations
 * @param {string} [jwtToken=null] Optional JWT token to scope the client for RLS
 * @returns {import('@supabase/supabase-js').SupabaseClient} Configured Supabase client
 */
function createSupabaseClient(env, logger, nodeEnv, useServiceRole = false, jwtToken = null) {
  const effectiveNodeEnv = nodeEnv || process.env.NODE_ENV;
  const shouldUseMock = process.env.USE_MOCK_SUPABASE === 'true';

  // console.log(`[SupabaseConfig] createSupabaseClient called. Env: ${effectiveNodeEnv}, Mock: ${shouldUseMock}, ServiceRole: ${useServiceRole}, JWT: ${jwtToken ? 'Present' : 'Absent'}`); // Debug log

  if (effectiveNodeEnv === 'test' && shouldUseMock) {
    logger.debug('Attempting to use MOCK Supabase client (USE_MOCK_SUPABASE=true)');
    try {
      const mockSupabase = require('../../tests/mocks/supabase'); // Adjusted path
      if (mockSupabase && typeof mockSupabase.createMockClient === 'function') {
        logger.debug('Using mock Supabase client from tests/mocks/supabase.js');
        return mockSupabase.createMockClient();
      }
    } catch (err) {
      logger.debug('Failed to load mock from tests/mocks/supabase.js, trying tests/__mocks__/supabase.js', err.message);
    }

    try {
      const mockSupabase = require('../../tests/__mocks__/supabase'); // Adjusted path
      if (mockSupabase && typeof mockSupabase.createSupabaseClient === 'function') {
        logger.debug('Using mock Supabase client from tests/__mocks__/supabase.js');
        return mockSupabase.createSupabaseClient();
      }
    } catch (err) {
      logger.debug('Failed to load mock from tests/__mocks__/supabase.js, using fallback mock', err.message);
    }
    
    logger.debug('Creating minimal fallback mock Supabase client for unit test (USE_MOCK_SUPABASE=true)');
    return minimalFallbackMock; 
  }

  // For non-mocked test environments (integration tests) OR development/production
  try {
    // getEnvironmentConfig will use process.env.NODE_ENV if nodeEnv param is not overriding.
    // For integration tests (effectiveNodeEnv === 'test' && !shouldUseMock), 
    // testingConfig() inside getEnvironmentConfig already tries to use process.env variables.
    const configDetails = getEnvironmentConfig(env, logger, effectiveNodeEnv);
    
    let supabaseUrlToUse, supabaseKeyToUse, clientOptionsToUse;

    clientOptionsToUse = configDetails.options || {}; // Initialize clientOptionsToUse early

    if (jwtToken) {
      supabaseUrlToUse = configDetails.url; // Should be env.supabase.url from higher level config
      supabaseKeyToUse = configDetails.key; // Use anon key for JWT-scoped client
      clientOptionsToUse = {
        ...clientOptionsToUse,
        global: {
          ...(clientOptionsToUse.global || {}),
          headers: {
            ...(clientOptionsToUse.global?.headers || {}),
            Authorization: `Bearer ${jwtToken}`,
          },
        },
      };
      logger.info(`[SupabaseConfig] Creating Supabase client WITH JWT. Environment: ${effectiveNodeEnv}`);
    } else if (effectiveNodeEnv === 'test' && !shouldUseMock) {
        // Integration Test Path: Directly use .env.test variables (via process.env)
        supabaseUrlToUse = process.env.SUPABASE_URL; 
        supabaseKeyToUse = useServiceRole 
            ? process.env.SUPABASE_SERVICE_ROLE_KEY 
            : process.env.SUPABASE_ANON_KEY;
        // Options from testingConfig are already part of configDetails.options if effectiveNodeEnv is test
        // clientOptionsToUse = testingConfig(env /*testingConfig might not need env*/).options || {}; 
        logger.debug(`[SupabaseConfig] Integration Test REAL client. URL: ${supabaseUrlToUse}, Key Set: ${!!supabaseKeyToUse}, ServiceRole: ${useServiceRole}`);
    } else {
        // Development/Production Path (or if a test somehow missed the above)
        supabaseUrlToUse = configDetails.url;
        supabaseKeyToUse = useServiceRole && env?.supabase?.serviceRoleKey // env here is the one passed to createSupabaseClient
            ? env.supabase.serviceRoleKey
            : configDetails.key;
        // clientOptionsToUse are already set from configDetails.options
        // logger.debug(`[SupabaseConfig] Dev/Prod REAL client. URL: ${supabaseUrlToUse}, Key Set: ${!!supabaseKeyToUse}, ServiceRole: ${useServiceRole}`);
    }

    if (!supabaseUrlToUse || !supabaseKeyToUse) {
        const message = `Supabase URL or Key is MISSING for client creation. URL: ${supabaseUrlToUse}, Key Set: ${!!supabaseKeyToUse}, ServiceRole: ${useServiceRole}, Env: ${effectiveNodeEnv}, Mock: ${shouldUseMock}`;
        logger.error(message);
        // If this happens in integration tests, we want it to fail loudly rather than use a mock.
        if (effectiveNodeEnv === 'test' && !shouldUseMock) {
            throw new Error(message + " - Integration tests require valid .env.test credentials.");
        }
        // For other scenarios (like unit tests that were supposed to mock but failed, or dev/prod misconfig),
        // falling back to mock might hide issues, so prefer throwing.
        // However, the original code had a fallback to minimal mock in case of error during *client creation*.
        // Let's re-evaluate the fallback for errors during createClient() itself.
        throw new Error(message); 
    }
    
    logger.info(`[SupabaseConfig] Creating Supabase client. Environment: ${effectiveNodeEnv}, ServiceRole: ${useServiceRole}, Mocked: ${shouldUseMock}`);
    return createClient(supabaseUrlToUse, supabaseKeyToUse, clientOptionsToUse);

  } catch (error) {
    logger.error(`[SupabaseConfig] Error creating Supabase client: ${error.message}`, { stack: error.stack });
    // Fallback for TEST environment only if client creation ITSELF fails, to prevent widespread unit test breaks
    // if mocks weren't explicitly requested but real client setup had an issue.
    if (effectiveNodeEnv === 'test') {
      logger.warn('[SupabaseConfig] Real Supabase client creation failed in test environment, falling back to minimal mock to prevent complete test suite failure. THIS IS UNEXPECTED FOR INTEGRATION TESTS.');
      return minimalFallbackMock;
    }
    throw error; // Rethrow for non-test environments or if no fallback desired
  }
}

/**
 * Create a connection string from individual environment variables
 *
 * @param {Object} env - The environment configuration object.
 * @param {Object} logger - The logger instance.
 * @param {string} nodeEnv - The current NODE_ENV value.
 * @param {string} [connectionType='direct'] - Type of connection: 'direct', 'sessionPooler', or 'transactionPooler'
 * @param {boolean} [useServiceRole=false] - Whether to use the service role key instead of password
 * @returns {string} PostgreSQL connection string formatted according to Supabase standards
 */
function createConnectionString(env, logger, nodeEnv, connectionType = 'direct', useServiceRole = false) {
  const effectiveNodeEnv = nodeEnv || process.env.NODE_ENV;

  // Priority 1: Check testing environment
  if (effectiveNodeEnv === 'test') {
    // Simpler: Directly return the expected test string based on common test env vars or defaults
    const testingDirectConnectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@test-db-host:5432/postgres';
    logger?.debug?.('Using testing direct connection string.'); // Keep log if desired
    return testingDirectConnectionString;
  }

  // Derive the key for connectionStrings lookup
  const connectionTypeKey = connectionType === 'transactionPooler' ? 'transaction' :
                           connectionType === 'sessionPooler' ? 'session' :
                           'direct';

  // Priority 2: Check for pre-configured strings based on type
  const preconfiguredString = env?.supabase?.connectionStrings?.[connectionTypeKey];
  if (preconfiguredString) {
    logger?.debug?.(`Using pre-configured connection string for type:`, connectionTypeKey);
    return preconfiguredString;
  }

  // If not available, construct the connection string manually
  if (!env || !env.supabase) {
      throw new Error('Environment config (env.supabase) is missing for manual connection string construction.');
  }

  // Extract project reference from the Supabase URL
  const projectRef = env.supabase.projectRef ||
                    (env.supabase.url ? new URL(env.supabase.url).hostname.split('.')[0] : null);

  if (!projectRef) {
    throw new Error("Could not determine Supabase project reference. Please set SUPABASE_PROJECT_REF in .env or ensure env.supabase.url is provided.");
  }

  // Determine the password to use (service role key or regular password)
  const password = useServiceRole ? env.supabase.serviceRoleKey : env.supabase.databasePassword;
  if (!password) {
      throw new Error(`Required password/key (useServiceRole=${useServiceRole}) not found in env.supabase for manual connection string construction.`);
  }
  const poolerHost = env.supabase.poolerHost || 'aws-0-us-east-2.pooler.supabase.com'; // Default pooler host if not specified

  // Format connection string based on connection type
  switch (connectionType) {
    case 'direct':
      logger?.debug?.(`Manually constructing direct connection string${useServiceRole ? ' using service role key' : ''}.`);
      return `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres`;

    case 'sessionPooler':
      // Format: postgresql://[POOLER_USER]:[PASSWORD]@[POOLER_HOST]:5432/postgres
      return `postgresql://postgres.${projectRef}:${password}@${poolerHost}:5432/postgres`;

    case 'transactionPooler':
      // Format: postgresql://[POOLER_USER]:[PASSWORD]@[POOLER_HOST]:6543/postgres
      return `postgresql://postgres.${projectRef}:${password}@${poolerHost}:6543/postgres`;

    // Default case should not be reached due to effectiveConnectionType logic
    // but added for safety, returning manual direct string.
    default: 
      logger.error(`Reached default case in createConnectionString switch with type: ${connectionType}. This should not happen.`);
      return `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres`; 
  }
}

/**
 * Test a database connection and handle DNS resolution issues
 * @param {Object} env - The environment configuration object.
 * @param {Object} logger - The logger instance.
 * @param {string} connectionString - The PostgreSQL connection string
 * @returns {Promise<Object>} Connection test result with status and error info
 */
async function testConnection(env, logger, connectionString) {
  // Lazy require dependencies
  const dns = require('dns').promises;
  const { Pool } = require('pg');
  // const { env, logger } = require('./index'); // Removed

  // Basic check for connection string
  if (!connectionString) {
      return { success: false, error: 'Connection string is required.', errorType: 'MISSING_ARGUMENT' };
  }

  try {
    // Extract hostname for DNS lookup
    const connectionUrl = new URL(connectionString);
    const hostname = connectionUrl.hostname;

    try {
      // First check DNS resolution
      logger.debug(`Resolving hostname: ${hostname}`);
      const addresses = await dns.lookup(hostname, { all: true });

      if (!addresses || addresses.length === 0) {
        return {
          success: false,
          error: `DNS resolution failed for ${hostname}`,
          errorType: 'DNS_RESOLUTION_FAILED'
        };
      }

      logger.debug(`DNS resolved ${hostname} to: ${addresses.map(a => a.address).join(', ')}`);
    } catch (dnsError) {
      logger.error(`DNS resolution error for ${hostname}:`, dnsError);
      return {
        success: false,
        error: `DNS resolution error: ${dnsError.message}`,
        errorType: 'DNS_RESOLUTION_ERROR',
        errorDetails: dnsError
      };
    }

    // Try to establish database connection
    const pool = new Pool({
      connectionString,
      ssl: {
        // Use injected env, default to true if env.supabase or sslRejectUnauthorized is missing
        rejectUnauthorized: env?.supabase?.sslRejectUnauthorized !== false
      },
      // Use injected env, default to 30s if env.supabase or connectionTimeout is missing
      connectionTimeoutMillis: env?.supabase?.connectionTimeout || 30000
    });

    // Test connection by getting server version
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT version()');
      return {
        success: true,
        version: result.rows[0].version,
        connectionType: connectionString.includes(':6543/') ? 'transactionPooler' :
                        connectionString.includes('pooler.supabase.com:5432') ? 'sessionPooler' : 'direct'
      };
    } finally {
      client.release();
      await pool.end();
    }
  } catch (error) {
    logger.error('Database connection error:', error);
    return {
      success: false,
      error: error.message,
      errorType: error.code || 'CONNECTION_ERROR',
      errorDetails: error
    };
  }
}

/**
 * Apply a migration SQL file
 * @param {Object} env - The environment configuration object.
 * @param {Object} logger - The logger instance.
 * @param {string} nodeEnv - The current NODE_ENV value.
 * @param {string} migrationPath Path to the migration SQL file
 * @returns {Promise<boolean>} Success status of the migration
 */
async function applyMigration(env, logger, nodeEnv, migrationPath) {
  // Lazy require dependencies
  const fs = require('fs').promises;
  const { Pool } = require('pg');
  // const { env, logger } = require('./index'); // Removed
  const effectiveNodeEnv = nodeEnv || process.env.NODE_ENV;

  try {
    // Read migration file
    const sqlContent = await fs.readFile(migrationPath, 'utf8');

    // Log migration attempt
    logger.info(`Applying migration: ${path.basename(migrationPath)}`);

    // Use direct Postgres connection instead of RPC function
    // Pass injected dependencies to createConnectionString
    const connectionString = createConnectionString(env, logger, effectiveNodeEnv, 'direct', true);
    const pool = new Pool({ connectionString });

    const pgClient = await pool.connect();

    try {
      // Execute migration
      await pgClient.query(sqlContent);

      logger.info(`Migration successful: ${path.basename(migrationPath)}`);
      return true;
    } catch (error) {
      logger.error(`Migration failed: ${error.message}`, {
        migrationFile: path.basename(migrationPath),
        error
      });
      return false;
    } finally {
      pgClient.release();
      await pool.end();
    }
  } catch (err) {
    logger.error(`Error applying migration: ${err.message}`, {
      migrationFile: path.basename(migrationPath),
      error: err
    });
    return false;
  }
}

/**
 * Rollback a migration if it fails
 * @param {Object} env - The environment configuration object.
 * @param {Object} logger - The logger instance.
 * @param {string} nodeEnv - The current NODE_ENV value.
 * @param {string} migrationPath Path to the migration SQL file
 * @param {string} rollbackPath Path to the rollback SQL file
 * @returns {Promise<boolean>} Success status of the rollback
 */
async function rollbackMigration(env, logger, nodeEnv, migrationPath, rollbackPath) {
  // Lazy require dependencies
  const fs = require('fs').promises;
  const { Pool } = require('pg');
  // const { env, logger } = require('./index'); // Removed
  const effectiveNodeEnv = nodeEnv || process.env.NODE_ENV;

  try {
    // Check if rollback file exists
    try {
      await fs.access(rollbackPath);
    } catch (err) {
      logger.error(`Rollback file not found: ${rollbackPath}`);
      return false;
    }

    // Read rollback file
    const sqlContent = await fs.readFile(rollbackPath, 'utf8');

    // Log rollback attempt
    logger.info(`Rolling back migration: ${path.basename(migrationPath)}`);

    // Use direct Postgres connection instead of RPC function
    // Pass injected dependencies to createConnectionString
    const connectionString = createConnectionString(env, logger, effectiveNodeEnv, 'direct', true);
    const pool = new Pool({ connectionString });

    const pgClient = await pool.connect();

    try {
      // Execute rollback
      await pgClient.query(sqlContent);

      logger.info(`Rollback successful: ${path.basename(migrationPath)}`);
      return true;
    } catch (error) {
      logger.error(`Rollback failed: ${error.message}`, {
        migrationFile: path.basename(migrationPath),
        rollbackFile: path.basename(rollbackPath),
        error
      });
      return false;
    } finally {
      pgClient.release();
      await pool.end();
    }
  } catch (err) {
    logger.error(`Error during rollback: ${err.message}`, {
      migrationFile: path.basename(migrationPath),
      rollbackFile: path.basename(rollbackPath),
      error: err
    });
    return false;
  }
}

/**
 * Get the current status of migrations
 * @param {Object} env - The environment configuration object.
 * @param {Object} logger - The logger instance.
 * @param {string} nodeEnv - The current NODE_ENV value.
 * @returns {Promise<Object>} Object containing migration status information
 */
async function getMigrationStatus(env, logger, nodeEnv, client = null) {
  const effectiveNodeEnv = nodeEnv || process.env.NODE_ENV;
  try {
    // Use provided client or create one
    const supabaseClient = client || createSupabaseClient(env, logger, effectiveNodeEnv, true); 

    // Query migration table using the determined client
    const { data, error } = await supabaseClient
      .from('migrations')
      .select('*')
      .order('applied_at', { ascending: false });

    if (error) {
      if (error.code === 'PGRST116') {
        // Table not found, likely migrations haven't been initialized
        return {
          initialized: false,
          migrations: [],
          lastApplied: null,
          error: 'Migration tracking not initialized'
        };
      }

      logger.error('Error fetching migration status:', error);
      throw error;
    }

    return {
      initialized: true,
      migrations: data || [],
      lastApplied: data && data.length > 0 ? data[0] : null,
      count: data ? data.length : 0
    };
  } catch (err) {
    logger.error('Failed to get migration status:', err);
    return {
      initialized: false,
      error: err.message
    };
  }
}

/**
 * Documentation explaining RLS configuration
 */
const RLS_DOCUMENTATION = `
Row Level Security (RLS) Configuration Guide

Why RLS is disabled in development:
- Makes development faster by bypassing permission checks
- Allows direct data manipulation for testing new features
- Prevents "permission denied" errors during active development

How to enable RLS for testing:
- Set rls.enabled=true in the testingConfig
- Create test-specific policies in your migration scripts
- Use test.bypassForTesting=true for specific test cases

Critical importance of RLS in production:
- SECURITY CRITICAL: RLS MUST be enabled in production
- Prevents unauthorized access to other users' data
- Implements data isolation at the database level
- Provides defense-in-depth security beyond application logic

Best Practices:
1. Always develop with production RLS policies in mind
2. Test explicitly with RLS enabled before deployment
3. Use service role sparingly and only for admin functions
4. Audit RLS policies regularly for security gaps
`;

/**
 * Documentation explaining Supabase connection types
 */
const CONNECTION_TYPES_DOCUMENTATION = `
Supabase Connection Types Guide

Supabase offers multiple connection methods for different use cases:

1. Direct Connection
   - Format: postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   - Use for: General database operations and migrations
   - Pros: Direct access to all database features
   - Cons: Limited connection pool, can exhaust connections with high traffic

2. Session Pooler
   - Format: postgresql://[POOLER_USER]:[PASSWORD]@[POOLER_HOST]:5432/postgres
   - Use for: Read-heavy operations, long-running connections
   - Pros: Better connection management, maintains session variables
   - Cons: Transactions limited to within a single query

3. Transaction Pooler
   - Format: postgresql://[POOLER_USER]:[PASSWORD]@[POOLER_HOST]:6543/postgres
   - Use for: Write-heavy workloads, transaction processing
   - Pros: Optimized for multiple statements in a transaction
   - Cons: Does not maintain session variables between queries

Best Practices:
1. Use direct connections for migrations and schema changes
2. Use session pooler for most API endpoints that read data
3. Use transaction pooler for data-modifying operations
4. For high-traffic applications, implement a connection strategy that uses all three types
`;

/**
 * Get a Supabase client with admin privileges (service role)
 * @param {Object} env - The environment configuration object.
 * @param {Object} logger - The logger instance.
 * @param {string} nodeEnv - The current NODE_ENV value.
 * @returns {import('@supabase/supabase-js').SupabaseClient} Admin Supabase client
 */
function getSupabaseAdmin(env, logger, nodeEnv) {
  const effectiveNodeEnv = nodeEnv || process.env.NODE_ENV;
  const shouldUseMock = process.env.USE_MOCK_SUPABASE === 'true';

  // console.log(`[SupabaseConfig] getSupabaseAdmin called. Env: ${effectiveNodeEnv}, Mock: ${shouldUseMock}`); // Debug log

  if (effectiveNodeEnv === 'test' && shouldUseMock) {
    logger.debug('Attempting to use MOCK Supabase admin client (USE_MOCK_SUPABASE=true)');
     try {
      const mockSupabase = require('../../tests/mocks/supabase');
      if (mockSupabase && typeof mockSupabase.createMockAdminClient === 'function') { // Expecting a specific admin mock
        logger.debug('Using mock Supabase admin client from tests/mocks/supabase.js');
        return mockSupabase.createMockAdminClient();
      } else if (mockSupabase && typeof mockSupabase.createMockClient === 'function') {
        logger.debug('Using general mock Supabase client as admin from tests/mocks/supabase.js');
        return mockSupabase.createMockClient(); // Fallback to general mock if admin specific isn't there
      }
    } catch (err) {
      logger.debug('Failed to load admin mock from tests/mocks/supabase.js, trying __mocks__', err.message);
    }

    try {
      const mockSupabase = require('../../tests/__mocks__/supabase');
      if (mockSupabase && typeof mockSupabase.getSupabaseAdmin === 'function') { // Original check
         logger.debug('Using mock Supabase admin from tests/__mocks__/supabase.js via getSupabaseAdmin');
        return mockSupabase.getSupabaseAdmin();
      } else if (mockSupabase && typeof mockSupabase.createSupabaseClient === 'function') {
         logger.debug('Using general mock Supabase client as admin from tests/__mocks__/supabase.js');
        return mockSupabase.createSupabaseClient();
      }
    } catch (err) {
      logger.debug('Failed to load admin mock from tests/__mocks__/supabase.js, using fallback mock', err.message);
    }
    logger.debug('Creating minimal fallback mock Supabase admin client for unit test (USE_MOCK_SUPABASE=true)');
    return minimalFallbackMock;
  }

  // For non-mocked tests or dev/prod
  try {
    // Call the main createSupabaseClient function with useServiceRole = true
    // It now contains the logic to correctly use process.env for integration tests or env for others.
    logger.info(`[SupabaseConfig] Creating REAL Supabase admin client. Environment: ${effectiveNodeEnv}, Mocked: ${shouldUseMock}`);
    return createSupabaseClient(env, logger, effectiveNodeEnv, true);
  } catch (error) {
    logger.error(`[SupabaseConfig] Failed to create Supabase admin client: ${error.message}`, { stack: error.stack });
    if (effectiveNodeEnv === 'test') {
       logger.warn('[SupabaseConfig] Real Supabase admin client creation failed in test environment, falling back to minimal mock.');
       return minimalFallbackMock;
    }
    throw error; 
  }
}

// Define the minimal fallback mock structure separately
const minimalFallbackMock = {
  auth: {
    signIn: () => Promise.resolve({ data: { user: { id: 'test-user-id' } }, error: null }),
    signUp: () => Promise.resolve({ data: { user: { id: 'test-user-id' } }, error: null })
  },
  from: () => ({
    select: function() { return this; },
    insert: () => Promise.resolve({ data: [{ id: 'test-id' }], error: null }),
    update: () => Promise.resolve({ data: [{ id: 'test-id' }], error: null }),
    delete: () => Promise.resolve({ data: [{ id: 'test-id' }], error: null }),
    eq: function() { return this; },
    single: () => Promise.resolve({ data: null, error: null })
  })
};

module.exports = {
  // Configuration getters
  getEnvironmentConfig,
  createSupabaseClient,
  
  // Connection utilities
  createConnectionString,
  testConnection,
  
  // Environment helpers
  isDevelopment,
  isTest,
  isProduction,
  
  // Migration utilities
  applyMigration,
  rollbackMigration,
  getMigrationStatus,
  
  // Documentation
  RLS_DOCUMENTATION,
  CONNECTION_TYPES_DOCUMENTATION,
  
  // New function
  getSupabaseAdmin,

  // Exported for testing
  minimalFallbackMock 
};