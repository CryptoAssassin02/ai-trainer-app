/**
 * @fileoverview Notification service for handling user notification preferences
 */

const { createClient } = require('@supabase/supabase-js');
const logger = require('../config/logger');
const { DatabaseError, NotFoundError } = require('../utils/errors');

/**
 * Initialize Supabase client with JWT for Row Level Security
 * 
 * @param {string} jwtToken - JWT token for authentication
 * @returns {import('@supabase/supabase-js').SupabaseClient} Configured Supabase client
 * @throws {Error} If Supabase is not properly configured or JWT is missing
 */
function getSupabaseClient(jwtToken) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    logger.error('Supabase URL or Key is missing in environment variables.');
    throw new Error('Supabase configuration is missing.');
  }

  if (!jwtToken) {
    logger.error('JWT token is missing for Supabase client initialization.');
    throw new Error('Authentication token is required.');
  }

  return createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${jwtToken}` } }
  });
}

/**
 * Store or update notification preferences for a user
 * 
 * @param {string} userId - User ID
 * @param {Object} prefsData - Notification preference data
 * @param {boolean} [prefsData.email_enabled] - Email notifications enabled
 * @param {boolean} [prefsData.sms_enabled] - SMS notifications enabled
 * @param {boolean} [prefsData.push_enabled] - Push notifications enabled
 * @param {boolean} [prefsData.in_app_enabled] - In-app notifications enabled
 * @param {string} [prefsData.quiet_hours_start] - Quiet hours start time (HH:MM format)
 * @param {string} [prefsData.quiet_hours_end] - Quiet hours end time (HH:MM format)
 * @param {string} jwtToken - JWT token for authentication
 * @returns {Promise<Object>} Stored preferences data
 * @throws {DatabaseError} If there's an error storing the preferences
 */
async function storePreferences(userId, prefsData, jwtToken) {
  try {
    const supabase = getSupabaseClient(jwtToken);
    
    logger.debug(`Storing notification preferences for user ${userId}`);
    
    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert({ 
        user_id: userId,
        ...prefsData,
        updated_at: new Date().toISOString()
      }, { 
        onConflict: 'user_id',
        returning: 'representation'
      });
    
    if (error) {
      logger.error(`Failed to store notification preferences for user ${userId}:`, error);
      throw new DatabaseError(`Failed to store notification preferences: ${error.message}`);
    }
    
    logger.info(`Successfully stored notification preferences for user ${userId}`);
    return data[0];
  } catch (error) {
    logger.error(`Error in storePreferences for user ${userId}:`, error);
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError(`Failed to store notification preferences: ${error.message}`);
  }
}

/**
 * Retrieve notification preferences for a user
 * 
 * @param {string} userId - User ID
 * @param {string} jwtToken - JWT token for authentication
 * @returns {Promise<Object>} User notification preferences
 * @throws {DatabaseError} If there's an error retrieving the preferences
 */
async function retrievePreferences(userId, jwtToken) {
  try {
    const supabase = getSupabaseClient(jwtToken);
    
    logger.debug(`Retrieving notification preferences for user ${userId}`);
    
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      // PGRST116 is the "no rows returned" error code from PostgREST (Supabase)
      if (error.code === 'PGRST116') {
        logger.info(`No notification preferences found for user ${userId}`);
        return {}; // Return empty object for new users who haven't set preferences
      }
      
      logger.error(`Failed to retrieve notification preferences for user ${userId}:`, error);
      throw new DatabaseError(`Failed to retrieve notification preferences: ${error.message}`);
    }
    
    logger.info(`Successfully retrieved notification preferences for user ${userId}`);
    return data;
  } catch (error) {
    logger.error(`Error in retrievePreferences for user ${userId}:`, error);
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError(`Failed to retrieve notification preferences: ${error.message}`);
  }
}

/**
 * Send a test notification (mock implementation for MVP)
 * 
 * @param {string} userId - User ID
 * @param {string} channel - Notification channel ('email', 'sms', 'push', 'in_app')
 * @param {string} jwtToken - JWT token for authentication
 * @returns {Promise<Object>} Result of the notification test
 */
async function sendTestNotification(userId, channel, jwtToken) {
  try {
    logger.debug(`Sending test ${channel} notification for user ${userId}`);
    
    // This is a mock implementation for the MVP
    // In a real implementation, this would use actual notification services
    console.log(`[MOCK ${channel.toUpperCase()}]: Test notification for user ${userId}`);
    
    // Check if the user has enabled this notification channel
    const prefs = await retrievePreferences(userId, jwtToken);
    const channelEnabled = prefs[`${channel}_enabled`];
    
    let message = `Test ${channel} notification logged`;
    
    // Add warning if the channel is disabled
    if (channelEnabled === false) {
      message += ` (Note: ${channel} notifications are currently disabled in your preferences)`;
    }
    
    logger.info(`Successfully sent test ${channel} notification for user ${userId}`);
    return { success: true, message };
  } catch (error) {
    logger.error(`Error sending test ${channel} notification for user ${userId}:`, error);
    throw new Error(`Failed to send test notification: ${error.message}`);
  }
}

module.exports = {
  storePreferences,
  retrievePreferences,
  sendTestNotification
}; 