/**
 * Service for managing user check-in data
 * Handles database operations for check-in records including creation, retrieval, and metrics calculation
 */
const { BadRequestError, DatabaseError, NotFoundError } = require('../utils/errors');
const logger = require('../config/logger');
const { getSupabaseClientWithToken } = require('./supabase'); // Use centralized helper

/**
 * Creates a new check-in record for a user
 * 
 * @param {string} userId - The user's ID
 * @param {Object} data - The check-in data
 * @param {string} jwtToken - The user's JWT token for RLS enforcement
 * @returns {Object} The newly created check-in record
 * @throws {BadRequestError} If required data is missing
 * @throws {DatabaseError} If database operation fails
 */
async function storeCheckIn(userId, data, jwtToken) {
  if (!userId) {
    throw new BadRequestError('User ID is required');
  }

  if (!data || !data.date) {
    throw new BadRequestError('Check-in data with date is required');
  }

  const supabase = getSupabaseClientWithToken(jwtToken); // Use imported helper

  try {
    // Prepare the check-in data
    const checkInData = {
      user_id: userId,
      date: data.date,
      weight: data.weight || null,
      body_fat_percentage: data.body_fat_percentage || null,
      measurements: data.measurements || null,
      mood: data.mood || null,
      sleep_quality: data.sleep_quality || null,
      energy_level: data.energy_level || null,
      stress_level: data.stress_level || null,
      notes: data.notes || null
    };

    // Insert the check-in record
    const { data: result, error } = await supabase
      .from('user_check_ins')
      .insert(checkInData)
      .select()
      .single();

    if (error) {
      logger.error(`Failed to store check-in: ${error.message}`, { userId, error });
      throw new DatabaseError(`Failed to store check-in: ${error.message}`);
    }

    return result;
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof DatabaseError) {
      throw error;
    }
    logger.error('Unexpected error storing check-in', { userId, error });
    throw new DatabaseError(`Failed to store check-in: ${error.message}`);
  }
}

/**
 * Retrieves check-in records for a user with optional filtering
 * 
 * @param {string} userId - The user's ID
 * @param {Object} filters - Optional filters (startDate, endDate, limit, offset)
 * @param {string} jwtToken - The user's JWT token for RLS enforcement
 * @returns {Array} The filtered check-in records with pagination
 * @throws {BadRequestError} If userId is missing
 * @throws {DatabaseError} If database operation fails
 */
async function retrieveCheckIns(userId, filters = {}, jwtToken) {
  if (!userId) {
    throw new BadRequestError('User ID is required');
  }

  const supabase = getSupabaseClientWithToken(jwtToken); // Use imported helper

  try {
    // Start with a base query
    let query = supabase
      .from('user_check_ins')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    // Apply date range filters if provided
    if (filters.startDate) {
      query = query.gte('date', filters.startDate);
    }

    if (filters.endDate) {
      query = query.lte('date', filters.endDate);
    }

    // Apply pagination
    const limit = filters.limit || 10;
    const offset = filters.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      logger.error(`Failed to retrieve check-ins: ${error.message}`, { userId, filters, error });
      throw new DatabaseError(`Failed to retrieve check-ins: ${error.message}`);
    }

    // Ensure data is an array, even if null/undefined is returned
    const responseData = data || [];

    return {
      data: responseData,
      pagination: {
        limit,
        offset,
        total: count
      }
    };
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof DatabaseError) {
      throw error;
    }
    logger.error('Unexpected error retrieving check-ins', { userId, filters, error });
    throw new DatabaseError(`Failed to retrieve check-ins: ${error.message}`);
  }
}

/**
 * Retrieves a specific check-in record by ID
 * 
 * @param {string} checkInId - The check-in record ID
 * @param {string} userId - The user's ID
 * @param {string} jwtToken - The user's JWT token for RLS enforcement
 * @returns {Object} The check-in record
 * @throws {BadRequestError} If required parameters are missing
 * @throws {NotFoundError} If the check-in record is not found
 * @throws {DatabaseError} If database operation fails
 */
async function retrieveCheckIn(checkInId, userId, jwtToken) {
  if (!checkInId) {
    throw new BadRequestError('Check-in ID is required');
  }

  if (!userId) {
    throw new BadRequestError('User ID is required');
  }

  const supabase = getSupabaseClientWithToken(jwtToken); // Use imported helper

  try {
    const { data, error } = await supabase
      .from('user_check_ins')
      .select('*')
      .eq('id', checkInId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.message.includes('No rows found') || error.code === 'PGRST116') {
        throw new NotFoundError(`Check-in record not found: ${checkInId}`);
      }
      logger.error(`Failed to retrieve check-in: ${error.message}`, { checkInId, userId, error });
      throw new DatabaseError(`Failed to retrieve check-in: ${error.message}`);
    }

    return data;
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof NotFoundError || error instanceof DatabaseError) {
      throw error;
    }
    logger.error('Unexpected error retrieving check-in', { checkInId, userId, error });
    throw new DatabaseError(`Failed to retrieve check-in: ${error.message}`);
  }
}

