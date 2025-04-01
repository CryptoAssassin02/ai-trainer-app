/* eslint-disable require-jsdoc */
const logger = require('../config/logger');

/**
 * OpenAI Helper Utilities
 *
 * Provides functions for common tasks related to interacting with the OpenAI API,
 * such as formatting messages, parsing responses, and creating prompts.
 */

/**
 * Formats messages into the structure expected by the OpenAI Chat Completion API.
 *
 * @param {Array<object>} messages - An array of message objects. Each object should have at least a 'role' and 'content'.
 *                                   Example: [{ role: 'system', content: 'You are helpful.' }, { role: 'user', content: 'Hello?' }]
 * @returns {Array<import('openai').ChatCompletionMessageParam>} Formatted messages ready for the API.
 * @throws {Error} If the input is not an array or if messages lack required fields.
 */
function formatMessages(messages) {
  if (!Array.isArray(messages)) {
    throw new Error('Input must be an array of message objects.');
  }

  const formatted = messages.map((msg, index) => {
    if (!msg || typeof msg !== 'object' || !msg.role || typeof msg.content === 'undefined') {
      logger.error(`Invalid message format at index ${index}`, { message: msg });
      throw new Error(`Invalid message format at index ${index}. Each message must have 'role' and 'content'.`);
    }

    // Basic validation passed, return in the expected format
    return {
      role: msg.role,
      content: msg.content,
      // Include other valid fields if present (e.g., name, tool_call_id)
      ...(msg.name && { name: msg.name }),
      ...(msg.tool_call_id && { tool_call_id: msg.tool_call_id }),
      ...(msg.tool_calls && { tool_calls: msg.tool_calls }),
    };
  });

  logger.debug('Formatted OpenAI messages:', { count: formatted.length });
  return formatted;
}

/**
 * Attempts to extract a JSON object from a string response, often from OpenAI.
 *
 * Handles cases where the JSON might be embedded within markdown code blocks (```json ... ```)
 * or potentially surrounded by other text.
 *
 * @param {string | null | undefined} responseText - The raw text response from the API.
 * @returns {object | null} The parsed JSON object, or null if parsing fails or input is empty.
 */
function extractJSONFromResponse(responseText) {
  if (!responseText || typeof responseText !== 'string') {
    logger.debug('Cannot extract JSON from empty or non-string response.');
    return null;
  }

  let potentialJson = responseText.trim();

  // Attempt to find JSON within markdown code blocks first
  const codeBlockMatch = potentialJson.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    potentialJson = codeBlockMatch[1].trim();
    logger.debug('Extracted potential JSON from markdown code block.');
  } else {
     // If no code block, try to find the first '{' and last '}' as potential boundaries
     const firstBrace = potentialJson.indexOf('{');
     const lastBrace = potentialJson.lastIndexOf('}');
     if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        potentialJson = potentialJson.substring(firstBrace, lastBrace + 1);
        logger.debug('Extracted potential JSON using brace boundaries.');
     } else {
       logger.debug('Could not find clear JSON boundaries (code block or braces), attempting direct parse.');
     }
  }

  try {
    const parsed = JSON.parse(potentialJson);
    // Basic check to ensure it's an object (not just a string or number parsed as JSON)
    if (typeof parsed === 'object' && parsed !== null) {
      logger.debug('Successfully parsed JSON object from response.');
      return parsed;
    } else {
      logger.warn('Parsed content is not a JSON object.', { parsedType: typeof parsed });
      return null;
    }
  } catch (error) {
    logger.warn('Failed to parse JSON from response text.', { error: error.message, textSample: responseText.substring(0, 100) + '...' });
    return null;
  }
}

/**
 * Validates a response from OpenAI based on basic criteria.
 * (This is a placeholder and can be expanded significantly).
 *
 * @param {string | object | null} response - The response content (could be string or already parsed object).
 * @param {object} [options={}] - Validation options.
 * @param {boolean} [options.expectJson=false] - Whether the response *must* be parseable JSON.
 * @param {Function} [options.schemaValidator] - A function to validate the parsed JSON against a schema (e.g., using Joi or Zod).
 * @returns {boolean} True if the response is considered valid based on options, false otherwise.
 */
function validateResponse(response, options = {}) {
  const { expectJson = false, schemaValidator } = options;

  if (response === null || typeof response === 'undefined') {
    logger.warn('Validation failed: Response is null or undefined.');
    return false;
  }

  let parsedJson = null;
  if (expectJson || schemaValidator) {
    if (typeof response === 'string') {
      parsedJson = extractJSONFromResponse(response);
      if (!parsedJson) {
        logger.warn('Validation failed: Expected JSON but could not parse.');
        return false;
      }
    } else if (typeof response === 'object') {
      parsedJson = response;
    } else {
       logger.warn('Validation failed: Expected JSON but received non-string, non-object type.', { type: typeof response });
       return false;
    }

    if (schemaValidator) {
      try {
        const validationResult = schemaValidator(parsedJson);
        // Assuming validator throws or returns { error: ... } on failure
        if (validationResult && validationResult.error) {
          logger.warn('Validation failed: Schema validation error.', { error: validationResult.error.message });
          return false;
        }
        logger.debug('Schema validation passed.');
      } catch (error) {
        logger.warn('Validation failed: Error during schema validation.', { error: error.message });
        return false;
      }
    }
  }

  // Add other checks here if needed (e.g., harmful content detection)

  logger.debug('Response validation passed.');
  return true;
}

/**
 * Creates a standard system prompt message object.
 *
 * @param {string} content - The content of the system message.
 * @returns {import('openai').ChatCompletionSystemMessageParam} The system message object.
 */
function createSystemPrompt(content) {
  if (!content || typeof content !== 'string') {
    throw new Error('System prompt content must be a non-empty string.');
  }
  return { role: 'system', content };
}

/**
 * Creates a standard user prompt message object.
 *
 * @param {string} content - The content of the user message.
 * @returns {import('openai').ChatCompletionUserMessageParam} The user message object.
 */
function createUserPrompt(content) {
   if (!content || typeof content !== 'string') {
    throw new Error('User prompt content must be a non-empty string.');
  }
  return { role: 'user', content };
}

/**
 * Creates a standard assistant prompt message object.
 *
 * @param {string} content - The content of the assistant message.
 * @returns {import('openai').ChatCompletionAssistantMessageParam} The assistant message object.
 */
function createAssistantPrompt(content) {
   // Assistant content can sometimes be null (e.g., before tool calls)
   if (typeof content !== 'string' && content !== null) {
    throw new Error('Assistant prompt content must be a string or null.');
  }
  return { role: 'assistant', content };
}


module.exports = {
  formatMessages,
  extractJSONFromResponse,
  validateResponse,
  createSystemPrompt,
  createUserPrompt,
  createAssistantPrompt,
}; 