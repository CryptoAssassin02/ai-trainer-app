const logger = require('../../config/logger');
// Import Supabase client if needed for fetching data (e.g., contraindications)
// const { SupabaseClient } = require('../../services/supabase');

/**
 * Validates proposed plan adjustments for feasibility, safety, and coherence.
 * Also validates the final adjusted plan.
 */
class AdjustmentValidator {
    /**
     * Initializes the AdjustmentValidator.
     * @param {SupabaseClient} supabaseClient - Instance of the Supabase client.
     * @param {object} config - Agent configuration.
     * @param {Logger} loggerInstance - Logger instance.
     */
    constructor(supabaseClient, config = {}, loggerInstance = logger) {
        // Store dependencies if needed (e.g., supabaseClient for fetching rules)
        this.supabaseClient = supabaseClient; 
        this.config = config;
        this.logger = loggerInstance;
        this.logger.info('[AdjustmentValidator] Initialized.');
    }

    /**
     * Analyzes the feasibility of requested adjustments based on plan structure and context.
     * (Part of Step 8.3C)
     * @param {Object} plan - The original workout plan.
     * @param {Object} parsedFeedback - Structured feedback from FeedbackParser.
     * @param {Object} userProfile - User's profile data.
     * @returns {Promise<{feasible: Array, infeasible: Array, summary: string}>} Feasibility results.
     */
    async analyzeFeasibility(plan, parsedFeedback, userProfile) {
        this.logger.info('[AdjustmentValidator] Analyzing adjustment feasibility...');
        const results = {
            feasible: [],
            infeasible: [],
            summary: "Feasibility analysis complete."
        };

        // Example: Check if exercise to be substituted exists in the plan
        (parsedFeedback.substitutions || []).forEach(sub => {
            const exerciseExists = this._findExerciseInPlan(plan, sub.from);
            if (exerciseExists) {
                results.feasible.push({ type: 'substitution', item: sub, reason: 'Original exercise found in plan.' });
            } else {
                results.infeasible.push({ type: 'substitution', item: sub, reason: `Exercise '${sub.from}' not found in the original plan.` });
            }
        });

        // Example: Check feasibility of volume adjustments
        (parsedFeedback.volumeAdjustments || []).forEach(adj => {
            if (adj.exercise !== 'all') {
                const exerciseExists = this._findExerciseInPlan(plan, adj.exercise);
                if (!exerciseExists) {
                    results.infeasible.push({ type: 'volumeAdjustment', item: adj, reason: `Exercise '${adj.exercise}' not found for volume adjustment.` });
                    return;
                }
            }
             // Check if the property exists (sets, reps)
             // For simplicity, assume properties like 'sets' and 'reps' are generally feasible to adjust.
             results.feasible.push({ type: 'volumeAdjustment', item: adj, reason: 'Volume adjustment seems feasible.' });
        });
        
        // Example: Check feasibility of intensity adjustments
        (parsedFeedback.intensityAdjustments || []).forEach(adj => {
             if (adj.exercise !== 'all') {
                const exerciseExists = this._findExerciseInPlan(plan, adj.exercise);
                if (!exerciseExists) {
                    results.infeasible.push({ type: 'intensityAdjustment', item: adj, reason: `Exercise '${adj.exercise}' not found for intensity adjustment.` });
                    return;
                }
            }
            // Assume intensity adjustments are feasible but need safety check later
             results.feasible.push({ type: 'intensityAdjustment', item: adj, reason: 'Intensity adjustment seems feasible.' });
        });

        // TODO: Add feasibility checks for schedule, rest periods, equipment limitations

        this.logger.info(`[AdjustmentValidator] Feasibility: ${results.feasible.length} feasible, ${results.infeasible.length} infeasible.`);
        return results;
    }

