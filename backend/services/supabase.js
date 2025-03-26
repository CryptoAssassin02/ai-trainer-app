const { createClient } = require('@supabase/supabase-js');
const { config, logger } = require('../config/config');

// Initialize Supabase client
const supabase = createClient(
  config.supabase.url,
  config.supabase.anonKey
);

// Initialize admin client with service role key for privileged operations
const supabaseAdmin = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey
);

// Helper function to handle Supabase errors
const handleSupabaseError = (error) => {
  logger.error('Supabase error:', error);
  throw {
    status: error.status || 500,
    message: error.message || 'Database operation failed',
    details: error.details
  };
};

module.exports = {
  supabase,
  supabaseAdmin,
  handleSupabaseError
}; 