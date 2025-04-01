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
const { env, logger } = require('./index');
const path = require('path');
const fs = require('fs').promises;
const dns = require('dns').promises;

/**
 * Development Configuration
 * - RLS disabled for easier development
 * - Extended timeouts for debugging
 * - Verbose logging enabled
 */
const developmentConfig = {
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
};

/**
 * Testing Configuration
 * - Isolated database for tests
 * - Disabled triggers for faster tests
 * - Test-specific RLS settings
 */
const testingConfig = {
  // Connection settings
  url: env.supabase.url,
  key: env.supabase.anonKey,
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
    direct: env.supabase.databaseUrl,
    sessionPooler: env.supabase.databaseUrlPoolerSession,
    transactionPooler: env.supabase.databaseUrlPoolerTransaction
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
};

/**
 * Production Configuration
 * - RLS strictly enabled
 * - Minimal logging for performance
 * - Optimized connection settings
 */
const productionConfig = {
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
};

/**
 * Get the appropriate configuration based on current environment
 * @returns {Object} Environment-specific configuration
 */
function getEnvironmentConfig() {
  if (isDevelopment()) {
    return developmentConfig;
  } else if (isTest()) {
    return testingConfig;
  } else if (isProduction()) {
    return productionConfig;
  }
  
  // Default to development if not specified
  logger.warn('Environment not specified, defaulting to development configuration');
  return developmentConfig;
}

/**
 * Check if the application is running in development mode
 * @returns {boolean} True if in development mode
 */
function isDevelopment() {
  return env.env === 'development';
}

/**
 * Check if the application is running in test mode
 * @returns {boolean} True if in test mode
 */
function isTest() {
  return env.env === 'test';
}

/**
 * Check if the application is running in production mode
 * @returns {boolean} True if in production mode
 */
function isProduction() {
  return env.env === 'production';
}

/**
 * Create a Supabase client with environment-specific configuration
 * @param {boolean} [useServiceRole=false] Whether to use the service role key for admin operations
 * @returns {import('@supabase/supabase-js').SupabaseClient} Configured Supabase client
 */
function createSupabaseClient(useServiceRole = false) {
  const config = getEnvironmentConfig();
  const key = useServiceRole ? env.supabase.serviceRoleKey : config.key;
  
  // Log connection details for development and test environments
  if (isDevelopment() || isTest()) {
    logger.debug('Creating Supabase client with config:', {
      environment: env.env,
      url: config.url,
      usingServiceRole: useServiceRole,
      rlsEnabled: config.rls.enabled
    });
  }
  
  return createClient(config.url, key, config.options);
}

/**
 * Create a connection string from individual environment variables
 * 
 * @param {string} [connectionType='direct'] - Type of connection: 'direct', 'sessionPooler', or 'transactionPooler'
 * @param {boolean} [useServiceRole=false] - Whether to use the service role key instead of password
 * @returns {string} PostgreSQL connection string formatted according to Supabase standards
 */
function createConnectionString(connectionType = 'direct', useServiceRole = false) {
  const config = getEnvironmentConfig();
  
  // First try to use pre-configured connection strings from environment
  if (config.connectionStrings && config.connectionStrings[connectionType]) {
    return config.connectionStrings[connectionType];
  }
  
  // If not available, construct the connection string manually
  // Extract project reference from the Supabase URL
  const projectRef = env.supabase.projectRef || 
                    (env.supabase.url ? new URL(env.supabase.url).hostname.split('.')[0] : null);
  
  if (!projectRef) {
    throw new Error("Could not determine Supabase project reference. Please set SUPABASE_PROJECT_REF in .env");
  }
  
  // Determine the password to use (service role key or regular password)
  const password = useServiceRole ? env.supabase.serviceRoleKey : env.supabase.databasePassword;
  
  // Format connection string based on connection type
  switch (connectionType) {
    case 'direct':
      // Format: postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
      return `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres`;
      
    case 'sessionPooler':
      // Format: postgresql://[POOLER_USER]:[PASSWORD]@[POOLER_HOST]:5432/postgres
      return `postgresql://postgres.${projectRef}:${password}@${env.supabase.poolerHost || 'aws-0-us-east-2.pooler.supabase.com'}:5432/postgres`;
      
    case 'transactionPooler':
      // Format: postgresql://[POOLER_USER]:[PASSWORD]@[POOLER_HOST]:6543/postgres
      return `postgresql://postgres.${projectRef}:${password}@${env.supabase.poolerHost || 'aws-0-us-east-2.pooler.supabase.com'}:6543/postgres`;
      
    default:
      // Default to direct connection if unknown type specified
      logger.warn(`Unknown connection type: ${connectionType}, defaulting to direct connection`);
      return `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres`;
  }
}

/**
 * Test a database connection and handle DNS resolution issues
 * @param {string} connectionString - The PostgreSQL connection string
 * @returns {Promise<Object>} Connection test result with status and error info
 */
async function testConnection(connectionString) {
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
    const { Pool } = require('pg');
    
    const pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: env.supabase.sslRejectUnauthorized !== false
      },
      // Add timeout to avoid hanging connections
      connectionTimeoutMillis: env.supabase.connectionTimeout || 30000
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
 * @param {string} migrationPath Path to the migration SQL file
 * @returns {Promise<boolean>} Success status of the migration
 */
async function applyMigration(migrationPath) {
  try {
    // Read migration file
    const sqlContent = await fs.readFile(migrationPath, 'utf8');
    
    // Log migration attempt
    logger.info(`Applying migration: ${path.basename(migrationPath)}`);
    
    // Use direct Postgres connection instead of RPC function
    const { Pool } = require('pg');
    
    const pool = new Pool({
      connectionString: env.supabase.databaseUrl || createConnectionString('direct', true)
    });
    
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
 * @param {string} migrationPath Path to the migration SQL file
 * @param {string} rollbackPath Path to the rollback SQL file
 * @returns {Promise<boolean>} Success status of the rollback
 */
async function rollbackMigration(migrationPath, rollbackPath) {
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
    const { Pool } = require('pg');
    
    const pool = new Pool({
      connectionString: env.supabase.databaseUrl || createConnectionString('direct', true)
    });
    
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
 * @returns {Promise<Object>} Object containing migration status information
 */
async function getMigrationStatus() {
  try {
    const client = createSupabaseClient(true); // Use service role for checking status
    
    // Query migration table (assuming it exists)
    const { data, error } = await client
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
  CONNECTION_TYPES_DOCUMENTATION
};