/**
 * @fileoverview Supabase connection utilities
 * Provides centralized functions for creating and managing Supabase database connections
 */

const { env } = require('../config');
const { Pool } = require('pg');
const dns = require('dns').promises;

/**
 * Parse project reference from Supabase URL or environment variable
 * @param {string} supabaseUrl - The Supabase project URL
 * @returns {string} Project reference
 * @throws {Error} If project reference cannot be determined
 */
function getProjectRef(supabaseUrl) {
  // First try to get from environment variable
  if (env.supabase.projectRef) {
    return env.supabase.projectRef;
  }

  try {
    // Extract from URL if not in environment
    const url = new URL(supabaseUrl);
    // Project ref is the second part of the hostname (db.[PROJECT-REF].supabase.co)
    const projectRef = url.hostname.split('.')[1];
    
    if (!projectRef) {
      throw new Error('Invalid Supabase URL format');
    }
    
    return projectRef;
  } catch (error) {
    throw new Error('Could not determine project reference. Please set SUPABASE_PROJECT_REF in .env');
  }
}

/**
 * Create a connection string for Supabase Postgres
 * @param {Object} options - Connection options
 * @param {string} [options.type='direct'] - Connection type ('direct', 'sessionPooler', or 'transactionPooler')
 * @param {boolean} [options.useServiceRole=true] - Whether to use service role key for authentication
 * @returns {string} Formatted connection string
 */
function createConnectionString(options = {}) {
  const {
    type = 'direct',
    useServiceRole = true
  } = options;

  // Always prioritize pre-configured connection strings from the env module
  const envConnections = {
    direct: env.supabase.databaseUrl,
    directServiceRole: env.supabase.databaseUrlServiceRole,
    sessionPooler: env.supabase.databaseUrlPoolerSession,
    transactionPooler: env.supabase.databaseUrlPoolerTransaction
  };

  // Use the appropriate pre-configured string when available
  if (useServiceRole && envConnections.directServiceRole) {
    return envConnections.directServiceRole;
  }
  
  if (envConnections[type]) {
    return envConnections[type];
  }
  
  // Get project reference and credentials
  const projectRef = getProjectRef(env.supabase.url);
  const password = useServiceRole ? env.supabase.serviceRoleKey : env.supabase.databasePassword;
  const poolerHost = env.supabase.poolerHost || 'aws-0-us-east-2.pooler.supabase.com';

  // Format string based on connection type
  switch (type) {
    case 'direct':
      return `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres`;

    case 'sessionPooler':
      return `postgresql://postgres.${projectRef}:${password}@${poolerHost}:5432/postgres`;

    case 'transactionPooler':
      return `postgresql://postgres.${projectRef}:${password}@${poolerHost}:6543/postgres`;

    default:
      throw new Error(`Invalid connection type: ${type}`);
  }
}

/**
 * Get optimized pool configuration based on connection type
 * @param {string} type - Connection type ('direct', 'sessionPooler', or 'transactionPooler')
 * @returns {Object} Pool configuration object
 */
function getPoolConfig(type = 'direct') {
  const baseConfig = {
    // SSL configuration
    ssl: {
      rejectUnauthorized: env.supabase.sslRejectUnauthorized !== false
    },
    // Connection timeouts
    connectionTimeoutMillis: env.supabase.connectionTimeout || 30000,
    idleTimeoutMillis: 120000, // 2 minutes
    // Query timeouts
    statement_timeout: 30000, // 30 seconds
    // Retry configuration
    max_retries: 3,
    retry_interval: 1000
  };

  switch (type) {
    case 'direct':
      return {
        ...baseConfig,
        // Conservative pool for direct connections
        max: 10,
        min: 1,
        // Shorter timeouts for direct connections
        connectionTimeoutMillis: 20000,
        statement_timeout: 20000
      };

    case 'sessionPooler':
      return {
        ...baseConfig,
        // Larger pool for read operations
        max: 20,
        min: 2,
        // Extended timeouts for long-running queries
        statement_timeout: 60000,
        // Session-specific settings
        application_name: 'session_pooler',
        keepalive: true
      };

    case 'transactionPooler':
      return {
        ...baseConfig,
        // Medium pool for write operations
        max: 15,
        min: 1,
        // Standard timeouts for transactions
        statement_timeout: 30000,
        // Transaction-specific settings
        application_name: 'transaction_pooler'
      };

    default:
      throw new Error(`Invalid connection type: ${type}`);
  }
}

/**
 * Test a database connection with DNS resolution check
 * @param {string} connectionString - The connection string to test
 * @returns {Promise<Object>} Connection test result
 */
async function testConnection(connectionString) {
  try {
    // Extract hostname for DNS check
    const url = new URL(connectionString);
    const hostname = url.hostname;

    try {
      // Check DNS resolution first
      const addresses = await dns.lookup(hostname, { all: true });
      if (!addresses || addresses.length === 0) {
        return {
          success: false,
          error: `DNS resolution failed for ${hostname}`,
          errorType: 'DNS_RESOLUTION_FAILED'
        };
      }
    } catch (dnsError) {
      return {
        success: false,
        error: `DNS resolution error: ${dnsError.message}`,
        errorType: 'DNS_RESOLUTION_ERROR'
      };
    }

    // Create pool with configuration
    const pool = new Pool({
      connectionString,
      ...getPoolConfig(
        connectionString.includes(':6543/') ? 'transactionPooler' :
        connectionString.includes('pooler.supabase.com:5432') ? 'sessionPooler' : 'direct'
      )
    });

    // Test connection
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT version()');
      return {
        success: true,
        version: result.rows[0].version,
        type: connectionString.includes(':6543/') ? 'transactionPooler' :
              connectionString.includes('pooler.supabase.com:5432') ? 'sessionPooler' : 'direct'
      };
    } finally {
      client.release();
      await pool.end();
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      errorType: error.code || 'CONNECTION_ERROR'
    };
  }
}

/**
 * Create a connection with fallback options
 * @param {Object} options - Connection options
 * @param {string[]} [options.types=['direct', 'sessionPooler', 'transactionPooler']] - Connection types to try
 * @param {boolean} [options.useServiceRole=true] - Whether to use service role key
 * @returns {Promise<Object>} Connection result with working connection string
 */
async function createConnectionWithFallback(options = {}) {
  const {
    types = ['direct', 'sessionPooler', 'transactionPooler'],
    useServiceRole = true
  } = options;

  let lastError = null;

  // Try each connection type in sequence
  for (const type of types) {
    try {
      const connectionString = createConnectionString({ type, useServiceRole });
      const testResult = await testConnection(connectionString);

      if (testResult.success) {
        return {
          success: true,
          connectionString,
          type,
          testResult
        };
      }

      lastError = testResult;
    } catch (error) {
      lastError = {
        success: false,
        error: error.message,
        errorType: 'CONNECTION_STRING_ERROR'
      };
    }
  }

  // If all attempts failed, return the last error
  return {
    success: false,
    error: lastError.error,
    errorType: lastError.errorType,
    attemptedTypes: types
  };
}

module.exports = {
  createConnectionString,
  getPoolConfig,
  getProjectRef,
  testConnection,
  createConnectionWithFallback
}; 