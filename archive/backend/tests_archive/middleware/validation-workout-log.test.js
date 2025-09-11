// Explicit mock calls MUST be at the top
jest.mock('../../config');
jest.mock('../../config/supabase');

/**
 * @fileoverview Tests for Workout Log Validation Schemas
 */

const Joi = require('joi');
const { workoutSchemas } = require('../../middleware/validation');

describe('Workout Log Validation Schemas', () => {
  /**
   * Tests for workoutLogSchema
   */
  describe('workoutLogSchema', () => {
    // Valid workout log data aligned with the schema
    const validWorkoutLog = {
      log_id: '123e4567-e89b-12d3-a456-426614174000',
      user_id: '789e4567-e89b-12d3-a456-426614174001',
      plan_id: '456e4567-e89b-12d3-a456-426614174002',
      date: '2023-01-01',
      exercises_completed: [
        {
          exercise_id: 'ex-123',
          exercise_name: 'Bench Press',
          sets_completed: 3,             // Use schema field name
          reps_completed: [8, 10, 12],   // Use schema field name
          weights_used: [135, 145, 155], // Use schema field name
          felt_difficulty: 7,            // Use schema field name (optional)
          notes: 'Felt strong'             // Use schema field name (optional)
        }
      ],
      overall_difficulty: 7, // Optional
      energy_level: 8, // Optional
      satisfaction: 8, // Optional
      feedback: 'Good workout overall', // Optional
      completed: true // Optional, defaults to true
    };

    test('accepts valid workout log data', () => {
        const { error, value } = workoutSchemas.workoutLogSchema.validate(validWorkoutLog);
        // Check error first
        if (error) { 
            console.error('Validation Error Details:', JSON.stringify(error.details, null, 2));
        }
        expect(error).toBeUndefined();
        
        // Expect date fields to be coerced to Date objects
        const expectedValue = {
            ...validWorkoutLog,
            date: new Date('2023-01-01T00:00:00Z'), // Expect Date object
            // completed defaults to true if not provided, but should pass through if provided
            completed: true 
        };
        // Remove optional fields from expected if they weren't in validWorkoutLog originally for exact match
        // delete expectedValue.overall_difficulty;
        // delete expectedValue.energy_level;
        // delete expectedValue.satisfaction;
        // delete expectedValue.feedback;
        
        expect(value).toEqual(expectedValue);
    });

    test('sets default for completed field when not provided', () => {
      const logWithoutCompleted = { ...validWorkoutLog };
      delete logWithoutCompleted.completed; 
      
      const { error, value } = workoutSchemas.workoutLogSchema.validate(logWithoutCompleted);
       if (error) { 
            console.error('Validation Error (Default):', JSON.stringify(error.details, null, 2));
        }
      expect(error).toBeUndefined();
      expect(value.completed).toBe(true);
    });

    test('rejects missing required fields', () => {
      // Test missing plan_id
      let invalidLog = { ...validWorkoutLog };
      delete invalidLog.plan_id;
      let { error } = workoutSchemas.workoutLogSchema.validate(invalidLog);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('Plan ID is required');

      // Test missing date
      invalidLog = { ...validWorkoutLog };
      delete invalidLog.date;
      ({ error } = workoutSchemas.workoutLogSchema.validate(invalidLog));
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('Date is required');

      // Test missing exercises_completed
      invalidLog = { ...validWorkoutLog };
      delete invalidLog.exercises_completed;
      ({ error } = workoutSchemas.workoutLogSchema.validate(invalidLog));
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('Exercises completed is required');
    });

    test('rejects invalid data types', () => {
      const baseLog = JSON.parse(JSON.stringify(validWorkoutLog)); 

      // Test invalid overall_difficulty (not a number)
      let invalidLog = { ...baseLog, exercises_completed: baseLog.exercises_completed, overall_difficulty: 'high' };
      let { error } = workoutSchemas.workoutLogSchema.validate(invalidLog);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('Overall difficulty must be a number'); 

      // Restore other checks, ensuring baseLog is used and exercises_completed is present
      // Test invalid plan_id format (not UUID)
      invalidLog = { ...baseLog, exercises_completed: baseLog.exercises_completed, plan_id: 'not-a-uuid' };
      ({ error } = workoutSchemas.workoutLogSchema.validate(invalidLog));
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('Plan ID must be a valid UUID');

      // Test invalid date format
      invalidLog = { ...baseLog, exercises_completed: baseLog.exercises_completed, date: 'not-a-date' };
      ({ error } = workoutSchemas.workoutLogSchema.validate(invalidLog));
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('Date must be a valid date');

      // Test invalid completed (not boolean)
      invalidLog = { ...baseLog, exercises_completed: baseLog.exercises_completed, completed: 'yes' };
      ({ error } = workoutSchemas.workoutLogSchema.validate(invalidLog));
      expect(error).toBeDefined();
      expect(error.details[0].type).toBe('boolean.base');
    });

    test('rejects empty exercises_completed array', () => {
      const invalidLog = { ...validWorkoutLog, exercises_completed: [] };
      const { error } = workoutSchemas.workoutLogSchema.validate(invalidLog);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('At least one exercise must be logged');
    });

    test('validates schema boundary conditions', () => {
       const baseLog = JSON.parse(JSON.stringify(validWorkoutLog)); 
       
      // Test overall_difficulty below min (1)
      let invalidLog = { ...baseLog, exercises_completed: baseLog.exercises_completed, overall_difficulty: 0 };
      let { error } = workoutSchemas.workoutLogSchema.validate(invalidLog);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('must be between 1 and 10');

      // Test overall_difficulty above max (10)
      invalidLog = { ...baseLog, exercises_completed: baseLog.exercises_completed, overall_difficulty: 11 };
      ({ error } = workoutSchemas.workoutLogSchema.validate(invalidLog));
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('must be between 1 and 10');
      
      // Restore checks for other fields, ensuring baseLog is used
      
      // Test energy_level below min (1)
      invalidLog = { ...baseLog, exercises_completed: baseLog.exercises_completed, energy_level: 0 };
      ({ error } = workoutSchemas.workoutLogSchema.validate(invalidLog));
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('must be between 1 and 10');

      // Test energy_level above max (10)
      invalidLog = { ...baseLog, exercises_completed: baseLog.exercises_completed, energy_level: 11 };
      ({ error } = workoutSchemas.workoutLogSchema.validate(invalidLog));
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('must be between 1 and 10');

      // Test feedback exceeding max length
      invalidLog = { ...baseLog, exercises_completed: baseLog.exercises_completed, feedback: 'a'.repeat(1001) };
      ({ error } = workoutSchemas.workoutLogSchema.validate(invalidLog));
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('Feedback cannot exceed 1000 characters');
    });

    test('validates exercise_completed entries', () => {
      // Test missing exercise_id in an exercise
      let invalidExercise = {
        ...validWorkoutLog,
        exercises_completed: [
          {
            // missing exercise_id
            exercise_name: 'Bench Press',
            sets_completed: 3,
            reps_completed: [8, 10, 12],
            weights_used: [135, 145, 155]
          }
        ]
      };
      let { error } = workoutSchemas.workoutLogSchema.validate(invalidExercise);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('Exercise ID is required');

      // Test missing exercise_name in an exercise
      invalidExercise = {
        ...validWorkoutLog,
        exercises_completed: [
          {
            exercise_id: 'ex-123',
            // missing exercise_name
            sets_completed: 3,
            reps_completed: [8, 10, 12],
            weights_used: [135, 145, 155]
          }
        ]
      };
      ({ error } = workoutSchemas.workoutLogSchema.validate(invalidExercise));
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('Exercise name is required');

      // Test invalid sets_completed (< 1)
      invalidExercise = {
        ...validWorkoutLog,
        exercises_completed: [
          {
            exercise_id: 'ex-123',
            exercise_name: 'Bench Press',
            sets_completed: 0, // Invalid: less than 1
            reps_completed: [8, 10, 12],
            weights_used: [135, 145, 155]
          }
        ]
      };
      ({ error } = workoutSchemas.workoutLogSchema.validate(invalidExercise));
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('Sets completed must be at least 1');

      // Test invalid reps_completed (not an array)
      invalidExercise = {
        ...validWorkoutLog,
        exercises_completed: [
          {
            exercise_id: 'ex-123',
            exercise_name: 'Bench Press',
            sets_completed: 3,
            reps_completed: 'lots of reps', // Invalid: not an array
            weights_used: [135, 145, 155]
          }
        ]
      };
      ({ error } = workoutSchemas.workoutLogSchema.validate(invalidExercise));
      expect(error).toBeDefined();
      expect(error.details[0].type).toBe('array.base');

      // Test invalid weights_used (not an array)
      invalidExercise = {
        ...validWorkoutLog,
        exercises_completed: [
          {
            exercise_id: 'ex-123',
            exercise_name: 'Bench Press',
            sets_completed: 3,
            reps_completed: [8, 10, 12],
            weights_used: 135 // Invalid: not an array
          }
        ]
      };
      ({ error } = workoutSchemas.workoutLogSchema.validate(invalidExercise));
      expect(error).toBeDefined();
      expect(error.details[0].type).toBe('array.base');
    });
  });

  /**
   * Tests for workoutLogUpdateSchema
   */
  describe('workoutLogUpdateSchema', () => {
    // Valid update data for testing
    const validLogUpdate = {
      completed: false,
      exercises_completed: [
        {
          exercise_id: 'ex-123',
          exercise_name: 'Bench Press',
          sets_completed: 4,
          reps_completed: [8, 8, 10, 12],
          weights_used: [135, 135, 145, 155],
          felt_difficulty: 8,
          notes: 'Added an extra set'
        }
      ],
      overall_difficulty: 8,
      feedback: 'Updated feedback'
    };

    test('accepts valid partial update data', () => {
      const { error, value } = workoutSchemas.workoutLogUpdateSchema.validate(validLogUpdate);
      expect(error).toBeUndefined();
      expect(value).toEqual(validLogUpdate);
    });

    test('allows individual fields to be updated', () => {
      // Test updating only completed
      let partialUpdate = { completed: false };
      let { error } = workoutSchemas.workoutLogUpdateSchema.validate(partialUpdate);
      expect(error).toBeUndefined();

      // Test updating only feedback
      partialUpdate = { feedback: 'New feedback' };
      ({ error } = workoutSchemas.workoutLogUpdateSchema.validate(partialUpdate));
      expect(error).toBeUndefined();

      // Test updating only overall_difficulty
      partialUpdate = { overall_difficulty: 9 };
      ({ error } = workoutSchemas.workoutLogUpdateSchema.validate(partialUpdate));
      expect(error).toBeUndefined();
    });

    test('requires at least one field for update', () => {
      const emptyUpdate = {};
      const { error } = workoutSchemas.workoutLogUpdateSchema.validate(emptyUpdate);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('At least one field is required for updating workout log');
    });

    test('validates updated exercises_completed format', () => {
      // Test invalid exercise format within array
      const invalidUpdate = {
        exercises_completed: [
          {
            exercise_id: 'ex-123',
            // Missing exercise_name
            sets_completed: 3,
            reps_completed: [8, 10, 12],
            weights_used: [135, 145, 155]
          }
        ]
      };
      const { error } = workoutSchemas.workoutLogUpdateSchema.validate(invalidUpdate);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('Exercise name is required');
    });

    test('validates boundary conditions in update', () => {
      // Test invalid overall_difficulty
      let invalidUpdate = { overall_difficulty: 11 };
      let { error } = workoutSchemas.workoutLogUpdateSchema.validate(invalidUpdate);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('must be between 1 and 10');

      // Test invalid energy_level
      invalidUpdate = { energy_level: 0 };
      ({ error } = workoutSchemas.workoutLogUpdateSchema.validate(invalidUpdate));
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('must be between 1 and 10');

      // Test invalid feedback length
      invalidUpdate = { feedback: 'a'.repeat(1001) };
      ({ error } = workoutSchemas.workoutLogUpdateSchema.validate(invalidUpdate));
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('cannot exceed 1000 characters');
    });
  });

  /**
   * Tests for workoutLogQuerySchema
   */
  describe('workoutLogQuerySchema', () => {
    test('accepts valid query parameters with defaults', () => {
      const validQuery = {};
      const { error, value } = workoutSchemas.workoutLogQuerySchema.validate(validQuery);
      expect(error).toBeUndefined();
      // Check default values
      expect(value.limit).toBe(10);
      expect(value.offset).toBe(0);
    });

    test('accepts and validates custom query parameters', () => {
      const customQuery = {
        startDate: '2023-01-01', 
        endDate: '2023-01-31',   
        planId: '123e4567-e89b-12d3-a456-426614174000',
        limit: 20,
        offset: 5
      };

      const { error, value } = workoutSchemas.workoutLogQuerySchema.validate(customQuery);
      
      if (error) {
        console.error('[DEBUG] Joi validation error:', JSON.stringify(error.details, null, 2));
      }
      
      expect(error).toBeUndefined();

      expect(value.limit).toBe(20);
      expect(value.offset).toBe(5);
      expect(value.planId).toBe('123e4567-e89b-12d3-a456-426614174000');
      
      // Check that dates are parsed correctly - they should be Date objects
      expect(value.startDate instanceof Date).toBe(true);
      expect(value.endDate instanceof Date).toBe(true);
      
      // Verify date values
      expect(value.startDate.toISOString()).toContain('2023-01-01');
      expect(value.endDate.toISOString()).toContain('2023-01-31');
    });

    test('enforces limit and offset constraints', () => {
      // Test limit below min (1)
      let invalidQuery = { limit: 0 };
      let { error } = workoutSchemas.workoutLogQuerySchema.validate(invalidQuery);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('Limit must be at least 1');

      // Test limit above max (100)
      invalidQuery = { limit: 101 };
      ({ error } = workoutSchemas.workoutLogQuerySchema.validate(invalidQuery));
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('Limit cannot exceed 100');

      // Test offset below min (0)
      invalidQuery = { offset: -1 };
      ({ error } = workoutSchemas.workoutLogQuerySchema.validate(invalidQuery));
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('Offset must be at least 0');
    });

    test('validates date formats', () => {
      // Test invalid startDate
      let invalidQuery = { startDate: 'not-a-date' };
      let { error } = workoutSchemas.workoutLogQuerySchema.validate(invalidQuery);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('Start date must be a valid date');

      // Test invalid endDate
      invalidQuery = { endDate: 'not-a-date' };
      ({ error } = workoutSchemas.workoutLogQuerySchema.validate(invalidQuery));
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('End date must be a valid date');
    });

    test('validates planId format', () => {
      // Test invalid planId (not UUID)
      const invalidQuery = { planId: 'not-a-uuid' };
      const { error } = workoutSchemas.workoutLogQuerySchema.validate(invalidQuery);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('Plan ID must be a valid UUID');
    });
  });
}); 