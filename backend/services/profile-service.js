/**
 * @fileoverview Profile service for handling user profile operations
 */

const { getSupabaseClient } = require('./supabase');
const { 
  ValidationError, 
  NotFoundError, 
  InternalError,
  ConflictError
} = require('../utils/errors');
const { convertHeight, convertWeight } = require('../utils/unit-conversion');
const logger = require('../config/logger');

// Table name for user profiles
const PROFILES_TABLE = 'user_profiles';

// Error code for version conflict
const VERSION_CONFLICT_ERROR = 'P2034';

// Maximum retry attempts for version conflicts
const MAX_RETRY_ATTEMPTS = 3;

/**
 * Get a user profile by user ID
 * 
 * @param {string} userId - UUID of the user
 * @returns {Promise<Object>} User profile data
 * @throws {NotFoundError} If profile doesn't exist
 * @throws {InternalError} If database operation fails
 */
async function getProfileByUserId(userId) {
  try {
    const supabase = getSupabaseClient();
    
    // Supabase response includes both data and error properties
    const { data, error } = await supabase
      .from(PROFILES_TABLE)
      .select('*')
      .eq('user_id', userId)
      .single();
    
    // Check for errors first
    if (error) {
      // If it's a PGRST116 error (not found), throw NotFoundError
      if (error.code === 'PGRST116') {
        logger.warn(`NotFoundError: Profile not found for user: ${userId}`);
        throw new NotFoundError(`Profile not found for user: ${userId}`);
      }
      
      // For all other error types, throw InternalError
      logger.error(`Database error in getProfileByUserId for user ${userId}:`, error);
      throw new InternalError('Failed to fetch user profile due to a database error', error);
    }
    
    // Then check if data is missing/null
    if (!data) {
      // This case should ideally be handled by error above, but keep as a safeguard
      logger.warn(`Profile data is null/undefined for user ${userId} even though promise resolved without error.`);
      throw new NotFoundError(`Profile not found for user: ${userId}`);
    }
    
    return convertProfileUnitsForResponse(data);

  } catch (error) { // Catch block expects promise rejections now
    logger.error('Caught error in getProfileByUserId catch block:', { errorName: error.name, errorCode: error.code, errorMessage: error.message });

    // Check for the specific 'not found' error code from the caught (rejected) error
    if (error.code === 'PGRST116') { // PostgREST code for exact row not found
      logger.warn(`NotFoundError: Profile not found for user: ${userId}`);
      throw new NotFoundError(`Profile not found for user: ${userId}`);
    }

    // Re-throw other specific errors if needed (though less likely here)
    if (error instanceof NotFoundError || error.name === 'InternalError') {
      throw error;
    }

    // Otherwise, wrap any other caught error in InternalError
    logger.error(`Error in getProfileByUserId for user ${userId}:`, error);
    throw new InternalError('Failed to fetch user profile', error);
  }
}

/**
 * Create a new user profile
 * 
 * @param {Object} profileData - Profile data to save
 * @returns {Promise<Object>} Created profile
 * @throws {ValidationError} If profile data is invalid
 * @throws {ConflictError} If profile already exists for the user
 * @throws {InternalError} If database operation fails
 */
