/**
 * @fileoverview Supabase Admin Service
 * 
 * This file provides admin-level operations for Supabase database management.
 * These functions require the service role key and should only be used in server-side code.
 * 
 * SECURITY WARNING: These functions bypass row-level security (RLS) policies.
 * Only use them for administrative tasks that genuinely require elevated permissions.
 * Always validate authentication and authorization before executing admin operations.
 */

const { createClient } = require('@supabase/supabase-js');
const { logger } = require('../config');
const { env } = require('../config');
const { createSupabaseClient, isProduction } = require('../config/supabase');
const { createConnectionString, getPoolConfig } = require('../utils/supabase');
const { Pool } = require('pg');

// Singleton instance for Supabase admin client
let supabaseAdminInstance = null;

/**
 * Security check to ensure we're not running in a browser environment
 * This helps prevent accidental exposure of the service role key
 */
function validateServerEnvironment() {
  if (typeof window !== 'undefined') {
    const error = new Error('CRITICAL SECURITY ERROR: Attempted to use service role key in browser environment');
    logger.error(error);
    throw error;
  }

  if (isProduction() && !env.supabase.serviceRoleKey) {
    const error = new Error('Service role key is missing in production environment');
    logger.error(error);
    throw error;
  }
}

/**
 * Authorization check to ensure the operation is allowed
 * This should be expanded based on your authorization model
 * @param {string} operation - The operation being performed
 * @param {Object} context - Context data about the request and user
 * @returns {boolean} Whether the operation is authorized
 */
function isAuthorizedAdminOperation(operation, context = {}) {
  // In a real implementation, this would check the user's role
  // and whether they're allowed to perform this specific operation
  
  // Log the admin operation attempt for audit purposes
  logger.info('Admin operation attempted', {
    operation,
    context,
    timestamp: new Date().toISOString()
  });
  
  // For now, we'll allow all server-side operations, but this should be expanded
  return true;
}

/**
 * Initialize or return the existing Supabase admin client instance
 * @returns {import('@supabase/supabase-js').SupabaseClient} Supabase admin client
 */
function getSupabaseAdmin() {
  // Security check
  validateServerEnvironment();
  
  if (supabaseAdminInstance) {
    return supabaseAdminInstance;
  }

  try {
    logger.info('Initializing Supabase admin client');
    // Use our new configuration helper with service role enabled
    supabaseAdminInstance = createSupabaseClient(true);
    logger.info('Supabase admin client initialized successfully');
    return supabaseAdminInstance;
  } catch (error) {
    logger.error('Failed to initialize Supabase admin client:', error);
    throw new Error('Failed to initialize admin database connection');
  }
}

/**
 * Log admin operations for security auditing
 * @param {string} operation - Name of the operation
 * @param {Object} details - Details of the operation
 * @param {Object} context - Request context (user, IP, etc.)
 */
function logAdminOperation(operation, details, context = {}) {
  logger.info('Admin operation executed', {
    operation,
    details,
    context,
    timestamp: new Date().toISOString()
  });
  
  // In a production system, you might want to store this in a dedicated audit log table
  // This could be implemented by adding a DB insert here
}

/**
 * Creates a new user with admin privileges
 * @param {Object} userData - User data including email and password
 * @param {Object} options - Additional options
 * @param {Object} context - Request context for authorization
 * @returns {Promise<Object>} The created user
 */
async function createUser(userData, options = {}, context = {}) {
  if (!isAuthorizedAdminOperation('createUser', context)) {
    throw new Error('Unauthorized admin operation: createUser');
  }
  
  // Input validation
  if (!userData.email || !userData.password) {
    throw new Error('Email and password are required for user creation');
  }
  
  const admin = getSupabaseAdmin();
  
  try {
    // Create the user with Supabase Auth
    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true,
      user_metadata: userData.metadata || {}
    });
    
    if (authError) throw authError;
    
    // If profile data is provided, create a profile in the profiles table
    if (userData.profile) {
      const { error: profileError } = await admin
        .from('profiles')
        .insert([{
          id: authUser.user.id,
          ...userData.profile
        }]);
      
      if (profileError) {
        // If profile creation fails, we should clean up the auth user
        await admin.auth.admin.deleteUser(authUser.user.id);
        throw profileError;
      }
    }
    
    // Log the operation
    logAdminOperation('createUser', {
      userId: authUser.user.id,
      email: userData.email,
      hasProfile: Boolean(userData.profile)
    }, context);
    
    return authUser;
  } catch (error) {
    logger.error('Failed to create user:', error);
    throw error;
  }
}

/**
 * Safely deletes a user and all related data
 * @param {string} userId - The ID of the user to delete
 * @param {Object} options - Additional options
 * @param {Object} context - Request context for authorization
 * @returns {Promise<Object>} Result of the operation
 */
