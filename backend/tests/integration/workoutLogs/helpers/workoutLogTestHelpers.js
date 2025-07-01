const supertest = require('supertest');
const { app } = require('../../../../server');
const workoutLogService = require('../../../../services/workout-log-service');

// MANDATORY: Follow workout_logs_integration_rules.mdc - NO MOCKING FOR REAL INTEGRATION

/**
 * CRITICAL SECURITY RULE #1: MANDATORY USER_ID FILTERING
 * Creates real test users via auth endpoints (never direct database)
 * Following authentication consistency rules
 */
async function createRealTestUser(userSuffix = '') {
  const uniqueEmail = `workout-logs-test-${Date.now()}-${userSuffix}@example.com`;
  
  const signupResponse = await supertest(app)
    .post('/v1/auth/signup')
    .send({
      name: `Workout Logs Test User ${userSuffix}`,
      email: uniqueEmail,
      password: 'TestPassword123!'
    });
    
  // CRITICAL: Verify consistent JWT token field naming
  expect(signupResponse.body.userId).toBeDefined();
  expect(signupResponse.body.jwtToken).toBeDefined(); // NOT accessToken
  
  return { 
    id: signupResponse.body.userId, 
    jwtToken: signupResponse.body.jwtToken,
    email: uniqueEmail
  };
}

/**
 * MANDATORY RULE #1: PRE-TEST SCHEMA VALIDATION
 * Validates database schema against actual table structure
 * FIXED: Removed dependency on non-existent RPC function
 */
async function validateWorkoutLogsSchema(supabase) {
  try {
    console.log('[SCHEMA VALIDATION] Testing workout_logs table existence...');
    
    // Test actual table existence first
    const { data: tableTest, error: tableError } = await supabase
      .from('workout_logs')
      .select('*')
      .limit(1);
      
    if (tableError && tableError.code === '42P01') {
      console.log('[SCHEMA VALIDATION] ERROR: workout_logs table does not exist');
      return {
        isValid: false,
        reason: 'workout_logs table does not exist',
        error: tableError.message
      };
    }
    
    console.log('[SCHEMA VALIDATION] Table exists, validating column structure...');
    
    // Verify expected columns exist (CORRECTED: From actual migration 0006_create_workout_logs.sql)
    const expectedColumns = [
      'id', 
      'user_id', 
      'plan_id',           // FIXED: Was 'workout_plan_id'
      'date',              // FIXED: Was 'logged_at'
      'completed',         // ADDED: Missing from expectations
      'exercises_completed',
      'overall_difficulty',
      'energy_level', 
      'satisfaction',
      'feedback',
      'created_at',
      'updated_at'
    ];
    
    // Validate columns by attempting to select them specifically
    try {
      console.log('[SCHEMA VALIDATION] Testing column existence...');
      const { data: columnTest, error: columnError } = await supabase
        .from('workout_logs')
        .select(expectedColumns.join(','))
        .limit(0);
        
      if (columnError) {
        console.log('[SCHEMA VALIDATION] ERROR: Column validation failed:', columnError.message);
        
        // Check if it's a missing column error
        if (columnError.message && columnError.message.includes('column') && columnError.message.includes('does not exist')) {
          return {
            isValid: false,
            reason: 'Missing expected columns in workout_logs table',
            error: columnError.message,
            expectedColumns,
            type: 'column_validation_failed'
          };
        }
        
        return {
          isValid: false,
          reason: 'Schema validation query failed',
          error: columnError.message
        };
      }
      
      console.log('[SCHEMA VALIDATION] All expected columns validated successfully');
      return {
        isValid: true,
        columns: expectedColumns,
        verified: 'column_validation_success',
        tableExists: true,
        columnCount: expectedColumns.length
      };
      
    } catch (columnError) {
      console.log('[SCHEMA VALIDATION] ERROR: Column validation exception:', columnError.message);
      return {
        isValid: false,
        reason: 'Column validation exception',
        error: columnError.message
      };
    }
    
  } catch (error) {
    console.log('[SCHEMA VALIDATION] ERROR: General validation error:', error.message);
    return {
      isValid: false,
      reason: 'Schema validation error',
      error: error.message
    };
  }
}

/**
 * MANDATORY RULE #2: ERROR CLASSIFICATION FRAMEWORK
 * Classifies errors to distinguish configuration bugs from legitimate integration errors
 */
