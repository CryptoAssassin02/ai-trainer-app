# Authentication & User Management Services Documentation

## Overview
Core service layer for authentication and user management operations, providing Supabase client management, database operations, and user profile handling with comprehensive error handling and retry logic.

**Primary Files**: 
- `backend/services/supabase.js` (419 lines)
- `backend/services/profile-service.js` (833 lines)
**Last Updated**: Current development phase  

## Services Summary

| Service Function | Purpose | File | Authentication | Error Handling |
|-----------------|---------|------|----------------|----------------|
| `getSupabaseClient()` | Get anonymous Supabase client | supabase.js | No | Retry logic |
| `getSupabaseAdminClient()` | Get admin Supabase client | supabase.js | Service role | Retry logic |
| `getSupabaseClientWithToken()` | Get RLS-scoped client | supabase.js | JWT required | Validation |
| `getProfileByUserId()` | Retrieve user profile | profile-service.js | JWT required | Custom errors |
| `createProfile()` | Create new user profile | profile-service.js | JWT required | Conflict handling |
| `updateProfile()` | Update existing profile | profile-service.js | JWT required | Version handling |
| `getProfilePreferences()` | Get user preferences only | profile-service.js | JWT required | Selective fields |
| `updateProfilePreferences()` | Update preferences only | profile-service.js | JWT required | Partial updates |

## Core Supabase Service (`supabase.js`)

### Client Management Functions

#### 1. getSupabaseClient()

**Purpose**: Initialize or return singleton anonymous Supabase client  
**Authentication**: None (uses anonymous key)  
**RLS Scope**: Not automatically scoped to specific user

```javascript
function getSupabaseClient() {
  if (supabaseInstance) {
    // Jest test reset handling
    if (isTest && actualCreateSupabaseClient.mock && 
        actualCreateSupabaseClient.mock.calls.length === 0) {
      supabaseInstance = null;
    } else {
      return supabaseInstance;
    }
  }

  try {
    logger.info('Initializing Supabase client');
    supabaseInstance = actualCreateSupabaseClient(env, logger, env.env, false, null);
    return supabaseInstance;
  } catch (error) {
    logger.error('Failed to initialize Supabase client:', error);
    throw new Error('Failed to initialize database connection');
  }
}
```

**Use Cases**:
- General database operations without user context
- Public data access
- Administrative operations that don't require user scoping

#### 2. getSupabaseAdminClient()

**Purpose**: Initialize or return singleton admin Supabase client  
**Authentication**: Uses service role key  
**RLS Scope**: Bypasses RLS policies

```javascript
function getSupabaseAdminClient() {
  if (supabaseAdminInstance) {
    return supabaseAdminInstance;
  }

  try {
    logger.info('Initializing Supabase admin client');
    supabaseAdminInstance = actualCreateSupabaseClient(env, logger, env.env, true, null);
    return supabaseAdminInstance;
  } catch (error) {
    logger.error('Failed to initialize Supabase admin client:', error);
    throw new Error('Failed to initialize admin database connection');
  }
}
```

**Use Cases**:
- User creation and management
- Administrative operations
- Bypassing RLS for system operations
- Raw SQL queries

#### 3. getSupabaseClientWithToken(jwtToken)

**Purpose**: Create RLS-scoped Supabase client with user JWT  
**Authentication**: JWT token required  
**RLS Scope**: Automatically scoped to authenticated user

```javascript
function getSupabaseClientWithToken(jwtToken) {
  if (!jwtToken) {
    logger.error('getSupabaseClientWithToken called without a JWT');
    throw new Error('JWT token is required to create a user-scoped Supabase client.');
  }
  return actualCreateSupabaseClient(env, logger, process.env.NODE_ENV, false, jwtToken);
}
```

**Use Cases**:
- User-specific operations
- Profile management
- RLS-enforced queries
- Secure data access

### Database Operation Functions

#### 4. query(table, options, useAdmin)

