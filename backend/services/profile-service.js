/**
 * @fileoverview Profile service for handling user profile operations
 */

const { getSupabaseClientWithToken } = require('./supabase');
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
 * @param {string} jwtToken - JWT token for RLS-scoped client
 * @returns {Promise<Object>} User profile data
 * @throws {NotFoundError} If profile doesn't exist
 * @throws {InternalError} If database operation fails
 */
async function getProfileByUserId(userId, jwtToken) {
  try {
    const supabase = getSupabaseClientWithToken(jwtToken);
    
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
 * @param {string} jwtToken - JWT token for RLS-scoped client
 * @returns {Promise<Object>} Created profile
 * @throws {ValidationError} If profile data is invalid
 * @throws {ConflictError} If profile already exists for the user
 * @throws {InternalError} If database operation fails
 */
async function createProfile(profileData, jwtToken) {
  logger.info('Attempting to create profile', { userId: profileData?.userId });
  try {
    // Validate input data first
    validateProfileData(profileData, false); // isUpdate = false

    // Prepare data for database insertion (snake_case, conversions)
    const dbData = prepareProfileDataForStorage(profileData);
    logger.debug('Prepared data for DB insertion:', dbData);

    // Get Supabase client
    const supabase = getSupabaseClientWithToken(jwtToken);

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
 * @param {Object} data - Profile data to update
 * @param {string} jwtToken - JWT token for RLS-scoped client
 * @returns {Promise<Object>} Updated profile data
 * @throws {NotFoundError} If profile doesn't exist
 * @throws {ValidationError} If data is invalid
 * @throws {InternalError} If database operation fails
 */
async function updateProfile(userId, data, jwtToken) {
  try {
    // Validate input data first
    validateProfileData(data, true); // true indicates this is an update
    
    console.log(`--- DEBUG SVC (updateProfile): Fetching profile for user ${userId} ---`);
    
    // First, fetch the existing profile to check if it exists - get raw database data
    const supabase = getSupabaseClientWithToken(jwtToken);
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
    
    console.log(`--- DEBUG SVC (updateProfile): Fetched profile: ${existingProfile ? 'Found' : 'Not Found'} ---`);
    
    if (!existingProfile) {
        throw new NotFoundError(`Profile not found for user: ${userId}`);
    }

    // Prepare the data for storage (convert to database format)
    const updatePayload = prepareProfileDataForStorage(data, existingProfile);

    console.log(`--- DEBUG SVC (updateProfile): Attempting update for user ${userId} ---`, updatePayload);

        const { data: updatedData, error: updateError } = await supabase
          .from(PROFILES_TABLE)
          .update(updatePayload)
          .eq('user_id', userId)
          .select()
          .single();

    console.log(`--- DEBUG SVC (updateProfile): Update Result - Error: ${JSON.stringify(updateError)}, Data: ${JSON.stringify(updatedData)} ---`);

        if (updateError) {
      console.error(`--- DEBUG SVC (updateProfile): Update error:`, updateError);
      if (updateError.code === 'PGRST116') {
        throw new NotFoundError(`Profile not found for user: ${userId}`);
              }
            throw new InternalError('Failed to update user profile due to a database error.', updateError);
          }

    if (!updatedData) {
          throw new InternalError('Failed to retrieve updated profile data');
    }

    console.log(`--- DEBUG SVC (updateProfile): Update successful ---`);
          // Return the converted profile data
          return convertProfileUnitsForResponse(updatedData);
  } catch (error) {
    // Re-throw validation errors
    if (error instanceof ValidationError) {
      throw error;
    }
    
    // Re-throw NotFoundError (from the fetch attempt)
    if (error instanceof NotFoundError) {
      throw error;
    }
    
    // Re-throw InternalError errors
    if (error instanceof InternalError) {
      throw error;
    }
    
    // Handle PGRST116 error code specifically for NotFoundError
    if (error.code === 'PGRST116') {
      throw new NotFoundError(`Profile not found for user: ${userId}`);
    }
    
    // Wrap any other unexpected errors
    throw new InternalError('Unexpected error in updateProfile function', error);
  }
}

/**
 * Get only the preferences portion of a user profile
 * 
 * @param {string} userId - UUID of the user
 * @param {string} jwtToken - JWT token for RLS-scoped client
 * @returns {Promise<Object>} User preferences
 * @throws {NotFoundError} If profile doesn't exist
 * @throws {InternalError} If database operation fails
 */
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
    
    // Transform snake_case to camelCase for response
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
 * @param {string} jwtToken - JWT token for RLS-scoped client
 * @returns {Promise<Object>} Updated preferences
 * @throws {NotFoundError} If profile doesn't exist
 * @throws {ValidationError} If preference data is invalid
 * @throws {InternalError} If database operation fails
 */
async function updateProfilePreferences(userId, preferenceData, jwtToken) {
  try {
    // Validate input data first
    validatePreferenceData(preferenceData);
    
    const supabase = getSupabaseClientWithToken(jwtToken);
    
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

    // Ensure there's something to update
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

    // Always add the updated_at timestamp
    dataToUpdate.updated_at = new Date().toISOString();

    // Update the profile preferences
    const { data, error } = await supabase
      .from(PROFILES_TABLE)
      .update(dataToUpdate)
      .eq('user_id', userId)
      .select('unit_preference, fitness_goals, equipment, experience_level, workout_frequency, updated_at, user_id')
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
      userId: data.user_id,
      unitPreference: data.unit_preference,
      goals: data.fitness_goals,
      equipment: data.equipment,
      experienceLevel: data.experience_level,
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
  
  // Validate unit preference if provided and not null
  if (profileData.unitPreference !== undefined && profileData.unitPreference !== null && 
      !['metric', 'imperial'].includes(profileData.unitPreference)) {
    errors.push({ 
      field: 'unitPreference', 
      message: 'Unit preference must be either "metric" or "imperial"' 
    });
  }
  
  // Validate height - accept either number (cm) or imperial object format, or null
  if (profileData.height !== undefined && profileData.height !== null) {
    if (typeof profileData.height === 'number') {
      // Simple number format - treat as centimeters regardless of unit preference
      if (profileData.height <= 0) {
      errors.push({ 
        field: 'height', 
          message: 'Height must be a positive number' 
      });
      }
    } else if (typeof profileData.height === 'object') {
      // Imperial object format { feet: X, inches: Y }
      if (profileData.height.feet === undefined || profileData.height.feet === null) {
        errors.push({ field: 'height.feet', message: 'Feet is required for imperial height' });
      }
      if (profileData.height.inches === undefined || profileData.height.inches === null) {
        errors.push({ field: 'height.inches', message: 'Inches is required for imperial height' });
      }
      if (typeof profileData.height.feet === 'number' && profileData.height.feet < 0) {
        errors.push({ field: 'height.feet', message: 'Feet cannot be negative' });
      }
      if (typeof profileData.height.inches === 'number' && profileData.height.inches < 0) {
        errors.push({ field: 'height.inches', message: 'Inches cannot be negative' });
      }
    } else {
      errors.push({ 
        field: 'height', 
        message: 'Height must be a positive number (cm) or an object with feet and inches for imperial format' 
      });
    }
  }
  
  // Validate weight based on unit preference, allow null
  if (profileData.weight !== undefined && profileData.weight !== null) {
    if (typeof profileData.weight !== 'number' || profileData.weight <= 0) {
      errors.push({ field: 'weight', message: 'Weight must be a positive number' });
    }
  }
  
  // Validate age if provided, allow null
  if (profileData.age !== undefined && profileData.age !== null) {
    if (!Number.isInteger(profileData.age) || profileData.age <= 0) {
      errors.push({ field: 'age', message: 'Age must be a positive integer' });
    }
  }
  
  // Validate goals if provided, allow null
  if (profileData.goals !== undefined && profileData.goals !== null && !Array.isArray(profileData.goals)) {
    errors.push({ field: 'goals', message: 'Goals must be an array' });
  }
  
  // Validate exercisePreferences if provided, allow null
  if (profileData.exercisePreferences !== undefined && profileData.exercisePreferences !== null && !Array.isArray(profileData.exercisePreferences)) {
    errors.push({ field: 'exercisePreferences', message: 'Exercise preferences must be an array' });
  }
  
  // Validate equipmentPreferences if provided, allow null
  if (profileData.equipmentPreferences !== undefined && profileData.equipmentPreferences !== null && !Array.isArray(profileData.equipmentPreferences)) {
    errors.push({ field: 'equipmentPreferences', message: 'Equipment preferences must be an array' });
  }
  
  // Validate medical conditions if provided - healthcare data validation, allow null
  if (profileData.medicalConditions !== undefined && profileData.medicalConditions !== null) {
    if (!Array.isArray(profileData.medicalConditions)) {
      errors.push({ 
        field: 'medicalConditions', 
        message: 'Medical conditions must be an array' 
      });
    } else {
      // Validate each medical condition in the array
      profileData.medicalConditions.forEach((condition, index) => {
        if (typeof condition !== 'string') {
          errors.push({ 
            field: `medicalConditions[${index}]`, 
            message: 'Each medical condition must be a string' 
          });
        } else if (condition.trim().length === 0) {
          errors.push({ 
            field: `medicalConditions[${index}]`, 
            message: 'Medical condition cannot be empty' 
          });
        } else if (condition.length > 200) {
          errors.push({ 
            field: `medicalConditions[${index}]`, 
            message: 'Medical condition cannot exceed 200 characters' 
          });
        } else if (!/^[a-zA-Z0-9\s\-.,()]+$/.test(condition.trim())) {
          errors.push({ 
            field: `medicalConditions[${index}]`, 
            message: 'Medical condition contains invalid characters' 
          });
        }
      });
      
      // Validate array length
      if (profileData.medicalConditions.length > 10) {
        errors.push({ 
          field: 'medicalConditions', 
          message: 'Cannot have more than 10 medical conditions' 
        });
      }
    }
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
  
  // Validate unit preference if provided, allow null
  if (preferenceData.unitPreference !== undefined && preferenceData.unitPreference !== null && 
      !['metric', 'imperial'].includes(preferenceData.unitPreference)) {
    errors.push({ 
      field: 'unitPreference', 
      message: 'Unit preference must be either "metric" or "imperial"' 
    });
  }
  
  // Validate goals if provided, allow null
  if (preferenceData.goals !== undefined && preferenceData.goals !== null && !Array.isArray(preferenceData.goals)) {
    errors.push({ field: 'goals', message: 'Goals must be an array' });
  }
  
  // Validate exercise preferences if provided, allow null
  if (preferenceData.exercisePreferences !== undefined && preferenceData.exercisePreferences !== null && !Array.isArray(preferenceData.exercisePreferences)) {
    errors.push({ field: 'exercisePreferences', message: 'Exercise preferences must be an array' });
  }
  
  // Validate equipment preferences if provided, allow null
  if (preferenceData.equipmentPreferences !== undefined && preferenceData.equipmentPreferences !== null && !Array.isArray(preferenceData.equipmentPreferences)) {
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
 * @param {Object} [existingProfile] - Existing profile for partial updates (should be in database format)
 * @returns {Object} Data ready for database storage
 */
function prepareProfileDataForStorage(profileData, existingProfile = {}) {
  // Start with a clean object - we'll only include database-formatted fields
  const result = {};
  
  // Only copy database-formatted fields from existing profile (snake_case)
  const dbFields = [
    'id', 'user_id', 'unit_preference', 'fitness_goals', 'equipment', 
    'workout_frequency', 'gender', 'age', 'name', 'experience_level', 
    'medical_conditions', 'height', 'weight', 'created_at', 'updated_at'
  ];
  
  // Copy existing database fields
  dbFields.forEach(field => {
    if (existingProfile[field] !== undefined) {
      result[field] = existingProfile[field];
    }
  });
  
  // Map camelCase to snake_case and correct column names - only update provided fields
  if (profileData.userId !== undefined) result.user_id = profileData.userId;
  if (profileData.unitPreference !== undefined) result.unit_preference = profileData.unitPreference;
  if (profileData.goals !== undefined) result.fitness_goals = profileData.goals; // Map to fitness_goals
  if (profileData.workoutFrequency !== undefined) result.workout_frequency = profileData.workoutFrequency;
  if (profileData.gender !== undefined) result.gender = profileData.gender;
  if (profileData.age !== undefined) result.age = profileData.age;
  if (profileData.name !== undefined) result.name = profileData.name;
  if (profileData.experienceLevel !== undefined) result.experience_level = profileData.experienceLevel;
  if (profileData.medicalConditions !== undefined) result.medical_conditions = profileData.medicalConditions;
  
  // Handle equipment field mapping - priority: equipmentPreferences > exercisePreferences > equipment
  if (profileData.equipmentPreferences !== undefined) {
    result.equipment = profileData.equipmentPreferences;
    console.log('Equipment field mapping: equipmentPreferences →', profileData.equipmentPreferences);
  } else if (profileData.exercisePreferences !== undefined) {
    result.equipment = profileData.exercisePreferences;
    console.log('Equipment field mapping: exercisePreferences →', profileData.exercisePreferences);
  } else if (profileData.equipment !== undefined) {
    result.equipment = profileData.equipment;
    console.log('Equipment field mapping: equipment →', profileData.equipment);
  }
  
  // Handle height conversion if provided
  if (profileData.height !== undefined) {
    console.log('--- DEBUG CONVERSION: Height input:', profileData.height, 'type:', typeof profileData.height);
    
    if (profileData.height === null) {
      result.height = null;
      console.log('--- DEBUG CONVERSION: Height set to null');
    } else if (typeof profileData.height === 'number') {
      // Simple number format - treat as centimeters and store directly
      result.height = profileData.height;
      console.log('--- DEBUG CONVERSION: Height stored as number:', result.height);
    } else if (typeof profileData.height === 'object' && profileData.height !== null) {
      // Imperial object format { feet: X, inches: Y } - convert to cm
      try {
        const convertedHeight = convertHeight(profileData.height, 'imperial', 'metric');
        result.height = convertedHeight;
        console.log('--- DEBUG CONVERSION: Height converted from', profileData.height, 'to', convertedHeight, 'cm');
      } catch (error) {
        console.error('--- DEBUG CONVERSION: Height conversion failed:', error);
        throw new ValidationError('Failed to convert height', [{ field: 'height', message: error.message }]);
      }
    }
  } else if (profileData.unitPreference !== undefined && existingProfile.height !== undefined && existingProfile.height !== null) {
    // Handle unit preference change without explicit height update
    // The height is already stored in cm in the database, so no conversion needed for storage
    // The response conversion will handle displaying it in the correct format
    console.log('--- DEBUG CONVERSION: Unit preference changed but height not provided, keeping existing height:', existingProfile.height, 'cm');
    result.height = existingProfile.height;
  }
  
  // Handle weight conversion if provided
  if (profileData.weight !== undefined) {
    console.log('--- DEBUG CONVERSION: Weight input:', profileData.weight, 'type:', typeof profileData.weight);
    
    if (profileData.weight === null) {
      result.weight = null;
      console.log('--- DEBUG CONVERSION: Weight set to null');
    } else {
      const unitPref = profileData.unitPreference || existingProfile.unit_preference || 'metric';
      
      // Store weight in kg (metric) in the database
      if (unitPref === 'imperial') {
        try {
          const convertedWeight = convertWeight(profileData.weight, 'imperial', 'metric');
          result.weight = convertedWeight;
          console.log('--- DEBUG CONVERSION: Weight converted from', profileData.weight, 'lbs to', convertedWeight, 'kg');
        } catch (error) {
          console.error('--- DEBUG CONVERSION: Weight conversion failed:', error);
          throw new ValidationError('Failed to convert weight', [{ field: 'weight', message: error.message }]);
        }
      } else {
        result.weight = profileData.weight;
        console.log('--- DEBUG CONVERSION: Weight stored as-is (metric):', result.weight, 'kg');
      }
    }
  } else if (profileData.unitPreference !== undefined && existingProfile.weight !== undefined && existingProfile.weight !== null) {
    // Handle unit preference change without explicit weight update
    // Weight is already stored in kg in the database, so no conversion needed for storage
    console.log('--- DEBUG CONVERSION: Unit preference changed but weight not provided, keeping existing weight:', existingProfile.weight, 'kg');
    result.weight = existingProfile.weight;
  }
  
  // Add timestamps - only set created_at if it's a new profile
  result.updated_at = new Date().toISOString();
  if (!existingProfile.created_at) {
    result.created_at = new Date().toISOString();
  }
  
  console.log('--- DEBUG CONVERSION: Final storage payload:', result);
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
    name: profileData.name,
    experienceLevel: profileData.experience_level,
    medicalConditions: profileData.medical_conditions,
    goals: profileData.fitness_goals, // Map from fitness_goals
    workoutFrequency: profileData.workout_frequency,
    createdAt: profileData.created_at,
    updatedAt: profileData.updated_at
  };
  
  // Note: For equipment field, we only return one field in the response
  // The backend stores everything in the 'equipment' database field
  // but for API responses, we use the 'equipment' field name
  if (profileData.equipment !== undefined) {
    response.equipment = profileData.equipment;
  }
  
  // Convert height from cm to imperial if needed
  if (profileData.height !== undefined && profileData.height !== null) {
    if (unitPreference === 'imperial') {
      try {
        response.height = convertHeight(profileData.height, 'metric', 'imperial');
        console.log('--- DEBUG RESPONSE: Height converted from', profileData.height, 'cm to imperial:', response.height);
      } catch (error) {
        console.error('--- DEBUG RESPONSE: Height conversion failed:', error);
        // Fall back to the original value if conversion fails
        response.height = profileData.height;
      }
    } else {
      response.height = profileData.height;
      console.log('--- DEBUG RESPONSE: Height kept as metric:', response.height, 'cm');
    }
  }
  
  // Convert weight from kg to imperial if needed
  if (profileData.weight !== undefined && profileData.weight !== null) {
    if (unitPreference === 'imperial') {
      try {
        response.weight = convertWeight(profileData.weight, 'metric', 'imperial');
        console.log('--- DEBUG RESPONSE: Weight converted from', profileData.weight, 'kg to', response.weight, 'lbs');
      } catch (error) {
        console.error('--- DEBUG RESPONSE: Weight conversion failed:', error);
        // Fall back to the original value if conversion fails
        response.weight = profileData.weight;
      }
    } else {
      response.weight = profileData.weight;
      console.log('--- DEBUG RESPONSE: Weight kept as metric:', response.weight, 'kg');
    }
  }
  
  console.log('--- DEBUG RESPONSE: Final response payload:', response);
  return response;
}

module.exports = {
  getProfileByUserId,
  createProfile,
  updateProfile,
  getProfilePreferences,
  updateProfilePreferences
}; 