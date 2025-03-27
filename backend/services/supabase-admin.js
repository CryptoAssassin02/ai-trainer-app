/**
 * @fileoverview Supabase Admin Service
 * 
 * ⚠️ SECURITY WARNING ⚠️
 * This module uses the Supabase service role key, which has FULL DATABASE ACCESS.
 * This key bypasses Row Level Security (RLS) and should NEVER be used in client-side code.
 * Only use this service for trusted server-side operations that require admin privileges.
 * Always implement proper authorization checks before performing admin operations.
 * All admin operations should be logged for security auditing.
 */

const { createClient } = require('@supabase/supabase-js');
const { env, logger } = require('../config');

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

  if (process.env.NODE_ENV === 'production' && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
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
    supabaseAdminInstance = createClient(
      env.supabase.url,
      env.supabase.serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        },
        global: {
          headers: {
            'x-application-name': 'trAIner-backend-admin',
            'x-admin-operation': 'true'
          }
        }
      }
    );
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
  
  const admin = getSupabaseAdmin();
  const results = [];
  
  try {
    // Execute each migration in sequence
    for (const migration of migrations) {
      const { name, sql, params = [] } = migration;
      
      if (!name || !sql) {
        throw new Error('Each migration must have a name and sql property');
      }
      
      logger.info(`Running migration: ${name}`);
      
      // Run the migration SQL
      const { data, error } = await admin.rpc('exec_sql', {
        sql_query: sql,
        params
      });
      
      if (error) {
        throw new Error(`Migration "${name}" failed: ${error.message}`);
      }
      
      results.push({
        name,
        success: true,
        result: data
      });
      
      logger.info(`Migration "${name}" completed successfully`);
    }
    
    // Log the operation
    logAdminOperation('migrateData', {
      migrationCount: migrations.length,
      migrationNames: migrations.map(m => m.name)
    }, context);
    
    return {
      success: true,
      migrations: results
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
  
  const admin = getSupabaseAdmin();
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
    
    // Execute the SQL
    const { error } = await admin.rpc('exec_sql', {
      sql_query: sql
    });
    
    if (error) throw error;
    
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