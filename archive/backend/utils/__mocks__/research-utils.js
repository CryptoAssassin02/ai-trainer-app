// backend/utils/__mocks__/research-utils.js

// Manual mock for the research-utils module

// Import the real functions to potentially delegate to them
const { validateAgainstSchema: actualValidateAgainstSchema } = jest.requireActual('../research-utils');

// Flag to control real validation
let useRealValidation = false;

const researchUtils = {
    // Return null by default or specific mock data if needed per test
    extractExerciseData: jest.fn(() => null),
    extractTechniqueData: jest.fn(() => null),
    extractProgressionData: jest.fn(() => null),
    validateAgainstSchema: jest.fn((data, schema, schemaName) => {
        console.log(`[MOCK DEBUG] validateAgainstSchema called. Schema title: ${schemaName || schema?.title}, Schema keys: ${schema ? Object.keys(schema) : 'N/A'}`);
        if (useRealValidation) {
             console.log(`[MOCK DEBUG] Using REAL validateAgainstSchema implementation.`);
             return actualValidateAgainstSchema(data, schema, schemaName);
        }
        // Default mock behavior (always valid)
        console.log(`[MOCK DEBUG] Using MOCK validateAgainstSchema implementation (always valid).`);
        return { isValid: true, errors: [] };
    }),
    safeParseResponse: jest.fn((response) => {
        console.log('[MOCK DEBUG] safeParseResponse called'); // DEBUG LOG
        try {
            // Basic mock implementation - real one might be more complex
            if (typeof response?.content !== 'string') return null;
            return JSON.parse(response.content);
        } catch (e) {
            return null;
        }
    }),
    validateSchemaAlignment: jest.fn(() => true), // Default aligns

    // Helper function for tests to control validation behavior
    __setUseRealValidation: (shouldUseReal) => {
        useRealValidation = shouldUseReal;
        console.log(`[MOCK CONTROL] useRealValidation set to: ${useRealValidation}`);
    }
};

module.exports = researchUtils;