**Purpose**: Execute queries with retry logic and error handling  
**Parameters**:
- `table`: Table name to query
- `options`: Query options (limit, offset, filters, orderBy, ascending)
- `useAdmin`: Whether to use admin client

```javascript
async function query(table, options = {}, useAdmin = false) {
  const { 
    limit = 100, 
    offset = 0, 
    filters = {}, 
    orderBy,
    ascending = true 
  } = options;
  
  const client = useAdmin ? getSupabaseAdminClient() : getSupabaseClient();
  
  return withRetry(async () => {
    let query = client.from(table).select('*');
    
    // Apply filters
    Object.entries(filters).forEach(([column, value]) => {
      query = query.eq(column, value);
    });
    
    // Apply ordering and pagination
    if (orderBy) {
      query = query.order(orderBy, { ascending });
    }
    query = query.range(offset, offset + limit - 1);
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }, `Query on ${table}`);
}
```

#### 5. getById(table, id, useAdmin)

**Purpose**: Retrieve single record by ID with error handling

```javascript
async function getById(table, id, useAdmin = false) {
  const client = useAdmin ? getSupabaseAdminClient() : getSupabaseClient();
  
  return withRetry(async () => {
    const { data, error } = await client
      .from(table)
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      // Handle 'not found' specifically to return null
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }
    
    return data;
  }, `GetById on ${table}`);
}
```

#### 6. insert(table, records, useAdmin)

**Purpose**: Insert one or more records with validation

```javascript
async function insert(table, records, useAdmin = false) {
  const client = useAdmin ? getSupabaseAdminClient() : getSupabaseClient();
  const recordsArray = records ? (Array.isArray(records) ? records : [records]) : [];
  
  if (recordsArray.length === 0) {
    throw new Error('No records provided for insert operation');
  }
  
  return withRetry(async () => {
    const { data, error } = await client
      .from(table)
      .insert(recordsArray)
      .select();
    
    if (error) throw error;
    return data;
  }, `Insert into ${table}`);
}
```

#### 7. update(table, id, updates, useAdmin)

**Purpose**: Update record by ID with validation

```javascript
async function update(table, id, updates, useAdmin = false) {
  const client = useAdmin ? getSupabaseAdminClient() : getSupabaseClient();
  
  if (!id) throw new Error('ID is required for update operation');
  if (!updates || Object.keys(updates).length === 0) {
    throw new Error('No update data provided');
  }
  
  return withRetry(async () => {
    const { data, error } = await client
      .from(table)
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }, `Update in ${table}`);
}
```

#### 8. remove(table, id, useAdmin)

**Purpose**: Delete record by ID

```javascript
async function remove(table, id, useAdmin = false) {
  const client = useAdmin ? getSupabaseAdminClient() : getSupabaseClient();
  
  if (!id) throw new Error('ID is required for delete operation');
  
  return withRetry(async () => {
    const { error } = await client
      .from(table)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { success: true };
  }, `Delete from ${table}`);
}
```

#### 9. rawQuery(sql, params)

**Purpose**: Execute raw SQL queries (admin only)

```javascript
async function rawQuery(sql, params = []) {
  return withRetry(async () => {
    // Use direct Postgres connection
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: env.supabase.databaseUrl || createConnectionString()
    });
    
    const pgClient = await pool.connect();
    
    try {
      const result = await pgClient.query(sql, params);
      return result.rows;
    } finally {
      pgClient.release();
      await pool.end();
    }
  }, 'Raw SQL query');
}
```

### Error Handling & Retry Logic

#### handleSupabaseError(error, operation)

**Purpose**: Standardize Supabase error handling

```javascript
function handleSupabaseError(error, operation = 'Database operation') {
  logger.error(`Supabase error during ${operation}:`, error);
  
  const statusCode = error.status || error?.statusCode || 500;
  const isRetryable = RETRY_CONFIG.retryableStatusCodes.includes(statusCode);
  
  throw {
    status: statusCode,
    message: error.message || `${operation} failed`,
    details: error.details || {},
    retryable: isRetryable,
    code: error.code || 'SUPABASE_ERROR'
  };
}
```

