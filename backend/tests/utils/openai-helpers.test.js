const { 
    formatMessages, 
    extractJSONFromResponse, 
    validateResponse,
    createSystemPrompt,
    createUserPrompt,
    createAssistantPrompt 
} = require('../../utils/openai-helpers');
const logger = require('../../config/logger'); // Import logger to mock its methods

// Mock the logger methods
jest.mock('../../config/logger', () => ({
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(), // Include info if it might be used
}));

describe('OpenAI Helpers', () => {

    beforeEach(() => {
        // Reset mocks before each test
        jest.clearAllMocks();
    });

    describe('formatMessages', () => {
        test('should throw error if input is not an array', () => {
            expect(() => formatMessages({})).toThrow('Input must be an array of message objects.');
            expect(() => formatMessages(null)).toThrow('Input must be an array of message objects.');
            expect(() => formatMessages('string')).toThrow('Input must be an array of message objects.');
        });

        test('should throw error if messages have invalid format', () => {
            const invalidMessages = [
                { content: 'Valid content, missing role' },
                { role: 'user' }, // missing content
                null,
                'string message',
                { role: 'user', content: undefined } // content is undefined
            ];
            invalidMessages.forEach((msg, index) => {
                expect(() => formatMessages([msg]))
                    .toThrow(`Invalid message format at index 0.`);
                // Check logger was called for the specific error case causing the throw
                if (msg !== null && typeof msg !== 'string') { // Error log happens for object-like invalid messages
                     expect(logger.error).toHaveBeenCalledWith(expect.stringContaining(`Invalid message format at index 0`), { message: msg });
                }
                 // Reset logger mock for next iteration if needed, or check total calls later
                 logger.error.mockClear();
            });
             expect(() => formatMessages([{ role: 'user', content: 'Valid' }, null]))
               .toThrow('Invalid message format at index 1.');

        });

        test('should return correctly formatted messages', () => {
            const messages = [
                { role: 'system', content: 'System instructions.' },
                { role: 'user', content: 'User query.' }
            ];
            const expectedFormat = [
                { role: 'system', content: 'System instructions.' },
                { role: 'user', content: 'User query.' }
            ];
            const result = formatMessages(messages);
            expect(result).toEqual(expectedFormat);
            expect(logger.debug).toHaveBeenCalledWith('Formatted OpenAI messages:', { count: 2 });
        });

        test('should include optional fields if present', () => {
            const messages = [
                { role: 'assistant', content: null, tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'func', arguments: '{}' }}] },
                { role: 'tool', content: 'Tool result', tool_call_id: 'call_1', name: 'func' }
            ];
            const expectedFormat = [
                { role: 'assistant', content: null, tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'func', arguments: '{}' }}] },
                { role: 'tool', content: 'Tool result', tool_call_id: 'call_1', name: 'func' }
            ];
             const result = formatMessages(messages);
            // We need to check the structure deeply for the optional fields
            expect(result).toEqual(expectedFormat);
            expect(result[0]).toHaveProperty('tool_calls');
            expect(result[1]).toHaveProperty('tool_call_id', 'call_1');
            expect(result[1]).toHaveProperty('name', 'func');
            expect(logger.debug).toHaveBeenCalledWith('Formatted OpenAI messages:', { count: 2 });
        });

    }); // End describe formatMessages

    describe('extractJSONFromResponse', () => {
        test('should return null and log debug for null, undefined, or non-string input', () => {
            expect(extractJSONFromResponse(null)).toBeNull();
            expect(logger.debug).toHaveBeenCalledWith('Cannot extract JSON from empty or non-string response.');
            
            logger.debug.mockClear(); // Clear mock for next assertion
            expect(extractJSONFromResponse(undefined)).toBeNull();
            expect(logger.debug).toHaveBeenCalledWith('Cannot extract JSON from empty or non-string response.');
            
            logger.debug.mockClear(); 
            expect(extractJSONFromResponse(123)).toBeNull();
            expect(logger.debug).toHaveBeenCalledWith('Cannot extract JSON from empty or non-string response.');
             
            logger.debug.mockClear(); 
            expect(extractJSONFromResponse({})).toBeNull();
            expect(logger.debug).toHaveBeenCalledWith('Cannot extract JSON from empty or non-string response.');
        });
        
        test('should extract JSON from markdown code blocks (with and without language specifier)', () => {
            const jsonString = JSON.stringify({ key: 'value', nested: { num: 1 } });
            const responseWithJsonBlock = `Some text before.\n\`\`\`json\n${jsonString}\n\`\`\`\nSome text after.`;
            const responseWithGenericBlock = `\`\`\`\n${jsonString}\n\`\`\``;
        
            const expectedJson = { key: 'value', nested: { num: 1 } };
        
            let result = extractJSONFromResponse(responseWithJsonBlock);
            expect(result).toEqual(expectedJson);
            expect(logger.debug).toHaveBeenCalledWith('Extracted potential JSON from markdown code block.');
            expect(logger.debug).toHaveBeenCalledWith('Successfully parsed JSON object from response.');
        
            logger.debug.mockClear(); // Clear for next assertion
        
            result = extractJSONFromResponse(responseWithGenericBlock);
            expect(result).toEqual(expectedJson);
            expect(logger.debug).toHaveBeenCalledWith('Extracted potential JSON from markdown code block.');
            expect(logger.debug).toHaveBeenCalledWith('Successfully parsed JSON object from response.');
        });
        
        test('should extract JSON using first/last brace boundaries if no code block found', () => {
            const jsonString = JSON.stringify({ message: "data", items: [1, 2] });
            const responseText = `Here is the data: ${jsonString}. Please process it.`;
            const expectedJson = { message: "data", items: [1, 2] };
        
            const result = extractJSONFromResponse(responseText);
            expect(result).toEqual(expectedJson);
            expect(logger.debug).toHaveBeenCalledWith('Extracted potential JSON using brace boundaries.');
            expect(logger.debug).toHaveBeenCalledWith('Successfully parsed JSON object from response.');
        });
        
        test('should handle nested braces correctly when using brace boundaries', () => {
            const jsonString = JSON.stringify({ outer: { inner: "value" }, array: [{ id: 1 }] });
            const responseText = `Data payload: ${jsonString}`;
            const expectedJson = { outer: { inner: "value" }, array: [{ id: 1 }] };
        
            const result = extractJSONFromResponse(responseText);
            expect(result).toEqual(expectedJson);
            expect(logger.debug).toHaveBeenCalledWith('Extracted potential JSON using brace boundaries.');
        });
        
        test('should extract only the first valid JSON object based on brace boundaries', () => {
             const jsonString1 = JSON.stringify({ first: true });
             const jsonString2 = JSON.stringify({ second: true });
             const responseText = `Object 1: ${jsonString1}, Object 2: ${jsonString2}`;
             // Current logic grabs from first { to last }, which results in invalid JSON for parsing.
             // Therefore, the expected result is null.
             const expectedJson = null; 
        
             const result = extractJSONFromResponse(responseText);
             expect(result).toEqual(expectedJson);
             // It still identifies brace boundaries, but parsing fails.
             expect(logger.debug).toHaveBeenCalledWith('Extracted potential JSON using brace boundaries.');
             expect(logger.warn).toHaveBeenCalledWith('Failed to parse JSON from response text.', expect.anything());
        });

        test('should parse directly if the string is only valid JSON', () => {
            const jsonString = JSON.stringify({ direct: true });
            const result = extractJSONFromResponse(jsonString);
            expect(result).toEqual({ direct: true });
            // Check it didn't log boundary extraction messages
            expect(logger.debug).not.toHaveBeenCalledWith(expect.stringContaining('markdown code block'));
            expect(logger.debug).not.toHaveBeenCalledWith(expect.stringContaining('brace boundaries'));
            expect(logger.debug).toHaveBeenCalledWith('Successfully parsed JSON object from response.');
        });

        test('should return null and log warning if parsed JSON is not an object', () => {
            const nonObjectJsonString = JSON.stringify("just a string"); // Valid JSON, but not an object
            const responseText = `\`\`\`json\n${nonObjectJsonString}\n\`\`\``;
            
            const result = extractJSONFromResponse(responseText);
            expect(result).toBeNull();
            expect(logger.warn).toHaveBeenCalledWith('Parsed content is not a JSON object.', { parsedType: 'string' });
        });

        test('should return null and log debug if no clear boundaries (code block or braces) are found', () => {
            const responseText = "This string contains no JSON markers.";
            const result = extractJSONFromResponse(responseText);
            expect(result).toBeNull();
            expect(logger.debug).toHaveBeenCalledWith('Could not find clear JSON boundaries (code block or braces), attempting direct parse.');
            // It will then attempt direct parse which fails
            expect(logger.warn).toHaveBeenCalledWith('Failed to parse JSON from response text.', expect.anything());
        });

        // More tests will be added here incrementally

    }); // End describe extractJSONFromResponse

    describe('validateResponse', () => {
        test('should return false and log warning for null or undefined response', () => {
            expect(validateResponse(null)).toBe(false);
            expect(logger.warn).toHaveBeenCalledWith('Validation failed: Response is null or undefined.');
            
            logger.warn.mockClear();
            expect(validateResponse(undefined)).toBe(false);
            expect(logger.warn).toHaveBeenCalledWith('Validation failed: Response is null or undefined.');
        });

        test('should return true for valid non-null input with no options', () => {
            expect(validateResponse('some response text')).toBe(true);
            expect(validateResponse({ key: 'value' })).toBe(true);
            expect(logger.warn).not.toHaveBeenCalled();
            expect(logger.debug).toHaveBeenCalledWith('Response validation passed.');
        });
        
        // Tests for expectJson=true
        test('should return true for valid JSON string when expectJson is true', () => {
            const jsonString = JSON.stringify({ success: true });
            expect(validateResponse(jsonString, { expectJson: true })).toBe(true);
            expect(logger.warn).not.toHaveBeenCalled();
            expect(logger.debug).toHaveBeenCalledWith('Successfully parsed JSON object from response.');
        });
        
         test('should return true for valid JSON object when expectJson is true', () => {
             expect(validateResponse({ success: true }, { expectJson: true })).toBe(true);
             expect(logger.warn).not.toHaveBeenCalled();
             // No parsing needed, straight to success
             expect(logger.debug).toHaveBeenCalledWith('Response validation passed.');
         });
         
        test('should return false for invalid JSON string when expectJson is true', () => {
            const invalidJsonString = '{"key": "value\", invalid}';
            expect(validateResponse(invalidJsonString, { expectJson: true })).toBe(false);
            expect(logger.warn).toHaveBeenCalledWith('Validation failed: Expected JSON but could not parse.');
            expect(logger.warn).toHaveBeenCalledWith('Failed to parse JSON from response text.', expect.anything());
        });
        
        test('should return false for non-string/non-object when expectJson is true', () => {
             expect(validateResponse(123, { expectJson: true })).toBe(false);
             expect(logger.warn).toHaveBeenCalledWith('Validation failed: Expected JSON but received non-string, non-object type.', { type: 'number' });
        });
        
        // Tests for schemaValidator
        test('should call schemaValidator and return true on success', () => {
            const response = { name: 'test', value: 123 };
            const mockValidator = jest.fn().mockReturnValue({ error: null }); // Simulate successful validation
            
            expect(validateResponse(response, { schemaValidator: mockValidator })).toBe(true);
            expect(mockValidator).toHaveBeenCalledWith(response);
            expect(logger.debug).toHaveBeenCalledWith('Schema validation passed.');
            expect(logger.warn).not.toHaveBeenCalled();
        });
        
        test('should call schemaValidator and return false on schema mismatch', () => {
            const response = { name: 'test', wrongValue: 'abc' };
            const mockValidator = jest.fn().mockReturnValue({ error: new Error('Schema mismatch') }); // Simulate failure
            
            expect(validateResponse(response, { schemaValidator: mockValidator })).toBe(false);
            expect(mockValidator).toHaveBeenCalledWith(response);
            expect(logger.warn).toHaveBeenCalledWith('Validation failed: Schema validation error.', { error: 'Schema mismatch' });
        });
        
        test('should call schemaValidator and return false if validator throws error', () => {
             const response = { name: 'test', value: 123 };
             const mockValidator = jest.fn().mockImplementation(() => { 
                 throw new Error('Validator crashed'); 
             });
             
             expect(validateResponse(response, { schemaValidator: mockValidator })).toBe(false);
             expect(mockValidator).toHaveBeenCalledWith(response);
             expect(logger.warn).toHaveBeenCalledWith('Validation failed: Error during schema validation.', { error: 'Validator crashed' });
        });
        
        test('should parse string before validating schema', () => {
             const responseString = JSON.stringify({ schemaKey: 'valid' });
             const mockValidator = jest.fn().mockReturnValue({ error: null }); 
             
             expect(validateResponse(responseString, { schemaValidator: mockValidator })).toBe(true);
             expect(mockValidator).toHaveBeenCalledWith({ schemaKey: 'valid' }); // Called with parsed object
             expect(logger.debug).toHaveBeenCalledWith('Successfully parsed JSON object from response.');
             expect(logger.debug).toHaveBeenCalledWith('Schema validation passed.');
        });
        
        test('should return false if string parsing fails before schema validation', () => {
             const invalidResponseString = '{"invalid_json": true";'
             const mockValidator = jest.fn();
             
             expect(validateResponse(invalidResponseString, { schemaValidator: mockValidator })).toBe(false);
             expect(mockValidator).not.toHaveBeenCalled();
             expect(logger.warn).toHaveBeenCalledWith('Validation failed: Expected JSON but could not parse.');
        });

    }); // End describe validateResponse

    describe('createSystemPrompt', () => {
        test('should return correct system prompt object', () => {
            const content = 'You are a helpful AI assistant.';
            expect(createSystemPrompt(content)).toEqual({ role: 'system', content: content });
        });

        test('should throw error for invalid or empty content', () => {
            expect(() => createSystemPrompt('')).toThrow('System prompt content must be a non-empty string.');
            expect(() => createSystemPrompt(null)).toThrow('System prompt content must be a non-empty string.');
            expect(() => createSystemPrompt(undefined)).toThrow('System prompt content must be a non-empty string.');
            expect(() => createSystemPrompt(123)).toThrow('System prompt content must be a non-empty string.');
        });
    }); // End describe createSystemPrompt

    describe('createUserPrompt', () => {
        test('should return correct user prompt object', () => {
            const content = 'Generate a workout plan.';
            expect(createUserPrompt(content)).toEqual({ role: 'user', content: content });
        });

        test('should throw error for invalid or empty content', () => {
            expect(() => createUserPrompt('')).toThrow('User prompt content must be a non-empty string.');
            expect(() => createUserPrompt(null)).toThrow('User prompt content must be a non-empty string.');
            expect(() => createUserPrompt(undefined)).toThrow('User prompt content must be a non-empty string.');
            expect(() => createUserPrompt({})).toThrow('User prompt content must be a non-empty string.');
        });
    }); // End describe createUserPrompt

    describe('createAssistantPrompt', () => {
        test('should return correct assistant prompt object for string content', () => {
            const content = 'Here is your plan:';
            expect(createAssistantPrompt(content)).toEqual({ role: 'assistant', content: content });
        });

        test('should return correct assistant prompt object for null content', () => {
            expect(createAssistantPrompt(null)).toEqual({ role: 'assistant', content: null });
        });

        test('should throw error for invalid content (non-string/non-null)', () => {
            const expectedError = 'Assistant prompt content must be a non-empty string or null.';
            expect(() => createAssistantPrompt('')).toThrow(expectedError); // Empty string is invalid
            expect(() => createAssistantPrompt(undefined)).toThrow(expectedError);
            expect(() => createAssistantPrompt(123)).toThrow(expectedError);
            expect(() => createAssistantPrompt({})).toThrow(expectedError);
        });
    }); // End describe createAssistantPrompt

}); 