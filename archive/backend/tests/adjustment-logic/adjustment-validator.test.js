const AdjustmentValidator = require('../../agents/adjustment-logic/adjustment-validator');

// Mock dependencies
const mockSupabaseClient = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  data: [],
  error: null,
  then: jest.fn(cb => cb({ data: [], error: null })),
  in: jest.fn()
};

jest.mock('../../services/supabase', () => ({
  getSupabaseClient: jest.fn(() => mockSupabaseClient)
}));

const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

describe('AdjustmentValidator', () => {
  let validator;
  let mockConfig;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock config
    mockConfig = {
      openai: {
        model: 'gpt-4-turbo'
      }
    };
    
    // Create validator instance
    validator = new AdjustmentValidator(mockSupabaseClient, mockConfig, mockLogger);
  });
  
  test('constructor should set properties correctly', () => {
    const mockClient = {};
    const mockConfig = { testKey: 'testValue' };
    const mockLogger = { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() };

    const validator = new AdjustmentValidator(mockClient, mockConfig, mockLogger);

    expect(validator.supabaseClient).toBe(mockClient);
    expect(validator.config).toBe(mockConfig);
    expect(validator.logger).toBe(mockLogger);
  });
  
  test('constructor should use default logger when not provided', () => {
    const mockClient = {};
    const mockConfig = { testKey: 'testValue' };
    
    const validator = new AdjustmentValidator(mockClient, mockConfig);
    
    // It should use the default logger module
    expect(validator.logger).toBeDefined();
    expect(validator.supabaseClient).toBe(mockClient);
    expect(validator.config).toBe(mockConfig);
  });
  
  describe('analyzeFeasibility', () => {
    const basePlan = {
      weeklySchedule: {
        Monday: { exercises: [{ exercise: 'Squat', sets: 3, reps: 10 }, { exercise: 'Bench Press', sets: 3, reps: 8 }] },
        Wednesday: { exercises: [{ exercise: 'Deadlift', sets: 1, reps: 5 }] }
      }
    };
    const baseUserProfile = { id: 'user1', fitnessLevel: 'intermediate', goals: ['strength'] };

    test('should mark substitution as feasible if original exercise exists', async () => {
      const feedback = { substitutions: [{ from: 'Squat', to: 'Leg Press' }] };
      const result = await validator.analyzeFeasibility(basePlan, feedback, baseUserProfile);
      expect(result.feasible).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'substitution', item: feedback.substitutions[0], reason: 'Original exercise found in plan.' })
      ]));
      expect(result.infeasible).toEqual([]);
    });

    test('should mark substitution as infeasible if original exercise does not exist', async () => {
      const feedback = { substitutions: [{ from: 'Overhead Press', to: 'Arnold Press' }] };
      const result = await validator.analyzeFeasibility(basePlan, feedback, baseUserProfile);
      expect(result.infeasible).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'substitution', item: feedback.substitutions[0], reason: "Exercise 'Overhead Press' not found in the original plan." })
      ]));
      expect(result.feasible).toEqual([]);
    });

    test('should mark volume adjustment as feasible if exercise exists', async () => {
      const feedback = { volumeAdjustments: [{ exercise: 'Bench Press', property: 'sets', change: 'increase' }] };
      const result = await validator.analyzeFeasibility(basePlan, feedback, baseUserProfile);
      expect(result.feasible).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'volumeAdjustment', item: feedback.volumeAdjustments[0], reason: 'Volume adjustment seems feasible.' })
      ]));
    });

    test('should mark volume adjustment as feasible if exercise is \'all\'', async () => {
      const feedback = { volumeAdjustments: [{ exercise: 'all', property: 'reps', change: 'decrease' }] };
      const result = await validator.analyzeFeasibility(basePlan, feedback, baseUserProfile);
      expect(result.feasible).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'volumeAdjustment', item: feedback.volumeAdjustments[0], reason: 'Volume adjustment seems feasible.' })
      ]));
    });

    test('should mark volume adjustment as infeasible if specific exercise does not exist', async () => {
      const feedback = { volumeAdjustments: [{ exercise: 'Cable Fly', property: 'sets', change: 'increase' }] };
      const result = await validator.analyzeFeasibility(basePlan, feedback, baseUserProfile);
      expect(result.infeasible).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'volumeAdjustment', item: feedback.volumeAdjustments[0], reason: "Exercise 'Cable Fly' not found for volume adjustment." })
      ]));
    });

    test('should mark intensity adjustment as feasible if exercise exists', async () => {
      const feedback = { intensityAdjustments: [{ exercise: 'Deadlift', parameter: 'RPE', change: 'increase' }] };
      const result = await validator.analyzeFeasibility(basePlan, feedback, baseUserProfile);
      expect(result.feasible).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'intensityAdjustment', item: feedback.intensityAdjustments[0], reason: 'Intensity adjustment seems feasible.' })
      ]));
    });

    test('should return empty feasible/infeasible for empty feedback arrays', async () => {
      const feedback = { substitutions: [], volumeAdjustments: [], intensityAdjustments: [] };
      const result = await validator.analyzeFeasibility(basePlan, feedback, baseUserProfile);
      expect(result.feasible).toEqual([]);
      expect(result.infeasible).toEqual([]);
    });

    test('should handle null or undefined feedback categories gracefully', async () => {
      const feedback1 = { substitutions: null, volumeAdjustments: undefined }; // No intensityAdjustments
      let result = await validator.analyzeFeasibility(basePlan, feedback1, baseUserProfile);
      expect(result.feasible).toEqual([]);
      expect(result.infeasible).toEqual([]);

      const feedback2 = {}; // completely empty feedback
      result = await validator.analyzeFeasibility(basePlan, feedback2, baseUserProfile);
      expect(result.feasible).toEqual([]);
      expect(result.infeasible).toEqual([]);
    });
  });
  
  describe('checkSafety', () => {
    let baseUserProfile;
    let plan;

    beforeEach(() => {
      baseUserProfile = { id: 'user1', medical_conditions: ['knee pain'], fitnessLevel: 'beginner', goals: ['weight loss'] };
      plan = { /* ... some plan structure ... */ }; // Not directly used by checkSafety but good for context
      // Reset and configure Supabase mock for _fetchContraindications
      mockSupabaseClient.from.mockReturnThis();
      mockSupabaseClient.select.mockReturnThis();
      mockSupabaseClient.in.mockImplementation(async () => ({ data: [], error: null }));
    });

    test('should mark substitution as safe if no contraindications or warnings', async () => {
      const feedback = { substitutions: [{ from: 'Squat', to: 'Leg Press' }] };
      // _isSubstitutionSafe will be called, assume it returns safe by default if no matching contraindications
      const result = await validator.checkSafety(feedback, baseUserProfile);
      expect(result.safeRequests).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'substitution', item: feedback.substitutions[0] })
      ]));
      expect(result.unsafeRequests).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    test('should mark substitution as unsafe if contraindicated', async () => {
      const feedback = { substitutions: [{ from: 'Squat', to: 'Box Jump' }] }; // Assume Box Jump is bad for knees
      mockSupabaseClient.in.mockImplementationOnce(async () => ({
        data: [{ condition: 'knee pain', exercises_to_avoid: ['box jump'] }],
        error: null,
      }));
      const result = await validator.checkSafety(feedback, baseUserProfile);
      expect(result.unsafeRequests).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'substitution', item: feedback.substitutions[0], reason: expect.stringContaining('contraindicated due to user condition: knee pain') })
      ]));
      expect(result.safeRequests).toEqual([]);
    });

    test('should add warning for substitution if _isSubstitutionSafe returns a warning', async () => {
      const feedback = { substitutions: [{ from: 'Squat', to: 'High-Intensity Jump Squat' }] };
      // Mock _isSubstitutionSafe to return a warning specifically for this test
      const originalIsSubstitutionSafe = validator._isSubstitutionSafe;
      validator._isSubstitutionSafe = jest.fn(() => ({ safe: true, warning: 'Exercise involves jumping, ensure appropriate for knee.' }));
      
      const result = await validator.checkSafety(feedback, baseUserProfile);
      expect(result.safeRequests).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'substitution', item: feedback.substitutions[0] })
      ]));
      expect(result.warnings).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'substitution', item: feedback.substitutions[0], message: 'Exercise involves jumping, ensure appropriate for knee.' })
      ]));
      validator._isSubstitutionSafe = originalIsSubstitutionSafe; // Restore original
    });

    test('should add warning for volume increase adjustment', async () => {
      const feedback = { volumeAdjustments: [{ exercise: 'Squat', property: 'sets', change: 'increase', value: '5' }] };
      const result = await validator.checkSafety(feedback, baseUserProfile);
      expect(result.safeRequests).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'volumeAdjustment', item: feedback.volumeAdjustments[0] })
      ]));
      expect(result.warnings).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'volumeAdjustment', item: feedback.volumeAdjustments[0], message: 'Large volume increases should be done cautiously. Ensure adequate recovery.' })
      ]));
    });

    test('should not add specific volume warning for decrease/set adjustment', async () => {
      const feedback = { volumeAdjustments: [{ exercise: 'Squat', property: 'sets', change: 'decrease' }] };
      const result = await validator.checkSafety(feedback, baseUserProfile);
      expect(result.safeRequests).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'volumeAdjustment', item: feedback.volumeAdjustments[0] })
      ]));
      const volumeWarnings = result.warnings.filter(w => w.type === 'volumeAdjustment');
      expect(volumeWarnings.some(w => w.message.includes('Large volume increases'))).toBe(false);
    });
    
    test('should add warning for intensity increase adjustment', async () => {
      const feedback = { intensityAdjustments: [{ exercise: 'all', parameter: 'RPE', change: 'increase' }] };
      const result = await validator.checkSafety(feedback, baseUserProfile);
      expect(result.safeRequests).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'intensityAdjustment', item: feedback.intensityAdjustments[0] })
      ]));
      expect(result.warnings).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'intensityAdjustment', item: feedback.intensityAdjustments[0], message: 'Significant intensity increases require careful progression and form focus.' })
      ]));
    });

    test('should add warning for pain concerns', async () => {
      const feedback = { painConcerns: [{ area: 'shoulder', exercise: 'Overhead Press', severity: 'mild' }] };
      const result = await validator.checkSafety(feedback, baseUserProfile);
      expect(result.warnings).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'painConcern', item: feedback.painConcerns[0], message: 'Review exercises potentially affecting the shoulder area due to reported pain.' })
      ]));
    });

    test('should continue and use empty contraindications if _fetchContraindications fails', async () => {
      mockSupabaseClient.in.mockImplementationOnce(async () => ({ data: null, error: { message: 'DB error'} }));
      const feedback = { substitutions: [{ from: 'Squat', to: 'Leg Press' }] }; // Should still be safe by default
      const result = await validator.checkSafety(feedback, baseUserProfile);
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Failed to fetch contraindications: DB error'));
      expect(result.safeRequests.length).toBe(1);
      expect(result.unsafeRequests.length).toBe(0);
    });

    test('should return default structure for empty feedback', async () => {
      const feedback = {};
      const result = await validator.checkSafety(feedback, baseUserProfile);
      expect(result.safeRequests).toEqual([]);
      expect(result.unsafeRequests).toEqual([]);
      expect(result.warnings).toEqual([]);
    });
  });
  
  describe('verifyCoherence', () => {
    let basePlan;
    let baseUserProfile;

    beforeEach(() => {
      basePlan = { weeklySchedule: { Monday: { exercises: [{ exercise: 'Squat'}] } } }; // Simplified
      baseUserProfile = { id: 'user1', fitnessLevel: 'intermediate', goals: ['strength'] };
      // Mock helper methods behavior for coherence checks
      validator._isCompound = jest.fn(name => name?.toLowerCase().includes('squat') || name?.toLowerCase().includes('bench'));
      validator._isIsolation = jest.fn(name => name?.toLowerCase().includes('curl') || name?.toLowerCase().includes('fly'));
    });

    test('should mark substitution as coherent if types align with strength goal (Comp->Comp)', async () => {
      const feedback = { substitutions: [{ from: 'Squat', to: 'Front Squat' }] }; // Comp -> Comp
      validator._isCompound.mockImplementation(name => name.toLowerCase().includes('squat')); // Both are compound
      const result = await validator.verifyCoherence(basePlan, feedback, baseUserProfile);
      expect(result.coherent).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'substitution', item: feedback.substitutions[0] })
      ]));
      expect(result.incoherent).toEqual([]);
    });

    test('should mark substitution as incoherent if Comp->Iso for strength goal', async () => {
      const feedback = { substitutions: [{ from: 'Squat', to: 'Leg Curl' }] }; // Comp -> Iso
      // _isCompound for 'Squat' is true, _isIsolation for 'Leg Curl' is true by default mock setup
      const result = await validator.verifyCoherence(basePlan, feedback, baseUserProfile);
      expect(result.incoherent).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'substitution', item: feedback.substitutions[0], reason: expect.stringContaining('might not optimally align with strength goals') })
      ]));
      expect(result.coherent).toEqual([]);
    });

    test('should mark substitution as coherent if Iso->Comp for strength goal', async () => {
      const feedback = { substitutions: [{ from: 'Leg Curl', to: 'Squat' }] }; // Iso -> Comp
      const result = await validator.verifyCoherence(basePlan, feedback, baseUserProfile);
      expect(result.coherent).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'substitution', item: feedback.substitutions[0] })
      ]));
    });
    
    test('should mark volume increase as coherent for muscle_gain goal', async () => {
      baseUserProfile.goals = ['muscle_gain'];
      const feedback = { volumeAdjustments: [{ exercise: 'Squat', property: 'sets', change: 'increase' }] };
      const result = await validator.verifyCoherence(basePlan, feedback, baseUserProfile);
      expect(result.coherent).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'volumeAdjustment', item: feedback.volumeAdjustments[0] })
      ]));
      expect(result.incoherent).toEqual([]);
    });

    test('should mark volume decrease as incoherent for muscle_gain goal', async () => {
      baseUserProfile.goals = ['muscle_gain'];
      const feedback = { volumeAdjustments: [{ exercise: 'Squat', property: 'sets', change: 'decrease' }] };
      const result = await validator.verifyCoherence(basePlan, feedback, baseUserProfile);
      expect(result.incoherent).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'volumeAdjustment', item: feedback.volumeAdjustments[0], reason: expect.stringContaining('might hinder muscle gain goals') })
      ]));
      expect(result.coherent).toEqual([]);
    });

    test('should return empty coherent/incoherent for empty feedback arrays', async () => {
      const feedback = { substitutions: [], volumeAdjustments: [] };
      const result = await validator.verifyCoherence(basePlan, feedback, baseUserProfile);
      expect(result.coherent).toEqual([]);
      expect(result.incoherent).toEqual([]);
    });

    test('should handle null or undefined feedback categories gracefully', async () => {
      const feedback1 = { substitutions: null }; // No volumeAdjustments
      let result = await validator.verifyCoherence(basePlan, feedback1, baseUserProfile);
      expect(result.coherent).toEqual([]);
      expect(result.incoherent).toEqual([]);

      const feedback2 = {}; // Completely empty feedback
      result = await validator.verifyCoherence(basePlan, feedback2, baseUserProfile);
      expect(result.coherent).toEqual([]);
      expect(result.incoherent).toEqual([]);
    });
  });
  
  describe('validateAdjustedPlan', () => {
    let baseUserProfile;
    let validPlanStructure;

    beforeEach(() => {
      baseUserProfile = { id: 'user1', fitnessLevel: 'intermediate', goals: ['strength'], preferences: { workoutFrequency: '3x per week' }, medical_conditions: [] };
      validPlanStructure = {
        planId: 'plan123',
        planName: "Validated Plan",
        updated_at: new Date().toISOString(),
        weeklySchedule: {
          Monday: { sessionName: "Chest Day", exercises: [{ exercise: 'Bench Press', sets: 4, repsOrDuration: '6-8' }] },
          Tuesday: "Rest",
          Wednesday: { sessionName: "Leg Day", exercises: [{ exercise: 'Squat', sets: 3, repsOrDuration: '8-10' }] },
          Thursday: "Rest",
          Friday: { sessionName: "Back Day", exercises: [{ exercise: 'Deadlift', sets: 1, repsOrDuration: '5' }] },
          Saturday: "Rest",
          Sunday: "Rest"
        }
      };
      // Reset and configure Supabase mock for _fetchContraindications
      mockSupabaseClient.from.mockReturnThis();
      mockSupabaseClient.select.mockReturnThis();
      mockSupabaseClient.in.mockImplementation(async () => ({ data: [], error: null }));
    });

    test('should pass for a valid plan structure with no concurrency issue', async () => {
      const { isValid, issues } = await validator.validateAdjustedPlan(validPlanStructure, baseUserProfile);
      expect(isValid).toBe(true);
      expect(issues).toEqual([]);
    });

    test('should identify concurrency issue if originalUpdatedAt is newer', async () => {
      const olderPlanDate = new Date();
      olderPlanDate.setDate(olderPlanDate.getDate() - 1);
      const planWithStaleUpdate = { ...validPlanStructure, updated_at: olderPlanDate.toISOString() };
      const originalTimestamp = new Date().toISOString(); // Fresher timestamp

      const { isValid, issues } = await validator.validateAdjustedPlan(planWithStaleUpdate, baseUserProfile, originalTimestamp);
      // Concurrency is a warning, so isValid might still be true if no other issues
      // expect(isValid).toBe(false); // Or true, depending on how strictly concurrency is treated
      expect(issues).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'concurrency', message: expect.stringContaining('Potential concurrency conflict') })
      ]));
      // Check that the specific concurrency warning was logged among any calls to logger.warn
      const warnCalls = mockLogger.warn.mock.calls;
      expect(warnCalls.some(call => call[0].includes('Concurrency warning detected for plan plan123'))).toBe(true);
    });

    test('should fail if adjustedPlan is null or not an object', async () => {
      let result = await validator.validateAdjustedPlan(null, baseUserProfile);
      expect(result.isValid).toBe(false);
      expect(result.issues[0]).toMatchObject({ type: 'structure', message: 'Adjusted plan is null or not an object.' });

      result = await validator.validateAdjustedPlan("not an object", baseUserProfile);
      expect(result.isValid).toBe(false);
      expect(result.issues[0]).toMatchObject({ type: 'structure', message: 'Adjusted plan is null or not an object.' });
    });

    test('should fail if planName is missing or invalid', async () => {
      const planMissingName = { ...validPlanStructure, planName: null };
      const { isValid, issues } = await validator.validateAdjustedPlan(planMissingName, baseUserProfile);
      expect(isValid).toBe(false);
      expect(issues).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'structure', message: 'Plan name is missing or invalid.' })
      ]));
    });

    test('should fail if weeklySchedule is missing or invalid', async () => {
      const planMissingSchedule = { ...validPlanStructure, weeklySchedule: null };
      const { isValid, issues } = await validator.validateAdjustedPlan(planMissingSchedule, baseUserProfile);
      expect(isValid).toBe(false);
      expect(issues).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'structure', message: 'Weekly schedule is missing or invalid.' })
      ]));
    });

    test('should fail if a day entry in weeklySchedule is invalid (not Rest or object)', async () => {
      const planInvalidDayEntry = {
        ...validPlanStructure,
        weeklySchedule: { ...validPlanStructure.weeklySchedule, Tuesday: 123 },
      };
      const { isValid, issues } = await validator.validateAdjustedPlan(planInvalidDayEntry, baseUserProfile);
      expect(isValid).toBe(false);
      expect(issues).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'schedule', day: 'Tuesday', message: expect.stringContaining('Invalid entry for day') })
      ]));
    });

    test('should fail if a session is null or not an object', async () => {
      const planInvalidSession = {
        ...validPlanStructure,
        weeklySchedule: { ...validPlanStructure.weeklySchedule, Monday: null },
      };
      const { isValid, issues } = await validator.validateAdjustedPlan(planInvalidSession, baseUserProfile);
      expect(isValid).toBe(false);
      // Note: The current implementation, if a session is null, it might be treated like a "Rest" day or pass initial checks before exercise validation.
      // This test will verify current behavior. Depending on strictness, this might be fine or need adjustment in impl.
      // Based on current code: it will be caught by `typeof session === 'object' && session !== null` failing, and then `typeof session !== 'string' || session.toLowerCase() !== 'rest'` also being true.
      expect(issues).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'schedule', day: 'Monday', message: expect.stringContaining('Invalid entry for day: expected workout object or "Rest", got object') })
      ]));

      const planInvalidSessionType = {
        ...validPlanStructure,
        weeklySchedule: { ...validPlanStructure.weeklySchedule, Monday: "NotAnObjectOrRest" },
      };
      const result2 = await validator.validateAdjustedPlan(planInvalidSessionType, baseUserProfile);
      expect(result2.isValid).toBe(false);
      expect(result2.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'schedule', day: 'Monday', message: expect.stringContaining('Invalid entry for day: expected workout object or "Rest", got string') })
      ]));
    });

    test('should fail if sessionName is missing or invalid', async () => {
      const planInvalidSessionName = JSON.parse(JSON.stringify(validPlanStructure)); // Deep copy
      planInvalidSessionName.weeklySchedule.Monday.sessionName = null;
      const { isValid, issues } = await validator.validateAdjustedPlan(planInvalidSessionName, baseUserProfile);
      expect(isValid).toBe(false);
      expect(issues).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'session', day: 'Monday', message: 'Session name is missing or invalid.' })
      ]));
    });

    test('should fail if session exercises array is missing or invalid', async () => {
      const planInvalidExercisesArray = JSON.parse(JSON.stringify(validPlanStructure));
      planInvalidExercisesArray.weeklySchedule.Monday.exercises = null;
      let result = await validator.validateAdjustedPlan(planInvalidExercisesArray, baseUserProfile);
      expect(result.isValid).toBe(false);
      expect(result.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'session', day: 'Monday', message: 'Exercises array is missing or invalid.' })
      ]));

      const planNotArrayExercises = JSON.parse(JSON.stringify(validPlanStructure));
      planNotArrayExercises.weeklySchedule.Monday.exercises = "not an array";
      result = await validator.validateAdjustedPlan(planNotArrayExercises, baseUserProfile);
      expect(result.isValid).toBe(false);
      expect(result.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'session', day: 'Monday', message: 'Exercises array is missing or invalid.' })
      ]));
    });

    test('should fail if session exercises array is empty', async () => {
      const planEmptyExercises = JSON.parse(JSON.stringify(validPlanStructure));
      planEmptyExercises.weeklySchedule.Monday.exercises = [];
      const { isValid, issues } = await validator.validateAdjustedPlan(planEmptyExercises, baseUserProfile);
      expect(isValid).toBe(false);
      expect(issues).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'session', day: 'Monday', message: 'Workout session has no exercises.' })
      ]));
    });

    test('should fail if an exercise object is invalid', async () => {
      const planInvalidExerciseObj = JSON.parse(JSON.stringify(validPlanStructure));
      planInvalidExerciseObj.weeklySchedule.Monday.exercises[0] = null;
      const { isValid, issues } = await validator.validateAdjustedPlan(planInvalidExerciseObj, baseUserProfile);
      expect(isValid).toBe(false);
      expect(issues).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'exercise', day: 'Monday', index: 0, message: 'Invalid exercise object.' })
      ]));
    });

    test('should fail if exercise.exercise name is missing or invalid', async () => {
      const planInvalidExName = JSON.parse(JSON.stringify(validPlanStructure));
      planInvalidExName.weeklySchedule.Monday.exercises[0].exercise = null;
      const { isValid, issues } = await validator.validateAdjustedPlan(planInvalidExName, baseUserProfile);
      expect(isValid).toBe(false);
      expect(issues).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'exercise', day: 'Monday', index: 0, message: 'Exercise name is missing or invalid.' })
      ]));
    });

    test('should fail if exercise.sets is not a positive number', async () => {
      const planInvalidSets1 = JSON.parse(JSON.stringify(validPlanStructure));
      planInvalidSets1.weeklySchedule.Monday.exercises[0].sets = 0;
      let result = await validator.validateAdjustedPlan(planInvalidSets1, baseUserProfile);
      expect(result.isValid).toBe(false);
      expect(result.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'exercise', day: 'Monday', index: 0, name: 'Bench Press', message: 'Sets must be a positive number.' })
      ]));

      const planInvalidSets2 = JSON.parse(JSON.stringify(validPlanStructure));
      planInvalidSets2.weeklySchedule.Monday.exercises[0].sets = 'not a number';
      result = await validator.validateAdjustedPlan(planInvalidSets2, baseUserProfile);
      expect(result.isValid).toBe(false);
      expect(result.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'exercise', day: 'Monday', index: 0, name: 'Bench Press', message: 'Sets must be a positive number.' })
      ]));
    });

    test('should fail if exercise.repsOrDuration is not a non-empty string', async () => {
      const planInvalidReps1 = JSON.parse(JSON.stringify(validPlanStructure));
      planInvalidReps1.weeklySchedule.Monday.exercises[0].repsOrDuration = '';
      let result = await validator.validateAdjustedPlan(planInvalidReps1, baseUserProfile);
      expect(result.isValid).toBe(false);
      expect(result.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'exercise', day: 'Monday', index: 0, name: 'Bench Press', message: 'Reps/Duration must be a non-empty string.' })
      ]));

      const planInvalidReps2 = JSON.parse(JSON.stringify(validPlanStructure));
      planInvalidReps2.weeklySchedule.Monday.exercises[0].repsOrDuration = null;
      result = await validator.validateAdjustedPlan(planInvalidReps2, baseUserProfile);
      expect(result.isValid).toBe(false);
      expect(result.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'exercise', day: 'Monday', index: 0, name: 'Bench Press', message: 'Reps/Duration must be a non-empty string.' })
      ]));
    });

    test('should fail if workout frequency preference does not match total workout days', async () => {
      const planFrequencyMismatch = JSON.parse(JSON.stringify(validPlanStructure)); // 3 workout days
      const userProfileWithPref = { ...baseUserProfile, preferences: { workoutFrequency: '5x per week' } };
      const { isValid, issues } = await validator.validateAdjustedPlan(planFrequencyMismatch, userProfileWithPref);
      expect(isValid).toBe(false);
      expect(issues).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'coherence', message: 'Plan has 3 workout days, but user preference is 5x per week.' })
      ]));
    });

    test('should fail for overtraining risk if >= 6 workout days and not advanced level', async () => {
      const planOvertraining = JSON.parse(JSON.stringify(validPlanStructure));
      planOvertraining.weeklySchedule.Tuesday = { sessionName: "Shoulder Day", exercises: [{ exercise: 'OHP', sets: 3, repsOrDuration: '8-12' }] }; // 4 days
      planOvertraining.weeklySchedule.Thursday = { sessionName: "Arm Day", exercises: [{ exercise: 'Curls', sets: 3, repsOrDuration: '10-15' }] }; // 5 days
      planOvertraining.weeklySchedule.Saturday = { sessionName: "Full Body Light", exercises: [{ exercise: 'Rows', sets: 3, repsOrDuration: '12-15' }] }; // 6 days
      const userProfileIntermediate = { ...baseUserProfile, fitnessLevel: 'intermediate', preferences: { workoutFrequency: '6x per week'} }; // Pref matches but level doesn't allow
      
      const { isValid, issues } = await validator.validateAdjustedPlan(planOvertraining, userProfileIntermediate);
      expect(isValid).toBe(false);
      expect(issues).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'safety', message: expect.stringContaining('High workout frequency (6 days) may increase overtraining risk for intermediate level.') })
      ]));
    });

    test('should pass overtraining check if >= 6 workout days and advanced level', async () => {
      const planAdvancedHighFrequency = JSON.parse(JSON.stringify(validPlanStructure));
      planAdvancedHighFrequency.weeklySchedule.Tuesday = { sessionName: "Shoulder Day", exercises: [{ exercise: 'OHP', sets: 3, repsOrDuration: '8-12' }] }; 
      planAdvancedHighFrequency.weeklySchedule.Thursday = { sessionName: "Arm Day", exercises: [{ exercise: 'Curls', sets: 3, repsOrDuration: '10-15' }] }; 
      planAdvancedHighFrequency.weeklySchedule.Saturday = { sessionName: "Full Body Light", exercises: [{ exercise: 'Rows', sets: 3, repsOrDuration: '12-15' }] }; 
      const userProfileAdvanced = { ...baseUserProfile, fitnessLevel: 'advanced', preferences: { workoutFrequency: '6x per week'} };
      
      const { isValid, issues } = await validator.validateAdjustedPlan(planAdvancedHighFrequency, userProfileAdvanced);
      // Assuming frequency matches preference and no other issues.
      const nonOvertrainingIssues = issues.filter(issue => !issue.message.includes('High workout frequency'));
      //This test only checks if the overtraining specific issue is NOT present.
      //It assumes other parts of the plan are valid for an advanced user.
      const overtrainingIssuePresent = issues.some(issue => issue.type === 'safety' && issue.message.includes('High workout frequency'));
      expect(overtrainingIssuePresent).toBe(false);
      // If there are other unrelated issues, isValid might be false, but the overtraining check itself passed.
    });

    test('should fail if total workout days is zero', async () => {
      const planZeroDays = {
        ...validPlanStructure,
        weeklySchedule: {
          Monday: "Rest", Tuesday: "Rest", Wednesday: "Rest", Thursday: "Rest", Friday: "Rest", Saturday: "Rest", Sunday: "Rest"
        }
      };
      const { isValid, issues } = await validator.validateAdjustedPlan(planZeroDays, baseUserProfile);
      expect(isValid).toBe(false);
      expect(issues).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'coherence', message: 'The adjusted plan has no workout days scheduled.' })
      ]));
    });

    test('should fail if an exercise is contraindicated', async () => {
      const planWithContraindicatedEx = JSON.parse(JSON.stringify(validPlanStructure));
      planWithContraindicatedEx.weeklySchedule.Monday.exercises.push({ exercise: 'Box Jump', sets: 3, repsOrDuration: '10' });
      const userWithKneePain = { ...baseUserProfile, medical_conditions: ['knee pain'] };
      mockSupabaseClient.in.mockImplementationOnce(async () => ({
        data: [{ condition: 'knee pain', exercises_to_avoid: ['box jump'] }],
        error: null,
      }));

      const { isValid, issues } = await validator.validateAdjustedPlan(planWithContraindicatedEx, userWithKneePain);
      expect(isValid).toBe(false);
      expect(issues).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'safety', name: 'Box Jump', message: expect.stringContaining('Exercise may be contraindicated: Exercise \'Box Jump\' is contraindicated due to user condition: knee pain.') })
      ]));
    });

    test('should proceed without contraindication check if fetch fails, and pass if otherwise valid', async () => {
      const userProfileWithCondition = { ...baseUserProfile, medical_conditions: ['some condition'] };
      mockSupabaseClient.in.mockImplementationOnce(async () => ({ data: null, error: { message: 'DB error'} }));
      const { isValid, issues } = await validator.validateAdjustedPlan(validPlanStructure, userProfileWithCondition);
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('[AdjustmentValidator] Failed to fetch contraindications: DB error'));
      // Check that no safety issue related to contraindication was added.
      const contraindicationIssue = issues.find(issue => issue.message && issue.message.includes('contraindicated'));
      expect(contraindicationIssue).toBeUndefined();
      expect(isValid).toBe(true); // Assuming validPlanStructure is otherwise fine
    });

  });
  
  test('_findExerciseInPlan should locate exercises in the plan', () => {
    const plan = {
      weeklySchedule: {
        Monday: {
          exercises: [
            { exercise: 'Squat', sets: 3 },
            { exercise: 'Bench Press', sets: 3 }
          ]
        }
      }
    };
    
    const result = validator._findExerciseInPlan(plan, 'Squat');
    const negativeResult = validator._findExerciseInPlan(plan, 'Deadlift');
    
    expect(result).toBe(true);
    expect(negativeResult).toBe(false);
  });
  
  test('_fetchContraindications should handle empty conditions', async () => {
    const result = await validator._fetchContraindications([]);
    
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });
  
  test('_isSubstitutionSafe should evaluate exercise safety', () => {
    const result = validator._isSubstitutionSafe(
      'Squat', 
      ['knee_pain'], 
      []
    );
    
    expect(result).toHaveProperty('safe');
    expect(typeof result.safe).toBe('boolean');
  });
  
  test('_isCompound should identify compound exercises', () => {
    const result = validator._isCompound('Bench Press');
    const negativeResult = validator._isCompound('Bicep Curl');
    
    expect(result).toBe(true);
    expect(negativeResult).toBe(false);
  });
  
  test('_isIsolation should identify isolation exercises', () => {
    const result = validator._isIsolation('Bicep Curl');
    const negativeResult = validator._isIsolation('Squat');
    
    expect(result).toBe(true);
    expect(negativeResult).toBe(false);
  });
}); 