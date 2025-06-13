/**
 * @fileoverview Configuration settings for the Perplexity API client.
 * Manages API endpoints, request defaults, retry logic, rate limiting,
 * environment-specific settings, fallback behavior, and logging.
 *
 * Recommendation: Use the 'dotenv' package to load environment variables
 * (like PERPLEXITY_API_KEY) from a .env file.
 * require('dotenv').config();
 */

const BASE_URL = 'https://api.perplexity.ai';
const ENDPOINT = '/chat/completions';

const config = {
  // Default settings applicable to all environments unless overridden
  default: {
    api: {
      baseUrl: BASE_URL,
      endpoint: ENDPOINT,
      headers: {
        // Fetches the API key from environment variables for security
        Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000, // Default timeout: 10 seconds (in milliseconds)
    },
    // Default parameters for the request body
    bodyDefaults: {
      model: 'sonar-medium-online', // Default model - using free tier model
       // You can add other defaults like max_tokens, temperature here if needed
       // max_tokens: 512,
       // temperature: 0.7,
    },
    // Retry mechanism configuration
    retry: {
      maxRetries: 3, // Maximum number of retry attempts
      initialDelay: 1000, // Initial delay before the first retry (ms)
      backoffFactor: 2, // Multiplier for exponential backoff (1s, 2s, 4s)
    },
    // Rate limiting settings (conservative defaults)
    rateLimit: {
      requestsPerMinute: 60, // Allowed requests per minute
      cooldownPeriod: 60000, // Cooldown duration if limit is hit (ms)
      batchSizeRecommendation: 10, // Suggested number of concurrent requests
      enabled: true, // Rate limiting enabled by default
    },
    // Fallback mechanism (e.g., switch to OpenAI)
    fallback: {
      // Conditions that trigger a fallback attempt
      triggerConditions: {
        http5xx: true, // Fallback on 5xx server errors
        timeout: true, // Fallback on timeout after all retries
      },
      maxAttempts: 1, // How many times to attempt fallback for a single failed request
      // Logging for fallback events is handled by the logging config below
    },
    // Default logging settings
    logging: {
      level: 'info', // Default log level (e.g., 'debug', 'info', 'warn', 'error')
      logRateLimitBreach: true,
      logFallbackTrigger: true,
    },
    // Mocking setting (default to false)
    mock: {
        enabled: false,
        mockResponse: { // Default mock response if mocking is enabled
            choices: [{ message: { content: "This is a default mock response from Perplexity config." } }]
        }
    }
  },

  // Environment-specific overrides
  development: {
    api: {
      timeout: 30000, // Longer timeout for development: 30 seconds
    },
    rateLimit: {
      enabled: false, // Disable rate limiting in development
    },
    logging: {
      level: 'debug', // Verbose logging in development
    },
    mock: {
        enabled: process.env.MOCK_PERPLEXITY === 'true', // Allow enabling mocks via env var
    }
  },

  testing: {
    api: {
      timeout: 10000, // Standard timeout for testing
       // Use a specific test API key if available, otherwise default is fine
       // headers: {
       //   Authorization: `Bearer ${process.env.PERPLEXITY_TEST_API_KEY || process.env.PERPLEXITY_API_KEY}`,
       // },
    },
    retry: {
      maxRetries: 1, // Fewer retries during testing
    },
    rateLimit: {
      enabled: false, // Usually disable rate limiting for automated tests
    },
    logging: {
      level: 'warn', // Reduce noise during tests, log warnings/errors
    },
    // Indicate that mock responses should be used in the testing environment
    mock: {
      enabled: true, // Enable mocking for tests
      mockResponse: { // Specific mock response for tests
          choices: [{ message: { content: "Mock response for testing environment." } }]
      }
    }
  },

  test: {
    api: {
      timeout: 10000, // Standard timeout for testing
    },
    retry: {
      maxRetries: 1, // Fewer retries during testing
    },
    rateLimit: {
      enabled: false, // Usually disable rate limiting for automated tests
    },
    logging: {
      level: 'warn', // Reduce noise during tests, log warnings/errors
    },
    // Indicate that mock responses should be used in the test environment
    mock: {
      enabled: true, // Enable mocking for tests
      mockResponse: { // Specific mock response for tests
          choices: [{ message: { content: JSON.stringify([
            { 
              name: "Push-ups", 
              description: "Basic bodyweight exercise for chest and arms",
              difficulty: "beginner",
              equipment: ["bodyweight"],
              muscleGroups: ["chest", "triceps", "shoulders"],
              tags: ["compound", "bodyweight"],
              citations: ["https://example.com/pushups"]
            },
            { 
              name: "Squats", 
              description: "Lower body exercise targeting quads and glutes",
              difficulty: "beginner", 
              equipment: ["bodyweight"],
              muscleGroups: ["quadriceps", "glutes"],
              tags: ["compound", "bodyweight"],
              citations: ["https://example.com/squats"]
            },
            { 
              name: "Plank", 
              description: "Core strengthening exercise",
              difficulty: "beginner",
              equipment: ["bodyweight"], 
              muscleGroups: ["core"],
              tags: ["isometric", "bodyweight"],
              citations: ["https://example.com/plank"]
            }
          ]) } }]
      }
    }
  },

  production: {
    api: {
      timeout: 15000, // Shorter timeout in production: 15 seconds (was 5s, increased for potentially longer queries)
    },
    rateLimit: {
      enabled: true, // Enforce rate limiting strictly in production
      requestsPerMinute: 60, // Stick to the defined limits
    },
    retry: {
        maxRetries: 2, // Slightly fewer retries than default in prod to avoid long hangs
    },
    logging: {
      level: 'error', // Log only errors in production to reduce noise
      logRateLimitBreach: true, // Ensure rate limit issues are logged
      logFallbackTrigger: true, // Ensure fallback events are logged
    },
    mock: {
        enabled: false, // Ensure mocking is disabled in production
    }
  },
};

// Determine the current environment (default to 'development' if not set)
const env = process.env.NODE_ENV || 'development';

// Merge the default config with the environment-specific overrides
// Creates the final config object based on the current environment
const finalConfig = {
  ...config.default, // Start with default settings
  ...config[env], // Override with environment-specific settings
  // Deep merge for nested objects like 'api', 'retry', 'rateLimit', 'fallback', 'logging', 'mock'
  api: { ...config.default.api, ...config[env]?.api },
  bodyDefaults: { ...config.default.bodyDefaults, ...config[env]?.bodyDefaults },
  retry: { ...config.default.retry, ...config[env]?.retry },
  rateLimit: { ...config.default.rateLimit, ...config[env]?.rateLimit },
  fallback: { ...config.default.fallback, ...config[env]?.fallback },
  logging: { ...config.default.logging, ...config[env]?.logging },
  mock: { ...config.default.mock, ...config[env]?.mock },
};

// Add the current environment name to the final config for easy access
finalConfig.environment = env;

// Validate that the API key is present, especially in non-testing environments
if (!process.env.PERPLEXITY_API_KEY && env !== 'testing') {
  console.warn(
    'WARN: PERPLEXITY_API_KEY environment variable is not set. Perplexity API calls will likely fail.'
  );
  // Optionally, throw an error in production if the key is missing
  // if (env === 'production') {
  //   throw new Error('FATAL: PERPLEXITY_API_KEY is required in production but is not set.');
  // }
} else if (env !== 'testing') {
    // Mask the key partially for logging confirmation, only if it exists
    const apiKey = process.env.PERPLEXITY_API_KEY;
    const maskedKey = apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : 'Not Set';
    console.log(`INFO: Perplexity config loaded for environment: ${env}. API Key: ${maskedKey}`);
} else {
    console.log(`INFO: Perplexity config loaded for environment: ${env}. Mocking enabled.`);
}


module.exports = finalConfig;
