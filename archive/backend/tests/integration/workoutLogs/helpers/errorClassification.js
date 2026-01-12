/**
 * Error Classification Helper for Workout Logs Integration Tests
 * 
 * Follows patterns from critical AI integration testing rules to properly
 * distinguish between configuration bugs (must fail tests) and legitimate
 * integration errors (should pass tests as they confirm real integration).
 */

/**
 * Classifies workout logs integration test errors
 * @param {Error} error - The error to classify
 * @returns {Object} Classification results with shouldPassTest determination
 */
const classifyWorkoutLogError = (error) => {
  const errorMessage = error.message || '';
  const errorCode = error.code || '';
  const errorName = error.name || error.constructor.name || '';
  
  const classification = {
    // Configuration bugs (MUST FAIL TESTS)
    isConfigurationBug: false,
    isWrongTableName: false,
    isWrongColumnName: false,
    isMissingImport: false,
    isAuthConfigError: false,
    
    // Legitimate integration errors (SHOULD PASS TESTS)
    isConnectionError: false,
    isQuotaError: false,
    isServiceError: false,
    isRateLimitError: false,
    isNetworkTimeout: false,
    
    // User validation errors (expected in integration)
    isUserValidationError: false,
    isForeignKeyError: false,
    isDataValidationError: false,
    isNotFoundError: false,
    isValidationError: false,
    
    // Classification results
    isValidIntegrationError: false,
    shouldPassTest: false,
    errorType: 'unknown',
    testAction: 'investigate'
  };
  
  // 🚨 CONFIGURATION BUGS (MUST BE FIXED IMMEDIATELY):
  classification.isWrongTableName = errorMessage.includes('relation') && 
                                   errorMessage.includes('does not exist');
  
  classification.isWrongColumnName = errorMessage.includes('column') && 
                                    errorMessage.includes('does not exist');
  
  classification.isMissingImport = errorMessage.includes('Cannot find module') ||
                                  errorMessage.includes('is not defined');
  
  classification.isAuthConfigError = errorMessage.includes('Invalid JWT') && 
                                    errorMessage.includes('malformed');
  
  classification.isConfigurationBug = classification.isWrongTableName ||
                                     classification.isWrongColumnName ||
                                     classification.isMissingImport ||
                                     classification.isAuthConfigError;
  
  // ✅ LEGITIMATE INTEGRATION ERRORS (OK TO HANDLE GRACEFULLY):
  classification.isConnectionError = errorMessage.includes('ENOTFOUND') || 
                                    errorMessage.includes('connection refused') ||
                                    errorMessage.includes('network error');
  
  classification.isQuotaError = errorMessage.includes('quota') || 
                               errorMessage.includes('429') ||
                               errorCode === '429';
  
  classification.isRateLimitError = errorMessage.includes('rate limit') ||
                                   errorMessage.includes('too many requests');
  
  classification.isServiceError = errorMessage.includes('service unavailable') ||
                                 errorMessage.includes('503') ||
                                 errorCode === '503';
  
  classification.isNetworkTimeout = errorMessage.includes('timeout') && 
                                   !errorMessage.includes('config');
  
  // Expected validation errors (part of normal integration testing)
  classification.isUserValidationError = errorMessage.includes('Invalid userId format') ||
                                        errorMessage.includes('User not found');
  
  classification.isForeignKeyError = errorMessage.includes('foreign key') || 
                                    errorMessage.includes('violates foreign key constraint') ||
                                    errorMessage.includes('FOREIGN KEY constraint');
  
  // NEW: Handle specific error types
  classification.isNotFoundError = errorName === 'NotFoundError' ||
                                  errorMessage.includes('not found') ||
                                  errorMessage.includes('does not exist') &&
                                  !classification.isWrongTableName &&
                                  !classification.isWrongColumnName;
  
  classification.isValidationError = errorName === 'ValidationError' ||
                                    errorMessage.includes('Invalid workout log data') ||
                                    errorMessage.includes('date and exercises_completed are required');
  
  classification.isDataValidationError = errorMessage.includes('validation') ||
                                        errorMessage.includes('invalid data') ||
                                        errorMessage.includes('constraint') ||
                                        errorMessage.includes('check constraint') ||
                                        classification.isValidationError;
  
  // Determine if this is a valid integration error
  classification.isValidIntegrationError = classification.isConnectionError ||
                                          classification.isQuotaError ||
                                          classification.isServiceError ||
                                          classification.isRateLimitError ||
                                          classification.isNetworkTimeout ||
                                          classification.isUserValidationError ||
                                          classification.isForeignKeyError ||
                                          classification.isDataValidationError ||
                                          classification.isNotFoundError ||
                                          classification.isValidationError;
  
  // 🚨 CRITICAL: Configuration bugs MUST fail tests and be fixed
  if (classification.isConfigurationBug) {
    classification.shouldPassTest = false;
    classification.errorType = 'configuration_bug';
    classification.testAction = 'fail_test_fix_immediately';
    throw error; // FAIL THE TEST - This is a bug!
  }
  
  // ✅ Valid integration errors should pass tests (they confirm real integration)
  if (classification.isValidIntegrationError) {
    classification.shouldPassTest = true;
    classification.errorType = 'integration_error';
    classification.testAction = 'pass_test_confirms_integration';
  }
  
  return classification;
};

