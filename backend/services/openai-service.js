const { OpenAI, APIError } = require('openai');
const envConfig = require('../config/env'); // Fix import to use CommonJS require
const logger = require('../config/logger'); // Fix import to use CommonJS require
// REMOVE config require from top level
// const openaiConfig = require('../config/openai');

// Constants moved to config or used via this.config
// const MAX_RETRIES = config.retry.maxRetries;
// const BASE_DELAY = config.retry.baseDelay; // Initial delay in ms
// const RETRYABLE_STATUS_CODES = config.retry.retryableStatusCodes; // e.g., [429, 500, 502, 503, 504]

/**
 * Service class for interacting with the OpenAI API.
 * Handles client instantiation, API calls, error handling, and retries.
 */
class OpenAIService {
  #client = null; // Initialize client as null
  #apiKey = null; // Initialize apiKey as null
  // Define config property but don't assign here
  #config;
  #isInitialized = false; // Flag to track initialization attempt

  constructor() {
    // Require config INSIDE constructor again
    // This might allow test-specific mocks via jest.mock to work correctly
    this.#config = require('../config/openai');
    logger.info('OpenAIService instance created. Client will be initialized on first use.');
  }

  /**
   * Initializes the OpenAI client if it hasn't been initialized yet.
   * @returns {Promise<void>} A promise that resolves when the client is ready
   * @throws {Error} If the client initialization fails
   */
  async initClient() {
    if (this.#client) {
      return; // Client already initialized
    }

    // Set initialization flag to avoid multiple initialization attempts during retry sequences
    this.#isInitialized = true;

    try {
      // Get API key from environment or configuration
      this.#apiKey = envConfig.externalServices.openai.apiKey;

      // DEBUG: Log API key status
      logger.info(`[OpenAIService] DEBUG - API key status: ${this.#apiKey ? 'Present' : 'Missing'}`);
      logger.info(`[OpenAIService] DEBUG - API key length: ${this.#apiKey ? this.#apiKey.length : 0}`);
      logger.info(`[OpenAIService] DEBUG - API key starts with: ${this.#apiKey ? this.#apiKey.substring(0, 7) + '...' : 'N/A'}`);

      if (!this.#apiKey) {
        throw new Error('OpenAI API key not found');
      }

      // Create the client
      this.#client = new OpenAI({
        apiKey: this.#apiKey,
      });