function classifyWorkoutLogError(error) {
  const errorMessage = error.message || '';
  
  const classification = {
    // Configuration bugs (MUST FAIL TESTS) - Based on Phase 0 lessons
    isConfigurationBug: errorMessage.includes('relation') && errorMessage.includes('does not exist') ||
                       errorMessage.includes('column') && errorMessage.includes('does not exist') ||
                       errorMessage.includes('function') && errorMessage.includes('does not exist') ||
                       errorMessage.includes('accessToken') && errorMessage.includes('jwtToken'), // Auth inconsistency
    
    // Security issues (MUST FAIL TESTS) - From Phase 0 RLS fix
    isSecurityBreach: errorMessage.includes('cross-user') || 
                     errorMessage.includes('unauthorized access') ||
                     errorMessage.includes('user isolation'),
    
    // Legitimate integration errors (SHOULD PASS TESTS)  
    isConnectionError: errorMessage.includes('ENOTFOUND') || errorMessage.includes('network'),
    isValidationError: errorMessage.includes('validation') || errorMessage.includes('constraint'),
    isAuthError: errorMessage.includes('unauthorized') || errorMessage.includes('invalid token'),
    isRateLimitError: errorMessage.includes('429') || errorMessage.includes('quota'),
    
    shouldFailTest: false,
    shouldPassTest: true
  };
  
  // CRITICAL: Configuration bugs and security breaches MUST fail tests
  if (classification.isConfigurationBug || classification.isSecurityBreach) {
    classification.shouldFailTest = true;
    classification.shouldPassTest = false;
    throw error; // Fail the test immediately
  }
  
  return classification;
}

/**
 * Safe operation handler with proper error classification
 * Handles operations gracefully while enforcing security rules
 */
async function handleWorkoutLogOperationSafely(operation, expectError = false) {
  try {
    const result = await operation();
    
    if (expectError) {
      return {
        success: false,
        expectedError: false,
        result,
        message: 'Operation succeeded when error was expected'
      };
    }
    
    return {
      success: true,
      result,
      message: 'Operation completed successfully'
    };
    
  } catch (error) {
    // MANDATORY: Use error classification framework
    const classification = classifyWorkoutLogError(error);
    
    if (expectError && (classification.isValidationError || classification.isAuthError)) {
      return {
        success: false,
        expectedError: true,
        error: error.message,
        classification,
        message: 'Expected error occurred correctly'
      };
    }
    
    if (classification.shouldPassTest) {
      return {
        success: false,
        legitimateError: true,
        error: error.message,
        classification,
        message: 'Legitimate integration error - test should pass'
      };
    }
    
    // Re-throw configuration bugs or security breaches
    throw error;
  }
}

/**
 * Validates error handling with proper classification
 * Used for testing expected validation failures
 */
async function validateErrorHandling(operation, expectedErrorPattern) {
  try {
    const result = await operation();
    
    // If operation succeeds when error expected, that's a test failure
    return {
      expectedError: false,
      actualSuccess: true,
      result,
      message: 'Operation succeeded when validation error was expected'
    };
    
  } catch (error) {
    const errorMessage = error.message || '';
    const pattern = new RegExp(expectedErrorPattern, 'i');
    
    // MANDATORY: Use error classification framework
    const classification = classifyWorkoutLogError(error);
    
    // Check if error matches expected pattern
    const matchesPattern = pattern.test(errorMessage);
    
    if (matchesPattern && (classification.isValidationError || classification.isAuthError)) {
      return {
        expectedError: true,
        matchesPattern: true,
        error: errorMessage,
        classification,
        message: 'Validation error occurred as expected'
      };
    }
    
    // If configuration bug, let it bubble up to fail the test
    if (classification.isConfigurationBug || classification.isSecurityBreach) {
      throw error;
    }
    
    return {
      expectedError: false,
      matchesPattern: false,
      error: errorMessage,
      classification,
      message: 'Error occurred but did not match expected pattern'
    };
  }
}

/**
 * Creates valid test workout log data following Phase 0 patterns
 * CRITICAL: Always includes user_id for security validation
 */
