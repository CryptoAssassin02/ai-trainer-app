const { createClient } = require('@supabase/supabase-js');
const { env, logger } = require('../config');

/**
 * @typedef {Object} QueryOptions
 * @property {number} [limit] - Maximum number of records to return
 * @property {number} [offset] - Number of records to skip
 * @property {Object} [filters] - Object containing column-value pairs for filtering
 * @property {string} [orderBy] - Column to order by
 * @property {boolean} [ascending=true] - Sort in ascending order if true, descending if false
 */

/**
 * Singleton instance for Supabase clients
 */
let supabaseInstance = null;
let supabaseAdminInstance = null;

/**
 * Retry configuration for Supabase operations
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  retryableStatusCodes: [408, 429, 500, 502, 503, 504]
};

/**
 * Initialize or return the existing Supabase client instance
 * @returns {import('@supabase/supabase-js').SupabaseClient} Supabase client
 */
function getSupabaseClient() {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  try {
    logger.info('Initializing Supabase client');
    supabaseInstance = createClient(
      env.supabase.url,
      env.supabase.anonKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        },
        db: {
          schema: 'public'
        },
        global: {
          headers: {
            'x-application-name': 'trAIner-backend'
          }
        }
      }
    );
    logger.info('Supabase client initialized successfully');
    return supabaseInstance;
  } catch (error) {
    logger.error('Failed to initialize Supabase client:', error);
    throw new Error('Failed to initialize database connection');
  }
}

/**
 * Initialize or return the existing Supabase admin client instance
 * @returns {import('@supabase/supabase-js').SupabaseClient} Supabase admin client with service role key
 */