async function createProfile(profileData) {
  logger.info('Attempting to create profile', { userId: profileData?.userId });
  try {
    // Validate input data first
    validateProfileData(profileData, false); // isUpdate = false

    // Prepare data for database insertion (snake_case, conversions)
    const dbData = prepareProfileDataForStorage(profileData);
    logger.debug('Prepared data for DB insertion:', dbData);

    // Get Supabase client
    const supabase = getSupabaseClient();

    // Execute the insert operation
    logger.debug('Executing Supabase insert...');
    // ---> Add logs before the call
    console.log(`--- DEBUG SERVICE (createProfile): Before supabase.from('${PROFILES_TABLE}').insert(...) ---`);
    console.log(`--- DEBUG SERVICE (createProfile): typeof supabase.from === ${typeof supabase?.from}`);
    const fromResult = supabase.from(PROFILES_TABLE);
    console.log(`--- DEBUG SERVICE (createProfile): Result of supabase.from('${PROFILES_TABLE}') keys: ${fromResult ? Object.keys(fromResult).join(', ') : 'null/undefined'} ---`);
    console.log(`--- DEBUG SERVICE (createProfile): typeof fromResult.insert === ${typeof fromResult?.insert}`);
    // <--- End added logs

    // Await will now THROW if the mock promise rejects
    const { data: newProfileData } = await supabase
      .from(PROFILES_TABLE)
      .insert(dbData) 
      .select() 
      .single(); 
      
    // This part is only reached on SUCCESS (promise resolved)
    logger.debug('Supabase insert resolved successfully.');
    console.log("--- DEBUG SERVICE (createProfile): Insert Promise RESOLVED ---");
    console.log("--- DEBUG SERVICE (createProfile): Resolved data (newProfileData):", newProfileData);
    
    logger.debug('Checking if newProfileData exists...', { exists: !!newProfileData });
    if (!newProfileData) {
      logger.error('newProfileData is null or undefined after successful insert call.');
      console.error("--- DEBUG SERVICE (createProfile): ERROR - newProfileData is null/undefined post-resolution ---");
      // This case might indicate an issue post-insert or with RLS, treat as internal error
      throw new InternalError('Failed to retrieve profile data immediately after creation.');
    }

    logger.info(`Profile created successfully for user ID: ${profileData.userId}`);
    logger.debug('Converting profile data for response...');
    const responseData = convertProfileUnitsForResponse(newProfileData);
    logger.debug('Returning response data.');
    console.log("--- DEBUG SERVICE (createProfile): Successfully returning response data:", responseData);
    return responseData;


  } catch (error) { // Catch block expects promise rejections now
    logger.error('Caught error in createProfile catch block:', { errorName: error.name, errorCode: error.code, errorMessage: error.message });

    // Handle validation errors specifically if they bubble up
    if (error instanceof ValidationError) {
      logger.warn(`ValidationError during profile creation: ${error.message}`);
      throw error; // Re-throw validation errors as they are
    }
    
    // Check for the specific conflict error code from the caught (rejected) error
    if (error.code === '23505') { // PostgreSQL unique violation error code
      logger.warn(`ConflictError: Profile already exists for user ID: ${profileData.userId || 'N/A'}`);
      throw new ConflictError('A profile for this user already exists.');
    }

    // If it's already an InternalError (e.g., from the !newProfileData check), re-throw it
    if (error.name === 'InternalError') {
        throw error;
    }
    
    // Otherwise, wrap any other caught error (like the generic DB error from rejection) in InternalError
    const logUserId = profileData && profileData.userId ? profileData.userId : 'UserIdNotProvidedInInput';
    logger.error(`Unexpected error in createProfile for user ${logUserId}:`, error);
    throw new InternalError('An unexpected error occurred while creating the user profile', error);
  }
}

/**
 * Update an existing user profile
 * 
 * @param {string} userId - UUID of the user 
 * @param {Object} updateData - Profile data to update
 * @returns {Promise<Object>} Updated profile
 * @throws {NotFoundError} If profile doesn't exist
 * @throws {ValidationError} If update data is invalid
 * @throws {ConflictError} If maximum retry attempts are exceeded
 * @throws {InternalError} If database operation fails
 */
