/**
 * @fileoverview Centralized configuration for OpenAI API interactions.
 */

const envConfig = require('./env');

// --- Model Definitions ---
const MODELS = {
  // Latest Powerful Models
  GPT_4o: 'gpt-4o', // Most capable, multi-modal
  GPT_4_TURBO: 'gpt-4-turbo', // Predecessor to gpt-4o

  // Cost-effective / Faster Models
  GPT_4o_MINI: 'gpt-4o-mini', // New cost-effective model
  GPT_3_5_TURBO: 'gpt-3.5-turbo-0125', // Still a solid, fast option

  // Embedding Models
  TEXT_EMBEDDING_3_SMALL: 'text-embedding-3-small', // Recommended default
  TEXT_EMBEDDING_3_LARGE: 'text-embedding-3-large',
  TEXT_EMBEDDING_ADA_002: 'text-embedding-ada-002', // Older, cheaper

   // Reasoning Models (if applicable/available - may require specific access)
   // O1: 'o1',
   // O1_MINI: 'o1-mini'
};

// --- Default Settings based on Environment ---

const commonDefaults = {
  // Request Defaults
  temperature: 0.7,
  topP: 1.0,
  frequencyPenalty: 0.0,
  presencePenalty: 0.0,
  // maxTokens usually set per request type (e.g., chat vs. specific generation)

  // Default Models
  defaultChatModel: MODELS.GPT_4o_MINI, // Balance cost and capability
  defaultEmbeddingModel: MODELS.TEXT_EMBEDDING_3_SMALL,
  // defaultReasoningModel: MODELS.O1_MINI, // Example if using reasoning models

  // Retry Configuration (used by openai-service)
  retry: {
    maxRetries: 3,
    initialDelayMs: 1000,
    // Status codes considered retryable (handled in service logic)
    retryableStatusCodes: [429, 500, 502, 503, 504],
  },

  // Rate Limits (Informational - actual limits depend on OpenAI account tier)
  // These are NOT enforced client-side by this config, just guidelines.
  rateLimits: {
    // Example Tier 1 limits (check your actual tier: https://platform.openai.com/docs/guides/rate-limits)
    requestsPerMinute: { default: 60, [MODELS.GPT_4o]: 60 },
    tokensPerMinute: { default: 60000, [MODELS.GPT_4o]: 150000 },
  },

  // Placeholder for token/cost estimation constants
  // Pricing based on OpenAI website as of late 2024 (verify current prices)
  // Prices are per 1 Million tokens
  pricing: {
    [MODELS.GPT_4o]: { input: 5.00, output: 15.00 },
    [MODELS.GPT_4o_MINI]: { input: 0.15, output: 0.60 },
    [MODELS.GPT_4_TURBO]: { input: 10.00, output: 30.00 }, // Example price
    [MODELS.GPT_3_5_TURBO]: { input: 0.50, output: 1.50 },
    [MODELS.TEXT_EMBEDDING_3_SMALL]: { usage: 0.02 },
    [MODELS.TEXT_EMBEDDING_3_LARGE]: { usage: 0.13 },
    [MODELS.TEXT_EMBEDDING_ADA_002]: { usage: 0.10 }, // Example price
    // [MODELS.O1_MINI]: { input: TBD, output: TBD },
  },
  // Rough character count per token (highly approximate)
  charsPerTokenApproximation: 4,
};

let environmentConfig = {};

if (envConfig.isProduction) {
  environmentConfig = {
    logLevel: 'info',
    // Production might favor more robust models by default
    // defaultChatModel: MODELS.GPT_4o,
    // Stricter retry might be needed, or rely more on monitoring
    // retry: { ...commonDefaults.retry, maxRetries: 2 },
  };
} else if (envConfig.isTest) {
  environmentConfig = {
    logLevel: 'warn', // Reduce noise during tests
    // Use cheapest/fastest models for testing
    defaultChatModel: MODELS.GPT_3_5_TURBO,
    defaultEmbeddingModel: MODELS.TEXT_EMBEDDING_ADA_002,
    // Lower retries for tests to fail faster
    retry: { ...commonDefaults.retry, maxRetries: 1, initialDelayMs: 100 },
    // Mock pricing or disable cost checks in tests
    pricing: {},
  };
} else {
  // Development defaults
  environmentConfig = {
    logLevel: 'debug',
    // Can use more capable models in dev if needed
    // defaultChatModel: MODELS.GPT_4o,
  };
}

// --- Utility Functions ---

/**
 * VERY rough estimation of OpenAI tokens based on character count.
 * NOTE: For accurate counting, use a dedicated tokenizer library like 'tiktoken'.
 * @param {string} inputText - The text to estimate tokens for.
 * @returns {number} Approximate number of tokens.
 */
function estimateTokens(inputText) {
  if (!inputText) return 0;
  return Math.ceil(inputText.length / commonDefaults.charsPerTokenApproximation);
}

/**
 * Estimates the cost of an OpenAI API call based on token counts and model.
 * NOTE: This is an approximation based on known pricing, always verify with OpenAI.
 * @param {number} inputTokens - Number of input tokens.
 * @param {number} outputTokens - Number of output tokens (for chat models).
 * @param {string} [model=commonDefaults.defaultChatModel] - The specific model used.
 * @returns {number} Estimated cost in USD.
 */
function estimateCost(inputTokens, outputTokens = 0, model = environmentConfig.defaultChatModel || commonDefaults.defaultChatModel) {
  const prices = commonDefaults.pricing[model];
  if (!prices) {
    console.warn(`Pricing not available for model: ${model}. Cannot estimate cost.`);
    return 0;
  }

  let cost = 0;
  if (prices.input && prices.output) {
    // Chat model pricing
    cost = (inputTokens / 1000000) * prices.input + (outputTokens / 1000000) * prices.output;
  } else if (prices.usage) {
    // Embedding or other usage-based pricing
    cost = (inputTokens / 1000000) * prices.usage;
  } else {
     console.warn(`Unknown pricing structure for model: ${model}. Cannot estimate cost.`);
     return 0;
  }

  // Return cost rounded to a reasonable number of decimal places
  return parseFloat(cost.toFixed(6));
}

// --- Final Export --- //

// Deep merge commonDefaults with environmentConfig (environment overrides common)
// Basic merge, can be replaced with a deep merge library if needed for nested objects like retry
const finalConfig = {
  ...commonDefaults,
  ...environmentConfig,
  // Ensure nested objects like retry are merged correctly if overridden
  retry: { ...commonDefaults.retry, ...(environmentConfig.retry || {}) },
  rateLimits: { ...commonDefaults.rateLimits, ...(environmentConfig.rateLimits || {}) },
  pricing: { ...commonDefaults.pricing, ...(environmentConfig.pricing || {}) }, // Allows test env to override pricing
  // Add utility functions to the exported config
  utils: {
    estimateTokens,
    estimateCost,
  },
  // Expose MODELS enum
  MODELS,
};

module.exports = finalConfig; 