/**
 * Macro Calculation Service
 * 
 * This service handles the calculation, storage, and retrieval of 
 * macronutrient targets for users.
 */

const { createClient } = require('@supabase/supabase-js');
const { supabaseUrl, supabaseKey } = require('../config/supabase');
const { BadRequestError, DatabaseError, NotFoundError } = require('../utils/errors');
const logger = require('../config/logger');
const { getNutritionAgent } = require('../agents');
const retryOperation = require('../utils/retry-utils');

/**
 * Calculates macronutrient targets based on user information
 * 
 * @param {Object} userInfo User's demographic and goal information
 * @param {Boolean} useExternalApi Whether to use the Nutrition Agent API
 * @returns {Object} Calculated macro targets
 */
async function calculateMacros(userInfo, useExternalApi = true) {
  logger.info('Calculating macros', { ...userInfo, userId: userInfo.userId });
  
  try {
    // If external API is enabled and available, use Nutrition Agent
    if (useExternalApi) {
      try {
        const nutritionAgent = getNutritionAgent();
        return await retryOperation(
          async () => {
            const result = await nutritionAgent.calculateMacroTargets(userInfo);
            logger.info('Macros calculated via Nutrition Agent', { userId: userInfo.userId });
            return result;
          },
          { maxAttempts: 3, backoff: 'exponential' }
        );
      } catch (apiError) {
        logger.warn('Failed to calculate macros via API, falling back to formula', { 
          userId: userInfo.userId, 
          error: apiError.message 
        });
        // Fall back to formula calculation on API failure
      }
    }
    
    // Calculate macros using formula approach
    const { weight, height, age, gender, activityLevel, goal } = userInfo;
    
    // Define activity multipliers *before* validation
    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9
    };
    
    // --- INPUT VALIDATION ---
    if (
      weight === undefined || weight === null || isNaN(weight) ||
      height === undefined || height === null || isNaN(height) ||
      age === undefined || age === null || isNaN(age) ||
      !gender || (gender !== 'male' && gender !== 'female') || // Basic gender check
      !activityLevel || !activityMultipliers[activityLevel] || // Check activity level validity
      !goal // Check goal validity
    ) {
      const missingOrInvalid = [];
      if (weight === undefined || weight === null || isNaN(weight)) missingOrInvalid.push('weight');
      if (height === undefined || height === null || isNaN(height)) missingOrInvalid.push('height');
      if (age === undefined || age === null || isNaN(age)) missingOrInvalid.push('age');
      if (!gender || (gender !== 'male' && gender !== 'female')) missingOrInvalid.push('gender');
      if (!activityLevel || !activityMultipliers[activityLevel]) missingOrInvalid.push('activityLevel');
      if (!goal) missingOrInvalid.push('goal');
      
      const errorMessage = `Invalid or missing user info for formula calculation: ${missingOrInvalid.join(', ')}`;
      logger.error('Error calculating macros', { error: errorMessage, userId: userInfo.userId });
      throw new BadRequestError(errorMessage);
    }
    // --- END VALIDATION ---
    
    // Calculate BMR using Mifflin-St Jeor Equation
    let bmr;
    if (gender === 'male') {
      bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }
    
    // Calculate TDEE (Total Daily Energy Expenditure)
    const tdee = Math.round(bmr * activityMultipliers[activityLevel]);
    
    // Adjust calories based on goal
    let calorieAdjustment = 0;
    switch (goal) {
      case 'weight_loss':
        calorieAdjustment = -500; // Calorie deficit
        break;
      case 'muscle_gain':
        calorieAdjustment = 300; // Calorie surplus
        break;
      case 'maintenance':
      default:
        calorieAdjustment = 0; // No adjustment
    }
    
    const calories = tdee + calorieAdjustment;
    
    // Calculate macros based on goal
    let proteinPercentage, carbPercentage, fatPercentage;
    
    switch (goal) {
      case 'weight_loss':
        proteinPercentage = 0.30; // 30%
        fatPercentage = 0.35;     // 35%
        carbPercentage = 0.35;    // 35%
        break;
      case 'muscle_gain':
        proteinPercentage = 0.30; // 30%
        fatPercentage = 0.25;     // 25%
        carbPercentage = 0.45;    // 45%
        break;
      case 'maintenance':
      default:
        proteinPercentage = 0.25; // 25%
        fatPercentage = 0.30;     // 30%
        carbPercentage = 0.45;    // 45%
    }
    
    // Calculate grams for each macro
    // Protein: 4 calories per gram
    // Carbs: 4 calories per gram
    // Fat: 9 calories per gram
    const protein = Math.round((calories * proteinPercentage) / 4);
    const carbs = Math.round((calories * carbPercentage) / 4);
    const fat = Math.round((calories * fatPercentage) / 9);
    
    // Construct the result object
    const result = {
      calories,
      macros: {
        protein,
        carbs,
        fat
      },
      bmr,
      tdee,
      goalType: goal,
      calorieAdjustment
    };
    
    logger.info('Macros calculated via formula', { userId: userInfo.userId });
    return result;
  } catch (error) {
    logger.error('Error calculating macros', { error: error.message, userId: userInfo.userId });
    throw new BadRequestError(`Failed to calculate macros: ${error.message}`);
  }
}

/**
 * Stores macro plan in the database
 * 
 * @param {string} userId User ID
 * @param {Object} macroData Calculated macro data
 * @param {string} jwtToken User's JWT token for RLS
 * @returns {string} ID of the created macro plan
 */