async function updateProfile(userId, data) {
  // Input validation
  try {
    // Replace Joi validation with existing validateProfileData function
    validateProfileData(data, true); // true indicates this is an update operation
    
    // Get Supabase client
    const supabase = getSupabaseClient();
   
    let existingProfile = null;
    let initialFetchError = null; // Store potential error from the initial fetch

    // 1. Fetch the existing profile first to get the current version
    try {
      console.log(`--- DEBUG SVC (updateProfile): Fetching profile for user ${userId} ---`);
      existingProfile = await getProfileByUserId(userId); // Use function directly, not this.getProfileByUserId
      console.log(`--- DEBUG SVC (updateProfile): Fetched profile:`, existingProfile ? `Version ${existingProfile.version}` : 'Not Found');
    } catch (fetchError) {
      console.error(`--- DEBUG SVC (updateProfile): Error during initial fetch:`, fetchError);
      // If the initial fetch failed because the profile wasn't found, re-throw NotFoundError immediately.
      // Check both the instance type and potentially a specific error code if applicable.
      if (fetchError instanceof NotFoundError || fetchError.code === 'PGRST116') { // PGRST116 might indicate 0 rows returned
        console.log('--- DEBUG SVC (updateProfile): Rethrowing NotFoundError from initial fetch ---');
        throw new NotFoundError(`Profile not found for user: ${userId}`, fetchError);
      }
      // For other fetch errors, store it but proceed to see if we can update anyway (less likely, but covers edge cases)
      initialFetchError = fetchError;
      console.log('--- DEBUG SVC (updateProfile): Stored non-NotFoundError from initial fetch:', initialFetchError);
    }

    // 2. If the initial fetch *definitely* failed (and it wasn't a NotFoundError already thrown),
    //    we cannot proceed with an update that relies on the current version. Throw the stored error.
    if (!existingProfile && initialFetchError) {
        console.error('--- DEBUG SVC (updateProfile): Initial fetch failed with non-NotFoundError, throwing InternalError before update attempt. ---');
        throw new InternalError('Failed to fetch user profile before update.', initialFetchError);
    }

    // 3. If the initial fetch returned nothing BUT didn't throw an error (shouldn't happen if getProfileByUserId is correct),
    //    or if the profile genuinely doesn't exist (fetchError was NotFoundError but wasn't caught above somehow).
    if (!existingProfile) {
        console.error(`--- DEBUG SVC (updateProfile): Profile not found for user ${userId} before update attempt (either fetch returned null or previous error handling missed). Throwing NotFoundError. ---`);
        throw new NotFoundError(`Profile not found for user: ${userId}`);
    }

    // 4. Proceed with the update attempt using the fetched profile's version
    let attempts = 1;
    const MAX_RETRY_ATTEMPTS = 3; // Define max retries
    
    while (attempts <= MAX_RETRY_ATTEMPTS) {
      try {
        const currentVersion = existingProfile.version;
        const updatePayload = {
          ...prepareProfileDataForStorage(data, existingProfile),
          version: currentVersion + 1, // Increment version for optimistic lock
          updated_at: new Date().toISOString(),
        };

        console.log(`--- DEBUG SVC (updateProfile): Attempting update (Attempt ${attempts}) for user ${userId} with version ${currentVersion} ---`, updatePayload);

        const { data: updatedData, error: updateError } = await supabase
          .from(PROFILES_TABLE)
          .update(updatePayload)
          .eq('user_id', userId)
          .eq('version', currentVersion) // Optimistic lock
          .select()
          .single();

        console.log(`--- DEBUG SVC (updateProfile): Update Attempt ${attempts} Result - Error: ${JSON.stringify(updateError)}, Data: ${JSON.stringify(updatedData)} ---`);

        if (updateError) {
          console.error(`--- DEBUG SVC (updateProfile): Update error (Attempt ${attempts}):`, updateError);
          // Check for version conflict (Supabase might return 0 rows affected, or specific code)
          // PGRST116 often means the WHERE clause (.eq('version', currentVersion)) matched 0 rows.
          // P2034 is a specific version conflict error code
          if (updateError.code === 'PGRST116' || updateError.code === 'P2034' || updateError.message?.includes('constraint violation')) {
            console.log(`--- DEBUG SVC (updateProfile): Caught DB conflict error (${updateError.code || 'message match'}), retrying... ---`);
            attempts++;
            
            // If we've exceeded max retries, throw a ConflictError immediately
            if (attempts > MAX_RETRY_ATTEMPTS) {
              console.error(`--- DEBUG SVC (updateProfile): Max retries (${MAX_RETRY_ATTEMPTS}) exceeded for version conflict. ---`);
              throw new ConflictError(
                `Profile update failed after ${MAX_RETRY_ATTEMPTS} attempts due to version conflicts.`,
                updateError
              );
            }
            
            console.log(`--- DEBUG SVC (updateProfile): Retrying update (Attempt ${attempts}). Fetching latest profile... ---`);
            
            // Fetch the latest profile version *again* before the next attempt
            try {
              existingProfile = await getProfileByUserId(userId);
              console.log(`--- DEBUG SVC (updateProfile): Fetched latest profile for retry:`, existingProfile ? `Version ${existingProfile.version}` : 'Not Found during retry');
              if (!existingProfile) {
                // If the profile disappears during retry, it's a NotFoundError situation
                throw new NotFoundError(`Profile for user ${userId} disappeared during update retry.`);
              }
              // Continue to the next iteration of the while loop with the new `existingProfile` version
              continue;
            } catch(retryFetchError) {
              console.error(`--- DEBUG SVC (updateProfile): Error fetching profile during retry (Attempt ${attempts}):`, retryFetchError);
              // If fetching fails during retry, throw an appropriate error
              if (retryFetchError instanceof NotFoundError || retryFetchError.code === 'PGRST116') {
                throw new NotFoundError(`Profile for user ${userId} not found during update retry.`, retryFetchError);
              }
              throw new InternalError(`Failed to fetch profile during update retry attempt ${attempts}.`, retryFetchError);
            }
          } else {
            // Throw other database update errors immediately
            console.error(`--- DEBUG SVC (updateProfile): Non-conflict update DB error:`, updateError);
            throw new InternalError('Failed to update user profile due to a database error.', updateError);
          }
        } else if (!updatedData) {
          // If no data returned but also no error, it's an anomaly
          console.error(`--- DEBUG SVC (updateProfile): Update returned no error but also no data on attempt ${attempts} ---`);
          throw new InternalError('Failed to retrieve updated profile data');
        } else {
          // Success!
          console.log(`--- DEBUG SVC (updateProfile): Update successful on attempt ${attempts} ---`);
          // Return the converted profile data
          return convertProfileUnitsForResponse(updatedData);
        }
      } catch (error) {
        // Catch errors thrown from within the try block
        console.error(`--- DEBUG SVC (updateProfile): Error caught within retry loop (Attempt ${attempts}):`, error);
        
        // Re-throw specific errors directly
        if (error instanceof ValidationError || 
            error instanceof NotFoundError || 
            error instanceof ConflictError || 
            error instanceof InternalError) {
          throw error;
        }
        
        // Handle PGRST116 errors as conflicts
        if (error.code === 'PGRST116' || error.code === 'P2034') {
          attempts++;
          
          // If we've exceeded max retries, throw a ConflictError
          if (attempts > MAX_RETRY_ATTEMPTS) {
            throw new ConflictError(
              `Profile update failed after ${MAX_RETRY_ATTEMPTS} attempts due to version conflicts.`,
              error
            );
          }
          
          console.log(`--- DEBUG SVC (updateProfile): Caught conflict error in catch block, incrementing attempts to ${attempts} ---`);
          
          // Try to fetch the profile again for the next attempt
          try {
            existingProfile = await getProfileByUserId(userId);
            continue;
          } catch (fetchError) {
            if (fetchError instanceof NotFoundError) {
              throw fetchError;
            }
            throw new InternalError('Failed to fetch profile during update retry', fetchError);
          }
        }
        
        // Wrap any other unexpected errors
        throw new InternalError(`Unexpected error during profile update attempt ${attempts}.`, error);
      }
    }
    
    // If we've gotten here, we've exceeded max retries without throwing an error yet
    throw new ConflictError(`Profile update failed after ${MAX_RETRY_ATTEMPTS} attempts due to version conflicts.`);
  } catch (error) {
    // Re-throw validation errors
    if (error instanceof ValidationError) {
      throw error;
    }
    
    // Re-throw NotFoundError (from the fetch attempt)
    if (error instanceof NotFoundError) {
      throw error;
    }
    
    // Re-throw ConflictError (from retry mechanism)
    if (error instanceof ConflictError) {
      throw error;
    }
    
    // Re-throw InternalError errors
    if (error instanceof InternalError) {
      throw error;
    }
    
    // Wrap any other unexpected errors
    throw new InternalError('Unexpected error in updateProfile function', error);
  }
}