    /**
     * Checks requested adjustments for potential safety concerns based on user profile and known contraindications.
     * (Part of Step 8.3C)
     * @param {Object} parsedFeedback - Structured feedback from FeedbackParser.
     * @param {Object} userProfile - User's profile data (including medical conditions, injuries).
     * @returns {Promise<{safeRequests: Array, unsafeRequests: Array, warnings: Array, summary: string}>} Safety check results.
     */
    async checkSafety(parsedFeedback, userProfile) {
        this.logger.info('[AdjustmentValidator] Checking safety of requested adjustments...');
        const results = {
            safeRequests: [],
            unsafeRequests: [],
            warnings: [],
            summary: "Safety check complete."
        };

        const medicalConditions = userProfile.medical_conditions || []; // Assuming format
        // TODO: Fetch relevant contraindications from Supabase based on medicalConditions
        const contraindications = await this._fetchContraindications(medicalConditions);

        // Check substitutions
        (parsedFeedback.substitutions || []).forEach(sub => {
            const safetyCheck = this._isSubstitutionSafe(sub.to, medicalConditions, contraindications);
            if (safetyCheck.safe) {
                results.safeRequests.push({ type: 'substitution', item: sub });
                if (safetyCheck.warning) results.warnings.push({ type: 'substitution', item: sub, message: safetyCheck.warning });
            } else {
                results.unsafeRequests.push({ type: 'substitution', item: sub, reason: safetyCheck.reason });
            }
        });

        // Check volume adjustments
        (parsedFeedback.volumeAdjustments || []).forEach(adj => {
             // Basic safety check: Prevent extreme increases without supervision/context
             // More sophisticated checks needed based on user level, goals, current plan volume.
             if (adj.change === 'increase' && (adj.property === 'sets' || adj.property === 'reps')) {
                  // Example: Flag large increases as potentially unsafe without more context
                  // A more robust check would compare against current volume and user level.
                  results.warnings.push({ type: 'volumeAdjustment', item: adj, message: 'Large volume increases should be done cautiously. Ensure adequate recovery.'});
             }
             // Assume decreases are generally safe, though maybe not optimal
             results.safeRequests.push({ type: 'volumeAdjustment', item: adj });
        });

        // Check intensity adjustments
        (parsedFeedback.intensityAdjustments || []).forEach(adj => {
            // Similar to volume, flag large intensity increases
             if (adj.change === 'increase') {
                  results.warnings.push({ type: 'intensityAdjustment', item: adj, message: 'Significant intensity increases require careful progression and form focus.'});
             }
             results.safeRequests.push({ type: 'intensityAdjustment', item: adj });
        });
        
         // Check pain concerns - these directly inform safety
         (parsedFeedback.painConcerns || []).forEach(concern => {
            // Adding a warning to review exercises related to pain areas.
            results.warnings.push({ type: 'painConcern', item: concern, message: `Review exercises potentially affecting the ${concern.area} area due to reported pain.` });
            // Mark related exercises (if specified) as potentially unsafe for increase/certain movements
             if (concern.exercise && concern.exercise !== 'general') {
                  // This information will be used when applying adjustments
             }
        });

        // TODO: Add safety checks for schedule (overtraining), rest periods (under-recovery)

        this.logger.info(`[AdjustmentValidator] Safety: ${results.safeRequests.length} safe, ${results.unsafeRequests.length} unsafe, ${results.warnings.length} warnings.`);
        return results;
    }