#### withRetry(operation, operationName)

**Purpose**: Implement exponential backoff retry logic

```javascript
const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  retryableStatusCodes: [408, 429, 500, 502, 503, 504]
};

async function withRetry(operation, operationName = 'Database operation') {
  let lastError = null;
  for (let attempt = 1; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (!error.retryable || attempt === RETRY_CONFIG.maxRetries) {
        break;
      }
      
      const delay = RETRY_CONFIG.retryDelay * Math.pow(2, attempt - 1);
      logger.warn(`Retry attempt ${attempt}/${RETRY_CONFIG.maxRetries} for ${operationName} in ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  logger.error(`All retry attempts failed for ${operationName}`);
  throw lastError;
}
```

## Profile Service (`profile-service.js`)

### Profile Management Functions

#### 1. getProfileByUserId(userId, jwtToken)

**Purpose**: Retrieve user profile with unit conversion  
**Authentication**: JWT token required for RLS  
**Error Handling**: Custom NotFoundError and InternalError

```javascript
async function getProfileByUserId(userId, jwtToken) {
  try {
    const supabase = getSupabaseClientWithToken(jwtToken);
    
    const { data, error } = await supabase
      .from(PROFILES_TABLE)
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError(`Profile not found for user: ${userId}`);
      }
      throw new InternalError('Failed to fetch user profile due to a database error', error);
    }
    
    if (!data) {
      throw new NotFoundError(`Profile not found for user: ${userId}`);
    }
    
    return convertProfileUnitsForResponse(data);
  } catch (error) {
    // Error classification and re-throwing logic
    if (error.code === 'PGRST116') {
      throw new NotFoundError(`Profile not found for user: ${userId}`);
    }
    if (error instanceof NotFoundError || error.name === 'InternalError') {
      throw error;
    }
    throw new InternalError('Failed to fetch user profile', error);
  }
}
```

#### 2. createProfile(profileData, jwtToken)

**Purpose**: Create new user profile with validation and conflict handling  
**Authentication**: JWT token required  
**Validation**: Full profile data validation
**Conflict Handling**: Detects existing profiles

```javascript
async function createProfile(profileData, jwtToken) {
  logger.info('Attempting to create profile', { userId: profileData?.userId });
  try {
    // Validate input data
    validateProfileData(profileData, false); // isUpdate = false
    
    // Prepare data for database (snake_case, conversions)
    const dbData = prepareProfileDataForStorage(profileData);
    
    const supabase = getSupabaseClientWithToken(jwtToken);
    
    const { data: newProfileData } = await supabase
      .from(PROFILES_TABLE)
      .insert(dbData)
      .select()
      .single();
    
    if (!newProfileData) {
      throw new InternalError('Failed to retrieve profile data immediately after creation.');
    }
    
    logger.info(`Profile created successfully for user ID: ${profileData.userId}`);
    return convertProfileUnitsForResponse(newProfileData);
    
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    
    // Handle unique constraint violation (profile already exists)
    if (error.code === '23505') {
      throw new ConflictError('A profile for this user already exists.');
    }
    
    if (error.name === 'InternalError') {
      throw error;
    }
    
    throw new InternalError('An unexpected error occurred while creating the user profile', error);
  }
}
```

#### 3. updateProfile(userId, data, jwtToken)

**Purpose**: Update existing profile with validation  
**Authentication**: JWT token required  
**Validation**: Partial validation for updates
**Version Handling**: Checks for profile existence

```javascript
async function updateProfile(userId, data, jwtToken) {
  try {
    // Validate input data for update
    validateProfileData(data, true); // true indicates update
    
    const supabase = getSupabaseClientWithToken(jwtToken);
    
    // Check if profile exists
    const { data: existingProfile, error: fetchError } = await supabase
      .from(PROFILES_TABLE)
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        throw new NotFoundError(`Profile not found for user: ${userId}`);
      }
      throw new InternalError('Failed to fetch user profile for update', fetchError);
    }
    
    if (!existingProfile) {
      throw new NotFoundError(`Profile not found for user: ${userId}`);
    }
    
    // Prepare update payload
    const updatePayload = prepareProfileDataForStorage(data, existingProfile);
    
    const { data: updatedData, error: updateError } = await supabase
      .from(PROFILES_TABLE)
      .update(updatePayload)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (updateError) {
      if (updateError.code === 'PGRST116') {
        throw new NotFoundError(`Profile not found for user: ${userId}`);
      }
      throw new InternalError('Failed to update user profile due to a database error.', updateError);
    }
    
    if (!updatedData) {
      throw new InternalError('Failed to retrieve updated profile data');
    }
    
    return convertProfileUnitsForResponse(updatedData);
  } catch (error) {
    // Error type preservation and re-throwing
    if (error instanceof ValidationError || 
        error instanceof NotFoundError || 
        error instanceof InternalError) {
      throw error;
    }
    
    if (error.code === 'PGRST116') {
      throw new NotFoundError(`Profile not found for user: ${userId}`);
    }
    
    throw new InternalError('Unexpected error in updateProfile function', error);
  }
}
```

#### 4. getProfilePreferences(userId, jwtToken)

**Purpose**: Retrieve only user preferences  
**Authentication**: JWT token required  
**Selective Fields**: Returns only preference-related fields

```javascript
async function getProfilePreferences(userId, jwtToken) {
  try {
    const supabase = getSupabaseClientWithToken(jwtToken);
    
    const { data, error } = await supabase
      .from(PROFILES_TABLE)
      .select('unit_preference, fitness_goals, equipment, experience_level, workout_frequency, updated_at, user_id')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError(`Profile not found for user: ${userId}`);
      }
      throw new InternalError('Failed to fetch user preferences', error);
    }
    
    if (!data) {
      throw new NotFoundError(`Profile not found for user: ${userId}`);
    }
    
    // Transform snake_case to camelCase
    return {
      userId: data.user_id,
      unitPreference: data.unit_preference,
      goals: data.fitness_goals,
      equipment: data.equipment,
      experienceLevel: data.experience_level,
      workoutFrequency: data.workout_frequency,
      updatedAt: data.updated_at
    };
  } catch (error) {
    // Error handling with proper classification
    if (error instanceof NotFoundError || error instanceof InternalError) {
      throw error;
    }
    
    if (error.code === 'PGRST116') {
      throw new NotFoundError(`Profile not found for user: ${userId}`);
    }
    
    logger.error('Error in getProfilePreferences:', error);
    throw new InternalError('Failed to fetch user preferences', error);
  }
}
```

#### 5. updateProfilePreferences(userId, preferenceData, jwtToken)

**Purpose**: Update only user preferences  
**Authentication**: JWT token required  
**Partial Updates**: Updates only provided fields

```javascript
async function updateProfilePreferences(userId, preferenceData, jwtToken) {
  try {
    // Validate preference data
    validatePreferenceData(preferenceData);
    
    const supabase = getSupabaseClientWithToken(jwtToken);
    
    // Check if profile exists
    const { data: existingProfile, error: fetchError } = await supabase
      .from(PROFILES_TABLE)
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (fetchError || !existingProfile) {
      throw new NotFoundError(`Profile not found for user: ${userId}`);
    }
    
    // Prepare update data only for provided fields
    const dataToUpdate = {};
    if (preferenceData.unitPreference !== undefined) {
      dataToUpdate.unit_preference = preferenceData.unitPreference;
    }
    if (preferenceData.goals !== undefined) {
      dataToUpdate.fitness_goals = preferenceData.goals;
    }
    if (preferenceData.equipment !== undefined) {
      dataToUpdate.equipment = preferenceData.equipment;
    }
    if (preferenceData.experienceLevel !== undefined) {
      dataToUpdate.experience_level = preferenceData.experienceLevel;
    }
    if (preferenceData.workoutFrequency !== undefined) {
      dataToUpdate.workout_frequency = preferenceData.workoutFrequency;
    }
    
    // Return existing if no changes
    if (Object.keys(dataToUpdate).length === 0) {
      return {
        userId: existingProfile.user_id,
        unitPreference: existingProfile.unit_preference,
        goals: existingProfile.fitness_goals,
        equipment: existingProfile.equipment,
        experienceLevel: existingProfile.experience_level,
        workoutFrequency: existingProfile.workout_frequency
      };
    }
    
    // Add updated timestamp
    dataToUpdate.updated_at = new Date().toISOString();
    
    // Execute update
    const { data, error } = await supabase
      .from(PROFILES_TABLE)
      .update(dataToUpdate)
      .eq('user_id', userId)
      .select('unit_preference, fitness_goals, equipment, experience_level, workout_frequency, updated_at, user_id')
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError(`Profile not found for user: ${userId} during preference update.`);
      }
      throw new InternalError('Failed to update user preferences', error);
    }
    
    if (!data) {
      throw new NotFoundError(`Failed to retrieve updated preferences for user: ${userId}`);
    }
    
    return {
      userId: data.user_id,
      unitPreference: data.unit_preference,
      goals: data.fitness_goals,
      equipment: data.equipment,
      experienceLevel: data.experience_level,
      workoutFrequency: data.workout_frequency,
      updatedAt: data.updated_at
    };
  } catch (error) {
    // Comprehensive error handling
    if (error instanceof ValidationError || 
        error instanceof NotFoundError || 
        error instanceof InternalError) {
      throw error;
    }
    
    if (error.code === 'PGRST116') {
      throw new NotFoundError(`Profile not found for user: ${userId}`);
    }
    
    logger.error('Error in updateProfilePreferences:', error);
    throw new InternalError('Failed to update user preferences', error);
  }
}
```

### Validation Functions

#### validateProfileData(profileData, isUpdate)

**Purpose**: Validate profile data for create/update operations

```javascript
function validateProfileData(profileData, isUpdate = false) {
  const errors = [];
  
  // Required fields for creation
  if (!isUpdate) {
    if (!profileData.userId) {
      errors.push({ field: 'userId', message: 'User ID is required' });
    }
    if (!profileData.unitPreference) {
      errors.push({ field: 'unitPreference', message: 'Unit preference is required' });
    }
  }
  
  // Unit preference validation
  if (profileData.unitPreference !== undefined && 
      profileData.unitPreference !== null && 
      !['metric', 'imperial'].includes(profileData.unitPreference)) {
    errors.push({ 
      field: 'unitPreference', 
      message: 'Unit preference must be either "metric" or "imperial"' 
    });
  }
  
  // Height validation (number or imperial object)
  if (profileData.height !== undefined && profileData.height !== null) {
    if (typeof profileData.height === 'number') {
      if (profileData.height <= 0) {
        errors.push({ 
          field: 'height', 
          message: 'Height must be a positive number' 
        });
      }
    } else if (typeof profileData.height === 'object') {
      // Imperial format validation
      if (profileData.height.feet === undefined || profileData.height.feet === null) {
        errors.push({ field: 'height.feet', message: 'Feet is required for imperial height' });
      }
      // Additional validation logic...
    }
  }
  
  // Weight, age, and other field validations...
  
  if (errors.length > 0) {
    throw new ValidationError('Profile validation failed', errors);
  }
}
```

#### validatePreferenceData(preferenceData)

**Purpose**: Validate preference-specific data

```javascript
function validatePreferenceData(preferenceData) {
  const errors = [];
  
  // Unit preference validation
  if (preferenceData.unitPreference !== undefined && 
      !['metric', 'imperial'].includes(preferenceData.unitPreference)) {
    errors.push({ 
      field: 'unitPreference', 
      message: 'Unit preference must be either "metric" or "imperial"' 
    });
  }
  
  // Goals validation (array of strings)
  if (preferenceData.goals !== undefined && !Array.isArray(preferenceData.goals)) {
    errors.push({ field: 'goals', message: 'Goals must be an array' });
  }
  
  // Equipment validation (array of strings)
  if (preferenceData.equipment !== undefined && !Array.isArray(preferenceData.equipment)) {
    errors.push({ field: 'equipment', message: 'Equipment must be an array' });
  }
  
  // Experience level validation
  if (preferenceData.experienceLevel !== undefined && 
      !['beginner', 'intermediate', 'advanced'].includes(preferenceData.experienceLevel)) {
    errors.push({ 
      field: 'experienceLevel', 
      message: 'Experience level must be beginner, intermediate, or advanced' 
    });
  }
  
  if (errors.length > 0) {
    throw new ValidationError('Preference validation failed', errors);
  }
}
```

### Data Transformation Functions

#### prepareProfileDataForStorage(profileData, existingProfile)

**Purpose**: Convert API data to database format (camelCase to snake_case)

```javascript
function prepareProfileDataForStorage(profileData, existingProfile = {}) {
  const dbData = {};
  
  // User ID mapping
  if (profileData.userId) {
    dbData.user_id = profileData.userId;
  }
  
  // Unit preference mapping
  if (profileData.unitPreference !== undefined) {
    dbData.unit_preference = profileData.unitPreference;
  }
  
  // Height conversion and mapping
  if (profileData.height !== undefined) {
    if (profileData.height === null) {
      dbData.height = null;
    } else if (typeof profileData.height === 'number') {
      dbData.height = profileData.height; // Assume centimeters
    } else if (typeof profileData.height === 'object' && profileData.height.feet !== undefined) {
      // Convert imperial to total inches
      const totalInches = (profileData.height.feet * 12) + (profileData.height.inches || 0);
      dbData.height = totalInches;
    }
  }
  
  // Weight mapping
  if (profileData.weight !== undefined) {
    dbData.weight = profileData.weight;
  }
  
  // Age mapping
  if (profileData.age !== undefined) {
    dbData.age = profileData.age;
  }
  
  // Goals mapping
  if (profileData.goals !== undefined) {
    dbData.fitness_goals = profileData.goals;
  }
  
  // Equipment mapping
  if (profileData.equipment !== undefined) {
    dbData.equipment = profileData.equipment;
  }
  
  // Experience level mapping
  if (profileData.experienceLevel !== undefined) {
    dbData.experience_level = profileData.experienceLevel;
  }
  
  // Workout frequency mapping
  if (profileData.workoutFrequency !== undefined) {
    dbData.workout_frequency = profileData.workoutFrequency;
  }
  
  // Always update timestamp for modifications
  dbData.updated_at = new Date().toISOString();
  
  return dbData;
}
```

#### convertProfileUnitsForResponse(profileData)

**Purpose**: Convert database format to API response format (snake_case to camelCase)

```javascript
function convertProfileUnitsForResponse(profileData) {
  const responseData = {
    userId: profileData.user_id,
    unitPreference: profileData.unit_preference,
    age: profileData.age,
    gender: profileData.gender,
    goals: profileData.fitness_goals,
    equipment: profileData.equipment,
    experienceLevel: profileData.experience_level,
    workoutFrequency: profileData.workout_frequency,
    createdAt: profileData.created_at,
    updatedAt: profileData.updated_at
  };
  
  // Height conversion based on unit preference
  if (profileData.height !== null && profileData.height !== undefined) {
    if (profileData.unit_preference === 'imperial') {
      // Convert from stored inches to feet/inches object
      const totalInches = profileData.height;
      responseData.height = {
        feet: Math.floor(totalInches / 12),
        inches: totalInches % 12,
        totalInches: totalInches
      };
    } else {
      // Metric - return as centimeters
      responseData.height = profileData.height;
    }
  } else {
    responseData.height = null;
  }
  
  // Weight mapping (no conversion, stored as provided)
  responseData.weight = profileData.weight;
  
  return responseData;
}
```

## Integration Patterns

### Supabase Client Selection

```javascript
// Pattern for selecting appropriate client
const getAppropriateClient = (requiresUserContext, requiresAdmin) => {
  if (requiresAdmin) {
    return getSupabaseAdminClient();
  } else if (requiresUserContext) {
    return getSupabaseClientWithToken(jwtToken);
  } else {
    return getSupabaseClient();
  }
};
```

### Error Handling Chain

```javascript
// Pattern for error handling in service functions
try {
  // Database operation
  const result = await supabaseOperation();
  return processResult(result);
} catch (error) {
  // Specific error handling
  if (error.code === 'PGRST116') {
    throw new NotFoundError('Resource not found');
  }
  if (error.code === '23505') {
    throw new ConflictError('Resource already exists');
  }
  if (error instanceof CustomError) {
    throw error; // Re-throw custom errors
  }
  // Generic error wrapping
  throw new InternalError('Operation failed', error);
}
```

### Transaction Support

```javascript
// Pattern for multi-operation transactions
async function createUserWithProfile(userData, profileData, jwtToken) {
  const adminClient = getSupabaseAdminClient();
  
  try {
    // User creation (admin)
    const user = await adminClient.auth.admin.createUser(userData);
    
    // Profile creation (user-scoped)
    const userClient = getSupabaseClientWithToken(jwtToken);
    const profile = await createProfile(profileData, jwtToken);
    
    return { user, profile };
  } catch (error) {
    // Cleanup logic for failed transactions
    // ... rollback operations
    throw error;
  }
}
```

## Configuration Dependencies

### Environment Variables

```javascript
// Required Supabase configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_anonymous_key
SUPABASE_SERVICE_KEY=your_service_role_key
DATABASE_URL=postgresql_connection_string (optional)
NODE_ENV=development|test|production
```

### Retry Configuration

```javascript
const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // Base delay in milliseconds
  retryableStatusCodes: [408, 429, 500, 502, 503, 504]
};
```

### Database Table Configuration

```javascript
// Profile service table reference
const PROFILES_TABLE = 'user_profiles';

