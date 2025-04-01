/**
 * @fileoverview Profile service for handling user profile operations
 */

const { getSupabaseClient } = require('./supabase');
const { 
  ValidationError, 
  NotFoundError, 
  InternalError 
} = require('../utils/errors');
const { convertHeight, convertWeight } = require('../utils/unit-conversion');
const logger = require('../config/logger');

// Table name for user profiles
const PROFILES_TABLE = 'user_profiles';

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
    
    const { data, error } = await supabase
      .from(PROFILES_TABLE)
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError(`Profile not found for user: ${userId}`);
      }
      throw new InternalError('Failed to fetch user profile', error);
    }
    
    if (!data) {
      throw new NotFoundError(`Profile not found for user: ${userId}`);
    }
    
    // Handle unit conversions if needed
    return convertProfileUnitsForResponse(data);
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof InternalError) {
      throw error;
    }
    logger.error('Error in getProfileByUserId:', error);
    throw new InternalError('Failed to fetch user profile', error);
  }
}

/**
 * Create a new user profile
 * 
 * @param {Object} profileData - Profile data to save
 * @returns {Promise<Object>} Created profile
 * @throws {ValidationError} If profile data is invalid
 * @throws {InternalError} If database operation fails
 */
async function createProfile(profileData) {
  try {
    validateProfileData(profileData);
    
    const supabase = getSupabaseClient();
    
    // Prepare data for storage (convert units if needed)
    const dataToStore = prepareProfileDataForStorage(profileData);
    
    const { data, error } = await supabase
      .from(PROFILES_TABLE)
      .insert(dataToStore)
      .select()
      .single();
    
    if (error) {
      throw new InternalError('Failed to create user profile', error);
    }
    
    // Handle unit conversions for response
    return convertProfileUnitsForResponse(data);
  } catch (error) {
    if (error instanceof ValidationError || error instanceof InternalError) {
      throw error;
    }
    logger.error('Error in createProfile:', error);
    throw new InternalError('Failed to create user profile', error);
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
 * @throws {InternalError} If database operation fails
 */
async function updateProfile(userId, updateData) {
  try {
    validateProfileData(updateData, true);
    
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
      throw new InternalError('Failed to fetch user profile for update', fetchError);
    }
    
    if (!existingProfile) {
      throw new NotFoundError(`Profile not found for user: ${userId}`);
    }
    
    // Prepare data for storage
    const dataToStore = prepareProfileDataForStorage(updateData, existingProfile);
    
    // Update the profile
    const { data, error } = await supabase
      .from(PROFILES_TABLE)
      .update(dataToStore)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) {
      throw new InternalError('Failed to update user profile', error);
    }
    
    // Handle unit conversions for response
    return convertProfileUnitsForResponse(data);
  } catch (error) {
    if (error instanceof NotFoundError || 
        error instanceof ValidationError || 
        error instanceof InternalError) {
      throw error;
    }
    logger.error('Error in updateProfile:', error);
    throw new InternalError('Failed to update user profile', error);
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
      .select('unit_preference, goals, exercise_preferences, equipment_preferences, workout_frequency')
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
    
    return {
      unitPreference: data.unit_preference,
      goals: data.goals,
      exercisePreferences: data.exercise_preferences,
      equipmentPreferences: data.equipment_preferences,
      workoutFrequency: data.workout_frequency
    };
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof InternalError) {
      throw error;
    }
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
       return convertProfileUnitsForResponse(existingProfile); // Or throw validation error? Return existing prefs?
       // For now, let's just return the existing converted prefs if nothing was provided to update.
    }

    // Always add the updated_at timestamp
    dataToUpdate.updated_at = new Date().toISOString();

    // Update the profile preferences
    const { data, error } = await supabase
      .from(PROFILES_TABLE)
      .update(dataToUpdate)
      .eq('user_id', userId)
      .select('unit_preference, goals, exercise_preferences, equipment_preferences, workout_frequency') // Select only prefs
      .single();

    if (error) {
      // Handle potential error where update affects 0 rows (profile gone between check and update)
      if (error.code === 'PGRST116') { // Or based on specific error inspection
           throw new NotFoundError(`Profile not found for user: ${userId} during preference update.`);
       }
      throw new InternalError('Failed to update user preferences', error);
    }

    // The select should return the *updated* preferences based on the DB state
    return {
      unitPreference: data.unit_preference,
      goals: data.goals,
      exercisePreferences: data.exercise_preferences,
      equipmentPreferences: data.equipment_preferences,
      workoutFrequency: data.workout_frequency
    };
  } catch (error) {
    if (error instanceof NotFoundError ||
        error instanceof ValidationError ||
        error instanceof InternalError) {
      throw error;
    }
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
    updatedAt: profileData.updated_at
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