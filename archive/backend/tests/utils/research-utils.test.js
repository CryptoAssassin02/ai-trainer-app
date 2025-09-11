const Ajv = require('ajv');
const researchUtils = require('../../utils/research-utils');
const {
  validateAgainstSchema,
  safeParseResponse,
  extractExerciseData,
  extractTechniqueData,
  extractProgressionData,
  validateSchemaAlignment,
  generateContraindicationWarning
} = researchUtils;

// Mock the logger module
jest.mock('../../config/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
}));

const logger = require('../../config/logger');

// Mock Ajv
jest.mock('ajv', () => {
  const mockCompile = jest.fn();
  const mockAjv = jest.fn(() => ({
    compile: mockCompile
  }));
  
  // Add errorsText method to mock Ajv
  mockAjv.errorsText = jest.fn().mockImplementation((errors) => {
    if (!errors || !Array.isArray(errors)) return 'No errors';
    return errors.map(e => `${e.instancePath || 'path?'}: ${e.message}`).join('; ');
  });
  
  return mockAjv;
});

describe('Research Utils', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    // No need to restore spies if not using them
  });

  describe('validateAgainstSchema', () => {
    // First, let's prepare some common test variables
    const validSchema = { type: 'object', properties: { name: { type: 'string' } } };
    const validData = { name: 'Test Exercise' };
    const schemaName = 'testSchema';

    test('should return error object for invalid schema input', () => {
      // Test with null schema
      let result = validateAgainstSchema(validData, null, schemaName);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toBe('Invalid schema provided for validation.');
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Invalid schema provided for testSchema')
      );

      // Test with non-object schema
      logger.error.mockClear();
      result = validateAgainstSchema(validData, 'not an object', schemaName);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toBe('Invalid schema provided for validation.');
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Invalid schema provided for testSchema')
      );
    });

    test('should return valid result for empty array data', () => {
      const result = validateAgainstSchema([], validSchema, schemaName);
      expect(result.isValid).toBe(true);
      expect(result.errors).toBeNull();
      // No logging expected in this case
      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
    });

    test('should return valid result for valid data', () => {
      // Setup mock implementation to simulate successful validation
      const mockValidate = jest.fn().mockReturnValue(true);
      Ajv().compile.mockReturnValue(mockValidate);

      const result = validateAgainstSchema(validData, validSchema, schemaName);
      
      // Check compile was called with schema
      expect(Ajv().compile).toHaveBeenCalledWith(validSchema);
      // Check validate was called with data
      expect(mockValidate).toHaveBeenCalledWith(validData);
      
      // Check the returned result
      expect(result.isValid).toBe(true);
      expect(result.errors).toBeNull();
      
      // No logging should occur on success
      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
    });

    test('should return invalid result with errors for failed validation', () => {
      // Setup mock to simulate validation failure
      const mockErrors = [
        { instancePath: '/name', message: 'should be string' },
        { instancePath: '/age', message: 'is required' }
      ];
      const mockValidate = jest.fn().mockImplementation(() => {
        mockValidate.errors = mockErrors;
        return false;
      });
      
      Ajv().compile.mockReturnValue(mockValidate);

      const result = validateAgainstSchema(validData, validSchema, schemaName);
      
      // Check returned result
      expect(result.isValid).toBe(false);
      expect(result.errors).toBe(mockErrors);
      
      // Check logging occurred with error details
      expect(logger.warn).toHaveBeenCalledWith(
        `[validateAgainstSchema] Schema validation failed for testSchema: /name - should be string; /age - is required Data: ${JSON.stringify(validData).substring(0, 100)}...`
      );
    });

    test('should return error object for schema compilation error', () => {
      // Setup mock to throw during compile
      const compileError = new Error('Schema compilation error');
      Ajv().compile.mockImplementation(() => {
        throw compileError;
      });

      const result = validateAgainstSchema(validData, validSchema, schemaName);
      
      // Check returned result
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toBe('Schema compilation error: Schema compilation error');
      
      // Check error was logged
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error compiling schema testSchema: Schema compilation error')
      );
    });
  });

  describe('safeParseResponse', () => {
    test('should return null and log warning for invalid inputs', () => {
      // Test with null
      let result = safeParseResponse(null);
      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid or non-string content provided for parsing')
      );

      // Test with undefined
      logger.warn.mockClear();
      result = safeParseResponse(undefined);
      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid or non-string content provided for parsing')
      );

      // Test with number
      logger.warn.mockClear();
      result = safeParseResponse(123);
      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid or non-string content provided for parsing')
      );

      // Test with object
      logger.warn.mockClear();
      result = safeParseResponse({});
      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid or non-string content provided for parsing')
      );
    });

    test('should successfully parse valid JSON string', () => {
      const jsonObject = { name: 'Test Exercise', sets: 3, reps: 10 };
      const jsonString = JSON.stringify(jsonObject);
      
      const result = safeParseResponse(jsonString);
      
      expect(result).toEqual(jsonObject);
      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });

    test('should handle double-encoded JSON string', () => {
      const jsonObject = { name: 'Test Exercise', nested: { key: 'value' } };
      const jsonString = JSON.stringify(jsonObject);
      // Double encode the string
      const doubleEncodedString = JSON.stringify(jsonString);
      
      const result = safeParseResponse(doubleEncodedString);
      
      expect(result).toEqual(jsonObject);
      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });

    test('should return null and log error for invalid JSON', () => {
      const invalidJson = '{ "name": "Test Exercise", missing: quotes }';
      
      const result = safeParseResponse(invalidJson);
      
      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse JSON string')
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringMatching(/\[safeParseResponse\] Failed to parse JSON string: .+ Content snippet: .+/),
      );
    });
  });

  describe('extractExerciseData', () => {
    const mockSchema = { type: 'object', properties: { name: { type: 'string' } } };
    const validParsedData = { name: 'Valid Exercise' };
    let mockValidator;

    beforeEach(() => {
      // Create a fresh mock for each test
      mockValidator = jest.fn();
    });

    test('should return error object and log warning for null or undefined input', () => {
      // Test with null
      let result = extractExerciseData(null, mockSchema, mockValidator);
      expect(result).toEqual({ error: 'Invalid input data for extraction.' });
      expect(logger.warn).toHaveBeenCalledWith(
        '[extractExerciseData] Received null or undefined parsed data.'
      );
      expect(mockValidator).not.toHaveBeenCalled(); // Validator should not be called

      // Test with undefined
      logger.warn.mockClear();
      result = extractExerciseData(undefined, mockSchema, mockValidator);
      expect(result).toEqual({ error: 'Invalid input data for extraction.' });
      expect(logger.warn).toHaveBeenCalledWith(
        '[extractExerciseData] Received null or undefined parsed data.'
      );
      expect(mockValidator).not.toHaveBeenCalled();
    });

    test('should return error object and log warning if validator returns invalid', () => {
      const validationErrors = [{ field: 'name', message: 'is required' }];
      // Configure mock validator to return failure
      mockValidator.mockReturnValue({ isValid: false, errors: validationErrors });

      const result = extractExerciseData(validParsedData, mockSchema, mockValidator);

      // Check that validator was called correctly
      expect(mockValidator).toHaveBeenCalledWith(validParsedData, mockSchema, 'exerciseSchema');
      
      // Check the returned error object
      const expectedErrorMsg = `Schema validation failed for exerciseSchema: ${JSON.stringify(validationErrors)}`;
      expect(result).toEqual({ error: expectedErrorMsg });
      
      // Check logger was called with the error message
      expect(logger.warn).toHaveBeenCalledWith(`[extractExerciseData] ${expectedErrorMsg}`);
    });

    test('should return original data if validator returns valid', () => {
      // Configure mock validator to return success
      mockValidator.mockReturnValue({ isValid: true, errors: null });

      const result = extractExerciseData(validParsedData, mockSchema, mockValidator);

      // Check that validator was called correctly
      expect(mockValidator).toHaveBeenCalledWith(validParsedData, mockSchema, 'exerciseSchema');
      
      // Check that the original data is returned
      expect(result).toEqual(validParsedData);
      
      // No warning/error logging should occur
      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });
  });

  describe('extractTechniqueData', () => {
    const mockRawResponseValid = { content: '{"technique": "Valid Technique"}' };
    const mockRawResponseInvalidJson = { content: '{"technique": "Invalid}' };
    const mockRawResponseInvalidSchema = { content: '{"wrong_field": "data"}' };
    const mockSchema = { type: 'object', required: ['technique'], properties: { technique: { type: 'string' } } };
    const expectedParsedData = { technique: 'Valid Technique' };

    test('should return null if parsing fails', () => {
      const result = extractTechniqueData(mockRawResponseInvalidJson, mockSchema);
      expect(result).toBeNull();
      // Check logs from safeParseResponse
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Failed to parse JSON string'));
      expect(logger.error).toHaveBeenCalledWith(expect.stringMatching(/Failed to parse JSON string:.+Content snippet:.+/));
    });

    test('should return error object if schema validation fails', () => {
      // Setup Ajv mock for validation failure
      const mockErrors = [{ instancePath: '', message: "should have required property 'technique'" }];
      const mockValidate = jest.fn().mockImplementation(() => {
        mockValidate.errors = mockErrors;
        return false;
      });
      Ajv().compile.mockReturnValue(mockValidate);

      const result = extractTechniqueData(mockRawResponseInvalidSchema, mockSchema);

      expect(Ajv().compile).toHaveBeenCalledWith(mockSchema);
      expect(mockValidate).toHaveBeenCalledWith({ wrong_field: "data" }); // Called with parsed data
      
      const expectedErrorMsg = `Schema validation failed for techniqueSchema: : should have required property \'technique\'`;
      // Let's use the actual error generation logic for robustness
      const generatedErrorMsg = `Schema validation failed for techniqueSchema: ${mockErrors.map(e => `${e.instancePath || 'path?'}: ${e.message}`).join('; ')}`;
      expect(result).toEqual({ error: generatedErrorMsg }); 
      expect(logger.warn).toHaveBeenCalledWith(`[extractTechniqueData] ${generatedErrorMsg}`);
    });

    test('should return parsed data if parsing and validation succeed', () => {
       // Setup Ajv mock for validation success
      const mockValidate = jest.fn().mockReturnValue(true);
      Ajv().compile.mockReturnValue(mockValidate);

      const result = extractTechniqueData(mockRawResponseValid, mockSchema);

      expect(Ajv().compile).toHaveBeenCalledWith(mockSchema);
      expect(mockValidate).toHaveBeenCalledWith(expectedParsedData);
      expect(result).toEqual(expectedParsedData);
      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });
  });

  describe('extractProgressionData', () => {
    const mockRawResponseValid = { content: '{"progression": "Next step"}' };
    const mockRawResponseInvalidJson = { content: '{"progression": "Invalid}' };
    const mockRawResponseInvalidSchema = { content: '{"wrong_field": "data"}' };
    const mockSchema = { type: 'object', required: ['progression'], properties: { progression: { type: 'string' } } };
    const expectedParsedData = { progression: 'Next step' };

    test('should return null if parsing fails', () => {
      const result = extractProgressionData(mockRawResponseInvalidJson, mockSchema);
      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Failed to parse JSON string'));
      expect(logger.error).toHaveBeenCalledWith(expect.stringMatching(/Failed to parse JSON string:.+Content snippet:.+/));
    });

    test('should return error object if schema validation fails', () => {
      // Setup Ajv mock for validation failure
      const mockErrors = [{ instancePath: '', message: "should have required property 'progression'" }];
      const mockValidate = jest.fn().mockImplementation(() => {
        mockValidate.errors = mockErrors;
        return false;
      });
      Ajv().compile.mockReturnValue(mockValidate);

      const result = extractProgressionData(mockRawResponseInvalidSchema, mockSchema);

      expect(Ajv().compile).toHaveBeenCalledWith(mockSchema);
      expect(mockValidate).toHaveBeenCalledWith({ wrong_field: "data" }); // Called with parsed data
      
      // Use the actual error generation logic for robustness
      const generatedErrorMsg = `Schema validation failed for progressionSchema: ${mockErrors.map(e => `${e.instancePath || 'path?'}: ${e.message}`).join('; ')}`;
      expect(result).toEqual({ error: generatedErrorMsg }); 
      expect(logger.warn).toHaveBeenCalledWith(`[extractProgressionData] ${generatedErrorMsg}`);
    });

    test('should return parsed data if parsing and validation succeed', () => {
       // Setup Ajv mock for validation success
      const mockValidate = jest.fn().mockReturnValue(true);
      Ajv().compile.mockReturnValue(mockValidate);

      const result = extractProgressionData(mockRawResponseValid, mockSchema);

      expect(Ajv().compile).toHaveBeenCalledWith(mockSchema);
      expect(mockValidate).toHaveBeenCalledWith(expectedParsedData);
      expect(result).toEqual(expectedParsedData);
      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });
  });

  describe('validateSchemaAlignment', () => {
    let mockSchema;
    let mockExtractor;

    beforeEach(() => {
      // Reset mocks and schema/extractor for each test
      mockExtractor = jest.fn();
      // Base schema structure, modify as needed in tests
      mockSchema = {
        title: 'TestSchema',
        type: 'object',
        required: ['id', 'name'],
        properties: {
          id: { type: 'number' },
          name: { type: 'string' }
        },
        example: { id: 1, name: 'Example Data' } // Valid example by default
      };
    });

    test('should return false and log warning if schema or schema.example is missing', () => {
      // Test missing schema
      let result = validateSchemaAlignment(null, mockExtractor);
      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith('[validateSchemaAlignment] Schema or schema.example is missing.');

      // Test schema missing example
      logger.warn.mockClear();
      delete mockSchema.example;
      result = validateSchemaAlignment(mockSchema, mockExtractor);
      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith('[validateSchemaAlignment] Schema or schema.example is missing.');
    });

    test('should return false and log error if extractor throws an error', () => {
      const extractorError = new Error('Extractor failed!');
      mockExtractor.mockImplementation(() => {
        throw extractorError;
      });

      const result = validateSchemaAlignment(mockSchema, mockExtractor);
      
      expect(result).toBe(false);
      expect(mockExtractor).toHaveBeenCalledWith({ content: JSON.stringify(mockSchema.example) }, mockSchema);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error during schema alignment validation: Extractor failed!')
      );
    });

    test('should return false and log warning if extractor returns null', () => {
      mockExtractor.mockReturnValue(null);

      const result = validateSchemaAlignment(mockSchema, mockExtractor);
      
      expect(result).toBe(false);
      expect(mockExtractor).toHaveBeenCalledWith({ content: JSON.stringify(mockSchema.example) }, mockSchema);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Schema example failed validation/parsing for schema.')
      );
    });

    test('should return false and log warning if extracted data (object) misses required fields', () => {
      const extractedData = { id: 1 }; // Missing 'name'
      mockExtractor.mockReturnValue(extractedData);

      const result = validateSchemaAlignment(mockSchema, mockExtractor);
      
      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Schema misalignment: Extracted result missing required fields: name')
      );
    });

    test('should return false and log warning if extracted data (array item) misses required fields', () => {
      mockSchema.type = 'array';
      mockSchema.items = {
        type: 'object',
        required: ['value'],
        properties: { value: { type: 'number' } }
      };
      mockSchema.example = [{ other: 'field' }]; // Example item missing 'value'

      const extractedData = [{ other: 'field' }];
      mockExtractor.mockReturnValue(extractedData);

      const result = validateSchemaAlignment(mockSchema, mockExtractor);
      
      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Schema misalignment: Extracted result missing required fields: value')
      );
    });

    test('should return false and log warning if extracted data type mismatches for required check (object)', () => {
      mockSchema.required = ['config'];
      mockSchema.properties = { config: { type: 'object' } }; 
      mockSchema.example = { config: 'not an object' };

      const extractedData = 'not an object'; // Extractor returns a string instead of object
      mockExtractor.mockReturnValue(extractedData);

      const result = validateSchemaAlignment(mockSchema, mockExtractor);

      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
          expect.stringContaining('Schema misalignment: Result is not an object for required check.')
      );
    });

     test('should return false and log warning if extracted data type mismatches for required check (array)', () => {
      mockSchema.type = 'array';
      mockSchema.items = { type: 'object', required: ['id'] };
      mockSchema.example = ["not an object"]; // Example item is a string
      
      const extractedData = ["not an object"];
      mockExtractor.mockReturnValue(extractedData);

      const result = validateSchemaAlignment(mockSchema, mockExtractor);

      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Schema misalignment: Result item is not an object for required check.')
      );
    });

    test('should return true and log success if example data passes checks', () => {
      // Use the default valid schema and example
      const extractedData = { id: 1, name: 'Example Data' };
      mockExtractor.mockReturnValue(extractedData);

      const result = validateSchemaAlignment(mockSchema, mockExtractor);
      
      expect(result).toBe(true);
      expect(mockExtractor).toHaveBeenCalledWith({ content: JSON.stringify(mockSchema.example) }, mockSchema);
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('Validation passed for schema: TestSchema')
      );
      // Ensure no warnings or errors were logged
      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });
  });

  describe('generateContraindicationWarning', () => {
    test('should return null for null, undefined, or empty array input', () => {
      expect(generateContraindicationWarning(null)).toBeNull();
      expect(generateContraindicationWarning(undefined)).toBeNull();
      expect(generateContraindicationWarning([])).toBeNull();
    });

    test('should return correctly formatted warning string for valid input array', () => {
      const exercises = [
        { name: 'Exercise A' },
        { name: 'Exercise B' },
        { name: 'Exercise C' }
      ];
      const expectedString = `Filtered out 3 exercises due to potential contraindications (e.g., Exercise A).`;
      expect(generateContraindicationWarning(exercises)).toBe(expectedString);
    });

    test('should handle exercises missing the name property', () => {
      const exercises = [
        { name: 'Exercise A' },
        { description: 'Exercise without name' }, // Missing name
        { name: 'Exercise C' }
      ];
      // The implementation uses the first exercise name for the example
      const expectedString = `Filtered out 3 exercises due to potential contraindications (e.g., Exercise A).`; 
      // Note: The internal join will use 'Unknown Exercise' for the missing one, but the example shown uses the first exercise name.
      expect(generateContraindicationWarning(exercises)).toBe(expectedString);
    });

    test('should handle single exercise input', () => {
      const exercises = [
        { name: 'Single Exercise' }
      ];
      const expectedString = `Filtered out 1 exercises due to potential contraindications (e.g., Single Exercise).`;
      expect(generateContraindicationWarning(exercises)).toBe(expectedString);
    });
  });

});