/**
 * Computes progress metrics based on user check-in data over a specified period
 * 
 * @param {string} userId - The user's ID
 * @param {Object} dateRange - Date range for metrics calculation (startDate, endDate)
 * @param {string} jwtToken - The user's JWT token for RLS enforcement
 * @returns {Object} Calculated metrics including weight change, body fat change, etc.
 * @throws {BadRequestError} If required parameters are missing
 * @throws {DatabaseError} If database operation fails
 */
async function computeMetrics(userId, dateRange, jwtToken) {
  if (!userId) {
    throw new BadRequestError('User ID is required');
  }

  if (!dateRange || !dateRange.startDate || !dateRange.endDate) {
    throw new BadRequestError('Start and end dates are required for metrics calculation');
  }

  const supabase = getSupabaseClientWithToken(jwtToken); // Use imported helper

  try {
    // Get check-ins within the date range
    const { data: checkIns, error } = await supabase
      .from('user_check_ins')
      .select('*')
      .eq('user_id', userId)
      .gte('date', dateRange.startDate)
      .lte('date', dateRange.endDate)
      .order('date', { ascending: true });

    if (error) {
      logger.error(`Failed to retrieve check-ins for metrics: ${error.message}`, { userId, dateRange, error });
      throw new DatabaseError(`Failed to retrieve check-ins for metrics: ${error.message}`);
    }

    if (!checkIns || checkIns.length === 0) {
      return {
        message: "No check-in data available for the specified period",
        data: {
          weightChange: null,
          bodyFatChange: null,
          measurementChanges: {}
        }
      };
    }

    // Calculate metrics
    const firstCheckIn = checkIns[0];
    const lastCheckIn = checkIns[checkIns.length - 1];
    
    const metrics = {
      period: {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        totalDays: Math.floor((new Date(dateRange.endDate) - new Date(dateRange.startDate)) / (1000 * 60 * 60 * 24))
      },
      weightChange: calculateChange(firstCheckIn.weight, lastCheckIn.weight),
      bodyFatChange: calculateChange(firstCheckIn.body_fat_percentage, lastCheckIn.body_fat_percentage),
      measurementChanges: calculateMeasurementChanges(firstCheckIn.measurements, lastCheckIn.measurements),
      checkInCount: checkIns.length,
      averages: calculateAverages(checkIns)
    };

    return {
      message: "Metrics calculated successfully",
      data: metrics
    };
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof DatabaseError) {
      throw error;
    }
    logger.error('Unexpected error computing metrics', { userId, dateRange, error });
    throw new DatabaseError(`Failed to compute metrics: ${error.message}`);
  }
}

/**
 * Helper function to calculate change between two values
 */
function calculateChange(start, end) {
  if (start === null || end === null) {
    return null;
  }
  
  const change = end - start;
  const percentChange = start !== 0 ? (change / start) * 100 : 0;
  
  return {
    absolute: parseFloat(change.toFixed(2)),
    percent: parseFloat(percentChange.toFixed(2))
  };
}

/**
 * Helper function to calculate changes in body measurements
 */
function calculateMeasurementChanges(startMeasurements, endMeasurements) {
  if (!startMeasurements || !endMeasurements) {
    return {};
  }

  const changes = {};
  
  // Calculate changes for each measurement type
  Object.keys(startMeasurements).forEach(key => {
    if (endMeasurements[key] !== undefined) {
      changes[key] = calculateChange(startMeasurements[key], endMeasurements[key]);
    }
  });
  
  return changes;
}

/**
 * Helper function to calculate averages across all check-ins
 */
function calculateAverages(checkIns) {
  const averages = {
    weight: null,
    bodyFat: null,
    energyLevel: null,
    stressLevel: null
  };
  
  let weightSum = 0;
  let weightCount = 0;
  let bodyFatSum = 0;
  let bodyFatCount = 0;
  let energySum = 0;
  let energyCount = 0;
  let stressSum = 0;
  let stressCount = 0;
  
  checkIns.forEach(checkIn => {
    if (checkIn.weight !== null) {
      weightSum += checkIn.weight;
      weightCount++;
    }
    
    if (checkIn.body_fat_percentage !== null) {
      bodyFatSum += checkIn.body_fat_percentage;
      bodyFatCount++;
    }
    
    if (checkIn.energy_level !== null) {
      energySum += checkIn.energy_level;
      energyCount++;
    }
    
    if (checkIn.stress_level !== null) {
      stressSum += checkIn.stress_level;
      stressCount++;
    }
  });
  
  if (weightCount > 0) averages.weight = parseFloat((weightSum / weightCount).toFixed(2));
  if (bodyFatCount > 0) averages.bodyFat = parseFloat((bodyFatSum / bodyFatCount).toFixed(2));
  if (energyCount > 0) averages.energyLevel = parseFloat((energySum / energyCount).toFixed(2));
  if (stressCount > 0) averages.stressLevel = parseFloat((stressSum / stressCount).toFixed(2));
  
  return averages;
}

module.exports = {
  storeCheckIn,
  retrieveCheckIns,
  retrieveCheckIn,
  computeMetrics
}; 