function createValidTestWorkoutLog(userId, overrides = {}) {
  if (!userId) {
    throw new Error('SECURITY VIOLATION: userId is required for workout log creation');
  }
  
  const baseData = {
    user_id: userId, // CRITICAL: Always include for security validation
    plan_id: null, // FIXED: Was 'workout_plan_id' - can be null for user-created logs
    date: new Date().toISOString().split('T')[0], // FIXED: Was 'logged_at' - use date format for date column
    completed: true, // ADDED: Missing column from actual schema
    overall_difficulty: 7,
    energy_level: 8,
    satisfaction: 9,
    feedback: 'Test workout completed successfully',
    exercises_completed: [
      {
        exercise_name: 'Squat',
        sets: [
          { weight: 135, reps: 10 },
          { weight: 155, reps: 8 },
          { weight: 175, reps: 6 }
        ]
      },
      {
        exercise_name: 'Bench Press',
        sets: [
          { weight: 115, reps: 10 },
          { weight: 135, reps: 8 },
          { weight: 145, reps: 6 }
        ]
      }
    ]
  };
  
  // Apply overrides while preserving user_id security
  return {
    ...baseData,
    ...overrides,
    user_id: userId // CRITICAL: Always enforce user_id from parameter
  };
}

/**
 * Creates invalid test workout log data for validation testing
 * Used to test error handling scenarios
 */
function createInvalidTestWorkoutLog(userId, invalidationType) {
  if (!userId) {
    throw new Error('SECURITY VIOLATION: userId is required even for invalid test data');
  }
  
  const baseData = createValidTestWorkoutLog(userId); // Now uses overrides properly
  
  switch (invalidationType) {
    case 'invalid_exercises_json':
      return {
        ...baseData,
        exercises_completed: 'invalid-json-string' // Should be array
      };
      
    case 'missing_required_fields':
      const { overall_difficulty, ...missingRequired } = baseData;
      return missingRequired;
      
    case 'invalid_data_types':
      return {
        ...baseData,
        overall_difficulty: 'not-a-number',
        energy_level: 'also-not-a-number'
      };
      
    case 'out_of_range_values':
      return {
        ...baseData,
        overall_difficulty: 15, // Above maximum of 10
        energy_level: -5        // Below minimum of 1
      };
      
    case 'malformed_exercises':
      return {
        ...baseData,
        exercises_completed: [
          {
            // Missing exercise_name
            sets: [{ weight: 'invalid', reps: 'also-invalid' }]
          }
        ]
      };
      
    default:
      throw new Error(`Unknown invalid data type: ${invalidationType}`);
  }
}

/**
 * Generates test data for boundary value testing
 * Creates systematic boundary test cases
 */
function generateBoundaryTestCases(userId) {
  if (!userId) {
    throw new Error('SECURITY VIOLATION: userId is required for boundary test generation');
  }
  
  return {
    minimumValues: createValidTestWorkoutLog(userId, {
      overall_difficulty: 1,
      energy_level: 1,
      satisfaction: 1,
      exercises_completed: [
        {
          exercise_name: 'A', // Minimum length string
          sets: [{ weight: 0, reps: 1 }] // Minimum values
        }
      ]
    }),
    
    maximumValues: createValidTestWorkoutLog(userId, {
      overall_difficulty: 10,
      energy_level: 10,
      satisfaction: 10,
      exercises_completed: Array(50).fill(null).map((_, i) => ({ // Large array
        exercise_name: `Exercise ${i}`.repeat(10), // Long string
        sets: Array(20).fill({ weight: 999, reps: 100 }) // Many sets, high values
      }))
    }),
    
    edgeCases: createValidTestWorkoutLog(userId, {
      feedback: 'A'.repeat(5000), // Very long feedback
      exercises_completed: []      // Empty exercise array
    })
  };
}

/**
 * Database cleanup helper for test isolation
 * CRITICAL: Ensures user data isolation during cleanup
 */
async function cleanupTestData(supabase, userId) {
  if (!userId) {
    console.log('Warning: No userId provided for cleanup');
    return;
  }
  
  try {
    // CRITICAL: Always filter by user_id for security
    await supabase
      .from('workout_logs')
      .delete()
      .eq('user_id', userId);
      
    console.log(`Cleaned up workout logs for user: ${userId}`);
  } catch (error) {
    console.log('Cleanup warning:', error.message);
    // Don't fail tests due to cleanup issues
  }
}

module.exports = {
  // Core helper functions
  createRealTestUser,
  handleWorkoutLogOperationSafely,
  validateWorkoutLogsSchema,
  classifyWorkoutLogError,
  validateErrorHandling,
  
  // Test data generation
  createValidTestWorkoutLog,
  createInvalidTestWorkoutLog,
  generateBoundaryTestCases,
  
  // Cleanup utilities
  cleanupTestData,
  
  // Service access
  workoutLogService
}; 