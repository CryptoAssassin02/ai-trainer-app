/**
 * @fileoverview Database Migration Utility
 * 
 * This module provides utilities for managing database migrations.
 * It reads SQL migration files from the migrations directory and executes them in order.
 * Migrations are tracked in a migrations table to avoid applying them multiple times.
 * Transactions are used to ensure migrations are atomic and can be rolled back if they fail.
 */

const fs = require('fs/promises');
const path = require('path');
const { Pool } = require('pg');
const { logger, env } = require('../config');
const { 
  createConnectionString, 
  getPoolConfig, 
  testConnection,
  createConnectionWithFallback,
  createSupabaseClient
} = require('./supabase');
const dns = require('dns').promises;

// Migration directory relative to project root
const MIGRATIONS_DIR = env.migrations?.directory || path.join(__dirname, '../migrations');

/**
 * Create a connection pool with fallback options
 * @returns {Promise<Object>} Connection pool and details
 */
async function createConnectionPool() {
  try {
    logger.info('Setting up database connection for migrations...');
    
    // First try using environment variable connection strings
    const connectionResult = await createConnectionWithFallback({
      types: ['direct', 'sessionPooler', 'transactionPooler'],
      useServiceRole: true // Always use service role for migrations
    });
    
    if (!connectionResult.success) {
      throw new Error(`Failed to establish any database connection: ${connectionResult.error}`);
    }
    
    logger.info(`Successfully established database connection using ${connectionResult.type} connection`);
    
    // Create pool with appropriate configuration
    const pool = new Pool({
      connectionString: connectionResult.connectionString,
      ...getPoolConfig(connectionResult.type)
    });
    
    // Ensure pool errors are caught
    pool.on('error', (err) => {
      logger.error('Unexpected error on idle PostgreSQL client', err);
      // Don't exit process here - just log the error
    });
    
    return { 
      pool, 
      connectionType: connectionResult.type,
      connectionString: connectionResult.connectionString
    };
  } catch (error) {
    logger.error('Failed to create connection pool:', error);
    throw new Error(`Database connection failed: ${error.message}`);
  }
}

/**
 * Ensure the migrations table exists
 * @param {Object} client - PostgreSQL client
 * @returns {Promise<void>}
 */
