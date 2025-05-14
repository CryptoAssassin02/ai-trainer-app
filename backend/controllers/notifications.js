/**
 * @fileoverview Controller for handling notification preferences requests
 */

const notificationService = require('../services/notification-service');
const logger = require('../config/logger');

/**
 * Update notification preferences for the authenticated user
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.user - Authenticated user
 * @param {Object} req.body - Request body with notification preferences
 * @param {string} req.headers.authorization - JWT token
 * @param {Object} res - Express response object
 * @returns {Object} Response with updated preferences or error
 */
async function updatePreferences(req, res) {
  try {
    const userId = req.user.id;
    const jwtToken = req.headers.authorization.split(' ')[1];
    
    logger.debug('Updating notification preferences', { userId });
    
    const updatedPrefs = await notificationService.storePreferences(userId, req.body, jwtToken);
    
    return res.status(200).json({
      status: 'success',
      data: updatedPrefs,
      message: 'Notification preferences updated successfully'
    });
  } catch (error) {
    logger.error('Error updating notification preferences:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to update notification preferences',
      error: error.message
    });
  }
}

/**
 * Get notification preferences for the authenticated user
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.user - Authenticated user
 * @param {string} req.headers.authorization - JWT token
 * @param {Object} res - Express response object
 * @returns {Object} Response with user's notification preferences or error
 */
async function getPreferences(req, res) {
  try {
    const userId = req.user.id;
    const jwtToken = req.headers.authorization.split(' ')[1];
    
    logger.debug('Retrieving notification preferences', { userId });
    
    const prefs = await notificationService.retrievePreferences(userId, jwtToken);
    
    // Apply defaults for missing preferences
    const preferences = {
      email_enabled: prefs.email_enabled ?? false,
      sms_enabled: prefs.sms_enabled ?? false,
      push_enabled: prefs.push_enabled ?? false,
      in_app_enabled: prefs.in_app_enabled ?? true, // Default to true for in-app notifications
      quiet_hours_start: prefs.quiet_hours_start ?? null,
      quiet_hours_end: prefs.quiet_hours_end ?? null
    };
    
    return res.status(200).json({
      status: 'success',
      data: preferences
    });
  } catch (error) {
    logger.error('Error retrieving notification preferences:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve notification preferences',
      error: error.message
    });
  }
}

/**
 * Send a test notification (mock implementation for MVP)
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.user - Authenticated user
 * @param {Object} req.body - Request body
 * @param {string} req.body.channel - Notification channel (email, sms, push, in_app)
 * @param {string} req.headers.authorization - JWT token
 * @param {Object} res - Express response object
 * @returns {Object} Response with test result or error
 */
async function testNotification(req, res) {
  try {
    const userId = req.user.id;
    const jwtToken = req.headers.authorization.split(' ')[1];
    const { channel } = req.body;
    
    // Validate the channel
    if (!channel || !['email', 'sms', 'push', 'in_app'].includes(channel)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid notification channel. Must be one of: email, sms, push, in_app'
      });
    }
    
    logger.debug(`Sending test ${channel} notification`, { userId, channel });
    
    const result = await notificationService.sendTestNotification(userId, channel, jwtToken);
    
    return res.status(200).json({
      status: 'success',
      data: result,
      message: result.message
    });
  } catch (error) {
    logger.error('Error sending test notification:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to send test notification',
      error: error.message
    });
  }
}

module.exports = {
  updatePreferences,
  getPreferences,
  testNotification
}; 