async function deleteUser(userId, options = {}, context = {}) {
  if (!isAuthorizedAdminOperation('deleteUser', context)) {
    throw new Error('Unauthorized admin operation: deleteUser');
  }
  
  if (!userId) {
    throw new Error('User ID is required for deletion');
  }
  
  const admin = getSupabaseAdmin();
  
  try {
    // First, delete user data from related tables
    // This could be expanded based on your database schema
    
    // Optional: backup user data before deletion if options.backup is true
    let backupData = null;
    if (options.backup) {
      const { data: profileData } = await admin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      backupData = {
        profile: profileData,
        timestamp: new Date().toISOString()
      };
    }
    
    // Delete from profiles table
    const { error: profileError } = await admin
      .from('profiles')
      .delete()
      .eq('id', userId);
    
    if (profileError) throw profileError;
    
    // Delete from workouts table if it exists
    const { error: workoutsError } = await admin
      .from('workouts')
      .delete()
      .eq('user_id', userId);
    
    // Note: We continue even if deleting workouts fails, as it might not exist
    if (workoutsError && workoutsError.code !== 'PGRST116') {
      throw workoutsError;
    }
    
    // Finally, delete the user from auth
    const { error: authError } = await admin.auth.admin.deleteUser(userId);
    
    if (authError) throw authError;
    
    // Log the operation
    logAdminOperation('deleteUser', {
      userId,
      wasBackedUp: Boolean(options.backup)
    }, context);
    
    return {
      success: true,
      backup: backupData
    };
  } catch (error) {
    logger.error(`Failed to delete user ${userId}:`, error);
    throw error;
  }
}

/**
 * Run database migrations using the service role
 * @param {Array<Object>} migrations - Array of migration objects
 * @param {Object} context - Request context for authorization
 * @returns {Promise<Object>} Results of the migrations
 */
async function migrateData(migrations, context = {}) {
  if (!isAuthorizedAdminOperation('migrateData', context)) {
    throw new Error('Unauthorized admin operation: migrateData');
  }
  
  if (!Array.isArray(migrations) || migrations.length === 0) {
    throw new Error('Migrations must be a non-empty array');
  }
  
  // Use the new postgres-based migrations utility instead
  logger.info('Using postgres-based migrations utility');
  logger.warn('This function is deprecated. Use the migrations utility directly instead.');
  
  try {
    // Import the migrations utility
    const { runMigrations } = require('../utils/migrations');
    
    // Run the migrations
    const result = await runMigrations();
    
    // Log the operation
    logAdminOperation('migrateData', {
      migrationCount: result.executed ? result.executed.length : 0,
      migrationNames: result.executed ? result.executed.map(m => m.name) : []
    }, context);
    
    return {
      success: true,
      migrations: result.executed || []
    };
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  }
}

/**
 * Create or modify database tables
 * @param {Object} tableConfig - Configuration for the table operation
 * @param {Object} context - Request context for authorization
 * @returns {Promise<Object>} Result of the operation
 */
async function manageTables(tableConfig, context = {}) {
  if (!isAuthorizedAdminOperation('manageTables', context)) {
    throw new Error('Unauthorized admin operation: manageTables');
  }
  
  const { operation, table, schema } = tableConfig;
  
  if (!operation || !table) {
    throw new Error('Operation and table name are required');
  }
  
  let sql = '';
  
  try {
    switch (operation) {
      case 'create':
        if (!schema || !Array.isArray(schema.columns) || schema.columns.length === 0) {
          throw new Error('Schema with columns is required for table creation');
        }
        
        // Build CREATE TABLE statement
        const columnDefs = schema.columns.map(col => {
          const { name, type, constraints = [] } = col;
          return `${name} ${type} ${constraints.join(' ')}`;
        }).join(', ');
        
        sql = `CREATE TABLE IF NOT EXISTS ${table} (${columnDefs})`;
        
        if (schema.rls) {
          // Enable RLS on the table
          sql += `; ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`;
          
          // Add RLS policies if provided
          if (Array.isArray(schema.rls.policies)) {
            for (const policy of schema.rls.policies) {
              sql += `; CREATE POLICY "${policy.name}" ON ${table} 
                       FOR ${policy.operation || 'ALL'} 
                       TO ${policy.role || 'authenticated'} 
                       USING (${policy.using})`;
              
              if (policy.check) {
                sql += ` WITH CHECK (${policy.check})`;
              }
            }
          }
        }
        break;
        
      case 'alter':
        if (!schema || !Array.isArray(schema.alterations) || schema.alterations.length === 0) {
          throw new Error('Schema with alterations is required for table modification');
        }
        
        // Build ALTER TABLE statements
        sql = schema.alterations.map(alteration => {
          const { action, column, type, constraints = [] } = alteration;
          
          switch (action) {
            case 'add':
              return `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${type} ${constraints.join(' ')}`;
            case 'drop':
              return `ALTER TABLE ${table} DROP COLUMN IF EXISTS ${column}`;
            case 'modify':
              return `ALTER TABLE ${table} ALTER COLUMN ${column} TYPE ${type}`;
            default:
              throw new Error(`Unknown alteration action: ${action}`);
          }
        }).join('; ');
        break;
        
      case 'drop':
        sql = `DROP TABLE IF EXISTS ${table}`;
        break;
        
      default:
        throw new Error(`Unknown table operation: ${operation}`);
    }
    
    // Execute the SQL using the direct postgres connection
    const pool = new Pool({
      connectionString: env.supabase.databaseUrl || createConnectionString({ mode: 'transaction' }),
      ...getPoolConfig('transaction')
    });
    
    const client = await pool.connect();
    
    try {
      await client.query(sql);
      
      // Log the operation
      logAdminOperation('manageTables', {
        operation,
        table,
        sql
      }, context);
      
      return {
        success: true,
        operation,
        table
      };
    } finally {
      client.release();
      await pool.end();
    }
  } catch (error) {
    logger.error(`Table operation ${operation} failed for ${table}:`, error);
    throw error;
  }
}

module.exports = {
  getSupabaseAdmin,
  isAuthorizedAdminOperation,
  createUser,
  deleteUser,
  migrateData,
  manageTables
}; 