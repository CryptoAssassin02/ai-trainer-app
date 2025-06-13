/**
 * @fileoverview Nutrition service for handling nutrition data operations
 */

const { getSupabaseClientWithToken } = require('./supabase');
const { 
  ValidationError, 
  NotFoundError, 
  InternalError 
} = require('../utils/errors');
const logger = require('../config/logger');

// Table names for nutrition data
const NUTRITION_PLANS_TABLE = 'nutrition_plans';
const DIETARY_PREFERENCES_TABLE = 'dietary_preferences';
const MEAL_LOGS_TABLE = 'meal_logs';

/**
 * Get a nutrition plan by user ID
 * 
 * @param {string} userId - UUID of the user
 * @param {string} jwtToken - JWT token for RLS-scoped client
 * @returns {Promise<Object>} User nutrition plan data
 * @throws {NotFoundError} If plan doesn't exist
 * @throws {InternalError} If database operation fails
 */
async function getNutritionPlanByUserId(userId, jwtToken) {
  try {
    const supabase = getSupabaseClientWithToken(jwtToken);
    
    const { data, error } = await supabase
      .from(NUTRITION_PLANS_TABLE)
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError(`Nutrition plan not found for user: ${userId}`);
      }
      throw new InternalError('Failed to fetch nutrition plan', error);
    }
    
    if (!data) {
      throw new NotFoundError(`Nutrition plan not found for user: ${userId}`);
    }
    
    return formatNutritionPlanResponse(data);
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof InternalError) {
      throw error;
    }
    logger.error('Error in getNutritionPlanByUserId:', error);
    throw new InternalError('Failed to fetch nutrition plan', error);
  }
}

/**
 * Create or update a nutrition plan
 * 
 * @param {Object} planData - Nutrition plan data to save
 * @param {string} jwtToken - JWT token for RLS-scoped client
 * @returns {Promise<Object>} Created or updated plan
 * @throws {ValidationError} If plan data is invalid
 * @throws {InternalError} If database operation fails
 */
async function createOrUpdateNutritionPlan(planData, jwtToken) {
  try {
    validateNutritionPlanData(planData);
    
    const supabase = getSupabaseClientWithToken(jwtToken);
    
    // Prepare data for storage
    const dataToStore = prepareNutritionPlanForStorage(planData);
    
    // Use upsert to create or update based on user_id
    const { data, error } = await supabase
      .from(NUTRITION_PLANS_TABLE)
      .upsert(dataToStore, {
        onConflict: 'user_id', // Ensure this matches your Supabase table constraint
        returning: 'representation'
      })
      .select()
      .single();
    
    if (error) {
      throw new InternalError('Failed to save nutrition plan', error);
    }
    
    return formatNutritionPlanResponse(data);
  } catch (error) {
    if (error instanceof ValidationError || error instanceof InternalError) {
      throw error;
    }
    logger.error('Error in createOrUpdateNutritionPlan:', error);
    throw new InternalError('Failed to save nutrition plan', error);
  }
}

/**
 * Get dietary preferences for a user
 * 
 * @param {string} userId - UUID of the user
 * @param {string} jwtToken - JWT token for RLS-scoped client
 * @returns {Promise<Object>} User dietary preferences
 * @throws {NotFoundError} If preferences don't exist
 * @throws {InternalError} If database operation fails
 */
async function getDietaryPreferences(userId, jwtToken) {
  try {
    const supabase = getSupabaseClientWithToken(jwtToken);
    
    const { data, error } = await supabase
      .from(DIETARY_PREFERENCES_TABLE)
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError(`Dietary preferences not found for user: ${userId}`);
      }
      throw new InternalError('Failed to fetch dietary preferences', error);
    }
    
    if (!data) {
      throw new NotFoundError(`Dietary preferences not found for user: ${userId}`);
    }
    
    return formatDietaryPreferencesResponse(data);
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof InternalError) {
      throw error;
    }
    logger.error('Error in getDietaryPreferences:', error);
    throw new InternalError('Failed to fetch dietary preferences', error);
  }
}

/**
 * Create or update dietary preferences
 * 
 * @param {Object} preferencesData - Dietary preferences data to save
 * @param {string} jwtToken - JWT token for RLS-scoped client
 * @returns {Promise<Object>} Created or updated preferences
 * @throws {ValidationError} If preferences data is invalid
 * @throws {InternalError} If database operation fails
 */
