/* eslint-disable max-len */
const {
  formatMessages,
  extractJSONFromResponse,
  validateResponse,
  createSystemPrompt,
  createUserPrompt,
  createAssistantPrompt,
} = require('../../utils/openai-helpers');
const logger = require('../../config/logger');

// Mock the logger
jest.mock('../../config/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

describe('OpenAI Helper Utilities', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- formatMessages Tests ---
  describe('formatMessages', () => {
    test('should format valid messages correctly', () => {
      const messages = [
        { role: 'system', content: 'You are helpful' },
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there' },
        { role: 'tool', content: 'tool output', tool_call_id: '123'}
      ];
      const expected = [
        { role: 'system', content: 'You are helpful' },
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there' },
         { role: 'tool', content: 'tool output', tool_call_id: '123'}
      ];
      expect(formatMessages(messages)).toEqual(expected);
    });

    test('should throw error if input is not an array', () => {
      expect(() => formatMessages('not an array')).toThrow('Input must be an array of message objects.');
    });

    test('should throw error for messages missing role', () => {
      const messages = [{ content: 'missing role' }];
      expect(() => formatMessages(messages)).toThrow('Invalid message format at index 0. Each message must have \'role\' and \'content\'.');
      expect(logger.error).toHaveBeenCalled();
    });

    test('should throw error for messages missing content (unless role is assistant with tool_calls)', () => {
      const messages = [{ role: 'user' }]; // Missing content
      expect(() => formatMessages(messages)).toThrow('Invalid message format at index 0. Each message must have \'role\' and \'content\'.');
       expect(logger.error).toHaveBeenCalled();

       // Should NOT throw if assistant message has tool_calls but null content
       const messagesWithToolCall = [
         { role: 'assistant', content: null, tool_calls: [{id: '1'}] }
        ];
       // We need to refine the formatMessages validation slightly if we want to allow null content for assistant tool calls *explicitly*
       // For now, based on current implementation, it requires content to be defined (even if null)
       // Let's adjust the test slightly to reflect the current code which requires `content` key to exist
       const messagesWithToolCallAndNullContent = [
         { role: 'assistant', content: null, tool_calls: [{id: '1'}] }
        ];
        expect(() => formatMessages(messagesWithToolCallAndNullContent)).not.toThrow();

         const messagesWithToolCallAndUndefinedContent = [
         { role: 'assistant', tool_calls: [{id: '1'}] } // Content key is undefined
        ];
       expect(() => formatMessages(messagesWithToolCallAndUndefinedContent)).toThrow('Invalid message format at index 0. Each message must have \'role\' and \'content\'.');

    });

    test('should handle empty array input', () => {
      expect(formatMessages([])).toEqual([]);
    });
  });

  // --- extractJSONFromResponse Tests ---
  describe('extractJSONFromResponse', () => {
    test('should return null for null or undefined input', () => {
      expect(extractJSONFromResponse(null)).toBeNull();
      expect(extractJSONFromResponse(undefined)).toBeNull();
      expect(logger.debug).toHaveBeenCalledWith('Cannot extract JSON from empty or non-string response.');
    });

    test('should return null for non-string input', () => {
      expect(extractJSONFromResponse(123)).toBeNull();
      expect(extractJSONFromResponse({a: 1})).toBeNull();
    });

    test('should return null for empty string input', () => {
      expect(extractJSONFromResponse('')).toBeNull();
    });

    test('should extract JSON from plain JSON string', () => {
      const jsonString = '{"key": "value", "number": 123}';
      expect(extractJSONFromResponse(jsonString)).toEqual({ key: 'value', number: 123 });
    });

    test('should extract JSON from markdown code block (```json ... ```)', () => {
      const text = 'Some text before\n```json\n{\n  "plan": "workout",\n  "duration": 60\n}\n```\nSome text after';
      expect(extractJSONFromResponse(text)).toEqual({ plan: 'workout', duration: 60 });
      expect(logger.debug).toHaveBeenCalledWith('Extracted potential JSON from markdown code block.');
    });

    test('should extract JSON from markdown code block (``` ... ```)', () => {
      const text = 'Use this:\n```\n{\n  "name": "Push-ups"\n}\n```';
      expect(extractJSONFromResponse(text)).toEqual({ name: 'Push-ups' });
      expect(logger.debug).toHaveBeenCalledWith('Extracted potential JSON from markdown code block.');
    });

     test('should extract JSON using brace boundaries if no code block', () => {
      const text = 'Here is the data: { "id": 1, "active": true } according to the system.';
      expect(extractJSONFromResponse(text)).toEqual({ id: 1, active: true });
       expect(logger.debug).toHaveBeenCalledWith('Extracted potential JSON using brace boundaries.');
    });

    test('should return null for malformed JSON', () => {
      const malformed = '{"key": "value", number: 123}'; // Missing quotes around number key
      expect(extractJSONFromResponse(malformed)).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Failed to parse JSON'), expect.any(Object));
    });

    test('should return null if parsed content is not an object', () => {
      const text = '"just a string"'
      expect(extractJSONFromResponse(text)).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith('Parsed content is not a JSON object.', { parsedType: 'string' });
    });

     test('should handle JSON within text without code blocks or clear braces', () => {
        // Current implementation relies on code blocks or first/last braces.
        // Direct parsing might work for simple cases but is less reliable.
        const text = 'The result is { "status": "ok" }';
        // Depending on implementation details, this might parse correctly or fail.
        // Current implementation extracts using brace boundaries.
        expect(extractJSONFromResponse(text)).toEqual({ status: 'ok' });
    });
  });

  // --- validateResponse Tests ---
  describe('validateResponse', () => {
    test('should return false for null or undefined response', () => {
      expect(validateResponse(null)).toBe(false);
      expect(validateResponse(undefined)).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith('Validation failed: Response is null or undefined.');
    });

    test('should return true for valid string when no JSON expected', () => {
      expect(validateResponse('Simple text response')).toBe(true);
    });

    test('should return true for valid object when no JSON expected', () => {
      expect(validateResponse({ key: 'value' })).toBe(true);
    });

    test('should return true when JSON expected and valid JSON string provided', () => {
      expect(validateResponse('{"a": 1}', { expectJson: true })).toBe(true);
    });

     test('should return true when JSON expected and valid object provided', () => {
      expect(validateResponse({a: 1}, { expectJson: true })).toBe(true);
    });

    test('should return false when JSON expected and invalid JSON string provided', () => {
      expect(validateResponse('{"a: 1}', { expectJson: true })).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith('Validation failed: Expected JSON but could not parse.');
    });

    test('should return false when JSON expected and non-JSON string provided', () => {
      expect(validateResponse('not json', { expectJson: true })).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith('Validation failed: Expected JSON but could not parse.');
    });

    test('should return false when JSON expected and non-object/non-string provided', () => {
      expect(validateResponse(123, { expectJson: true })).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith('Validation failed: Expected JSON but received non-string, non-object type.', { type: 'number' });
    });

    // Schema Validation Tests
    const mockSchemaValidator = jest.fn((data) => {
      if (data && data.requiredField) {
        return { error: null }; // Simulate Joi/Zod success
      } else {
        return { error: { message: 'Missing required field' } }; // Simulate Joi/Zod error
      }
    });

    const mockThrowingValidator = jest.fn(() => {
      throw new Error('Validator crashed');
    });

    test('should return true when schema validator passes', () => {
      const response = { requiredField: 'exists' };
      expect(validateResponse(response, { schemaValidator: mockSchemaValidator })).toBe(true);
      expect(mockSchemaValidator).toHaveBeenCalledWith(response);
      expect(logger.debug).toHaveBeenCalledWith('Schema validation passed.');
    });

     test('should return true when schema validator passes for JSON string', () => {
      const response = '{"requiredField": "exists"}';
      expect(validateResponse(response, { schemaValidator: mockSchemaValidator })).toBe(true);
      expect(mockSchemaValidator).toHaveBeenCalledWith({ requiredField: 'exists' });
    });

    test('should return false when schema validator fails', () => {
      const response = { wrongField: 'oops' };
      expect(validateResponse(response, { schemaValidator: mockSchemaValidator })).toBe(false);
      expect(mockSchemaValidator).toHaveBeenCalledWith(response);
      expect(logger.warn).toHaveBeenCalledWith('Validation failed: Schema validation error.', { error: 'Missing required field' });
    });

     test('should return false when schema validator fails for JSON string', () => {
      const response = '{"wrongField": "oops"}';
      expect(validateResponse(response, { schemaValidator: mockSchemaValidator })).toBe(false);
      expect(mockSchemaValidator).toHaveBeenCalledWith({ wrongField: 'oops' });
    });

    test('should return false if schema validator expects JSON but response is invalid JSON', () => {
       const response = 'not json';
       expect(validateResponse(response, { schemaValidator: mockSchemaValidator })).toBe(false);
       expect(logger.warn).toHaveBeenCalledWith('Validation failed: Expected JSON but could not parse.');
       expect(mockSchemaValidator).not.toHaveBeenCalled();
    });

    test('should return false if schema validator itself throws an error', () => {
      const response = { requiredField: 'exists' };
      expect(validateResponse(response, { schemaValidator: mockThrowingValidator })).toBe(false);
       expect(logger.warn).toHaveBeenCalledWith('Validation failed: Error during schema validation.', { error: 'Validator crashed' });
    });

  });

  // --- createSystemPrompt Tests ---
  describe('createSystemPrompt', () => {
    test('should create a valid system message object', () => {
      const content = 'Act as a fitness expert.';
      expect(createSystemPrompt(content)).toEqual({ role: 'system', content });
    });

    test('should throw error for empty or non-string content', () => {
      expect(() => createSystemPrompt('')).toThrow('System prompt content must be a non-empty string.');
      expect(() => createSystemPrompt(null)).toThrow('System prompt content must be a non-empty string.');
      expect(() => createSystemPrompt(123)).toThrow('System prompt content must be a non-empty string.');
    });
  });

   // --- createUserPrompt Tests ---
   describe('createUserPrompt', () => {
    test('should create a valid user message object', () => {
      const content = 'Generate a workout plan.';
      expect(createUserPrompt(content)).toEqual({ role: 'user', content });
    });

    test('should throw error for empty or non-string content', () => {
      expect(() => createUserPrompt('')).toThrow('User prompt content must be a non-empty string.');
      expect(() => createUserPrompt(null)).toThrow('User prompt content must be a non-empty string.');
      expect(() => createUserPrompt(123)).toThrow('User prompt content must be a non-empty string.');
    });
  });

   // --- createAssistantPrompt Tests ---
  describe('createAssistantPrompt', () => {
    test('should create a valid assistant message object with string content', () => {
      const content = 'Here is your plan:';
      expect(createAssistantPrompt(content)).toEqual({ role: 'assistant', content });
    });

    test('should create a valid assistant message object with null content', () => {
      const content = null;
      expect(createAssistantPrompt(content)).toEqual({ role: 'assistant', content: null });
    });

    test('should throw error for non-string/non-null content', () => {
      expect(() => createAssistantPrompt(123)).toThrow('Assistant prompt content must be a string or null.');
      expect(() => createAssistantPrompt(undefined)).toThrow('Assistant prompt content must be a string or null.');
      expect(() => createAssistantPrompt({a:1})).toThrow('Assistant prompt content must be a string or null.');
    });
  });

}); 