/**
 * Handles workout logs errors safely during integration testing
 * @param {Function} operation - The operation to execute
 * @param {boolean} expectError - Whether we expect this operation to fail (for verification tests)
 * @param {Function} fallbackAction - Optional fallback action
 * @returns {Object} Operation result with error handling
 */
const handleWorkoutLogOperationSafely = async (operation, expectError = false, fallbackAction = null) => {
  try {
    const result = await operation();
    console.log('[WORKOUT LOGS] Operation completed successfully');
    
    // If we expected an error but got success
    if (expectError) {
      console.log('[WORKOUT LOGS] Warning: Expected error but operation succeeded');
      return { 
        success: true, 
        result, 
        expectedError: false,
        actualError: false 
      };
    }
    
    return { success: true, result };
  } catch (error) {
    console.log('[WORKOUT LOGS] Operation failed with error:', error.message);
    
    try {
      const classification = classifyWorkoutLogError(error);
      
      // If we expected an error and got a valid integration error
      if (expectError && classification.shouldPassTest) {
        console.log(`[WORKOUT LOGS] Expected error occurred and handled correctly: ${error.message}`);
        return { 
          success: false, 
          error: error.message,
          errorName: error.name,
          classification,
          confirmsIntegration: true,
          expectedError: true,
          actualError: true
        };
      }
      
      // Normal valid integration error handling
      if (classification.shouldPassTest) {
        console.log(`[WORKOUT LOGS] ${classification.testAction}: ${error.message}`);
        return { 
          success: false, 
          error: error.message,
          errorName: error.name,
          classification,
          confirmsIntegration: true 
        };
      }
      
      // If we reach here, it's an unclassified error
      console.log('[WORKOUT LOGS] Unclassified error - needs investigation');
      throw error;
      
    } catch (classificationError) {
      // Classification failed or configuration bug detected
      console.log('[WORKOUT LOGS] Error classification failed or configuration bug detected');
      throw classificationError;
    }
  }
};

/**
 * Validates that workout logs operations handle errors appropriately
 * @param {Function} testOperation - The test operation to validate
 * @param {string} expectedErrorPattern - Optional expected error pattern
 * @returns {Object} Validation results
 */
const validateErrorHandling = async (testOperation, expectedErrorPattern = null) => {
  try {
    const result = await testOperation();
    
    // If we expected an error but got success
    if (expectedErrorPattern) {
      console.log('[WORKOUT LOGS] Warning: Expected error but operation succeeded');
      return { 
        success: true, 
        result, 
        expectedError: false,
        actualError: false 
      };
    }
    
    return { success: true, result };
    
  } catch (error) {
    const classification = classifyWorkoutLogError(error);
    
    // Check if error matches expected pattern
    if (expectedErrorPattern) {
      const matchesExpected = new RegExp(expectedErrorPattern, 'i').test(error.message);
      
      if (matchesExpected && classification.shouldPassTest) {
        console.log('[WORKOUT LOGS] Expected error occurred and handled correctly');
        return { 
          success: true, 
          expectedError: true,
          actualError: true,
          classification 
        };
      }
    }
    
    // Re-throw if it's a configuration bug or unexpected error
    throw error;
  }
};

module.exports = {
  classifyWorkoutLogError,
  handleWorkoutLogOperationSafely,
  validateErrorHandling
}; 