    /**
     * Verifies coherence of adjustments with user goals and overall plan structure.
     * (Part of Step 8.3C)
     * @param {Object} plan - The original workout plan.
     * @param {Object} parsedFeedback - Structured feedback from FeedbackParser.
     * @param {Object} userProfile - User's profile data (goals, fitnessLevel).
     * @returns {Promise<{coherent: Array, incoherent: Array, summary: string}>} Coherence check results.
     */
    async verifyCoherence(plan, parsedFeedback, userProfile) {
        this.logger.info('[AdjustmentValidator] Verifying coherence of adjustments...');
        const results = {
            coherent: [],
            incoherent: [],
            summary: "Coherence check complete."
        };
        const userGoals = userProfile.goals || [];
        const fitnessLevel = userProfile.fitnessLevel || 'beginner';

        // Example: Check if substituting an isolation exercise for a compound lift aligns with strength goals
        (parsedFeedback.substitutions || []).forEach(sub => {
            const isFromCompound = this._isCompound(sub.from); // Requires helper
            const isToIsolation = this._isIsolation(sub.to); // Requires helper
            if (userGoals.includes('strength') && isFromCompound && isToIsolation) {
                results.incoherent.push({ type: 'substitution', item: sub, reason: `Replacing compound lift '${sub.from}' with isolation exercise '${sub.to}' might not optimally align with strength goals.` });
            } else {
                results.coherent.push({ type: 'substitution', item: sub });
            }
        });

        // Example: Check if significant volume decrease aligns with muscle gain goals
        (parsedFeedback.volumeAdjustments || []).forEach(adj => {
            if (userGoals.includes('muscle_gain') && adj.change === 'decrease') {
                results.incoherent.push({ type: 'volumeAdjustment', item: adj, reason: `Decreasing volume significantly might hinder muscle gain goals.` });
            } else {
                 results.coherent.push({ type: 'volumeAdjustment', item: adj });
            }
        });

        // TODO: Add more coherence checks (e.g., intensity vs. endurance goals, schedule vs. recovery needs)

        this.logger.info(`[AdjustmentValidator] Coherence: ${results.coherent.length} coherent, ${results.incoherent.length} incoherent.`);
        return results;
    }

