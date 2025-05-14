const PlanModifier = require('../../../agents/adjustment-logic/plan-modifier');
const { SupabaseClient } = require('../../../services/supabase'); // Mocked
const logger = require('../../../config/logger');

jest.mock('../../../services/supabase');
jest.mock('../../../config/logger');

// Get the mocked logger instance
const mockLogger = require('../../../config/logger');

// Mock test data
const getTestPlan = () => JSON.parse(JSON.stringify({
    planId: "original_123",
    planName: "Strength Basics",
    weeklySchedule: {
        Monday: {
            sessionName: "Upper Body A",
            exercises: [
                { exercise: "Bench Press", sets: 3, repsOrDuration: "6-8", rest: "90s" },
                { exercise: "Overhead Press", sets: 3, repsOrDuration: "8-10", rest: "60s" }
            ]
        },
        Wednesday: {
            sessionName: "Lower Body",
            exercises: [
                { exercise: "Squats", sets: 4, repsOrDuration: "5-7", rest: "120s" },
                { exercise: "Romanian Deadlift", sets: 3, repsOrDuration: "8-10", rest: "90s" }
            ]
        },
        Friday: {
            sessionName: "Upper Body B",
            exercises: [
                { exercise: "Pull-ups", sets: 3, repsOrDuration: "AMRAP", rest: "90s" },
                { exercise: "Barbell Rows", sets: 4, repsOrDuration: "6-8", rest: "60s" }
            ]
        },
        Tuesday: "Rest",
        Thursday: "Rest",
        Saturday: "Rest",
        Sunday: "Rest"
    }
}));