// Common error codes
const VERSION_CONFLICT_ERROR = 'P2034';
const UNIQUE_VIOLATION_ERROR = '23505';
const NOT_FOUND_ERROR = 'PGRST116';
```

## Performance Considerations

### Client Singleton Management

- Supabase clients are managed as singletons to avoid connection overhead
- Jest test environment includes reset logic for clean test state
- Admin and anonymous clients are separate instances

### Retry Strategy

- Exponential backoff for retryable operations
- Maximum 3 retry attempts
- Only retries on specific HTTP status codes
- Prevents cascade failures during service outages

### Memory Management

- Clients are reused across requests
- Database connections are pooled
- Prepared statements for raw SQL queries
- Graceful connection cleanup

## Testing Considerations

### Test Environment Adaptations

```javascript
// Singleton reset for tests
_resetForTests: () => {
  if (isTest) {
    supabaseInstance = null;
    supabaseAdminInstance = null;
  }
}
```

### Mock Integration Points

- Supabase client responses
- Database operation results
- Error injection for edge cases
- JWT token validation

## Future Enhancements

### Scalability Improvements

- Connection pooling optimization
- Read replica support
- Horizontal scaling considerations
- Cache integration for frequently accessed profiles

### Security Enhancements

- Enhanced RLS policy validation
- Audit logging for profile changes
- Data encryption for sensitive fields
- Rate limiting per user operations

### Feature Additions

- Profile versioning and history
- Bulk profile operations
- Advanced validation rules
- Integration with external identity providers