async function createOrUpdateDietaryPreferences(preferencesData, jwtToken) {
  try {
    validateDietaryPreferences(preferencesData);
    
    const supabase = getSupabaseClientWithToken(jwtToken);
    
    // Prepare data for storage
    const dataToStore = prepareDietaryPreferencesForStorage(preferencesData);
    
    // Use upsert to create or update based on user_id
    const { data, error } = await supabase
      .from(DIETARY_PREFERENCES_TABLE)
      .upsert(dataToStore, {
        onConflict: 'user_id',
        returning: 'representation'
      })
      .select()
      .single();
    
    if (error) {
      throw new InternalError('Failed to save dietary preferences', error);
    }
    
    return formatDietaryPreferencesResponse(data);
  } catch (error) {
    if (error instanceof ValidationError || error instanceof InternalError) {
      throw error;
    }
    logger.error('Error in createOrUpdateDietaryPreferences:', error);
    throw new InternalError('Failed to save dietary preferences', error);
  }
}

/**
 * Log a meal for a user
 * 
 * @param {Object} mealLogData - Meal log data to save
 * @param {string} jwtToken - JWT token for RLS-scoped client
 * @returns {Promise<Object>} Created meal log
 * @throws {ValidationError} If meal log data is invalid
 * @throws {InternalError} If database operation fails
 */
async function logMeal(mealLogData, jwtToken) {
  try {
    validateMealLogData(mealLogData);
    
    const supabase = getSupabaseClientWithToken(jwtToken);
    
    // Prepare data for storage
    const dataToStore = prepareMealLogForStorage(mealLogData);
    
    const { data, error } = await supabase
      .from(MEAL_LOGS_TABLE)
      .insert(dataToStore)
      .select()
      .single();
    
    if (error) {
      throw new InternalError('Failed to save meal log', error);
    }
    
    return formatMealLogResponse(data);
  } catch (error) {
    if (error instanceof ValidationError || error instanceof InternalError) {
      throw error;
    }
    logger.error('Error in logMeal:', error);
    throw new InternalError('Failed to save meal log', error);
  }
}

/**
 * Get meal logs for a user within a date range
 * 
 * @param {string} userId - UUID of the user
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @param {string} jwtToken - JWT token for RLS-scoped client
 * @returns {Promise<Array<Object>>} Array of meal logs
 * @throws {ValidationError} If date format is invalid
 * @throws {InternalError} If database operation fails
 */