      logger.info('OpenAI client initialized successfully');
    } catch (error) {
      this.#isInitialized = false; // Reset flag on failure
      logger.error('Failed to initialize OpenAI client', { error: error.message });
      throw new Error(`Failed to initialize OpenAI client: ${error.message}`);
    }
  }

  /**
   * Calculates exponential backoff delay.
   * @param {number} attempt - The current retry attempt number (starting from 1).
   * @param {number} baseDelayMs - The base delay in milliseconds.
   * @returns {number} Delay in milliseconds.
   */
  #calculateDelay(attempt, baseDelayMs) {
    // Exponential backoff: baseDelay * 2^(attempt-1)
    // Add jitter: +/- 50% of the calculated delay
    const delay = baseDelayMs * Math.pow(2, attempt - 1);
    const jitter = delay * (Math.random() - 0.5); // Random number between -0.5 and 0.5
    return Math.max(0, Math.round(delay + jitter)); // Ensure delay is not negative
  }

  /**
   * Simple delay utility.
   * @param {number} ms - Milliseconds to delay.
   * @returns {Promise<void>}
   */
  async #delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generates a chat completion using the OpenAI API.
   * @param {Array<Object>} messages - An array of message objects (e.g., [{ role: 'user', content: 'Hello' }]).
   * @param {Object} [options={}] - Optional parameters to override defaults (e.g., model, temperature, max_tokens).
   * @returns {Promise<string | Object>} The assistant's message content string or the message object if tool calls are present.
   * @throws {APIError | Error} If the API call fails or the response is invalid.
   */
  async generateChatCompletion(messages, options = {}) {
    // Ensure client is initialized
    await this.initClient();

    // Determine the final max_tokens value, prioritizing options
    const maxTokensValue = options.max_tokens ?? this.#config.maxTokens;

    // Base payload with defaults
    const requestPayload = {
      model: options.model ?? this.#config.defaultChatModel,
      messages,
      temperature: options.temperature ?? this.#config.temperature,
      // Add max_tokens only if it has a value (either from options or config)
      ...(maxTokensValue !== undefined && maxTokensValue !== null ? { max_tokens: maxTokensValue } : {}),
      // Add other parameters from options if needed, ensuring correct naming
      ...(options.top_p !== undefined ? { top_p: options.top_p } : {}),
      ...(options.frequency_penalty !== undefined ? { frequency_penalty: options.frequency_penalty } : {}),
      ...(options.presence_penalty !== undefined ? { presence_penalty: options.presence_penalty } : {}),
      ...(options.response_format ? { response_format: options.response_format } : {}),
      ...(options.tools ? { tools: options.tools } : {}),
      ...(options.tool_choice ? { tool_choice: options.tool_choice } : {}),
    };

    logger.info(`Generating OpenAI chat completion with model: ${requestPayload.model}`);
    logger.debug('Chat completion request payload:', requestPayload);
    
    // DEBUG: Log the exact messages being sent
    console.log('[OpenAIService] DEBUG - Request payload model:', requestPayload.model);
    console.log('[OpenAIService] DEBUG - Request payload messages length:', requestPayload.messages?.length || 0);
    if (requestPayload.messages && requestPayload.messages.length > 0) {
      requestPayload.messages.forEach((msg, index) => {
        console.log(`[OpenAIService] DEBUG - Message ${index}:`, {
          role: msg.role,
          contentLength: msg.content?.length || 0,
          contentPreview: msg.content?.substring(0, 200) + '...'
        });
      });
    }

    const retryableStatusCodes = this.#config.retry.retryableStatusCodes;
    const maxRetries = this.#config.retry.maxRetries;
    const baseDelay = this.#config.retry.baseDelay;
    
    let retries = 0;
    
    while (retries <= maxRetries) {
      try {
        logger.debug(`Executing OpenAI Chat Completion (Attempt ${retries + 1})`);
        
        const response = await this.#client.chat.completions.create(requestPayload);

        // DEBUG: Log response structure
        logger.info(`[OpenAIService] DEBUG - Response received, type: ${typeof response}`);
        logger.info(`[OpenAIService] DEBUG - Response has choices: ${response?.choices ? 'Yes' : 'No'}`);
        logger.info(`[OpenAIService] DEBUG - Choices length: ${response?.choices?.length || 0}`);
        if (response?.choices?.[0]) {
          logger.info(`[OpenAIService] DEBUG - First choice message type: ${typeof response.choices[0].message}`);
          logger.info(`[OpenAIService] DEBUG - First choice content type: ${typeof response.choices[0].message?.content}`);
          logger.info(`[OpenAIService] DEBUG - First choice content length: ${response.choices[0].message?.content?.length || 0}`);
          logger.info(`[OpenAIService] DEBUG - First choice content preview: ${response.choices[0].message?.content?.substring(0, 100) || 'Empty'}`);
        }

        // Validate response
        if (!response || !response.choices || response.choices.length === 0) {
          logger.error('Invalid response structure received from OpenAI Chat Completion', response);
          throw new Error('Invalid response structure from OpenAI Chat Completion');
        }

        const choice = response.choices[0];

        // Log usage and estimated cost if available
        if (response && response.usage) {
          const estimatedCost = this.#config.utils.estimateCost(requestPayload.model, response.usage);
          logger.info(`OpenAI Chat Completion Usage:`, { usage: response.usage, estimatedCostUSD: estimatedCost });
        }

        // Handle tool calls
        if (choice.finish_reason === 'tool_calls') {
          logger.info('OpenAI chat completion finished due to tool calls.');
          return choice.message; // Return the full message object with tool_calls
        }

        // Validate message content exists
        if (!choice.message || typeof choice.message.content !== 'string') {
          logger.error('Missing or invalid content in OpenAI Chat Completion response', { choice });
          throw new Error('Missing or invalid content in OpenAI Chat Completion response');
        }

        return choice.message.content;
      } catch (error) {
        logger.error(`Error during OpenAI Chat Completion (Attempt ${retries + 1})`, { error: error.message || error, status: error.status });

        if (error && typeof error.status === 'number') { 
          const isRetryable = retryableStatusCodes.includes(error.status);

          if (isRetryable && retries < maxRetries) {
            retries++;
            const delayMs = this.#calculateDelay(retries, baseDelay);
            logger.warn(`OpenAI Chat Completion failed with retryable status ${error.status}. Retrying (${retries}/${maxRetries}) after ${delayMs}ms...`);
            await this.#delay(delayMs);
            continue;
          } else if (isRetryable) {
            logger.error(`OpenAI Chat Completion failed with status ${error.status} after exhausting all ${maxRetries} retries.`);
            throw error; // Re-throw the original error
          } else {
            logger.error(`OpenAI Chat Completion failed with non-retryable status ${error.status}.`);
            throw error; // Re-throw the original error
          }
        } else {
          logger.error(`An unexpected non-APIError occurred during OpenAI Chat Completion.`, error);
          throw error; // Re-throw the original error
        }
      }
    }

    // This line should be unreachable
    throw new Error('OpenAI Chat Completion failed unexpectedly after retries.');
  }

  /**
   * Alias for generateChatCompletion for backward compatibility.
   * @param {Object} options - Request options including messages
   * @returns {Promise<Object>} The full OpenAI response object
   */
  async createChatCompletion(options) {
    // Extract messages from options and pass the rest as options
    const { messages, ...otherOptions } = options;
    
    // Call generateChatCompletion but return the full response structure expected by helper modules
    const result = await this.generateChatCompletion(messages, otherOptions);
    
    // If result is a string (normal case), wrap it in the expected response structure
    if (typeof result === 'string') {
      return {
        choices: [{
          message: {
            content: result
          }
        }]
      };
    }
    
    // If result is an object (tool calls case), wrap it in the expected structure
    return {
      choices: [{
        message: result
      }]
    };
  }

  /**
   * Generates an embedding vector for the given input text.
   * Uses defaults from openaiConfig.
   * @param {string | Array<string>} inputText - The text or array of texts to embed.
   * @param {object} [options={}] - Optional parameters for embedding generation.
   * @param {string} [options.model] - The embedding model to use (overrides config default).
   * @returns {Promise<Array<number> | Array<Array<number>>>} The generated embedding vector(s).
   * @throws {APIError | Error} If the API call fails after retries.
   */
  async generateEmbedding(inputText, options = {}) {
    // Ensure client is initialized
    await this.initClient();
    
    // Merge options with defaults from config
    const requestPayload = {
      model: options.model ?? this.#config.defaultEmbeddingModel,
      input: inputText,
      // Add optional parameters from options if they exist
      ...(options.dimensions && { dimensions: options.dimensions }),
      ...(options.encoding_format && { encoding_format: options.encoding_format }), // Added missing option
      ...(options.user && { user: options.user }),
    };

    logger.info(`Generating OpenAI embedding(s) with model: ${requestPayload.model}`);
    logger.debug('Embedding request payload:', requestPayload);

    const retryableStatusCodes = this.#config.retry.retryableStatusCodes;
    const maxRetries = this.#config.retry.maxRetries;
    const baseDelay = this.#config.retry.baseDelay;
    
    let retries = 0;
    
    while (retries <= maxRetries) {
      try {
        logger.debug(`Executing OpenAI Embedding Generation (Attempt ${retries + 1})`);
        
        const response = await this.#client.embeddings.create(requestPayload);
        
        // Validate response
        if (!response || !response.data || response.data.length === 0) {
          logger.error('Invalid response structure received from OpenAI Embedding', response);
          throw new Error('Invalid response structure from OpenAI Embedding');
        }
        
        for (let i = 0; i < response.data.length; i++) {
          const item = response.data[i];
          if (!item || !item.embedding || !Array.isArray(item.embedding)) {
            logger.error('Missing embedding in response data at index ' + i, item ?? response);
            throw new Error('Missing embedding in response data at index ' + i);
          }
        }
        
        // ADDED: Validate response length matches input length for array inputs
        if (Array.isArray(inputText) && response.data.length !== inputText.length) {
          logger.error('Invalid response structure: embedding count mismatch', {
            inputLength: inputText.length,
            outputLength: response.data.length,
            response
          });
          throw new Error('Invalid response structure: embedding count mismatch');
        }
        
        // Log usage and estimated cost if available
        if (response && response.usage) {
          const estimatedCost = this.#config.utils.estimateCost(requestPayload.model, response.usage);
          logger.info(`OpenAI Embedding Generation Usage:`, { usage: response.usage, estimatedCostUSD: estimatedCost });
        }
        
        const embeddings = response.data.map(d => d.embedding);
        return Array.isArray(inputText) ? embeddings : embeddings[0];
      } catch (error) {
        logger.error(`Error during OpenAI Embedding Generation (Attempt ${retries + 1})`, { error: error.message || error, status: error.status });

        if (error && typeof error.status === 'number') {
          const isRetryable = retryableStatusCodes.includes(error.status);

          if (isRetryable && retries < maxRetries) {
            retries++;
            const delayMs = this.#calculateDelay(retries, baseDelay);
            logger.warn(`OpenAI Embedding Generation failed with retryable status ${error.status}. Retrying (${retries}/${maxRetries}) after ${delayMs}ms...`);
            await this.#delay(delayMs);
            continue;
          } else if (isRetryable) {
            logger.error(`OpenAI Embedding Generation failed with status ${error.status} after exhausting all ${maxRetries} retries.`);
            throw error; // Re-throw the original error
          } else {
            logger.error(`OpenAI Embedding Generation failed with non-retryable status ${error.status}.`);
            throw error; // Re-throw the original error
          }
        } else {
          logger.error(`An unexpected non-APIError occurred during OpenAI Embedding Generation.`, error);
          throw error; // Re-throw the original error
        }
      }
    }

    // This line should be unreachable
    throw new Error('OpenAI Embedding Generation failed unexpectedly after retries.');
  }
}

// Export the class definition directly
module.exports = OpenAIService; 