function getSupabaseAdminClient() {
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
        db: {
          schema: 'public'
        },
        global: {
          headers: {
            'x-application-name': 'trAIner-backend-admin'
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
 * Handles and standardizes Supabase errors
 * @param {Error} error - The error thrown by Supabase
 * @param {string} [operation='Database operation'] - Description of the operation that failed
 * @throws {Object} Standardized error object
 */
function handleSupabaseError(error, operation = 'Database operation') {
  logger.error(`Supabase error during ${operation}:`, error);
  
  // Extract status code from error or default to 500
  const statusCode = error.status || error?.statusCode || 500;
  
  // Check if error is retryable based on status code
  const isRetryable = RETRY_CONFIG.retryableStatusCodes.includes(statusCode);
  
  throw {
    status: statusCode,
    message: error.message || `${operation} failed`,
    details: error.details || {},
    retryable: isRetryable,
    code: error.code || 'SUPABASE_ERROR'
  };
}

/**
 * Implements retry logic for Supabase operations
 * @param {Function} operation - The async function to retry
 * @param {string} [operationName='Database operation'] - Description of the operation
 * @returns {Promise<any>} Result of the operation
 */
async function withRetry(operation, operationName = 'Database operation') {
  let lastError = null;
  for (let attempt = 1; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // If error is not retryable or this is the last attempt, don't retry
      if (!error.retryable || attempt === RETRY_CONFIG.maxRetries) {
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = RETRY_CONFIG.retryDelay * Math.pow(2, attempt - 1);
      logger.warn(`Retry attempt ${attempt}/${RETRY_CONFIG.maxRetries} for ${operationName} in ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // If we got here, all retries failed
  logger.error(`All retry attempts failed for ${operationName}`);
  throw lastError;
}

/**
 * Execute a query on a Supabase table with proper error handling and retries
 * @param {string} table - Table name to query
 * @param {QueryOptions} [options={}] - Query options
 * @param {boolean} [useAdmin=false] - Whether to use admin client for privileged operations
 * @returns {Promise<Object[]>} - Query results
 */
async function query(table, options = {}, useAdmin = false) {
  const { 
    limit = 100, 
    offset = 0, 
    filters = {}, 
    orderBy,
    ascending = true 
  } = options;
  
  const client = useAdmin ? getSupabaseAdminClient() : getSupabaseClient();
  
  const operationName = `Query on ${table}`;
  
  return withRetry(async () => {
    try {
      // Start building the query
      let query = client.from(table).select('*');
      
      // Apply filters
      Object.entries(filters).forEach(([column, value]) => {
        query = query.eq(column, value);
      });
      
      // Apply ordering if specified
      if (orderBy) {
        query = query.order(orderBy, { ascending });
      }
      
      // Apply pagination
      query = query.range(offset, offset + limit - 1);
      
      // Execute the query
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      throw handleSupabaseError(error, operationName);
    }
  }, operationName);
}

/**
 * Get a record by its ID
 * @param {string} table - Table name
 * @param {string|number} id - Record ID
 * @param {boolean} [useAdmin=false] - Whether to use admin client
 * @returns {Promise<Object|null>} - The record or null if not found
 */
async function getById(table, id, useAdmin = false) {
  const client = useAdmin ? getSupabaseAdminClient() : getSupabaseClient();
  const operationName = `GetById on ${table}`;
  
  return withRetry(async () => {
    try {
      const { data, error } = await client
        .from(table)
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        // Handle 'not found' specifically to return null instead of throwing
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }
      
      return data;
    } catch (error) {
      throw handleSupabaseError(error, operationName);
    }
  }, operationName);
}

/**
 * Insert one or more records with validation
 * @param {string} table - Table name
 * @param {Object|Object[]} records - Record(s) to insert
 * @param {boolean} [useAdmin=false] - Whether to use admin client
 * @returns {Promise<Object[]>} - The inserted records
 */
async function insert(table, records, useAdmin = false) {
  const client = useAdmin ? getSupabaseAdminClient() : getSupabaseClient();
  const operationName = `Insert into ${table}`;
  
  // Ensure records is an array
  const recordsArray = Array.isArray(records) ? records : [records];
  
  // Basic validation
  if (recordsArray.length === 0) {
    throw new Error('No records provided for insert operation');
  }
  
  return withRetry(async () => {
    try {
      const { data, error } = await client
        .from(table)
        .insert(recordsArray)
        .select();
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      throw handleSupabaseError(error, operationName);
    }
  }, operationName);
}

/**
 * Update a record by ID with validation
 * @param {string} table - Table name
 * @param {string|number} id - Record ID to update
 * @param {Object} updates - Fields to update
 * @param {boolean} [useAdmin=false] - Whether to use admin client
 * @returns {Promise<Object>} - The updated record
 */
async function update(table, id, updates, useAdmin = false) {
  const client = useAdmin ? getSupabaseAdminClient() : getSupabaseClient();
  const operationName = `Update in ${table}`;
  
  // Basic validation
  if (!id) {
    throw new Error('ID is required for update operation');
  }
  
  if (!updates || Object.keys(updates).length === 0) {
    throw new Error('No update data provided');
  }
  
  return withRetry(async () => {
    try {
      const { data, error } = await client
        .from(table)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      throw handleSupabaseError(error, operationName);
    }
  }, operationName);
}

/**
 * Delete a record by ID
 * @param {string} table - Table name
 * @param {string|number} id - Record ID to delete
 * @param {boolean} [useAdmin=false] - Whether to use admin client
 * @returns {Promise<void>}
 */
async function remove(table, id, useAdmin = false) {
  const client = useAdmin ? getSupabaseAdminClient() : getSupabaseClient();
  const operationName = `Delete from ${table}`;
  
  // Basic validation
  if (!id) {
    throw new Error('ID is required for delete operation');
  }
  
  return withRetry(async () => {
    try {
      const { error } = await client
        .from(table)
        .delete()
        .eq('id', id);
      
      if (error) {
        throw error;
      }
      
      return { success: true };
    } catch (error) {
      throw handleSupabaseError(error, operationName);
    }
  }, operationName);
}

/**
 * Run a raw SQL query (admin only)
 * @param {string} sql - SQL query
 * @param {Array} [params=[]] - Query parameters 
 * @returns {Promise<Object>} - Query results
 */
async function rawQuery(sql, params = []) {
  const client = getSupabaseAdminClient();
  const operationName = 'Raw SQL query';
  
  return withRetry(async () => {
    try {
      const { data, error } = await client.rpc('exec_sql', { 
        sql_query: sql,
        params
      });
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      throw handleSupabaseError(error, operationName);
    }
  }, operationName);
}

module.exports = {
  getSupabaseClient,
  getSupabaseAdminClient,
  handleSupabaseError,
  query,
  getById,
  insert,
  update,
  remove,
  rawQuery
}; 