describe('PlanModifier (Step 8.3C - Modification Part)', () => {
    let modifier;
    let mockSupabaseClient;

    beforeEach(() => {
        jest.clearAllMocks();
        mockSupabaseClient = { from: jest.fn() }; // Basic mock

        // Mock logger
        mockLogger.info = jest.fn();
        mockLogger.warn = jest.fn();
        mockLogger.error = jest.fn();
        mockLogger.debug = jest.fn();

        modifier = new PlanModifier(mockSupabaseClient, {}, mockLogger);
    });

    // --- Initialization ---
    it('should initialize correctly', () => {
        expect(modifier.supabaseClient).toBe(mockSupabaseClient);
        expect(modifier.logger).toBe(mockLogger);
        expect(mockLogger.info).toHaveBeenCalledWith('[PlanModifier] Initialized.');
    });

    // --- _modifyExercises ---
    describe('_modifyExercises', () => {
        it('should substitute an existing exercise', () => {
            const plan = getTestPlan();
            const substitution = { from: "Squats", to: "Leg Press", reason: "Knee friendly" };
            const result = modifier._modifyExercises(plan, substitution);

            expect(result.changed).toBe(true);
            expect(result.day).toBe('Wednesday');
            expect(result.exercise).toBe('Leg Press');
            expect(plan.weeklySchedule.Wednesday.exercises[0].exercise).toBe('Leg Press');
            expect(plan.weeklySchedule.Wednesday.exercises[0].notes).toContain('Substituted from Squats (Knee friendly)');
        });

        it('should not change if exercise to substitute is not found', () => {
            const plan = getTestPlan();
            const substitution = { from: "NonExistent", to: "Leg Press" };
            const result = modifier._modifyExercises(plan, substitution);

            expect(result.changed).toBe(false);
            expect(result.outcome).toContain('not found');
            expect(plan.weeklySchedule.Wednesday.exercises[0].exercise).toBe('Squats'); // Unchanged
        });
         
         it('should substitute only on the target day/index if provided', () => {
             const plan = getTestPlan();
             // Add squats to another day
             plan.weeklySchedule.Friday.exercises.push({ exercise: "Squats", sets: 3, repsOrDuration: "10" });
             
             const substitution = { from: "Squats", to: "Goblet Squat" };
             const result = modifier._modifyExercises(plan, substitution, 'Wednesday', 0);
             
             expect(result.changed).toBe(true);
             expect(result.day).toBe('Wednesday');
             expect(plan.weeklySchedule.Wednesday.exercises[0].exercise).toBe('Goblet Squat');
             expect(plan.weeklySchedule.Friday.exercises[2].exercise).toBe('Squats'); // Friday unchanged
         });
    });

    // --- _adjustVolume ---
    describe('_adjustVolume', () => {
        it('should increase sets for a specific exercise', () => {
            const plan = getTestPlan();
            const adjustment = { exercise: "Bench Press", property: "sets", change: "increase" };
            const result = modifier._adjustVolume(plan, adjustment);

            expect(result.changed).toBe(true);
            expect(plan.weeklySchedule.Monday.exercises[0].sets).toBe(4);
        });
        
         it('should set specific set value', () => {
            const plan = getTestPlan();
            const adjustment = { exercise: "Bench Press", property: "sets", change: "increase", value: "5" };
            const result = modifier._adjustVolume(plan, adjustment);
            expect(result.changed).toBe(true);
            expect(plan.weeklySchedule.Monday.exercises[0].sets).toBe(5);
        });

        it('should decrease reps for a range', () => {
            const plan = getTestPlan();
            const adjustment = { exercise: "Overhead Press", property: "reps", change: "decrease" };
            const result = modifier._adjustVolume(plan, adjustment);

            expect(result.changed).toBe(true);
            expect(plan.weeklySchedule.Monday.exercises[1].repsOrDuration).toBe("7-9");
        });
        
        it('should increase reps for a single value', () => {
            const plan = getTestPlan();
             // Add an exercise with single rep value
             plan.weeklySchedule.Monday.exercises.push({ exercise: "Curls", sets: 3, repsOrDuration: "12", rest: "60s" });
            const adjustment = { exercise: "Curls", property: "reps", change: "increase" };
            const result = modifier._adjustVolume(plan, adjustment);

            expect(result.changed).toBe(true);
            expect(plan.weeklySchedule.Monday.exercises[2].repsOrDuration).toBe("14");
        });

        it('should adjust volume for "all" exercises', () => {
            const plan = getTestPlan();
            const adjustment = { exercise: "all", property: "sets", change: "increase" };
            const result = modifier._adjustVolume(plan, adjustment);

            expect(result.changed).toBe(true);
            expect(plan.weeklySchedule.Monday.exercises[0].sets).toBe(4); // Bench Press
            expect(plan.weeklySchedule.Wednesday.exercises[0].sets).toBe(5); // Squats
            expect(plan.weeklySchedule.Friday.exercises[1].sets).toBe(5); // Barbell Rows
        });
    });

    // --- _adjustIntensity ---
    describe('_adjustIntensity', () => {
        it('should add an intensity note to a specific exercise', () => {
            const plan = getTestPlan();
            const adjustment = { exercise: "Bench Press", parameter: "weight", change: "increase", value: "5kg", reason: "Progress" };
            const result = modifier._adjustIntensity(plan, adjustment);

            expect(result.changed).toBe(true);
            expect(plan.weeklySchedule.Monday.exercises[0].notes).toBe("Increase weight to 5kg (Progress)");
        });

        it('should append intensity note if notes already exist', () => {
            const plan = getTestPlan();
            plan.weeklySchedule.Monday.exercises[0].notes = "Focus on form";
            const adjustment = { exercise: "Bench Press", parameter: "RPE", change: "increase", value: "8" };
            const result = modifier._adjustIntensity(plan, adjustment);

            expect(result.changed).toBe(true);
            expect(plan.weeklySchedule.Monday.exercises[0].notes).toBe("Focus on form; Increase RPE to 8");
        });

        it('should add intensity notes to "all" exercises', () => {
            const plan = getTestPlan();
            const adjustment = { exercise: "all", parameter: "tempo", change: "decrease", value: "slower" };
            const result = modifier._adjustIntensity(plan, adjustment);

            expect(result.changed).toBe(true);
            // Check a few exercises
            expect(plan.weeklySchedule.Monday.exercises[0].notes).toContain('Decrease tempo to slower');
            expect(plan.weeklySchedule.Wednesday.exercises[1].notes).toContain('Decrease tempo to slower');
        });
    });

    // --- _modifySchedule ---
    describe('_modifySchedule', () => {
        it('should move a workout day to a rest day', () => {
            const plan = getTestPlan();
            const change = { type: 'move', details: 'Move Monday workout to Tuesday' };
            const result = modifier._modifySchedule(plan, change);

            expect(result.changed).toBe(true);
            expect(result.outcome).toContain('Moved workout from Monday to Tuesday');
            expect(plan.weeklySchedule.Tuesday).toEqual(expect.objectContaining({ sessionName: "Upper Body A" }));
            expect(plan.weeklySchedule.Monday).toBe('Rest');
        });

        it('should fail to move if target day is not a rest day', () => {
            const plan = getTestPlan();
            const change = { type: 'move', details: 'Move Monday to Wednesday' };
            const result = modifier._modifySchedule(plan, change);

            expect(result.changed).toBe(false);
            expect(result.outcome).toContain("Target day 'Wednesday' already has a workout");
            expect(plan.weeklySchedule.Monday).toEqual(expect.objectContaining({ sessionName: "Upper Body A" }));
            expect(plan.weeklySchedule.Wednesday).toEqual(expect.objectContaining({ sessionName: "Lower Body" }));
        });
        
         it('should fail to move if source day is not a workout day', () => {
            const plan = getTestPlan();
            const change = { type: 'move', details: 'Move Tuesday to Thursday' };
            const result = modifier._modifySchedule(plan, change);

            expect(result.changed).toBe(false);
            expect(result.outcome).toContain('Cannot move Tuesday: No workout found on that day');
        });

        it('should combine two workout days', () => {
            const plan = getTestPlan();
            const change = { type: 'combine', details: 'Combine Monday and Wednesday' };
            const result = modifier._modifySchedule(plan, change);

            expect(result.changed).toBe(true);
            expect(result.outcome).toContain('Combined workouts from Monday and Wednesday onto Monday. Wednesday is now a rest day.');
            expect(plan.weeklySchedule.Monday.exercises).toHaveLength(4); // 2 from Mon + 2 from Wed
            expect(plan.weeklySchedule.Monday.sessionName).toContain('Combined: Upper Body A & Lower Body');
            expect(plan.weeklySchedule.Wednesday).toBe('Rest');
        });
         
         it('should fail to combine if one day is not a workout', () => {
            const plan = getTestPlan();
            const change = { type: 'combine', details: 'Combine Monday and Tuesday' };
            const result = modifier._modifySchedule(plan, change);

            expect(result.changed).toBe(false);
            expect(result.outcome).toContain('Cannot combine Monday and Tuesday: One or both days are not valid workout sessions');
        });
        // TODO: Tests for split, add_day, remove_day when implemented
    });

    // --- _adjustRestPeriods ---
    describe('_adjustRestPeriods', () => {
        let modifier;
        let plan; // Declare plan here
        beforeEach(() => {
            modifier = new PlanModifier();
            plan = getTestPlan(); // Initialize plan before each test in this describe block
        });

         it('should set specific rest period between sets for exercises with existing rest', () => {
            const change = { type: 'between_sets', change: 'set', value: '75 seconds' };
            const result = modifier._adjustRestPeriods(plan, change);

            expect(result.changed).toBe(true);
            expect(result.outcome).toContain('Adjusted rest periods between sets');
            expect(plan.weeklySchedule.Monday.exercises[0].rest).toBe('75 seconds');
            expect(plan.weeklySchedule.Wednesday.exercises[0].rest).toBe('75 seconds');
        });
        
         it('should increase rest period between sets', () => {
            const change = { type: 'between_sets', change: 'increase' }; // Increase by 30s
            const result = modifier._adjustRestPeriods(plan, change);
            expect(result.changed).toBe(true);
            expect(plan.weeklySchedule.Monday.exercises[0].rest).toBe('120 seconds'); // 90 + 30
            expect(plan.weeklySchedule.Monday.exercises[1].rest).toBe('90 seconds'); // 60 + 30
        });
        
         it('should decrease rest period between sets (min 15s)', () => {
            plan.weeklySchedule.Monday.exercises[0].rest = "30s"; // Set initial low rest
            const change = { type: 'between_sets', change: 'decrease' }; // Decrease by 30s
            const result = modifier._adjustRestPeriods(plan, change);
            expect(result.changed).toBe(true);
            expect(plan.weeklySchedule.Monday.exercises[0].rest).toBe('15 seconds'); // 30 - 30 clamped to 15
            expect(plan.weeklySchedule.Monday.exercises[1].rest).toBe('30 seconds'); // 60 - 30
        });
        
         it('should add a general note if no specific rest periods exist', () => {
             const change = { type: 'between_sets', change: 'decrease', value: '45 seconds' };
             // Define plan locally for this test to ensure isolation
             const localPlan = {
                 planName: "Test Plan",
                 goal: "Strength",
                 level: "Intermediate",
                 weeklySchedule: {
                     Monday: {
                         sessionName: "Upper Body A",
                         notes: ["Previous note"], // Pre-existing note
                         exercises: [
                             { exercise: "Bench Press", sets: 3, repsOrDuration: "5", rest: null }, // Rest is null
                             { exercise: "Overhead Press", sets: 3, repsOrDuration: "8", rest: null } // Rest is null
                         ]
                     },
                     // Add simplified versions of other days if needed for execution, otherwise omit
                     Wednesday: { sessionName: "Lower Body", exercises: [] }, 
                     Friday: { sessionName: "Upper Body B", exercises: [] } 
                 },
                 archivedSessions: {}
             };
              
             const result = modifier._adjustRestPeriods(localPlan, change);
              
             expect(result.changed).toBe(true);
             // Expect the implementation's actual outcome message (from the special case)
             expect(result.outcome).toContain('No specific rest periods found to adjust; added general note.');
             // Check for the note (now with notes array pre-existing)
             expect(localPlan.weeklySchedule.Monday.notes).toContain('General rest between sets: 45 seconds');
         });

        it('should increase rest between workouts by converting a workout day to rest', () => {
            const change = { type: 'between_workouts', change: 'increase' };
            const result = modifier._adjustRestPeriods(plan, change);
            expect(result.changed).toBe(true);
             // It should choose Friday (last workout day) in this case
             expect(result.outcome).toContain('Increased rest between workouts by making Friday a rest day');
            expect(plan.weeklySchedule.Friday).toBe('Rest');
            expect(plan.archivedSessions).toHaveProperty('Friday');
        });

        it('should decrease rest between workouts by converting a rest day to workout (from archive)', () => {
            // Make Friday a rest day and archive it
             plan.archivedSessions = { Friday: plan.weeklySchedule.Friday };
             plan.weeklySchedule.Friday = 'Rest';
             
            const change = { type: 'between_workouts', change: 'decrease' };
            const result = modifier._adjustRestPeriods(plan, change);

            expect(result.changed).toBe(true);
            expect(result.outcome).toContain('Decreased rest between workouts by making Friday a workout day');
            expect(plan.weeklySchedule.Friday).toEqual(expect.objectContaining({ sessionName: 'Upper Body B' }));
            expect(plan.archivedSessions).not.toHaveProperty('Friday');
        });
        
         it('should decrease rest between workouts by converting a rest day (no archive)', () => {
            plan.weeklySchedule.Friday = 'Rest'; // Friday is now rest, no archive
             
            const change = { type: 'between_workouts', change: 'decrease' };
            const result = modifier._adjustRestPeriods(plan, change);

            expect(result.changed).toBe(true);
            // It should choose Tuesday (first available rest day)
            expect(result.outcome).toContain('Decreased rest between workouts by making Tuesday a workout day');
            expect(plan.weeklySchedule.Tuesday).toEqual({ sessionName: 'New Workout Session', exercises: [] });
        });
        
         it('should fail to increase rest if only one workout day', () => {
            const plan = { weeklySchedule: { Monday: {sessionName:'W'}, Tuesday:'Rest' /*...*/ }};
            const change = { type: 'between_workouts', change: 'increase' };
            const result = modifier._adjustRestPeriods(plan, change);
            expect(result.changed).toBe(false);
            expect(result.outcome).toContain('Cannot increase rest days');
         });
         
         it('should fail to decrease rest if no rest days available', () => {
             const plan = { weeklySchedule: { Monday:{}, Tuesday:{}, Wednesday:{}, Thursday:{}, Friday:{}, Saturday:{}, Sunday:{} } };
             const change = { type: 'between_workouts', change: 'decrease' };
            const result = modifier._adjustRestPeriods(plan, change);
            expect(result.changed).toBe(false);
            expect(result.outcome).toContain('Cannot decrease rest days');
         });
    });
    
    // --- _handlePainConcern ---
    describe('_handlePainConcern', () => {
        it('should add caution note to specific exercise mentioned', () => {
             const plan = getTestPlan();
             const concern = { area: 'knee', exercise: 'Squats'};
             const result = modifier._handlePainConcern(plan, concern);
             expect(result.changed).toBe(true);
             expect(result.outcome).toContain('Added caution notes');
             expect(plan.weeklySchedule.Wednesday.exercises[0].notes).toContain('Caution: User reported knee pain');
        });
        
        it('should not change anything if exercise is general or not found', () => {
             const plan = getTestPlan();
             const concern = { area: 'knee', exercise: 'general'};
             const result = modifier._handlePainConcern(plan, concern);
             expect(result.changed).toBe(false);
             expect(result.outcome).toContain('No specific exercise notes added');
        });
    });
    
    // --- _handleEquipmentLimitation ---
    describe('_handleEquipmentLimitation', () => {
        let modifier;
        let plan; // Declare plan here
        beforeEach(() => {
            modifier = new PlanModifier();
            plan = getTestPlan(); // Initialize plan before each test in this describe block
            // Reset mock for this specific describe block if needed
            modifier._generateSubstitutionForEquipment = jest.fn(); 
        });

        it('should substitute exercise requiring unavailable equipment with generic alternative', () => {
             const limitation = { equipment: 'barbell', alternative: null };
             modifier._generateSubstitutionForEquipment.mockReturnValue('Dumbbell Rows'); // Mock specific return value
             const result = modifier._handleEquipmentLimitation(plan, limitation);
             expect(result.changed).toBe(true);
             expect(result.outcome).toContain("Substituted 'Barbell Rows' with generic alternative 'Dumbbell Rows'.");
             expect(plan.weeklySchedule.Friday.exercises[1].exercise).toBe('Dumbbell Rows');
             expect(plan.weeklySchedule.Friday.exercises[1].notes).toContain('Substituted from Barbell Rows (Equipment limitation (barbell) - Generic sub)');
        });

        it('should substitute with suggested alternative if provided', () => {
             const limitation = { equipment: 'barbell', alternative: 'kettlebell rows' };
             const result = modifier._handleEquipmentLimitation(plan, limitation);
             expect(result.changed).toBe(true);
             expect(result.outcome).toContain("Substituted 'Barbell Rows' with suggested 'kettlebell rows'.");
             expect(plan.weeklySchedule.Friday.exercises[1].exercise).toBe('kettlebell rows');
             expect(modifier._generateSubstitutionForEquipment).not.toHaveBeenCalled();
         });

         it('should return unchanged if equipment not found', () => {
            const limitation = { equipment: 'leg press machine' };
            const result = modifier._handleEquipmentLimitation(plan, limitation);
            expect(result.changed).toBe(false);
            expect(result.outcome).toContain("No exercises found requiring the limited equipment");
        });

        it('should add a warning note if no substitution is found', () => {
            const limitation = { equipment: 'barbell', alternative: null };
            modifier._generateSubstitutionForEquipment.mockReturnValue(null); // Mock no sub found
            const result = modifier._handleEquipmentLimitation(plan, limitation);
            expect(result.changed).toBe(true); // Changed because a note was added
            expect(result.outcome).toContain("Could not find suitable substitution for 'Barbell Rows'");
            expect(plan.weeklySchedule.Friday.exercises[1].notes).toContain('Warning: Requires barbell');
        });
    });

    // --- Main Apply Method --- 
    describe('apply (main method)', () => {
        it('should apply feasible and safe adjustments in priority order', async () => {
            const plan = getTestPlan();
            const feedback = {
                // High priority
                painConcerns: [{ area: 'knee', exercise: 'Squats' }],
                substitutions: [{ from: 'Squats', to: 'Leg Press', reason: 'knee pain' }, { from: 'Barbell Rows', to: 'DB Rows', reason: 'preference' }],
                // Medium priority
                volumeAdjustments: [{ exercise: 'Bench Press', property: 'sets', change: 'increase' }],
                // Low priority
                scheduleChanges: [{ type: 'move', details: 'move Friday to Saturday' }]
            };
            const considerations = [
                { feasible: [], infeasible: [] }, // Assume all feasible
                { safeRequests: [], unsafeRequests: [] } // Assume all safe
            ];

            const result = await modifier.apply(plan, feedback, considerations);

            expect(result.modifiedPlan).toBeDefined();
            expect(result.appliedChanges.length).toBeGreaterThanOrEqual(4); // Pain note, 2 subs, volume, schedule
            expect(result.skippedChanges).toEqual([]);

            // Verify high priority changes applied
            expect(result.modifiedPlan.weeklySchedule.Wednesday.exercises[0].exercise).toBe('Leg Press');
            expect(result.modifiedPlan.weeklySchedule.Wednesday.exercises[0].notes).toContain('Caution: User reported knee pain');
             expect(result.modifiedPlan.weeklySchedule.Friday).toBe('Rest'); // Because it was moved
             expect(result.modifiedPlan.weeklySchedule.Saturday.exercises.find(ex => ex.exercise === 'DB Rows')).toBeDefined(); // Row sub check on moved day

            // Verify medium priority change applied
            expect(result.modifiedPlan.weeklySchedule.Monday.exercises[0].sets).toBe(4);
            
            // Verify low priority change applied
            expect(result.modifiedPlan.weeklySchedule.Saturday).toBeDefined();
            expect(result.modifiedPlan.weeklySchedule.Saturday.sessionName).toBe('Upper Body B');
            
            // Check metadata
            expect(result.modifiedPlan.lastAdjusted).toBeDefined();
            expect(result.modifiedPlan.adjustmentHistory).toBeDefined();
            expect(result.modifiedPlan.appliedChanges).toEqual(result.appliedChanges); // Check internal consistency
        });

        it('should skip infeasible adjustments', async () => {
             const plan = getTestPlan();
             const feedback = { substitutions: [{ from: 'NonExistent', to: 'Anything' }] };
             const considerations = [
                { feasible: [], infeasible: [{ type: 'substitution', item: feedback.substitutions[0], reason: 'Not found' }] }, 
                { safeRequests: [], unsafeRequests: [] }
            ];
            
             const result = await modifier.apply(plan, feedback, considerations);
             expect(result.appliedChanges).toEqual([]);
             expect(result.skippedChanges).toContainEqual(expect.objectContaining({ type: 'substitution', reason: expect.stringContaining('Infeasible: Not found') }));
        });
        
         it('should skip unsafe adjustments', async () => {
             const plan = getTestPlan();
             const feedback = { substitutions: [{ from: 'Squats', to: 'Contraindicated Exercise' }] };
             const considerations = [
                { feasible: [{ type: 'substitution', item: feedback.substitutions[0] }], infeasible: [] }, 
                { safeRequests: [], unsafeRequests: [{ type: 'substitution', item: feedback.substitutions[0], reason: 'Contraindicated' }] }
            ];
            
             const result = await modifier.apply(plan, feedback, considerations);
             expect(result.appliedChanges).toEqual([]);
             expect(result.skippedChanges).toContainEqual(expect.objectContaining({ type: 'substitution', reason: expect.stringContaining('Unsafe: Contraindicated') }));
        });
        
         it('should handle errors during modification gracefully', async () => {
             const plan = getTestPlan();
             const feedback = { scheduleChanges: [{ type: 'move', details: 'invalid details format' }] };
              const considerations = [
                { feasible: [{ type: 'scheduleChange', item: feedback.scheduleChanges[0] }], infeasible: [] }, 
                { safeRequests: [{ type: 'scheduleChange', item: feedback.scheduleChanges[0] }], unsafeRequests: [] }
             ];
             // Mock internal method to throw an error
             modifier._modifySchedule = jest.fn().mockImplementation(() => { throw new Error('Parsing failed'); });
             
              const result = await modifier.apply(plan, feedback, considerations);
              expect(result.appliedChanges).toEqual([]);
              expect(result.skippedChanges).toContainEqual(expect.objectContaining({ type: 'scheduleChange', reason: expect.stringContaining('Application error: Parsing failed') }));
              expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Error applying adjustment type scheduleChange'), expect.any(Object));
         });
    });
}); 