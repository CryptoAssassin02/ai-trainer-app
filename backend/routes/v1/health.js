/**
 * @fileoverview Health check routes to validate connections and services
 */

const express = require('express');
const router = express.Router();
const { getSupabaseClient } = require('../../services/supabase');
const { logger, env } = require('../../config');

/**
 * @api {get} /v1/health System health check
 * @apiName GetHealth
 * @apiGroup Health
 * @apiDescription Basic health check endpoint to verify the API is running
 * 
 * @apiSuccess {String} status Status of the API
 * @apiSuccess {Object} info Additional information about the system
 */
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    info: {
      version: env.app.version || '1.0.0',
      environment: env.app.nodeEnv || 'development',
      timestamp: new Date().toISOString()
    }
  });
});

/**
 * @api {get} /v1/health/supabase Supabase connection health check
 * @apiName GetSupabaseHealth
 * @apiGroup Health
 * @apiDescription Check if the Supabase connection is working properly
 * 
 * @apiSuccess {String} status Status of the Supabase connection
 * @apiSuccess {Object} info Information about the Supabase connection
 */
router.get('/supabase', async (req, res) => {
  try {
    // Primary check: Use the standard Supabase client (anon key by default)
    // This tests general API connectivity and if the anon role can perform a basic query.
    const supabase = getSupabaseClient();
    const startTime = Date.now();
    
    // Simple query to test the connection to a potentially non-existent or RLS-protected table for anon.
    const { data, error } = await supabase.from('_health_check').select('*').limit(1).maybeSingle();
    
    if (error) {
      // If the _health_check table doesn't exist, try a different approach
      if (error.code === 'PGRST116') {
        // Fallback: If the above query fails (e.g., table doesn't exist or RLS blocks anon),
        // attempt a direct connection to the database using pg Pool.
        // This tests raw database connectivity, often with service_role or a direct DB user.
        const { Pool } = require('pg');
        const { createConnectionString, getPoolConfig } = require('../../utils/supabase');
        
        const pool = new Pool({
          connectionString: env.supabase.databaseUrlServiceRole || env.supabase.databaseUrl || createConnectionString({ useServiceRole: true }),
          ssl: { rejectUnauthorized: false }
        });
        
        try {
          // Get current timestamp from database
          const result = await pool.query('SELECT NOW() as timestamp');
          await pool.end(); // Close the connection
          
          const responseTime = Date.now() - startTime;
          
          return res.json({
            status: 'ok',
            info: {
              connected: true,
              responseTime: `${responseTime}ms`,
              timestamp: result.rows[0].timestamp
            }
          });
        } catch (dbError) {
          logger.error('Database connection check failed:', dbError);
          return res.status(500).json({
            status: 'error',
            message: 'Database connection failed',
            error: dbError.message
          });
        }
      }
      
      logger.error('Supabase health check failed:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Supabase connection failed',
        error: error.message
      });
    }
    
    const responseTime = Date.now() - startTime;
    
    res.json({
      status: 'ok',
      info: {
        connected: true,
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    logger.error('Supabase health check error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to check Supabase connection',
      error: err.message
    });
  }
});

module.exports = router;