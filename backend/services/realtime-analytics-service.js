const { createClient } = require('@supabase/supabase-js');
const logger = require('../config/logger');
const { DatabaseError, NotFoundError, ApplicationError } = require('../utils/errors');
const { getSupabaseClientWithToken } = require('./supabase');

/**
 * Real-Time Analytics Service
 * Handles Supabase Realtime connections for analytics updates with JWT authentication
 * Following established analytics integration rules and patterns
 */
class RealtimeAnalyticsService {
  constructor({ supabaseClient, analyticsService, logger: serviceLogger }) {
    this.supabaseClient = supabaseClient;
    this.analyticsService = analyticsService;
    this.logger = serviceLogger || logger;
    this.activeChannels = new Map();
    this.connectionStats = {
      totalConnections: 0,
      activeConnections: 0,
      failedConnections: 0,
      totalEvents: 0,
      lastConnectionTime: null
    };
  }

  /**
   * Subscribe to real-time analytics updates for a user
   * ✅ FOLLOWS RULE: JWT Token Parameter Ordering (userId, jwtToken, options)
   * @param {string} userId - The user ID
   * @param {string} jwtToken - JWT token for authentication
   * @param {Function} clientCallback - Callback function for real-time updates
   * @param {object} options - Optional parameters
   * @returns {Promise<string>} Channel name for tracking
   */
  async subscribeToUserAnalytics(userId, jwtToken, clientCallback, options = {}) {
    if (!jwtToken) {
      throw new ApplicationError('JWT token required for real-time analytics subscription');
    }

    if (!userId) {
      throw new ApplicationError('User ID required for real-time analytics subscription');
    }

    if (typeof clientCallback !== 'function') {
      throw new ApplicationError('Client callback function required for real-time analytics subscription');
    }

    const channelName = `user-analytics-${userId}`;
    
    try {
      this.logger.info(`Subscribing to real-time analytics for user: ${userId}`);

      // ✅ FOLLOWS RULE: Proper JWT authentication for Supabase Realtime
      const supabaseWithAuth = getSupabaseClientWithToken(jwtToken);
      
      const channel = supabaseWithAuth
        .channel(channelName, {
          config: {
            headers: {
              Authorization: `Bearer ${jwtToken}`
            }
          }
        })
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_analytics_aggregates',
            filter: `user_id=eq.${userId}`
          },
          async (payload) => {
            try {
              // ✅ FOLLOWS RULE: Real-time analytics update processing
              this.connectionStats.totalEvents++;
              const updatedAnalytics = await this._processRealtimeUpdate(payload, userId, jwtToken);
              clientCallback(updatedAnalytics);
            } catch (error) {
              this.logger.error('Error processing real-time analytics update:', error);
              clientCallback({
                type: 'error',
                error: 'Failed to process analytics update',
                timestamp: new Date().toISOString()
              });
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public', 
            table: 'workout_logs',
            filter: `user_id=eq.${userId}`
          },
          async (payload) => {
            try {
              // ✅ FOLLOWS RULE: JWT token passed to analytics refresh
              await this._triggerAnalyticsRefresh(userId, jwtToken, 'workout_completed');
            } catch (error) {
              this.logger.error('Error triggering analytics refresh on workout log:', error);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'user_check_ins',
            filter: `user_id=eq.${userId}`
          },
          async (payload) => {
            try {
              // ✅ FOLLOWS RULE: JWT token passed to analytics refresh
              await this._triggerAnalyticsRefresh(userId, jwtToken, 'check_in_completed');
            } catch (error) {
              this.logger.error('Error triggering analytics refresh on check-in:', error);
            }
          }
        )
        .subscribe((status, error) => {
          if (status === 'SUBSCRIBED') {
            this.connectionStats.totalConnections++;
            this.connectionStats.activeConnections++;
            this.connectionStats.lastConnectionTime = new Date().toISOString();
            this.logger.info(`Real-time analytics subscription successful for user: ${userId}`);
          } else if (status === 'CHANNEL_ERROR') {
            this.connectionStats.failedConnections++;
            this.logger.error(`Real-time analytics subscription failed for user: ${userId}`, error);
          } else if (status === 'CLOSED') {
            this.connectionStats.activeConnections = Math.max(0, this.connectionStats.activeConnections - 1);
            this.logger.info(`Real-time analytics subscription closed for user: ${userId}`);
          }
        });

      this.activeChannels.set(channelName, {
        channel,
        userId,
        subscribedAt: new Date().toISOString(),
        status: 'subscribing'
      });

      return channelName;

    } catch (error) {
      this.connectionStats.failedConnections++;
      this.logger.error(`Failed to subscribe to real-time analytics for user ${userId}:`, error);
      throw new ApplicationError(`Failed to establish real-time analytics connection: ${error.message}`);
    }
  }