/**
 * Get only the preferences portion of a user profile
 * 
 * @param {string} userId - UUID of the user
 * @returns {Promise<Object>} User preferences
 * @throws {NotFoundError} If profile doesn't exist
 * @throws {InternalError} If database operation fails
 */
async function getProfilePreferences(userId) {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from(PROFILES_TABLE)
      .select('unit_preference, goals, exercise_preferences, equipment_preferences, workout_frequency, updated_at')
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
    
    // Transform snake_case to camelCase for response
    return {
      unitPreference: data.unit_preference,
      goals: data.goals,
      exercisePreferences: data.exercise_preferences,
      equipmentPreferences: data.equipment_preferences,
      workoutFrequency: data.workout_frequency,
      updatedAt: data.updated_at
    };
  } catch (error) {
    // Re-throw NotFoundError
    if (error instanceof NotFoundError) {
      throw error;
    }
    
    // Re-throw error with PGRST116 code as NotFoundError
    if (error.code === 'PGRST116') {
      throw new NotFoundError(`Profile not found for user: ${userId}`);
    }
    
    // Re-throw InternalError
    if (error instanceof InternalError) {
      throw error;
    }
    
    // Log any unexpected errors
    logger.error('Error in getProfilePreferences:', error);
    throw new InternalError('Failed to fetch user preferences', error);
  }
}