    /**
     * Validates the entire adjusted plan structure, safety, and progression.
     * Also checks for potential concurrency issues if timestamp provided.
     * (Part of Step 8.3D)
     * @param {Object} adjustedPlan - The modified workout plan.
     * @param {Object} userProfile - User's profile data.
     * @param {string} [originalUpdatedAt] - Optional timestamp of the plan when it was retrieved.
     * @returns {Promise<{isValid: boolean, issues: Array, summary: string}>} Validation results.
     */
    async validateAdjustedPlan(adjustedPlan, userProfile, originalUpdatedAt = null) {
        this.logger.info('[AdjustmentValidator] Validating final adjusted plan...');
        const issues = [];

        // --- Concurrency Check ---
        if (originalUpdatedAt && adjustedPlan.updated_at && new Date(adjustedPlan.updated_at) < new Date(originalUpdatedAt)) {
             // This check assumes PlanModifier updates 'updated_at' upon modification.
             // If the plan in the DB was updated *after* we retrieved it for adjustment,
             // our modification might be based on stale data.
             issues.push({
                 type: 'concurrency',
                 message: 'Potential concurrency conflict: The plan may have been updated by another process since it was loaded for this adjustment.',
                 originalTimestamp: originalUpdatedAt,
                 currentTimestamp: adjustedPlan.updated_at
             });
             // Depending on requirements, this could be a hard failure or just a warning.
             // Making it a warning for now.
             this.logger.warn(`[AdjustmentValidator] Concurrency warning detected for plan ${adjustedPlan.planId}`);
        }

        // 1. Check Basic Plan Structure
        if (!adjustedPlan || typeof adjustedPlan !== 'object') {
            issues.push({ type: 'structure', message: 'Adjusted plan is null or not an object.' });
            return { isValid: false, issues, summary: "Validation failed: Invalid plan structure." };
        }
        if (!adjustedPlan.planName || typeof adjustedPlan.planName !== 'string') {
            issues.push({ type: 'structure', message: 'Plan name is missing or invalid.' });
        }
        if (!adjustedPlan.weeklySchedule || typeof adjustedPlan.weeklySchedule !== 'object') {
            issues.push({ type: 'structure', message: 'Weekly schedule is missing or invalid.' });
            // Cannot proceed with further validation if schedule is missing
            return { isValid: issues.length === 0, issues, summary: issues.length > 0 ? "Validation failed: Invalid schedule." : "Validation passed (basic structure)." };
        }

        // 2. Validate Each Session in the Schedule
        let totalWorkoutDays = 0;
        for (const day in adjustedPlan.weeklySchedule) {
            const session = adjustedPlan.weeklySchedule[day];
            if (typeof session === 'object' && session !== null) { // It's a workout day
                totalWorkoutDays++;
                if (!session.sessionName || typeof session.sessionName !== 'string') {
                    issues.push({ type: 'session', day, message: 'Session name is missing or invalid.' });
                }
                if (!session.exercises || !Array.isArray(session.exercises)) {
                    issues.push({ type: 'session', day, message: 'Exercises array is missing or invalid.' });
                } else if (session.exercises.length === 0) {
                     issues.push({ type: 'session', day, message: 'Workout session has no exercises.' });
                } else {
                    // 3. Validate Each Exercise
                    session.exercises.forEach((ex, index) => {
                        if (!ex || typeof ex !== 'object') {
                            issues.push({ type: 'exercise', day, index, message: 'Invalid exercise object.' });
                            return;
                        }
                        if (!ex.exercise || typeof ex.exercise !== 'string') {
                            issues.push({ type: 'exercise', day, index, message: 'Exercise name is missing or invalid.' });
                        }
                        if (ex.sets === undefined || typeof ex.sets !== 'number' || ex.sets <= 0) {
                            issues.push({ type: 'exercise', day, index, name: ex.exercise, message: 'Sets must be a positive number.' });
                        }
                        if (ex.repsOrDuration === undefined || typeof ex.repsOrDuration !== 'string' || ex.repsOrDuration.trim() === '') {
                             // Allow string type flexibility but ensure it's present
                            issues.push({ type: 'exercise', day, index, name: ex.exercise, message: 'Reps/Duration must be a non-empty string.' });
                        }
                        // Optional: Validate rest format if needed
                        // if (ex.rest && typeof ex.rest !== 'string') { ... }
                    });
                }
            } else if (typeof session !== 'string' || session.toLowerCase() !== 'rest') {
                issues.push({ type: 'schedule', day, message: `Invalid entry for day: expected workout object or "Rest", got ${typeof session}.` });
            }
        }

        // 4. Overall Plan Coherence/Safety (Example Checks)
        const fitnessLevel = userProfile.fitnessLevel || 'beginner';
        const goals = userProfile.goals || [];

        // Check total workout days vs frequency preference (if available)
        const frequencyPref = userProfile.preferences?.workoutFrequency; // e.g., '3x per week'
        if (frequencyPref) {
             const freqNumMatch = frequencyPref.match(/(\d+)x/);
             if (freqNumMatch) {
                  const expectedDays = parseInt(freqNumMatch[1], 10);
                  if (totalWorkoutDays !== expectedDays) {
                       issues.push({ type: 'coherence', message: `Plan has ${totalWorkoutDays} workout days, but user preference is ${frequencyPref}.` });
                  }
             }
        }

        // Basic check for sufficient rest days
        if (totalWorkoutDays >= 6 && fitnessLevel !== 'advanced') {
            issues.push({ type: 'safety', message: `High workout frequency (${totalWorkoutDays} days) may increase overtraining risk for ${fitnessLevel} level. Ensure adequate recovery.` });
        }
        if (totalWorkoutDays === 0) {
             issues.push({ type: 'coherence', message: 'The adjusted plan has no workout days scheduled.'});
        }

        // Re-check exercise safety against contraindications (using fetched rules if available)
        const medicalConditions = userProfile.medical_conditions || [];
        const contraindications = await this._fetchContraindications(medicalConditions);
        if (contraindications.length > 0) {
             for (const day in adjustedPlan.weeklySchedule) {
                 const session = adjustedPlan.weeklySchedule[day];
                 if (typeof session === 'object' && session?.exercises) {
                      session.exercises.forEach((ex, index) => {
                           const safetyCheck = this._isSubstitutionSafe(ex.exercise, medicalConditions, contraindications);
                           if (!safetyCheck.safe) {
                                issues.push({ type: 'safety', day, index, name: ex.exercise, message: `Exercise may be contraindicated: ${safetyCheck.reason}` });
                           }
                      });
                 }
             }
        }

        // TODO: Add more sophisticated checks:
        // - Volume/Intensity progression appropriateness
        // - Muscle group balance
        // - Alignment with specific goal types (strength plans needing heavy compounds etc.)

        const isValid = issues.length === 0;
        const summary = isValid ? "Final plan validation successful." : `Validation failed with ${issues.length} issue(s).`;
        this.logger.info(`[AdjustmentValidator] Final Validation Result: ${isValid ? 'Valid' : 'Invalid'}. Issues: ${issues.length}`);
        if (!isValid) {
             this.logger.warn(`[AdjustmentValidator] Validation Issues:`, issues);
        }

        return { isValid, issues, summary };
    }

