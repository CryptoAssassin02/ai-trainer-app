const { OpenAI, APIError } = require('openai');
const envConfig = require('../config/env');
const logger = require('../config/logger'); // Assuming a logger exists based on backend/config/logger.js
const openaiConfig = require('../config/openai'); // Import the new config

// Constants moved to config or used via this.config
// const MAX_RETRIES = config.retry.maxRetries;
// const BASE_DELAY = config.retry.baseDelay; // Initial delay in ms
// const RETRYABLE_STATUS_CODES = config.retry.retryableStatusCodes; // e.g., [429, 500, 502, 503, 504]

/**
 * Service class for interacting with the OpenAI API.
 * Handles client instantiation, API calls, error handling, and retries.
 */
class OpenAIService {
  /**
   * @private {OpenAI | null} The singleton OpenAI client instance.
   */
  #client = null;
  /**
   * @private {string | null} The OpenAI API key.
   */
  #apiKey = null;
  #config; // Store config internally

  constructor() {
    // Store the imported config
    this.#config = openaiConfig;

    this.#apiKey = envConfig.externalServices.openai.apiKey;
    if (!this.#apiKey) {
      logger.warn('OpenAI API key is not configured. OpenAI services will not be available.');
    } else {
      logger.info(`OpenAIService initialized. Default chat model: ${openaiConfig.defaultChatModel}`);
    }

    // Basic validation
    if (!this.#config.apiKey) {
      logger.error('OpenAI API key is missing from configuration.');
      throw new Error('OpenAI API key is missing.');
    }
    this.#client = new OpenAI({
      apiKey: this.#config.apiKey,
      organization: this.#config.organization || undefined, // Pass organization if provided
    });
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
   * Executes an OpenAI API call with retry logic for specific errors.
   * @template T
   * @param {() => Promise<T>} apiCallFn - The function executing the OpenAI API call.
   * @param {string} operationName - Name of the operation for logging (e.g., 'Chat Completion').
   * @param {string} model - The model being used (for logging/cost estimation).
   * @returns {Promise<T>} The result of the successful API call.
   * @throws {Error | APIError} Throws an error if the call fails after retries or encounters a non-retryable error.
   */
  async #executeWithRetry(apiCallFn, operationName, model) {
    let retries = 0;
    // Use config values
    const maxRetries = this.#config.retry.maxRetries;
    const baseDelay = this.#config.retry.baseDelay;
    const retryableStatusCodes = this.#config.retry.retryableStatusCodes;

    while (retries <= maxRetries) {
      try {
        logger.debug(`Executing OpenAI ${operationName} (Attempt ${retries + 1})`);
        const result = await apiCallFn();
        logger.debug(`OpenAI ${operationName} successful (Attempt ${retries + 1})`);

        // Log usage and estimated cost if available in the response
        if (result && result.usage) {
          const estimatedCost = this.#config.utils.estimateCost(model, result.usage);
          logger.info(`OpenAI ${operationName} Usage:`, { usage: result.usage, estimatedCostUSD: estimatedCost });
        } else {
          logger.debug(`No usage data in response for OpenAI ${operationName}`);
        }

        return result;
      } catch (error) {
        logger.error(`Error during OpenAI ${operationName} (Attempt ${retries + 1})`, { error: error.message || error, status: error.status });

        if (error instanceof APIError) {
          // Check for retryable status codes using config
          const isRetryable = retryableStatusCodes.includes(error.status);

          if (isRetryable && retries < maxRetries) {
            retries++;
            const delayMs = this.#calculateDelay(retries, baseDelay);
            logger.warn(`OpenAI ${operationName} failed with retryable status ${error.status}. Retrying (${retries}/${maxRetries}) after ${delayMs}ms...`);
            await this.#delay(delayMs); // Use internal delay method
          } else if (isRetryable) { // Retries exhausted for a retryable error
             logger.error(`OpenAI ${operationName} failed with status ${error.status} after exhausting all ${maxRetries} retries.`);
             throw error; // Re-throw the last APIError
          } else { // Non-retryable APIError
            logger.error(`OpenAI ${operationName} failed with non-retryable status ${error.status}.`);
            throw error; // Re-throw non-retryable APIError immediately
          }
        } else {
          // Handle non-API errors (network issues, unexpected errors)
          logger.error(`An unexpected non-APIError occurred during OpenAI ${operationName}.`, error);
          throw error; // Re-throw unexpected errors immediately
        }
      }
    }
    // This line should theoretically be unreachable if logic is correct, but acts as a safeguard.
    throw new Error(`OpenAI ${operationName} failed unexpectedly after retries.`);
  }

  /**
   * Generates a chat completion using the OpenAI API.
   * @param {Array<Object>} messages - An array of message objects (e.g., [{ role: 'user', content: 'Hello' }]).
   * @param {Object} [options={}] - Optional parameters to override defaults (e.g., model, temperature, max_tokens).
   * @returns {Promise<string | Object>} The assistant's message content string or the message object if tool calls are present.
   * @throws {APIError | Error} If the API call fails or the response is invalid.
   */
  async generateChatCompletion(messages, options = {}) {
    // Determine the final max_tokens value, prioritizing options
    const maxTokensValue = options.maxTokens ?? this.#config.maxTokens;

    // Base payload with defaults
    const requestPayload = {
      model: options.model ?? this.#config.defaultChatModel,
      messages,
      temperature: options.temperature ?? this.#config.temperature,
      // Add max_tokens only if it has a value (either from options or config)
      ...(maxTokensValue !== undefined && maxTokensValue !== null ? { max_tokens: maxTokensValue } : {}),
      // Add other parameters from options if needed, ensuring correct naming
      ...(options.topP !== undefined ? { top_p: options.topP } : {}),
      ...(options.frequencyPenalty !== undefined ? { frequency_penalty: options.frequencyPenalty } : {}),
      ...(options.presencePenalty !== undefined ? { presence_penalty: options.presencePenalty } : {}),
      ...(options.responseFormat ? { response_format: options.responseFormat } : {}),
      ...(options.tools ? { tools: options.tools } : {}),
      ...(options.toolChoice ? { tool_choice: options.toolChoice } : {}),
    };

    logger.info(`Generating OpenAI chat completion with model: ${requestPayload.model}`);
    logger.debug('Chat completion request payload:', requestPayload);

    const apiCall = async () => {
      const response = await this.#client.chat.completions.create(requestPayload);

      // Basic validation of response structure
      if (!response || !response.choices || response.choices.length === 0) {
        logger.error('Invalid response structure received from OpenAI Chat Completion', response);
        throw new Error('Invalid response structure from OpenAI Chat Completion');
      }
      return response;
    };

    const response = await this.#executeWithRetry(apiCall, 'Chat Completion', requestPayload.model);
    const choice = response.choices[0];

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
     // Merge options with defaults from config
    const mergedOptions = {
        model: openaiConfig.defaultEmbeddingModel,
        ...options,
    };

    logger.info(`Generating OpenAI embedding(s) with model: ${mergedOptions.model}`);
    logger.debug('Embedding request payload:', mergedOptions);

    const apiCall = async () => {
      const response = await this.#client.embeddings.create({
        model: mergedOptions.model,
        input: inputText,
      });

      // Basic validation
      if (!response || !response.data || !response.data.length === 0) {
        logger.error('Invalid response structure received from OpenAI Embeddings', response);
        throw new Error('Invalid response structure from OpenAI Embeddings');
      }
       // Validate embeddings exist for each input
      for (let i = 0; i < response.data.length; i++) {
        const item = response.data[i];
        if (!item || !item.embedding || !Array.isArray(item.embedding)) {
          logger.error('Missing embedding in response data at index ' + i, item ?? response);
          throw new Error('Missing embedding in response data at index ' + i);
        }
      }

      // Return single embedding or array of embeddings based on input type
      const embeddings = response.data.map(d => d.embedding);
      return { ...response, embeddingsResult: Array.isArray(inputText) ? embeddings : embeddings[0] }; // Return full response + processed result
    };

    // Get the result from executeWithRetry, which now contains the full response + our processed result
    const resultWithFullResponse = await this.#executeWithRetry(apiCall, 'Embedding Generation', mergedOptions.model);
    // Return only the processed embeddings result to the caller
    return resultWithFullResponse.embeddingsResult;
  }
}

// Export a singleton instance
module.exports = new OpenAIService(); 