/**
 * Update only the preferences portion of a user profile
 * 
 * @param {string} userId - UUID of the user
 * @param {Object} preferenceData - Preference data to update
 * @returns {Promise<Object>} Updated preferences
 * @throws {NotFoundError} If profile doesn't exist
 * @throws {ValidationError} If preference data is invalid
 * @throws {InternalError} If database operation fails
 */
async function updateProfilePreferences(userId, preferenceData) {
  try {
    // Validate input data first
    validatePreferenceData(preferenceData);
    
    const supabase = getSupabaseClient();
    
    // First check if profile exists
    const { data: existingProfile, error: fetchError } = await supabase
      .from(PROFILES_TABLE)
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        throw new NotFoundError(`Profile not found for user: ${userId}`);
      }
      throw new InternalError('Failed to fetch user profile for preference update', fetchError);
    }
    
    if (!existingProfile) {
      throw new NotFoundError(`Profile not found for user: ${userId}`);
    }
    
    // Prepare preference data only with fields present in the input
    const dataToUpdate = {};
    if (preferenceData.unitPreference !== undefined) {
      dataToUpdate.unit_preference = preferenceData.unitPreference;
    }
    if (preferenceData.goals !== undefined) {
      dataToUpdate.goals = preferenceData.goals;
    }
    if (preferenceData.exercisePreferences !== undefined) {
      dataToUpdate.exercise_preferences = preferenceData.exercisePreferences;
    }
    if (preferenceData.equipmentPreferences !== undefined) {
      dataToUpdate.equipment_preferences = preferenceData.equipmentPreferences;
    }
    if (preferenceData.workoutFrequency !== undefined) {
      dataToUpdate.workout_frequency = preferenceData.workoutFrequency;
    }

    // Ensure there's something to update
    if (Object.keys(dataToUpdate).length === 0) {
       return {
         unitPreference: existingProfile.unit_preference,
         goals: existingProfile.goals,
         exercisePreferences: existingProfile.exercise_preferences,
         equipmentPreferences: existingProfile.equipment_preferences,
         workoutFrequency: existingProfile.workout_frequency
       };
    }

    // Always add the updated_at timestamp
    dataToUpdate.updated_at = new Date().toISOString();

    // Update the profile preferences
    const { data, error } = await supabase
      .from(PROFILES_TABLE)
      .update(dataToUpdate)
      .eq('user_id', userId)
      .select('unit_preference, goals, exercise_preferences, equipment_preferences, workout_frequency, updated_at')
      .single();

    if (error) {
      // Handle potential error where update affects 0 rows (profile gone between check and update)
      if (error.code === 'PGRST116') {
           throw new NotFoundError(`Profile not found for user: ${userId} during preference update.`);
       }
      throw new InternalError('Failed to update user preferences', error);
    }

    if (!data) {
      throw new NotFoundError(`Failed to retrieve updated preferences for user: ${userId}`);
    }

    // The select should return the *updated* preferences based on the DB state
    return {
      unitPreference: data.unit_preference,
      goals: data.goals,
      exercisePreferences: data.exercise_preferences,
      equipmentPreferences: data.equipment_preferences,
      workoutFrequency: data.workout_frequency,
      updatedAt: data.updated_at
    };
  } catch (error) {
    // Re-throw ValidationError
    if (error instanceof ValidationError) {
      throw error;
    }
    
    // Re-throw NotFoundError
    if (error instanceof NotFoundError) {
      throw error;
    }
    
    // Handle PGRST116 error code specifically for NotFoundError
    if (error.code === 'PGRST116') {
      throw new NotFoundError(`Profile not found for user: ${userId}`);
    }
    
    // Re-throw InternalError
    if (error instanceof InternalError) {
      throw error;
    }
    
    // Log any unexpected errors
    logger.error('Error in updateProfilePreferences:', error);
    throw new InternalError('Failed to update user preferences', error);
  }
}