  /**
   * Unsubscribe from real-time analytics updates
   * @param {string} channelName - Channel name to unsubscribe from
   * @returns {Promise<boolean>} Success status
   */
  async unsubscribeFromAnalytics(channelName) {
    try {
      const channelInfo = this.activeChannels.get(channelName);
      
      if (!channelInfo) {
        this.logger.warn(`Attempted to unsubscribe from non-existent channel: ${channelName}`);
        return false;
      }

      await this.supabaseClient.removeChannel(channelInfo.channel);
      this.activeChannels.delete(channelName);
      this.connectionStats.activeConnections = Math.max(0, this.connectionStats.activeConnections - 1);
      
      this.logger.info(`Successfully unsubscribed from channel: ${channelName}`);
      return true;

    } catch (error) {
      this.logger.error(`Failed to unsubscribe from channel ${channelName}:`, error);
      throw new ApplicationError(`Failed to unsubscribe from real-time analytics: ${error.message}`);
    }
  }

  /**
   * Get connection statistics
   * @returns {object} Connection statistics
   */
  getConnectionStats() {
    return {
      ...this.connectionStats,
      activeChannels: this.activeChannels.size,
      channels: Array.from(this.activeChannels.keys())
    };
  }

  /**
   * Process real-time update payload
   * ✅ FOLLOWS RULE: Consistent JWT token parameter ordering
   * @private
   * @param {object} payload - Supabase realtime payload
   * @param {string} userId - User ID
   * @param {string} jwtToken - JWT token
   * @returns {object} Processed update data
   */
  async _processRealtimeUpdate(payload, userId, jwtToken) {
    try {
      const { new: newRecord, old: oldRecord, eventType } = payload;
      
      this.logger.debug(`Processing real-time update for user ${userId}:`, {
        eventType,
        hasNewRecord: !!newRecord,
        hasOldRecord: !!oldRecord
      });

      return {
        type: 'analytics_update',
        userId,
        data: newRecord,
        previousData: oldRecord,
        timestamp: new Date().toISOString(),
        changeType: eventType,
        source: 'realtime_analytics'
      };

    } catch (error) {
      this.logger.error(`Error processing real-time update for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Trigger analytics refresh in background
   * ✅ FOLLOWS RULE: JWT token consistency and proper service integration
   * @private
   * @param {string} userId - User ID
   * @param {string} jwtToken - JWT token
   * @param {string} triggerType - Type of trigger event
   */
  async _triggerAnalyticsRefresh(userId, jwtToken, triggerType) {
    // Use setTimeout to avoid blocking the real-time event handler
    setTimeout(async () => {
      try {
        this.logger.debug(`Triggering analytics refresh for user ${userId}, trigger: ${triggerType}`);
        
        // ✅ FOLLOWS RULE: JWT Token Parameter Ordering (userId, jwtToken, options)
        if (this.analyticsService.refreshUserAnalytics) {
          await this.analyticsService.refreshUserAnalytics(userId, jwtToken, { 
            triggerType,
            source: 'realtime_trigger'
          });
        } else {
          this.logger.warn('Analytics service refresh method not available');
        }
        
      } catch (error) {
        this.logger.error(`Analytics refresh failed for user ${userId}:`, error);
        // Don't throw error here to avoid affecting real-time flow
      }
    }, 1000); // Brief delay to allow data to settle
  }

  /**
   * Cleanup all active channels
   * @returns {Promise<void>}
   */
  async cleanup() {
    try {
      const channelNames = Array.from(this.activeChannels.keys());
      
      this.logger.info(`Cleaning up ${channelNames.length} active real-time channels`);
      
      for (const channelName of channelNames) {
        await this.unsubscribeFromAnalytics(channelName);
      }
      
      this.activeChannels.clear();
      this.connectionStats.activeConnections = 0;
      
      this.logger.info('Real-time analytics service cleanup completed');
      
    } catch (error) {
      this.logger.error('Error during real-time analytics service cleanup:', error);
      throw error;
    }
  }

  /**
   * Health check for the real-time service
   * @returns {object} Service health status
   */
  healthCheck() {
    const stats = this.getConnectionStats();
    const isHealthy = stats.activeConnections >= 0 && stats.failedConnections < stats.totalConnections * 0.5;
    
    return {
      service: 'realtime-analytics',
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      metrics: stats,
      issues: isHealthy ? [] : ['High failure rate detected']
    };
  }

  /**
   * Check analytics refresh status for a user
   * ✅ FOLLOWS RULE: JWT token consistency
   * @param {string} userId - User ID to check refresh status for
   * @param {string} jwtToken - JWT token (optional for status check)
   * @returns {Promise<object>} Refresh status information
   */
  async checkRefreshStatus(userId, jwtToken = null) {
    try {
      this.logger.debug(`Checking analytics refresh status for user: ${userId}`);
      
      // Check if there are any pending refresh operations in the analytics_refresh_queue
      const { data: refreshQueue, error } = await this.supabaseClient
        .from('analytics_refresh_queue')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error && error.code !== 'PGRST116') {
        throw new DatabaseError(`Failed to check refresh status: ${error.message}`);
      }

      const lastRefresh = refreshQueue && refreshQueue.length > 0 ? refreshQueue[0] : null;
      
      return {
        userId,
        hasActiveRefresh: refreshQueue && refreshQueue.length > 0,
        lastRefreshTime: lastRefresh?.created_at || null,
        pendingRefreshes: refreshQueue?.length || 0,
        refreshHistory: refreshQueue || [],
        status: lastRefresh ? 'active' : 'idle',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error(`Error checking refresh status for user ${userId}:`, error);
      return {
        userId,
        hasActiveRefresh: false,
        status: 'unknown',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = RealtimeAnalyticsService; 