async function getMealLogs(userId, startDate, endDate, jwtToken) {
  try {
    // Validate date inputs
    if (startDate && !isValidDateFormat(startDate)) {
      throw new ValidationError('Invalid startDate format. Use YYYY-MM-DD.');
    }
    if (endDate && !isValidDateFormat(endDate)) {
      throw new ValidationError('Invalid endDate format. Use YYYY-MM-DD.');
    }
    
    const supabase = getSupabaseClientWithToken(jwtToken);
    
    // First construct the base query
    let query = supabase
      .from(MEAL_LOGS_TABLE)
      .select('*')
      .eq('user_id', userId);
    
    // Add date range filters if provided
    if (startDate) {
      query = query.gte('logged_at', `${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      query = query.lte('logged_at', `${endDate}T23:59:59.999Z`);
    }
    
    // Add order at the end after all filters
    query = query.order('logged_at', { ascending: false });
    
    const { data, error } = await query;
    
    if (error) {
      throw new InternalError('Failed to fetch meal logs', error);
    }
    
    // Format each meal log for response
    return data.map(formatMealLogResponse);
  } catch (error) {
    if (error instanceof ValidationError || error instanceof InternalError) {
      throw error;
    }
    logger.error('Error in getMealLogs:', error);
    throw new InternalError('Failed to fetch meal logs', error);
  }
}

// Helper Functions

/**
 * Validate nutrition plan data
 * 
 * @param {Object} planData - Nutrition plan data to validate
 * @throws {ValidationError} If data is invalid
 */
function validateNutritionPlanData(planData) {
  const errors = [];
  
  if (!planData.userId) {
    errors.push({ field: 'userId', message: 'User ID is required' });
  }
  
  if (!planData.calculations) {
    errors.push({ field: 'calculations', message: 'Nutrition calculations are required' });
  } else {
    if (planData.calculations.bmr === undefined) {
      errors.push({ field: 'calculations.bmr', message: 'BMR is required' });
    }
    if (planData.calculations.tdee === undefined) {
      errors.push({ field: 'calculations.tdee', message: 'TDEE is required' });
    }
    if (!planData.calculations.macros) {
      errors.push({ field: 'calculations.macros', message: 'Macros are required' });
    } else {
      if (planData.calculations.macros.protein_g === undefined) {
        errors.push({ field: 'calculations.macros.protein_g', message: 'Protein is required' });
      }
      if (planData.calculations.macros.carbs_g === undefined) {
        errors.push({ field: 'calculations.macros.carbs_g', message: 'Carbs are required' });
      }
      if (planData.calculations.macros.fat_g === undefined) {
        errors.push({ field: 'calculations.macros.fat_g', message: 'Fat is required' });
      }
      if (planData.calculations.macros.calories === undefined) {
        errors.push({ field: 'calculations.macros.calories', message: 'Calories are required' });
      }
    }
  }
  
  if (!planData.goals || !Array.isArray(planData.goals) || planData.goals.length === 0) {
    errors.push({ field: 'goals', message: 'At least one goal is required' });
  }
  
  if (!planData.activityLevel) {
    errors.push({ field: 'activityLevel', message: 'Activity level is required' });
  }
  
  // Throw validation error if there are any errors
  if (errors.length > 0) {
    throw new ValidationError('Nutrition plan data validation failed', errors);
  }
}

/**
 * Validate dietary preferences data
 * 
 * @param {Object} preferencesData - Dietary preferences data to validate
 * @throws {ValidationError} If data is invalid
 */
function validateDietaryPreferences(preferencesData) {
  const errors = [];
  
  if (!preferencesData.userId) {
    errors.push({ field: 'userId', message: 'User ID is required' });
  }
  
  if (preferencesData.mealFrequency !== undefined) {
    if (!Number.isInteger(preferencesData.mealFrequency) || preferencesData.mealFrequency < 1) {
      errors.push({ field: 'mealFrequency', message: 'Meal frequency must be a positive integer' });
    }
  }
  
  if (preferencesData.restrictions && !Array.isArray(preferencesData.restrictions)) {
    errors.push({ field: 'restrictions', message: 'Restrictions must be an array' });
  }
  
  if (preferencesData.allergies && !Array.isArray(preferencesData.allergies)) {
    errors.push({ field: 'allergies', message: 'Allergies must be an array' });
  }
  
  if (preferencesData.dislikedFoods && !Array.isArray(preferencesData.dislikedFoods)) {
    errors.push({ field: 'dislikedFoods', message: 'Disliked foods must be an array' });
  }
  
  // Throw validation error if there are any errors
  if (errors.length > 0) {
    throw new ValidationError('Dietary preferences validation failed', errors);
  }
}

/**
 * Validate meal log data
 * 
 * @param {Object} mealLogData - Meal log data to validate
 * @throws {ValidationError} If data is invalid
 */
function validateMealLogData(mealLogData) {
  const errors = [];
  
  if (!mealLogData.userId) {
    errors.push({ field: 'userId', message: 'User ID is required' });
  }
  
  if (!mealLogData.mealName) {
    errors.push({ field: 'mealName', message: 'Meal name is required' });
  }
  
  if (!mealLogData.foods || !Array.isArray(mealLogData.foods) || mealLogData.foods.length === 0) {
    errors.push({ field: 'foods', message: 'At least one food item is required' });
  } else {
    mealLogData.foods.forEach((food, index) => {
      if (!food.name) {
        errors.push({ field: `foods[${index}].name`, message: 'Food name is required' });
      }
      if (food.portionSize === undefined) {
        errors.push({ field: `foods[${index}].portionSize`, message: 'Portion size is required' });
      }
      if (!food.units) {
        errors.push({ field: `foods[${index}].units`, message: 'Units are required' });
      }
    });
  }
  
  if (!mealLogData.loggedAt) {
    errors.push({ field: 'loggedAt', message: 'Logged time is required' });
  } else if (!isValidISODate(mealLogData.loggedAt)) {
    errors.push({ field: 'loggedAt', message: 'Logged time must be a valid date' });
  }
  
  // Throw validation error if there are any errors
  if (errors.length > 0) {
    throw new ValidationError('Meal log data validation failed', errors);
  }
}

/**
 * Check if a string is a valid date format (YYYY-MM-DD)
 * 
 * @param {string} dateString - The date string to validate
 * @returns {boolean} True if valid format, false otherwise
 */
function isValidDateFormat(dateString) {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  
  // Check if it's a valid date
  const date = new Date(dateString);
  const timestamp = date.getTime();
  
  if (isNaN(timestamp)) return false;
  
  return date.toISOString().slice(0, 10) === dateString;
}

/**
 * Check if a string is a valid ISO date
 * 
 * @param {string} dateString - The date string to validate
 * @returns {boolean} True if valid ISO date, false otherwise
 */
function isValidISODate(dateString) {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Format nutrition plan data for storage
 * 
 * @param {Object} planData - Nutrition plan data from the client
 * @returns {Object} Data ready for database storage
 */
function prepareNutritionPlanForStorage(planData) {
  return {
    user_id: planData.userId,
    bmr: planData.calculations.bmr,
    tdee: planData.calculations.tdee,
    macros: {
      protein_g: planData.calculations.macros.protein_g,
      carbs_g: planData.calculations.macros.carbs_g,
      fat_g: planData.calculations.macros.fat_g,
      calories: planData.calculations.macros.calories
    },
    meal_plan: planData.mealPlan || null,
    food_suggestions: planData.foodSuggestions || null,
    explanations: planData.explanations || null,
    goals: planData.goals,
    activity_level: planData.activityLevel,
    updated_at: new Date().toISOString()
  };
}

/**
 * Format dietary preferences for storage
 * 
 * @param {Object} preferencesData - Dietary preferences from the client
 * @returns {Object} Data ready for database storage
 */
function prepareDietaryPreferencesForStorage(preferencesData) {
  return {
    user_id: preferencesData.userId,
    meal_frequency: preferencesData.mealFrequency,
    meal_timing_prefs: preferencesData.mealTimingPrefs || null,
    time_constraints: preferencesData.timeConstraints || null,
    restrictions: preferencesData.restrictions || [],
    disliked_foods: preferencesData.dislikedFoods || [],
    allergies: preferencesData.allergies || [],
    preferred_cuisine: preferencesData.preferredCuisine || null,
    diet_type: preferencesData.dietType || null,
    updated_at: new Date().toISOString()
  };
}

/**
 * Format meal log for storage
 * 
 * @param {Object} mealLogData - Meal log data from the client
 * @returns {Object} Data ready for database storage
 */
function prepareMealLogForStorage(mealLogData) {
  return {
    user_id: mealLogData.userId,
    meal_name: mealLogData.mealName,
    foods: mealLogData.foods.map(food => ({
      name: food.name,
      portion_size: food.portionSize,
      units: food.units,
      protein_g: food.protein_g,
      carbs_g: food.carbs_g,
      fat_g: food.fat_g,
      calories: food.calories
    })),
    notes: mealLogData.notes || null,
    logged_at: mealLogData.loggedAt,
    created_at: new Date().toISOString()
  };
}

/**
 * Format nutrition plan data for client response
 * 
 * @param {Object} planData - Nutrition plan data from the database
 * @returns {Object} Data ready for client response
 */
function formatNutritionPlanResponse(planData) {
  return {
    id: planData.id,
    userId: planData.user_id,
    calculations: {
      bmr: planData.bmr,
      tdee: planData.tdee,
      macros: planData.macros
    },
    mealPlan: planData.meal_plan,
    foodSuggestions: planData.food_suggestions,
    explanations: planData.explanations,
    goals: planData.goals,
    activityLevel: planData.activity_level,
    updatedAt: planData.updated_at,
    createdAt: planData.created_at
  };
}

/**
 * Format dietary preferences for client response
 * 
 * @param {Object} preferencesData - Dietary preferences from the database
 * @returns {Object} Data ready for client response
 */
function formatDietaryPreferencesResponse(preferencesData) {
  return {
    id: preferencesData.id,
    userId: preferencesData.user_id,
    mealFrequency: preferencesData.meal_frequency,
    mealTimingPrefs: preferencesData.meal_timing_prefs,
    timeConstraints: preferencesData.time_constraints,
    restrictions: preferencesData.restrictions,
    dislikedFoods: preferencesData.disliked_foods,
    allergies: preferencesData.allergies,
    preferredCuisine: preferencesData.preferred_cuisine,
    dietType: preferencesData.diet_type,
    updatedAt: preferencesData.updated_at,
    createdAt: preferencesData.created_at
  };
}

/**
 * Format meal log for client response
 * 
 * @param {Object} mealLogData - Meal log data from the database
 * @returns {Object} Data ready for client response
 */
function formatMealLogResponse(mealLogData) {
  return {
    id: mealLogData.id,
    userId: mealLogData.user_id,
    mealName: mealLogData.meal_name,
    foods: mealLogData.foods.map(food => ({
      name: food.name,
      portionSize: food.portion_size,
      units: food.units,
      protein_g: food.protein_g,
      carbs_g: food.carbs_g,
      fat_g: food.fat_g,
      calories: food.calories
    })),
    notes: mealLogData.notes,
    loggedAt: mealLogData.logged_at,
    createdAt: mealLogData.created_at
  };
}

module.exports = {
  getNutritionPlanByUserId,
  createOrUpdateNutritionPlan,
  getDietaryPreferences,
  createOrUpdateDietaryPreferences,
  logMeal,
  getMealLogs
}; 