// Helper Functions

/**
 * Validate profile data
 * 
 * @param {Object} profileData - Profile data to validate
 * @param {boolean} [isUpdate=false] - Whether this is an update operation
 * @throws {ValidationError} If data is invalid
 */
function validateProfileData(profileData, isUpdate = false) {
  const errors = [];
  
  // For creation, these fields are required
  if (!isUpdate) {
    if (!profileData.userId) {
      errors.push({ field: 'userId', message: 'User ID is required' });
    }
    
    if (!profileData.unitPreference) {
      errors.push({ field: 'unitPreference', message: 'Unit preference is required' });
    }
  }
  
  // Validate unit preference if provided
  if (profileData.unitPreference && 
      !['metric', 'imperial'].includes(profileData.unitPreference)) {
    errors.push({ 
      field: 'unitPreference', 
      message: 'Unit preference must be either "metric" or "imperial"' 
    });
  }
  
  // Validate height based on unit preference
  if (profileData.height) {
    const unitPref = profileData.unitPreference || 'metric';
    
    if (unitPref === 'metric' && typeof profileData.height !== 'number') {
      errors.push({ 
        field: 'height', 
        message: 'Height must be a number in centimeters when using metric units' 
      });
    } else if (unitPref === 'imperial') {
      if (!profileData.height.feet && profileData.height.feet !== 0) {
        errors.push({ field: 'height.feet', message: 'Feet is required for imperial height' });
      }
      if (!profileData.height.inches && profileData.height.inches !== 0) {
        errors.push({ field: 'height.inches', message: 'Inches is required for imperial height' });
      }
    }
  }
  
  // Validate weight based on unit preference
  if (profileData.weight !== undefined) {
    if (typeof profileData.weight !== 'number' || profileData.weight <= 0) {
      errors.push({ field: 'weight', message: 'Weight must be a positive number' });
    }
  }
  
  // Validate age if provided
  if (profileData.age !== undefined) {
    if (!Number.isInteger(profileData.age) || profileData.age <= 0) {
      errors.push({ field: 'age', message: 'Age must be a positive integer' });
    }
  }
  
  // Validate goals if provided
  if (profileData.goals && !Array.isArray(profileData.goals)) {
    errors.push({ field: 'goals', message: 'Goals must be an array' });
  }
  
  // Throw validation error if there are any errors
  if (errors.length > 0) {
    throw new ValidationError('Profile data validation failed', errors);
  }
}

/**
 * Validate preference data
 * 
 * @param {Object} preferenceData - Preference data to validate
 * @throws {ValidationError} If data is invalid
 */
function validatePreferenceData(preferenceData) {
  const errors = [];
  
  // Validate unit preference if provided
  if (preferenceData.unitPreference && 
      !['metric', 'imperial'].includes(preferenceData.unitPreference)) {
    errors.push({ 
      field: 'unitPreference', 
      message: 'Unit preference must be either "metric" or "imperial"' 
    });
  }
  
  // Validate goals if provided
  if (preferenceData.goals && !Array.isArray(preferenceData.goals)) {
    errors.push({ field: 'goals', message: 'Goals must be an array' });
  }
  
  // Validate exercise preferences if provided
  if (preferenceData.exercisePreferences && !Array.isArray(preferenceData.exercisePreferences)) {
    errors.push({ field: 'exercisePreferences', message: 'Exercise preferences must be an array' });
  }
  
  // Validate equipment preferences if provided
  if (preferenceData.equipmentPreferences && !Array.isArray(preferenceData.equipmentPreferences)) {
    errors.push({ field: 'equipmentPreferences', message: 'Equipment preferences must be an array' });
  }
  
  // Throw validation error if there are any errors
  if (errors.length > 0) {
    throw new ValidationError('Preference data validation failed', errors);
  }
}