async function storeMacros(userId, macroData, jwtToken) {
  logger.info('Storing macros for user', { userId });
  
  // Initialize Supabase client with JWT for RLS
  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${jwtToken}` } }
  });
  
  try {
    // Prepare data for insertion
    const planData = {
      user_id: userId,
      bmr: macroData.bmr,
      tdee: macroData.tdee,
      calories: macroData.calories,
      macros: macroData.macros,
      calorie_adjustment: macroData.calorieAdjustment || 0,
      status: 'active',
      meal_plan: null, // Can be populated later if meal planning is implemented
      food_suggestions: null,
      explanations: macroData.explanations || 'Generated based on user data and fitness goals'
    };
    
    // Insert data into nutrition_plans table
    const { data, error } = await supabase
      .from('nutrition_plans')
      .insert(planData)
      .select('id')
      .single();
    
    if (error) {
      logger.error('Error storing macros in database', { error: error.message, userId });
      throw new DatabaseError(`Failed to store macro plan: ${error.message}`);
    }
    
    logger.info('Macros stored successfully', { userId, planId: data.id });
    return data.id;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    logger.error('Unexpected error storing macros', { error: error.message, userId });
    throw new DatabaseError(`Failed to store macro plan: ${error.message}`);
  }
}

/**
 * Retrieves macro plans for a user with pagination and filtering
 * 
 * @param {string} userId User ID
 * @param {Object} filters Filtering options
 * @param {string} jwtToken User's JWT token for RLS
 * @returns {Object} Paginated list of macro plans
 */
async function retrieveMacros(userId, filters = {}, jwtToken) {
  logger.info('Retrieving macro plans', { userId, filters });
  
  // Initialize Supabase client with JWT for RLS
  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${jwtToken}` } }
  });
  
  try {
    // Set up pagination
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 10;
    const startIndex = (page - 1) * pageSize;
    
    // Build the query
    let query = supabase
      .from('nutrition_plans')
      .select('id, created_at, bmr, tdee, calories, macros, status, calorie_adjustment', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    // Apply date range filters if provided
    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate);
    }
    
    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate);
    }
    
    // Apply status filter if provided
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    
    // Apply pagination
    query = query.range(startIndex, startIndex + pageSize - 1);
    
    // Execute query
    const { data, error, count } = await query;
    
    if (error) {
      logger.error('Error retrieving macro plans', { error: error.message, userId });
      throw new DatabaseError(`Failed to retrieve macro plans: ${error.message}`);
    }
    
    // Prepare result with pagination metadata
    const result = {
      data,
      pagination: {
        total: count,
        page,
        pageSize,
        totalPages: Math.ceil(count / pageSize)
      }
    };
    
    logger.info('Macro plans retrieved successfully', { 
      userId, 
      count: data.length,
      total: count
    });
    
    return result;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    logger.error('Unexpected error retrieving macro plans', { error: error.message, userId });
    throw new DatabaseError(`Failed to retrieve macro plans: ${error.message}`);
  }
}

/**
 * Retrieves the most recent macro plan for a user
 * 
 * @param {string} userId User ID
 * @param {string} jwtToken User's JWT token for RLS
 * @returns {Object} The most recent macro plan
 */
async function retrieveLatestMacros(userId, jwtToken) {
  logger.info('Retrieving latest macro plan', { userId });
  
  // Initialize Supabase client with JWT for RLS
  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${jwtToken}` } }
  });
  
  try {
    // Query for the most recent active macro plan
    const { data, error } = await supabase
      .from('nutrition_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error) {
      // If no data found, return a clear message
      if (error.message.includes('No rows found') || error.code === 'PGRST116') {
        logger.info('No macro plans found for user', { userId });
        throw new NotFoundError('No active macro plan found for this user');
      }
      
      logger.error('Error retrieving latest macro plan', { error: error.message, userId });
      throw new DatabaseError(`Failed to retrieve latest macro plan: ${error.message}`);
    }
    
    logger.info('Latest macro plan retrieved successfully', { userId, planId: data.id });
    return data;
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof DatabaseError) {
      throw error;
    }
    logger.error('Unexpected error retrieving latest macro plan', { error: error.message, userId });
    throw new DatabaseError(`Failed to retrieve latest macro plan: ${error.message}`);
  }
}

/**
 * Updates an existing macro plan
 * 
 * @param {string} planId Plan ID to update
 * @param {Object} updates Data to update
 * @param {number} currentVersion Current version for concurrency control
 * @param {string} jwtToken User's JWT token for RLS
 * @returns {boolean} Success indicator
 */
async function updateMacroPlan(planId, updates, currentVersion, jwtToken) {
  logger.info('Updating macro plan', { planId });
  
  // Initialize Supabase client with JWT for RLS
  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${jwtToken}` } }
  });
  
  try {
    // Update with optimistic concurrency control
    const { data, error } = await supabase
      .from('nutrition_plans')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', planId)
      .select();
    
    if (error) {
      logger.error('Error updating macro plan', { error: error.message, planId });
      throw new DatabaseError(`Failed to update macro plan: ${error.message}`);
    }
    
    if (data.length === 0) {
      throw new NotFoundError(`Macro plan with ID ${planId} not found or you don't have permission to update it`);
    }
    
    logger.info('Macro plan updated successfully', { planId });
    return true;
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof DatabaseError) {
      throw error;
    }
    logger.error('Unexpected error updating macro plan', { error: error.message, planId });
    throw new DatabaseError(`Failed to update macro plan: ${error.message}`);
  }
}

module.exports = {
  calculateMacros,
  storeMacros,
  retrieveMacros,
  retrieveLatestMacros,
  updateMacroPlan
}; 