    // --- Helper Methods ---

    /**
     * Checks if a given exercise exists within the plan's weekly schedule.
     * @param {Object} plan - The workout plan.
     * @param {string} exerciseName - The name of the exercise to find.
     * @returns {boolean} True if the exercise is found, false otherwise.
     * @private
     */
    _findExerciseInPlan(plan, exerciseName) {
        if (!plan?.weeklySchedule || !exerciseName) return false;
        const nameLower = exerciseName.toLowerCase();

        for (const day in plan.weeklySchedule) {
            const session = plan.weeklySchedule[day];
            if (typeof session === 'object' && session?.exercises) {
                if (session.exercises.some(ex => ex.exercise?.toLowerCase() === nameLower)) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Fetches contraindication rules from Supabase based on user medical conditions.
     * @param {string[]} medicalConditions - List of user's medical conditions.
     * @returns {Promise<Array>} List of contraindication objects { condition, exercises_to_avoid: [] }.
     * @private
     */
    async _fetchContraindications(medicalConditions) {
        if (!this.supabaseClient || !medicalConditions || medicalConditions.length === 0) {
            return [];
        }
        this.logger.debug('[AdjustmentValidator] Fetching contraindications...');
        try {
            const lowerCaseConditions = medicalConditions.map(c => String(c).toLowerCase().trim());
            const { data, error } = await this.supabaseClient
                .from('contraindications') // Assumes this table exists
                .select('condition, exercises_to_avoid')
                .in('condition', lowerCaseConditions);

            if (error) {
                this.logger.warn(`[AdjustmentValidator] Failed to fetch contraindications: ${error.message}`);
                return [];
            }
            this.logger.info(`[AdjustmentValidator] Fetched ${data?.length || 0} contraindication rules.`);
            return data || [];
        } catch (dbError) {
            this.logger.error(`[AdjustmentValidator] Error during contraindication fetch: ${dbError.message}`);
            return [];
        }
    }

    /**
     * Checks if substituting TO a specific exercise is safe given conditions/contraindications.
     * @param {string} exerciseName - The name of the exercise being substituted TO.
     * @param {string[]} medicalConditions - User conditions.
     * @param {Array} contraindications - Fetched contraindication rules.
     * @returns {{safe: boolean, reason?: string, warning?: string}}
     * @private
     */
    _isSubstitutionSafe(exerciseName, medicalConditions, contraindications) {
        const exerciseLower = exerciseName?.toLowerCase();
        if (!exerciseLower) return { safe: false, reason: "Invalid exercise name for safety check." };

        for (const rule of contraindications) {
            if (rule.exercises_to_avoid?.map(e => e.toLowerCase()).includes(exerciseLower)) {
                return { safe: false, reason: `Exercise '${exerciseName}' is contraindicated due to user condition: ${rule.condition}.` };
            }
        }
        
        // Add more general checks based on conditions if no specific rule found
        if (medicalConditions.some(c => c.toLowerCase().includes('knee')) && exerciseLower.includes('jump')) {
             return { safe: true, warning: `Exercise '${exerciseName}' involves jumping, ensure it's appropriate for user's reported knee condition.` };
        }
        // Add other general heuristic checks

        return { safe: true }; // Default to safe if no specific contraindication found
    }
    
    // --- Coherence Helper Examples (require more robust implementation or DB lookup) ---
    _isCompound(exerciseName) {
        const compoundKeywords = ['squat', 'deadlift', 'bench press', 'overhead press', 'row', 'pull-up', 'chin-up', 'lunge'];
        const nameLower = exerciseName?.toLowerCase() || '';
        return compoundKeywords.some(keyword => nameLower.includes(keyword));
    }

    _isIsolation(exerciseName) {
        const isolationKeywords = ['curl', 'extension', 'fly', 'raise', 'kickback', 'triceps pushdown'];
        const nameLower = exerciseName?.toLowerCase() || '';
        return isolationKeywords.some(keyword => nameLower.includes(keyword));
    }
}

module.exports = AdjustmentValidator; 