/**
 * Convert profile data for storage in the database
 * 
 * @param {Object} profileData - Profile data from the client
 * @param {Object} [existingProfile] - Existing profile for partial updates
 * @returns {Object} Data ready for database storage
 */
function prepareProfileDataForStorage(profileData, existingProfile = {}) {
  // Start with existing profile data for partial updates
  const result = { ...existingProfile };
  
  // Map camelCase to snake_case
  if (profileData.userId) result.user_id = profileData.userId;
  if (profileData.unitPreference) result.unit_preference = profileData.unitPreference;
  if (profileData.goals) result.goals = profileData.goals;
  if (profileData.exercisePreferences) result.exercise_preferences = profileData.exercisePreferences;
  if (profileData.equipmentPreferences) result.equipment_preferences = profileData.equipmentPreferences;
  if (profileData.workoutFrequency) result.workout_frequency = profileData.workoutFrequency;
  if (profileData.gender) result.gender = profileData.gender;
  if (profileData.age !== undefined) result.age = profileData.age;
  
  // Handle height conversion if provided
  if (profileData.height) {
    const unitPref = profileData.unitPreference || existingProfile.unit_preference || 'metric';
    
    // Store height in cm (metric) in the database
    if (unitPref === 'imperial') {
      result.height = convertHeight(profileData.height, 'imperial', 'metric');
    } else {
      result.height = profileData.height;
    }
  }
  
  // Handle weight conversion if provided
  if (profileData.weight !== undefined) {
    const unitPref = profileData.unitPreference || existingProfile.unit_preference || 'metric';
    
    // Store weight in kg (metric) in the database
    if (unitPref === 'imperial') {
      result.weight = convertWeight(profileData.weight, 'imperial', 'metric');
    } else {
      result.weight = profileData.weight;
    }
  }
  
  // Add timestamps
  result.updated_at = new Date().toISOString();
  if (!existingProfile.created_at) {
    result.created_at = new Date().toISOString();
  }
  
  // Note: We don't set version here as it's handled in the update function
  
  return result;
}

/**
 * Convert profile data from database for client response
 * 
 * @param {Object} profileData - Profile data from the database
 * @returns {Object} Data ready for client response
 */
function convertProfileUnitsForResponse(profileData) {
  const unitPreference = profileData.unit_preference || 'metric';
  
  // Create a response object with camelCase properties
  const response = {
    id: profileData.id,
    userId: profileData.user_id,
    unitPreference,
    gender: profileData.gender,
    age: profileData.age,
    goals: profileData.goals,
    exercisePreferences: profileData.exercise_preferences,
    equipmentPreferences: profileData.equipment_preferences,
    workoutFrequency: profileData.workout_frequency,
    createdAt: profileData.created_at,
    updatedAt: profileData.updated_at,
    version: profileData.version || 1 // Include version in response
  };
  
  // Convert height from cm to imperial if needed
  if (profileData.height !== undefined) {
    if (unitPreference === 'imperial') {
      response.height = convertHeight(profileData.height, 'metric', 'imperial');
    } else {
      response.height = profileData.height;
    }
  }
  
  // Convert weight from kg to imperial if needed
  if (profileData.weight !== undefined) {
    if (unitPreference === 'imperial') {
      response.weight = convertWeight(profileData.weight, 'metric', 'imperial');
    } else {
      response.weight = profileData.weight;
    }
  }
  
  return response;
}

module.exports = {
  getProfileByUserId,
  createProfile,
  updateProfile,
  getProfilePreferences,
  updateProfilePreferences
}; 