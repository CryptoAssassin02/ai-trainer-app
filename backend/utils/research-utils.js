const Ajv = require('ajv');
const logger = require('../config/logger'); // Assuming logger is configured

const ajv = new Ajv({ allErrors: true, strict: false }); // Configure Ajv

/**
 * Validates parsed data against a schema using Ajv.
 * @param {Object} data - The parsed data to validate.
 * @param {Object} schema - The schema object containing the validation rules.
 * @param {string} schemaName - The name of the schema for logging purposes.
 * @returns {boolean} True if the data is valid, false otherwise.
 * @returns {{isValid: boolean, errors: object[]|null}} An object indicating validity and Ajv errors if invalid.
 */
function validateAgainstSchema(data, schema, schemaName) {
  if (!schema || typeof schema !== 'object') {
    logger.error(`[validateAgainstSchema] Invalid schema provided for ${schemaName}.`);
    return { isValid: false, errors: [{ message: `Invalid schema provided for validation.` }] };
  }
  if (Array.isArray(data) && data.length === 0) {
    return { isValid: true, errors: null };
  }
  try {
    const validate = ajv.compile(schema);
    const valid = validate(data);
    if (!valid) {
      const errorMessages = validate.errors.map(err => {
        const path = err.instancePath || 'path?';
        return `${path} - ${err.message}`;
      }).join('; ');
      logger.warn(`[validateAgainstSchema] Schema validation failed for ${schemaName}: ${errorMessages} Data: ${JSON.stringify(data).substring(0, 100)}...`);
      return { isValid: false, errors: validate.errors };
    }
    return { isValid: true, errors: null };
  } catch (error) {
    logger.error(`[validateAgainstSchema] Error compiling schema ${schemaName}: ${error.message}`);
    return { isValid: false, errors: [{ message: `Schema compilation error: ${error.message}` }] };
  }
}


/**
 * Extracts structured data safely from a potentially stringified JSON response.
 * @param {string} contentString - The JSON string content to parse.
 * @returns {Object|null} Parsed JSON object or null if parsing fails.
 */
function safeParseResponse(contentString) {
  if (!contentString || typeof contentString !== 'string') {
    logger.warn('[safeParseResponse] Invalid or non-string content provided for parsing.');
    return null;
  }
  try {
    // Attempt to handle cases where the content might be double-encoded
    let contentToParse = contentString;
    try {
        const firstPass = JSON.parse(contentToParse);
        if (typeof firstPass === 'string') {
            // If parsing results in a string, try parsing that string
            contentToParse = firstPass;
        }
    } catch (e) {
        // Ignore error if first pass fails, proceed with original content
    }

    return JSON.parse(contentToParse);
  } catch (error) {
    logger.warn(`[safeParseResponse] Failed to parse JSON string`);
    logger.error(`[safeParseResponse] Failed to parse JSON string: ${error.message}. Content snippet: ${contentString.substring(0, 100)}...`);
    return null;
  }
}

/**
 * Extracts exercise data from PARSED API response based on the provided schema.
 * @param {Object|Array} parsedData - The already parsed data (object or array) from the API.
 * @param {Object} schema - The schema defining expected exercise fields.
 * @param {Function} [validator=validateAgainstSchema] - The validation function to use.
 * @returns {Object|Array|{error: string}} Parsed and validated exercise data, or an error object if schema validation fails.
 */
function extractExerciseData(parsedData, schema, validator = validateAgainstSchema) {
  // Use the provided validator or the default one from the module
  const localValidate = validator;

  if (!parsedData) {
    logger.warn('[extractExerciseData] Received null or undefined parsed data.');
    return { error: 'Invalid input data for extraction.' };
  }

  // Pass ajv instance if needed, or assume it's handled within validator
  // Assuming validator returns { isValid, errors } structure
  const { isValid, errors } = localValidate(parsedData, schema, 'exerciseSchema');
  if (!isValid) {
      // Need access to ajv instance or its errorsText method. Let's refine the validator interface.
      // For now, let's assume the validator function itself provides formatted errors if needed.
      // Simplified error message generation for now.
      const errorMsg = `Schema validation failed for exerciseSchema: ${errors ? JSON.stringify(errors) : 'Unknown validation error'}`;
      logger.warn(`[extractExerciseData] ${errorMsg}`);
      return { error: errorMsg };
  }

  // Return the successfully parsed and validated data
  return parsedData;
}

/**
 * Extracts technique data from an API response based on the provided schema.
 * @param {Object} rawResponse - The raw API response object.
 * @param {Object} schema - The schema defining expected technique fields.
 * @returns {Object|null|{error: string}} Parsed and validated technique data, null if parsing fails, or an error object if schema validation fails.
 */