async function ensureMigrationsTable(client) {
  try {
    logger.info('Checking if migrations table exists...');
    
    // Check if migrations table exists
    const existsResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'migrations'
      );
    `);
    
    // If the table doesn't exist, create it
    if (!existsResult.rows[0].exists) {
      logger.info('Creating migrations table...');
      
      try {
        await client.query(`
          CREATE TABLE migrations (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            hash VARCHAR(64) NOT NULL,
            applied_at TIMESTAMPTZ DEFAULT now(),
            success BOOLEAN NOT NULL,
            error_message TEXT,
            execution_time INTEGER, -- milliseconds
            connection_type VARCHAR(50)
          );
        `);
        
        logger.info('Migrations table created successfully');
      } catch (createError) {
        // Handle "must be owner" error specifically
        if (createError.message.includes('must be owner of table') || 
            createError.message.includes('permission denied')) {
          logger.warn('Permission error creating migrations table - may be using unprivileged connection');
          
          // Try alternative approach - check if you can at least query the table
          try {
            await client.query('SELECT * FROM migrations LIMIT 1');
            logger.info('Migrations table exists but we lack schema modification privileges');
            return; // Table exists, we can proceed with limited permissions
          } catch (queryError) {
            // If we can't even query, rethrow with more helpful message
            throw new Error(`Insufficient database permissions: ${createError.message}`);
          }
        }
        throw createError; // Re-throw other errors
      }
    }
  } catch (error) {
    logger.error('Error ensuring migrations table exists:', error);
    
    // Add detailed error information
    if (error.code === '28P01') {
      throw new Error('Authentication failed: Invalid database credentials');
    } else if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
      throw new Error(`DNS resolution failed: Cannot resolve database host - ${error.message}`);
    } else if (error.code === '42501') {
      throw new Error('Permission denied: Insufficient privileges for database operation');
    } else {
      throw new Error(`Failed to create/check migrations table: ${error.message}`);
    }
  }
}

/**
 * Get a list of all migration files
 * @returns {Promise<Array<string>>} List of migration file names
 */
async function getMigrationFiles() {
  try {
    logger.info(`Reading migration files from ${MIGRATIONS_DIR}`);
    const files = await fs.readdir(MIGRATIONS_DIR);
    return files
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort alphabetically to ensure correct order
  } catch (error) {
    logger.error('Error reading migration files:', error);
    throw new Error(`Failed to read migration files: ${error.message}`);
  }
}

/**
 * Get a list of already applied migrations
 * @param {Object} client - PostgreSQL client
 * @returns {Promise<Array<string>>} List of applied migration names
 */
async function getAppliedMigrations(client) {
  try {
    const result = await client.query(`
      SELECT name 
      FROM migrations 
      WHERE success = true
      ORDER BY name;
    `);
    
    return result.rows.map(row => row.name);
  } catch (error) {
    logger.error('Error getting applied migrations:', error);
    
    // Check if the error is because the table doesn't exist yet
    if (error.message.includes('relation "migrations" does not exist')) {
      logger.info('Migrations table does not exist yet - no migrations have been applied');
      return [];
    }
    
    throw new Error(`Failed to get applied migrations: ${error.message}`);
  }
}

/**
 * Read the content of a migration file
 * @param {string} filename - Name of the migration file
 * @returns {Promise<string>} Content of the migration file
 */
async function readMigrationFile(filename) {
  try {
    const filePath = path.join(MIGRATIONS_DIR, filename);
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    logger.error(`Error reading migration file ${filename}:`, error);
    throw new Error(`Failed to read migration file ${filename}: ${error.message}`);
  }
}

/**
 * Calculate a simple hash of the file content
 * @param {string} content - Content to hash
 * @returns {string} Hash of the content
 */
function calculateHash(content) {
  let hash = 0;
  if (content.length === 0) return hash.toString(16);
  
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return hash.toString(16);
}

/**
 * Execute a single migration
 * @param {Object} client - PostgreSQL client
 * @param {string} filename - Name of the migration file
 * @param {boolean} dryRun - Whether to do a dry run without executing
 * @param {string} connectionType - Type of database connection being used
 * @returns {Promise<Object>} Result of the migration
 */
async function executeMigration(client, filename, dryRun = false, connectionType = 'direct') {
  const startTime = Date.now();
  let transactionActive = false;
  
  try {
    logger.info(`${dryRun ? '[DRY RUN] ' : ''}Executing migration: ${filename}`);
    
    // Read the migration file
    const sql = await readMigrationFile(filename);
    const hash = calculateHash(sql);
    
    if (dryRun) {
      logger.info(`[DRY RUN] Would execute SQL from ${filename}:`);
      logger.info('----------------------');
      logger.info(sql.slice(0, 500) + (sql.length > 500 ? '...' : ''));
      logger.info('----------------------');
      return {
        name: filename,
        success: true,
        dryRun: true,
        hash,
        executionTime: Date.now() - startTime,
        connectionType
      };
    }
    
    // Start a transaction
    try {
      await client.query('BEGIN');
      transactionActive = true;
    } catch (txnError) {
      logger.warn(`Could not start transaction for ${filename}: ${txnError.message}`);
      logger.warn('Proceeding without transaction - migration will not be atomic');
      // Continue without transaction
    }
    
    // Execute the migration
    try {
      await client.query(sql);
    } catch (sqlError) {
      // Check for permission errors
      if (sqlError.message.includes('must be owner') || 
          sqlError.message.includes('permission denied')) {
        throw new Error(`Permission error: ${sqlError.message}. Make sure to use the service role key for migrations.`);
      }
      
      // Check for syntax errors
      if (sqlError.message.includes('syntax error')) {
        throw new Error(`SQL syntax error in migration ${filename}: ${sqlError.message}`);
      }
      
      throw sqlError; // Re-throw other errors
    }
    
    // Record the migration
    try {
      await client.query(`
        INSERT INTO migrations (name, hash, success, execution_time, connection_type)
        VALUES ($1, $2, true, $3, $4)
        ON CONFLICT (name)
        DO UPDATE SET
          hash = EXCLUDED.hash,
          success = EXCLUDED.success,
          applied_at = now(),
          execution_time = EXCLUDED.execution_time,
          error_message = NULL,
          connection_type = EXCLUDED.connection_type;
      `, [filename, hash, Date.now() - startTime, connectionType]);
    } catch (recordError) {
      // If we can't record the migration but it executed successfully,
      // log a warning but don't fail the migration
      logger.warn(`Migration ${filename} executed but could not be recorded: ${recordError.message}`);
      logger.warn('You may see this migration again in future runs');
      
      // If we have a transaction, we should roll back to maintain consistency
      if (transactionActive) {
        throw recordError;
      }
    }
    
    // Commit the transaction if active
    if (transactionActive) {
      await client.query('COMMIT');
      transactionActive = false;
    }
    
    logger.info(`Migration ${filename} completed successfully (${Date.now() - startTime}ms)`);
    
    return {
      name: filename,
      success: true,
      hash,
      executionTime: Date.now() - startTime,
      connectionType
    };
  } catch (error) {
    logger.error(`Migration ${filename} failed:`, error);
    
    // Attempt to rollback the transaction if active
    if (transactionActive) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        logger.error('Error rolling back transaction:', rollbackError);
      }
    }
    
    // Record the failed migration if not a dry run
    if (!dryRun) {
      try {
        const sql = await readMigrationFile(filename);
        const hash = calculateHash(sql);
        
        await client.query(`
          INSERT INTO migrations (name, hash, success, error_message, execution_time, connection_type)
          VALUES ($1, $2, false, $3, $4, $5)
          ON CONFLICT (name)
          DO UPDATE SET
            hash = EXCLUDED.hash,
            success = EXCLUDED.success,
            applied_at = now(),
            error_message = EXCLUDED.error_message,
            execution_time = EXCLUDED.execution_time,
            connection_type = EXCLUDED.connection_type;
        `, [filename, hash, error.message, Date.now() - startTime, connectionType]);
      } catch (recordError) {
        logger.error('Failed to record migration failure:', recordError);
      }
    }
    
    throw new Error(`Migration failed: ${error.message}`);
  }
}

/**
 * Run all pending migrations
 * @param {Object} options - Options for running migrations
 * @param {boolean} options.dryRun - Whether to do a dry run without executing
 * @param {string} options.file - Specific file to migrate (optional)
 * @returns {Promise<Object>} Result of the migrations
 */
async function runMigrations(options = {}) {
  const { dryRun = false, file = null } = options;
  let client = null;
  let pool = null;
  let connectionType = 'unknown';
  
  try {
    // Create connection pool with fallback
    const connection = await createConnectionPool();
    pool = connection.pool;
    connectionType = connection.connectionType;
    client = await pool.connect();
    
    logger.info(`Connected to database using ${connectionType} connection`);
    
    // Get list of migration files
    let files = await getMigrationFiles();
    
    // If a specific file was requested, only include that one
    if (file) {
      if (!files.includes(file)) {
        throw new Error(`Migration file not found: ${file}`);
      }
      files = [file];
    }
    
    if (files.length === 0) {
      logger.info('No migration files found');
      return { success: true, executed: [], connectionType };
    }
    
    // Ensure migrations table exists
    if (!dryRun) {
      await ensureMigrationsTable(client);
    }
    
    // Get list of already applied migrations
    const appliedMigrations = dryRun ? [] : await getAppliedMigrations(client);
    
    // Filter out already applied migrations unless a specific file was requested
    const pendingMigrations = file 
      ? files
      : files.filter(f => !appliedMigrations.includes(f));
    
    if (pendingMigrations.length === 0 && !file) {
      logger.info('No pending migrations to apply');
      return { success: true, executed: [], connectionType };
    }
    
    logger.info(`Found ${pendingMigrations.length} migrations to apply${dryRun ? ' (dry run)' : ''}`);
    
    // Execute each migration
    const results = [];
    for (const migrationFile of pendingMigrations) {
      try {
        const result = await executeMigration(client, migrationFile, dryRun, connectionType);
        results.push(result);
      } catch (error) {
        return {
          success: false,
          executed: results,
          error: `Migration failed: ${error.message}`,
          connectionType
        };
      }
    }
    
    return {
      success: true,
      executed: results,
      connectionType
    };
  } catch (error) {
    logger.error('Failed to run migrations:', error);
    return {
      success: false,
      error: error.message,
      connectionType
    };
  } finally {
    if (client) client.release();
    if (pool) {
      try {
        await pool.end();
      } catch (endError) {
        logger.error('Error closing connection pool:', endError);
      }
    }
  }
}

/**
 * Get the status of all migrations
 * @returns {Promise<Object>} Migration status
 */
async function getMigrationStatus() {
  let client = null;
  let pool = null;
  let connectionType = 'unknown';
  
  try {
    // Create connection pool with service role key
    const connection = await createConnectionPool();
    pool = connection.pool;
    connectionType = connection.connectionType;
    client = await pool.connect();
    
    logger.info(`Connected to database using ${connectionType} connection`);
    
    // Ensure migrations table exists
    await ensureMigrationsTable(client);
    
    // Get list of migration files
    const files = await getMigrationFiles();
    
    // Get list of applied migrations
    const result = await client.query(`
      SELECT name, hash, applied_at, success, error_message, execution_time, connection_type
      FROM migrations 
      ORDER BY applied_at;
    `);
    
    // Build status object
    const appliedMap = new Map(result.rows.map(m => [m.name, m]));
    const status = {
      total: files.length,
      applied: result.rows.filter(m => m.success).length,
      failed: result.rows.filter(m => !m.success).length,
      pending: files.filter(f => !appliedMap.has(f) || !appliedMap.get(f).success).length,
      connectionType,
      migrations: files.map(file => {
        const appliedMigration = appliedMap.get(file);
        return {
          name: file,
          applied: Boolean(appliedMigration?.success),
          status: !appliedMigration 
            ? 'pending' 
            : (appliedMigration.success ? 'success' : 'failed'),
          appliedAt: appliedMigration?.applied_at,
          executionTime: appliedMigration?.execution_time,
          error: appliedMigration?.error_message,
          connectionType: appliedMigration?.connection_type || 'unknown'
        };
      })
    };
    
    return status;
  } catch (error) {
    logger.error('Failed to get migration status:', error);
    
    // Return partial status with error information
    return {
      error: error.message,
      connectionType,
      success: false
    };
  } finally {
    if (client) client.release();
    if (pool) {
      try {
        await pool.end();
      } catch (endError) {
        logger.error('Error closing connection pool:', endError);
      }
    }
  }
}

/**
 * @fileoverview Database migrations for Supabase
 * Contains functions to create and update database tables
 */

/**
 * Create profiles table if it doesn't exist
 * 
 * @returns {Promise<boolean>} Whether the operation was successful
 */
const createProfilesTable = async () => {
  try {
    const supabase = createSupabaseClient();
    
    // Check if table exists
    const { data: existingTables } = await supabase.rpc('get_tables');
    if (existingTables && existingTables.includes('profiles')) {
      logger.info('Profiles table already exists, skipping creation');
      return true;
    }
    
    // Create the table
    const { error } = await supabase.rpc('create_profiles_table');
    
    if (error) {
      logger.error('Error creating profiles table:', error);
      return false;
    }
    
    logger.info('Successfully created profiles table');
    return true;
  } catch (error) {
    logger.error('Error in createProfilesTable:', error);
    return false;
  }
};

/**
 * Create workouts table if it doesn't exist
 * 
 * @returns {Promise<boolean>} Whether the operation was successful
 */
const createWorkoutsTable = async () => {
  try {
    const supabase = createSupabaseClient();
    
    // Check if table exists
    const { data: existingTables } = await supabase.rpc('get_tables');
    if (existingTables && existingTables.includes('workouts')) {
      logger.info('Workouts table already exists, skipping creation');
      return true;
    }
    
    // Create the table
    const { error } = await supabase.rpc('create_workouts_table');
    
    if (error) {
      logger.error('Error creating workouts table:', error);
      return false;
    }
    
    logger.info('Successfully created workouts table');
    return true;
  } catch (error) {
    logger.error('Error in createWorkoutsTable:', error);
    return false;
  }
};

/**
 * Create refresh_tokens table if it doesn't exist
 * 
 * @returns {Promise<boolean>} Whether the operation was successful
 */
const createRefreshTokensTable = async () => {
  try {
    const supabase = createSupabaseClient();
    
    // Check if table exists
    const { data: existingTables } = await supabase.rpc('get_tables');
    if (existingTables && existingTables.includes('refresh_tokens')) {
      logger.info('Refresh tokens table already exists, skipping creation');
      return true;
    }
    
    // Create the table using raw SQL for more control
    const { error } = await supabase.rpc('create_refresh_tokens_table');
    
    if (error) {
      logger.error('Error creating refresh tokens table:', error);
      return false;
    }
    
    logger.info('Successfully created refresh tokens table');
    return true;
  } catch (error) {
    logger.error('Error in createRefreshTokensTable:', error);
    return false;
  }
};

/**
 * Create blacklisted_tokens table if it doesn't exist
 * This table is used for token blacklisting (revocation)
 * 
 * @returns {Promise<boolean>} Whether the operation was successful
 */
const createBlacklistedTokensTable = async () => {
  try {
    const supabase = createSupabaseClient();
    
    // Check if table exists
    const { data: existingTables } = await supabase.rpc('get_tables');
    if (existingTables && existingTables.includes('blacklisted_tokens')) {
      logger.info('Blacklisted tokens table already exists, skipping creation');
      return true;
    }
    
    // Create SQL query for the table
    const query = `
      CREATE TABLE blacklisted_tokens (
        jti TEXT PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        reason TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Create index for faster lookups
      CREATE INDEX idx_blacklisted_tokens_expires_at ON blacklisted_tokens(expires_at);
      
      -- Create RLS policies
      ALTER TABLE blacklisted_tokens ENABLE ROW LEVEL SECURITY;
      
      -- Policy for admins to see all tokens
      CREATE POLICY "Admins can see all blacklisted tokens" 
        ON blacklisted_tokens
        FOR SELECT
        TO authenticated
        USING (auth.jwt() ->> 'role' = 'admin');
        
      -- Policy for users to see only their tokens
      CREATE POLICY "Users can see their own blacklisted tokens" 
        ON blacklisted_tokens
        FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id);
        
      -- Policy to allow insert from server-side code
      CREATE POLICY "Allow server-side blacklisting" 
        ON blacklisted_tokens
        FOR INSERT
        TO authenticated
        WITH CHECK (true);
        
      -- Policy to allow cleanup of expired tokens
      CREATE POLICY "Allow deletion of expired tokens by admins" 
        ON blacklisted_tokens
        FOR DELETE
        TO authenticated
        USING (auth.jwt() ->> 'role' = 'admin' OR expires_at < CURRENT_TIMESTAMP);
    `;
    
    // Execute the query
    const { error } = await supabase.rpc('execute_sql', { query });
    
    if (error) {
      logger.error('Error creating blacklisted tokens table:', error);
      return false;
    }
    
    logger.info('Successfully created blacklisted tokens table');
    return true;
  } catch (error) {
    logger.error('Error in createBlacklistedTokensTable:', error);
    return false;
  }
};

/**
 * Create workout_logs table if it doesn't exist
 * 
 * @returns {Promise<boolean>} Whether the operation was successful
 */
const createWorkoutLogsTable = async () => {
  try {
    const supabase = createSupabaseClient();
    
    // Check if table exists
    const { data: existingTables } = await supabase.rpc('get_tables');
    if (existingTables && existingTables.includes('workout_logs')) {
      logger.info('Workout logs table already exists, skipping creation');
      return true;
    }
    
    // Create the table
    const { error } = await supabase.rpc('create_workout_logs_table');
    
    if (error) {
      logger.error('Error creating workout logs table:', error);
      return false;
    }
    
    logger.info('Successfully created workout logs table');
    return true;
  } catch (error) {
    logger.error('Error in createWorkoutLogsTable:', error);
    return false;
  }
};

/**
 * Create check_ins table if it doesn't exist
 * 
 * @returns {Promise<boolean>} Whether the operation was successful
 */
const createCheckInsTable = async () => {
  try {
    const supabase = createSupabaseClient();
    
    // Check if table exists
    const { data: existingTables } = await supabase.rpc('get_tables');
    if (existingTables && existingTables.includes('check_ins')) {
      logger.info('Check-ins table already exists, skipping creation');
      return true;
    }
    
    // Create the table
    const { error } = await supabase.rpc('create_check_ins_table');
    
    if (error) {
      logger.error('Error creating check-ins table:', error);
      return false;
    }
    
    logger.info('Successfully created check-ins table');
    return true;
  } catch (error) {
    logger.error('Error in createCheckInsTable:', error);
    return false;
  }
};

/**
 * Run all database migrations
 * 
 * @returns {Promise<boolean>} Whether all migrations were successful
 */
const runAllTableMigrations = async () => {
  try {
    logger.info('Starting database migrations...');
    
    // Run all migrations in sequence
    const profilesSuccess = await createProfilesTable();
    const workoutsSuccess = await createWorkoutsTable();
    const refreshTokensSuccess = await createRefreshTokensTable();
    const blacklistedTokensSuccess = await createBlacklistedTokensTable();
    const workoutLogsSuccess = await createWorkoutLogsTable();
    const checkInsSuccess = await createCheckInsTable();
    
    // Check if all migrations were successful
    const allSuccessful = 
      profilesSuccess && 
      workoutsSuccess && 
      refreshTokensSuccess && 
      blacklistedTokensSuccess &&
      workoutLogsSuccess && 
      checkInsSuccess;
    
    if (allSuccessful) {
      logger.info('All database migrations completed successfully');
    } else {
      logger.warn('Some database migrations failed');
    }
    
    return allSuccessful;
  } catch (error) {
    logger.error('Error running migrations:', error);
    return false;
  }
};

module.exports = {
  ensureMigrationsTable,
  getMigrationFiles,
  getAppliedMigrations,
  readMigrationFile,
  executeMigration,
  runMigrations,
  getMigrationStatus,
  createConnectionPool,
  createProfilesTable,
  createWorkoutsTable,
  createRefreshTokensTable,
  createBlacklistedTokensTable,
  createWorkoutLogsTable,
  createCheckInsTable,
  runAllTableMigrations
}; 