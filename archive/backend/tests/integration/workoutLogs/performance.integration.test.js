/**
 * WORKOUT LOGS PERFORMANCE INTEGRATION TESTS - PHASE 2
 * 
 * MANDATORY: Follow workout_logs_integration_rules.mdc
 * MANDATORY: Follow critical_ai_integration_test_rules.mdc
 * 
 * CRITICAL SECURITY REQUIREMENTS:
 * - ALL data access MUST filter by user_id (NEVER query by ID alone)
 * - ALL users created via real auth endpoints (NEVER direct database)
 * - ALL operations verified for user ownership
 * - ALL concurrent operations tested for user isolation
 */

const { getSupabaseClient } = require('../../../services/supabase');
const { 
  createRealTestUser,
  validateWorkoutLogsSchema,
  classifyWorkoutLogError,
  handleWorkoutLogOperationSafely,
  createValidTestWorkoutLog,
  cleanupTestData,
  workoutLogService
} = require('./helpers/workoutLogTestHelpers');

describe('Workout Logs Performance Integration Tests - Phase 2', () => {
  let supabase;
  let testUsers = [];
  let testCleanupTasks = [];

  beforeAll(async () => {
    console.log('[PERFORMANCE TEST] Starting Phase 2 performance integration tests...');
    
    // Initialize Supabase client
    supabase = getSupabaseClient();
    
    // MANDATORY RULE #1: PRE-TEST SCHEMA VALIDATION
    console.log('[PERFORMANCE TEST] Validating workout logs schema...');
    const schemaValidation = await validateWorkoutLogsSchema(supabase);
    expect(schemaValidation.isValid).toBe(true);
    console.log('[PERFORMANCE TEST] Schema validation passed');
    
    // MANDATORY RULE #2: SERVICE METHOD VERIFICATION  
    console.log('[PERFORMANCE TEST] Verifying service methods...');
    expect(typeof workoutLogService.storeWorkoutLog).toBe('function');
    expect(typeof workoutLogService.retrieveWorkoutLogs).toBe('function');
    expect(typeof workoutLogService.retrieveWorkoutLog).toBe('function');
    expect(typeof workoutLogService.updateWorkoutLog).toBe('function');
    expect(typeof workoutLogService.deleteWorkoutLog).toBe('function');
    console.log('[PERFORMANCE TEST] Service method verification passed');
    
    console.log('[PERFORMANCE TEST] Setup completed successfully');
  }, 120000); // 2 minute timeout for setup

  afterEach(async () => {
    console.log('[PERFORMANCE TEST] Starting test cleanup...');
    
    // Clean up test users with proper user isolation
    for (const user of testUsers) {
      if (user.id) {
        try {
          await cleanupTestData(supabase, user.id);
          console.log(`[PERFORMANCE TEST] Cleaned up data for user: ${user.id}`);
        } catch (error) {
          console.log(`[PERFORMANCE TEST] Warning: Cleanup error for user ${user.id}:`, error.message);
        }
      }
    }
    
    // Execute additional cleanup tasks
    for (const cleanupTask of testCleanupTasks) {
      try {
        await cleanupTask();
      } catch (error) {
        console.log('[PERFORMANCE TEST] Warning: Cleanup task error:', error.message);
      }
    }
    
    // Reset arrays
    testUsers = [];
    testCleanupTasks = [];
    
    console.log('[PERFORMANCE TEST] Test cleanup completed');
  }, 60000); // 1 minute timeout for cleanup

  describe('Task 2.1: Large Dataset Performance', () => {
    test('Should handle users with large workout log history', async () => {
      console.log('[PERFORMANCE TEST] Starting large dataset performance test...');
      
      // MANDATORY: Real user creation via auth endpoints
      const testUser = await createRealTestUser('performance-large-dataset');
      testUsers.push(testUser);
      console.log('[PERFORMANCE TEST] Created test user for large dataset test');
      
      // Create large number of workout logs (50 for performance testing)
      const createdLogIds = [];
      const logCreationStartTime = Date.now();
      
      console.log('[PERFORMANCE TEST] Creating 50 workout logs...');
      for (let i = 0; i < 50; i++) {
        const logData = {
          ...createValidTestWorkoutLog(testUser.id),
          overall_difficulty: (i % 10) + 1, // Cycle through 1-10
          energy_level: ((i + 3) % 10) + 1, // Different pattern
          satisfaction: ((i + 7) % 10) + 1, // Another pattern
          feedback: `Performance test log ${i + 1} of 50`,
          exercises_completed: [
            {
              exercise_name: `Exercise A${i}`,
              sets: [
                { weight: 100 + i, reps: 10 - (i % 3) },
                { weight: 110 + i, reps: 8 - (i % 2) }
              ]
            },
            {
              exercise_name: `Exercise B${i}`,
              sets: [
                { weight: 80 + i, reps: 12 - (i % 4) },
                { weight: 90 + i, reps: 10 - (i % 3) }
              ]
            }
          ]
        };
        
        const createResult = await handleWorkoutLogOperationSafely(async () => {
          return await workoutLogService.storeWorkoutLog(testUser.id, logData, testUser.jwtToken);
        });
        
        expect(createResult.success).toBe(true);
        // CRITICAL: Verify user ownership in every record
        expect(createResult.result.user_id).toBe(testUser.id);
        createdLogIds.push(createResult.result.id);
        
        if ((i + 1) % 10 === 0) {
          console.log(`[PERFORMANCE TEST] Created ${i + 1}/50 workout logs`);
        }
      }
      
      const logCreationTime = Date.now() - logCreationStartTime;
      console.log(`[PERFORMANCE TEST] Log creation completed in ${logCreationTime}ms`);
      
      // Test retrieval performance with proper user filtering
      console.log('[PERFORMANCE TEST] Testing retrieval performance...');
      const retrievalStartTime = Date.now();
      
      const retrievalResult = await handleWorkoutLogOperationSafely(async () => {
        return await workoutLogService.retrieveWorkoutLogs(testUser.id, { limit: 100 }, testUser.jwtToken);
      });
      
      const queryTime = Date.now() - retrievalStartTime;
      console.log(`[PERFORMANCE TEST] Query completed in ${queryTime}ms`);
      
      expect(retrievalResult.success).toBe(true);
      expect(queryTime).toBeLessThan(2000); // 2 second max performance requirement
      
      // CRITICAL: Verify all returned logs belong to test user
      expect(Array.isArray(retrievalResult.result)).toBe(true);
      expect(retrievalResult.result.length).toBeGreaterThan(0);
      
      retrievalResult.result.forEach((log, index) => {
        expect(log.user_id).toBe(testUser.id);
        if (index < 5) { // Log first 5 for verification
          console.log(`[PERFORMANCE TEST] Verified log ${index + 1}: user_id=${log.user_id}, difficulty=${log.overall_difficulty}`);
        }
      });
      
      // Test individual log retrieval performance
      console.log('[PERFORMANCE TEST] Testing individual log retrieval...');
      const individualRetrievalStartTime = Date.now();
      
      const randomLogId = createdLogIds[Math.floor(Math.random() * createdLogIds.length)];
      const individualResult = await handleWorkoutLogOperationSafely(async () => {
        return await workoutLogService.retrieveWorkoutLog(randomLogId, testUser.id, testUser.jwtToken);
      });
      
      const individualQueryTime = Date.now() - individualRetrievalStartTime;
      console.log(`[PERFORMANCE TEST] Individual query completed in ${individualQueryTime}ms`);
      
      expect(individualResult.success).toBe(true);
      expect(individualQueryTime).toBeLessThan(500); // 500ms max for individual queries
      // CRITICAL: Verify user ownership
      expect(individualResult.result.user_id).toBe(testUser.id);
      
      console.log('[PERFORMANCE TEST] Large dataset performance test completed successfully');
      console.log(`[PERFORMANCE TEST] Performance metrics: Creation=${logCreationTime}ms, Retrieval=${queryTime}ms, Individual=${individualQueryTime}ms`);
      
    }, 180000); // 3 minute timeout for large dataset test
  });

  describe('Task 2.2: Concurrent Operations', () => {
    test('Should handle concurrent workout logging', async () => {
      console.log('[PERFORMANCE TEST] Starting concurrent operations test...');
      
      // MANDATORY: Create multiple real users via auth endpoints
      const concurrentUsers = [];
      console.log('[PERFORMANCE TEST] Creating 5 concurrent test users...');
      
      for (let i = 1; i <= 5; i++) {
        const user = await createRealTestUser(`concurrent-${i}`);
        concurrentUsers.push(user);
        testUsers.push(user); // Add to cleanup list
        console.log(`[PERFORMANCE TEST] Created concurrent user ${i}/5: ${user.id}`);
      }
      
      console.log('[PERFORMANCE TEST] Starting concurrent workout logging operations...');
      
      // REQUIRED: Use Promise.allSettled for robust concurrent operations
      const concurrentOperations = concurrentUsers.map((user, index) => 
        async () => {
          try {
            const workoutData = {
              ...createValidTestWorkoutLog(user.id),
              overall_difficulty: (index % 5) + 6, // 6-10 range
              feedback: `Concurrent test workout for user ${index + 1}`,
              exercises_completed: [
                {
                  exercise_name: `Concurrent Exercise ${index + 1}A`,
                  sets: [
                    { weight: 150 + (index * 10), reps: 8 },
                    { weight: 160 + (index * 10), reps: 6 }
                  ]
                }
              ]
            };
            
            const startTime = Date.now();
            const result = await workoutLogService.storeWorkoutLog(user.id, workoutData, user.jwtToken);
            const operationTime = Date.now() - startTime;
            
            console.log(`[PERFORMANCE TEST] User ${index + 1} operation completed in ${operationTime}ms`);
            return { userId: user.id, result, success: true, operationTime };
          } catch (error) {
            // MANDATORY: Use error classification framework
            const classification = classifyWorkoutLogError(error);
            console.log(`[PERFORMANCE TEST] User ${index + 1} operation failed:`, error.message);
            return { userId: user.id, error: error.message, success: false, classification };
          }
        }
      );

      const concurrentStartTime = Date.now();
      const results = await Promise.allSettled(concurrentOperations.map(op => op()));
      const totalConcurrentTime = Date.now() - concurrentStartTime;
      
      console.log(`[PERFORMANCE TEST] All concurrent operations completed in ${totalConcurrentTime}ms`);

      // Analyze results
      let successfulOperations = 0;
      let failedOperations = 0;
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.success) {
          successfulOperations++;
          // CRITICAL: Verify user ownership in concurrent results
          expect(result.value.result.user_id).toBe(result.value.userId);
          console.log(`[PERFORMANCE TEST] User ${index + 1} SUCCESS: Operation time ${result.value.operationTime}ms`);
        } else {
          failedOperations++;
          console.log(`[PERFORMANCE TEST] User ${index + 1} FAILED:`, result.value?.error || result.reason);
        }
      });
      
      console.log(`[PERFORMANCE TEST] Concurrent results: ${successfulOperations} successful, ${failedOperations} failed`);
      
      // Require at least 80% success rate for concurrent operations
      const successRate = successfulOperations / concurrentUsers.length;
      expect(successRate).toBeGreaterThanOrEqual(0.8);
      
      // Verify data integrity - no cross-user contamination
      console.log('[PERFORMANCE TEST] Verifying data integrity across concurrent users...');
      
      for (const user of concurrentUsers) {
        const userLogs = await handleWorkoutLogOperationSafely(async () => {
          return await workoutLogService.retrieveWorkoutLogs(user.id, {}, user.jwtToken);
        });
        
        if (userLogs.success) {
          // CRITICAL: Verify all logs belong to correct user
          expect(Array.isArray(userLogs.result)).toBe(true);
          userLogs.result.forEach(log => {
            expect(log.user_id).toBe(user.id);
          });
          console.log(`[PERFORMANCE TEST] User ${user.id}: ${userLogs.result.length} logs verified for correct ownership`);
        }
      }
      
      console.log('[PERFORMANCE TEST] Concurrent operations test completed successfully');
      console.log(`[PERFORMANCE TEST] Concurrent metrics: Total time=${totalConcurrentTime}ms, Success rate=${Math.round(successRate * 100)}%`);
      
    }, 120000); // 2 minute timeout for concurrent test

    test('Should maintain performance under concurrent read operations', async () => {
      console.log('[PERFORMANCE TEST] Starting concurrent read operations test...');
      
      // MANDATORY: Create test user with some data
      const testUser = await createRealTestUser('concurrent-reads');
      testUsers.push(testUser);
      
      // Create baseline data for reading
      console.log('[PERFORMANCE TEST] Creating baseline data for concurrent reads...');
      const baselineData = [];
      
      for (let i = 0; i < 10; i++) {
        const logData = {
          ...createValidTestWorkoutLog(testUser.id),
          feedback: `Baseline data for concurrent reads ${i + 1}`
        };
        
        const createResult = await handleWorkoutLogOperationSafely(async () => {
          return await workoutLogService.storeWorkoutLog(testUser.id, logData, testUser.jwtToken);
        });
        
        expect(createResult.success).toBe(true);
        baselineData.push(createResult.result);
      }
      
      console.log(`[PERFORMANCE TEST] Created ${baselineData.length} baseline logs`);
      
      // Perform concurrent read operations
      const concurrentReads = Array.from({ length: 10 }, (_, index) => 
        async () => {
          try {
            const startTime = Date.now();
            const result = await workoutLogService.retrieveWorkoutLogs(testUser.id, { limit: 20 }, testUser.jwtToken);
            const readTime = Date.now() - startTime;
            
            return { 
              readIndex: index + 1, 
              success: true, 
              readTime, 
              resultCount: Array.isArray(result) ? result.length : 0,
              result 
            };
          } catch (error) {
            return { 
              readIndex: index + 1, 
              success: false, 
              error: error.message 
            };
          }
        }
      );
      
      console.log('[PERFORMANCE TEST] Executing 10 concurrent read operations...');
      const readStartTime = Date.now();
      const readResults = await Promise.allSettled(concurrentReads.map(op => op()));
      const totalReadTime = Date.now() - readStartTime;
      
      console.log(`[PERFORMANCE TEST] Concurrent reads completed in ${totalReadTime}ms`);
      
      // Analyze read performance
      let successfulReads = 0;
      let totalReadTime_sum = 0;
      
      readResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.success) {
          successfulReads++;
          totalReadTime_sum += result.value.readTime;
          
          // CRITICAL: Verify user ownership in all read results
          if (result.value.result && Array.isArray(result.value.result)) {
            result.value.result.forEach(log => {
              expect(log.user_id).toBe(testUser.id);
            });
          }
          
          console.log(`[PERFORMANCE TEST] Read ${index + 1}: ${result.value.readTime}ms, ${result.value.resultCount} records`);
        } else {
          console.log(`[PERFORMANCE TEST] Read ${index + 1} FAILED:`, result.value?.error || result.reason);
        }
      });
      
      const avgReadTime = successfulReads > 0 ? totalReadTime_sum / successfulReads : 0;
      console.log(`[PERFORMANCE TEST] Read performance: ${successfulReads}/10 successful, avg time ${Math.round(avgReadTime)}ms`);
      
      // Performance requirements for concurrent reads
      expect(successfulReads).toBeGreaterThanOrEqual(8); // 80% success rate minimum
      expect(avgReadTime).toBeLessThan(1000); // 1 second average max
      expect(totalReadTime).toBeLessThan(5000); // 5 seconds total max
      
      console.log('[PERFORMANCE TEST] Concurrent read operations test completed successfully');
      
    }, 90000); // 1.5 minute timeout for concurrent reads
  });

  // CRITICAL: Final validation test to ensure no configuration bugs were masked
  test('CRITICAL: Final validation - no configuration bugs masked as success', async () => {
    console.log('[PERFORMANCE TEST] Running final validation to ensure no configuration bugs...');
    
    // MANDATORY: Real user creation
    const testUser = await createRealTestUser('final-validation');
    testUsers.push(testUser);
    
    // Test complete CRUD lifecycle with performance monitoring
    const testData = createValidTestWorkoutLog(testUser.id);
    
    console.log('[PERFORMANCE TEST] Testing complete CRUD lifecycle...');
    
    // CREATE with performance monitoring
    const createStartTime = Date.now();
    const createResult = await handleWorkoutLogOperationSafely(async () => {
      return await workoutLogService.storeWorkoutLog(testUser.id, testData, testUser.jwtToken);
    });
    const createTime = Date.now() - createStartTime;
    
    expect(createResult.success).toBe(true);
    expect(createResult.result.user_id).toBe(testUser.id);
    console.log(`[PERFORMANCE TEST] CREATE: ${createTime}ms`);
    
    const logId = createResult.result.id;
    
    // READ with performance monitoring
    const readStartTime = Date.now();
    const readResult = await handleWorkoutLogOperationSafely(async () => {
      return await workoutLogService.retrieveWorkoutLog(logId, testUser.id, testUser.jwtToken);
    });
    const readTime = Date.now() - readStartTime;
    
    expect(readResult.success).toBe(true);
    expect(readResult.result.user_id).toBe(testUser.id);
    console.log(`[PERFORMANCE TEST] READ: ${readTime}ms`);
    
    // UPDATE with performance monitoring
    const updateData = { overall_difficulty: 9, feedback: 'Updated for performance validation' };
    const updateStartTime = Date.now();
    const updateResult = await handleWorkoutLogOperationSafely(async () => {
      return await workoutLogService.updateWorkoutLog(logId, updateData, testUser.id, testUser.jwtToken);
    });
    const updateTime = Date.now() - updateStartTime;
    
    expect(updateResult.success).toBe(true);
    expect(updateResult.result.user_id).toBe(testUser.id);
    console.log(`[PERFORMANCE TEST] UPDATE: ${updateTime}ms`);
    
    // DELETE with performance monitoring
    const deleteStartTime = Date.now();
    await workoutLogService.deleteWorkoutLog(logId, testUser.id, testUser.jwtToken);
    const deleteTime = Date.now() - deleteStartTime;
    console.log(`[PERFORMANCE TEST] DELETE: ${deleteTime}ms`);
    
    // Verify deletion
    const verifyResult = await handleWorkoutLogOperationSafely(
      async () => await workoutLogService.retrieveWorkoutLog(logId, testUser.id, testUser.jwtToken),
      true // expectError = true
    );
    expect(verifyResult.success).toBe(false); // Should fail after deletion
    
    // Performance validation
    expect(createTime).toBeLessThan(1000); // 1 second max
    expect(readTime).toBeLessThan(500);    // 500ms max
    expect(updateTime).toBeLessThan(1000); // 1 second max
    expect(deleteTime).toBeLessThan(500);  // 500ms max
    
    console.log('[PERFORMANCE TEST] Final validation completed - no configuration bugs detected');
    console.log(`[PERFORMANCE TEST] CRUD performance: CREATE=${createTime}ms, READ=${readTime}ms, UPDATE=${updateTime}ms, DELETE=${deleteTime}ms`);
    
  }, 60000); // 1 minute timeout for final validation
}); 