function extractTechniqueData(rawResponse, schema) {
  const localSafeParse = safeParseResponse;
  const localValidate = validateAgainstSchema;

  const parsedData = localSafeParse(rawResponse?.content);
  if (!parsedData) {
    return null; // Parsing failed
  }

  const { isValid, errors } = localValidate(parsedData, schema, 'techniqueSchema');
  if (!isValid) {
      // Generate a simplified error message from the errors array
      const errorDetails = errors ? errors.map(e => `${e.instancePath || 'path?'}: ${e.message}`).join('; ') : 'Unknown validation error';
      const errorMsg = `Schema validation failed for techniqueSchema: ${errorDetails}`;
      logger.warn(`[extractTechniqueData] ${errorMsg}`);
      return { error: errorMsg };
  }

  return parsedData;
}

/**
 * Extracts progression data from an API response based on the provided schema.
 * @param {Object} rawResponse - The raw API response object.
 * @param {Object} schema - The schema defining expected progression fields.
 * @returns {Object|null|{error: string}} Parsed and validated progression data, null if parsing fails, or an error object if schema validation fails.
 */
function extractProgressionData(rawResponse, schema) {
  const localSafeParse = safeParseResponse;
  const localValidate = validateAgainstSchema;

  const parsedData = localSafeParse(rawResponse?.content);
  if (!parsedData) {
    return null; // Parsing failed
  }

 const { isValid, errors } = localValidate(parsedData, schema, 'progressionSchema');
  if (!isValid) {
      // Generate a simplified error message
      const errorDetails = errors ? errors.map(e => `${e.instancePath || 'path?'}: ${e.message}`).join('; ') : 'Unknown validation error';
      const errorMsg = `Schema validation failed for progressionSchema: ${errorDetails}`;
      logger.warn(`[extractProgressionData] ${errorMsg}`);
      return { error: errorMsg };
  }

  return parsedData;
}

/**
 * Validates schema alignment by attempting to parse example data.
 * @param {Object} schema - The schema object containing an 'example' field.
 * @param {Function} extractor - The extractor function to test.
 * @returns {boolean} True if the example data can be extracted successfully, false otherwise.
 */
function validateSchemaAlignment(schema, extractor) {
  logger.log(`[validateSchemaAlignment] Validating schema: ${schema?.title || '(no title)'} against extractor: ${extractor.name}`);
  if (!schema || !schema.example) {
    logger.warn('[validateSchemaAlignment] Schema or schema.example is missing.');
    return false;
  }
  try {
    // Wrap the example in a mock response structure if needed by the extractor
    const sampleResponse = { content: JSON.stringify(schema.example) };
    const result = extractor(sampleResponse, schema);
    logger.log(`[validateSchemaAlignment] Extractor result: ${JSON.stringify(result)}`);

    // Check if the extractor returned null (indicating validation/parsing failure)
    if (result === null) {
        logger.warn(`[validateSchemaAlignment] Schema example failed validation/parsing for schema.`);
        return false;
    }

    // Optional: Check if required fields specified in the schema are present
    let missing = [];
    // Handle array vs object schemas for required check
    const dataToCheck = Array.isArray(result) ? result[0] : result; // Check first item if array

    if (schema.type === 'array' && schema.items && schema.items.required && Array.isArray(schema.items.required)) {
        if (!dataToCheck || typeof dataToCheck !== 'object') {
             logger.warn(`[validateSchemaAlignment] Schema misalignment: Result item is not an object for required check.`);
             return false;
        }
        missing = schema.items.required.filter(field => !(field in dataToCheck));
    } else if (schema.type === 'object' && schema.required && Array.isArray(schema.required)) {
        if (!dataToCheck || typeof dataToCheck !== 'object') {
             logger.warn(`[validateSchemaAlignment] Schema misalignment: Result is not an object for required check.`);
             return false;
        }
        missing = schema.required.filter(field => !(field in dataToCheck));
    }

    if (missing.length > 0) {
      logger.warn(`[validateSchemaAlignment] Schema misalignment: Extracted result missing required fields: ${missing.join(', ')}`);
      return false;
    }

    logger.log(`[validateSchemaAlignment] Validation passed for schema: ${schema?.title || '(no title)'}`);
    return true;
  } catch (error) {
    logger.error(`[validateSchemaAlignment] Error during schema alignment validation: ${error.message}`);
    return false;
  }
}

// Add a helper function to generate standard warning message format for contraindications
function generateContraindicationWarning(filteredExercises) {
  if (!filteredExercises || filteredExercises.length === 0) {
    return null;
  }
  
  const exerciseNames = filteredExercises.map(ex => ex.name || 'Unknown Exercise').join(', ');
  const count = filteredExercises.length;
  const exampleName = filteredExercises[0].name || 'Unknown Exercise';
  
  return `Filtered out ${count} exercises due to potential contraindications (e.g., ${exampleName}).`;
}

module.exports = {
  safeParseResponse,
  validateAgainstSchema,
  extractExerciseData,
  extractTechniqueData,
  extractProgressionData,
  validateSchemaAlignment,
  generateContraindicationWarning
}; 