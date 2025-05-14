/**
 * @fileoverview Configuration index file
 * This file consolidates all configuration modules and exports them
 */

let env, config, logger, supabase, openai, perplexity;

// Try to load each configuration module
// Tests should mock these modules as needed
try {
  env = require('./env');
} catch (error) {
  console.error('CRITICAL: Failed to load environment configuration (./env).', error);
  // Re-throw in all environments if essential env config fails
  throw new Error(`Failed to load environment configuration: ${error.message}`);
}

try {
  config = require('./config');
} catch (error) {
  console.warn('Warning: Failed to load server configuration (./config). Using defaults.', error);
  // Fallback to empty config if optional config fails
  config = { server: {} }; 
}

try {
  // Logger is essential, attempt to load it
  logger = require('../utils/logger');
} catch (error) {
   console.error('CRITICAL: Failed to load logger configuration (../utils/logger).', error);
   // Provide a basic console logger as a last resort if require fails
   logger = {
       info: (...args) => console.log('INFO:', ...args),
       warn: (...args) => console.warn('WARN:', ...args),
       error: (...args) => console.error('ERROR:', ...args),
       debug: (...args) => console.log('DEBUG:', ...args),
   };
   // Do not re-throw, try to continue with console logger
}

try {
  supabase = require('./supabase');
} catch (error) {
  console.error('CRITICAL: Failed to load Supabase configuration (./supabase).', error);
  // Re-throw if Supabase config is essential
  throw new Error(`Failed to load Supabase configuration: ${error.message}`);
}

try {
  openai = require('./openai');
} catch (error) {
  console.warn('Warning: Failed to load OpenAI configuration (./openai).', error);
  // Fallback if OpenAI is optional or handled elsewhere
  openai = {}; 
}

try {
  perplexity = require('./perplexity');
} catch (error) {
  console.warn('Warning: Failed to load Perplexity configuration (./perplexity).', error);
  // Fallback if Perplexity is optional or handled elsewhere
  perplexity = {}; 
}

// Default Server Configuration (used if config.server is not provided)
const defaultServerConfig = {
  maxRequestBodySize: '50mb',
  requestTimeout: 30000, // 30 seconds
  compressionLevel: 6,
  trustProxy: true
};

// Determine final serverConfig: use config.server if it exists, otherwise use defaults
const serverConfig = config && config.server ? config.server : defaultServerConfig;

// Export all config components
module.exports = {
  env,
  config,
  logger,
  supabase,
  openai,
  perplexity,
  serverConfig // Use the determined serverConfig
}; 