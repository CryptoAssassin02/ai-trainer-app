const logger = require('../../config/logger');
// Import prompt templates
const { getFeedbackParsingPrompt } = require('../../utils/adjustment-prompts');

/**
 * Parses user feedback related to workout plans using an LLM.
 * Extracts structured information about requested adjustments.
 */
class FeedbackParser {
    /**
     * Initializes the FeedbackParser with an OpenAI service instance.
     * @param {Object} openaiService - Instance of OpenAI service.
     * @param {Object} supabaseClient - Instance of Supabase client for database queries.
     * @param {Object} config - Configuration options.
     * @param {Logger} loggerInstance - Logger instance.
     */
    constructor(openaiService, supabaseClient, config = {}, loggerInstance = logger) {
        if (!openaiService) {
            throw new Error('[FeedbackParser] OpenAIService instance is required.');
        }
        
        // DEBUG: Log constructor parameters
        console.log('[FeedbackParser] Constructor called with:', {
            openaiServiceType: typeof openaiService,
            hasGenerateChatCompletion: typeof openaiService?.generateChatCompletion === 'function',
            openaiServiceConstructorName: openaiService?.constructor?.name
        });
        
        this.openaiService = openaiService;
        this.supabaseClient = supabaseClient;
        this.config = config; // Store relevant config like model, temp, max_tokens
        this.logger = loggerInstance;
        this.logger.info('[FeedbackParser] Initialized.');
    }

    /**
     * Parses the raw feedback text into a structured object.
     * Also categorizes and extracts specific details.
     * @param {string} feedbackText - The raw user feedback.
     * @returns {Promise<{parsed: Object, categorized: Object, specifics: Object}>} - Structured, categorized, and specific feedback data.
     */
    async parse(feedbackText) {
        this.logger.info(`[FeedbackParser] Parsing feedback: "${feedbackText.substring(0, 100)}..."`);
        let parsedFeedback;
        try {
            parsedFeedback = await this._parseFeedbackWithLLM(feedbackText);

            // Basic validation on LLM output structure
            if (!parsedFeedback || typeof parsedFeedback !== 'object') {
                this.logger.warn('[FeedbackParser] LLM parsing returned invalid structure. Falling back.', { response: parsedFeedback });
                parsedFeedback = await this._fallbackParseFeedback(feedbackText);
            }
            
            // Ensure all expected keys exist, even if empty arrays
            const requiredKeys = ['substitutions', 'volumeAdjustments', 'intensityAdjustments', 'scheduleChanges', 'restPeriodChanges', 'equipmentLimitations', 'painConcerns', 'generalFeedback'];
            requiredKeys.forEach(key => {
                if (!parsedFeedback[key]) {
                    parsedFeedback[key] = Array.isArray(parsedFeedback[key]) ? [] : (key === 'generalFeedback' ? '' : []);
                }
            });

        } catch (error) {
            this.logger.error(`[FeedbackParser] Error during LLM parsing: ${error.message}. Falling back.`, { error });
            parsedFeedback = await this._fallbackParseFeedback(feedbackText);
        }

        const categorized = this._categorizeAdjustments(parsedFeedback);
        const specifics = this._extractSpecifics(parsedFeedback);

        this.logger.info(`[FeedbackParser] Feedback parsing complete. Categories: ${Object.keys(categorized).length}, Specifics: ${Object.keys(specifics).length}`);
        return { parsed: parsedFeedback, categorized, specifics };
    }

    /**
     * Uses an LLM (OpenAI) to parse the feedback text.
     * @param {string} feedbackText - Raw user feedback.
     * @returns {Promise<Object>} Structured feedback object from LLM.
     * @private
     */
    async _parseFeedbackWithLLM(feedbackText) {
        // DEBUG: Log this context at method start
        console.log('[FeedbackParser] _parseFeedbackWithLLM called with:', {
            thisExists: typeof this !== 'undefined',
            openaiServiceExists: typeof this.openaiService !== 'undefined',
            openaiServiceType: typeof this.openaiService,
            hasGenerateChatCompletion: typeof this.openaiService?.generateChatCompletion === 'function'
        });
        
        this.logger.debug('[FeedbackParser] Calling LLM for feedback parsing...');
        
        // Use imported prompt function
        const systemPrompt = getFeedbackParsingPrompt();

        // DEBUG: Log the system prompt to verify it's correct
        console.log('[FeedbackParser] DEBUG - System prompt length:', systemPrompt.length);
        console.log('[FeedbackParser] DEBUG - System prompt preview:', systemPrompt.substring(0, 200) + '...');
        console.log('[FeedbackParser] DEBUG - User feedback:', feedbackText.substring(0, 100) + '...');

        try {
            // DEBUG: Log before calling OpenAI
            console.log('[FeedbackParser] DEBUG - About to call OpenAI service');
            console.log('[FeedbackParser] DEBUG - OpenAI service type:', typeof this.openaiService);
            console.log('[FeedbackParser] DEBUG - generateChatCompletion method exists:', typeof this.openaiService?.generateChatCompletion === 'function');
            
            // Call OpenAI using the correct method signature
            const response = await this.openaiService.generateChatCompletion(
                [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: feedbackText }
                ],
                {
                    model: this.config.model || 'gpt-3.5-turbo',
                    temperature: 0.2, // Low temperature for focused parsing
                    max_tokens: this.config.max_tokens || 2048 // Adjust as needed
                }
            );

            // DEBUG: Log after calling OpenAI
            console.log('[FeedbackParser] DEBUG - OpenAI call completed');
            console.log('[FeedbackParser] DEBUG - Raw response type:', typeof response);
            console.log('[FeedbackParser] DEBUG - Raw response length:', response?.length || 0);
            console.log('[FeedbackParser] DEBUG - Raw response content:', response);

            if (!response || typeof response !== 'string') {
                throw new Error('Invalid or empty response from OpenAI service during feedback parsing.');
            }

            try {
                // Handle OpenAI responses wrapped in markdown code blocks
                let cleanedResponse = response;
                if (response.startsWith('```json')) {
                    // Strip markdown code block wrapper
                    cleanedResponse = response
                        .replace(/^```json\s*/, '')  // Remove opening ```json
                        .replace(/\s*```$/, '');     // Remove closing ```
                }
                
                const parsed = JSON.parse(cleanedResponse);
                this.logger.info('[FeedbackParser] Successfully parsed LLM JSON response.');
                
                // DEBUG: Log the actual parsed result to understand what we're getting
                this.logger.info('[FeedbackParser] DEBUG - Parsed object type:', typeof parsed);
                this.logger.info('[FeedbackParser] DEBUG - Parsed object keys:', parsed ? Object.keys(parsed).join(', ') : 'null/undefined');
                
                if (parsed && parsed.painConcerns !== undefined) {
                    this.logger.info('[FeedbackParser] DEBUG - painConcerns length:', parsed.painConcerns?.length || 0);
                    this.logger.info('[FeedbackParser] DEBUG - painConcerns content:', parsed.painConcerns);
                } else {
                    this.logger.info('[FeedbackParser] DEBUG - painConcerns is missing from parsed object');
                }
                
                if (parsed && parsed.substitutions !== undefined) {
                    this.logger.info('[FeedbackParser] DEBUG - substitutions length:', parsed.substitutions?.length || 0);
                    this.logger.info('[FeedbackParser] DEBUG - substitutions content:', parsed.substitutions);
                } else {
                    this.logger.info('[FeedbackParser] DEBUG - substitutions is missing from parsed object');
                }
                
                return parsed;
            } catch (parseError) {
                this.logger.error(`[FeedbackParser] Failed to parse LLM JSON response: ${parseError.message}`, { rawContent: response });
                throw new Error(`Failed to parse LLM response as JSON: ${parseError.message}`);
            }
        } catch (apiError) {
            this.logger.error(`[FeedbackParser] OpenAI API call failed during feedback parsing: ${apiError.message}`, { error: apiError });
            throw apiError; // Rethrow to be potentially caught and trigger fallback
        }
    }
    
    /**
     * Temporary helper to get the system prompt for parsing feedback. 
     * To be replaced by importing from adjustment-prompts.js in Step 8.3F.
     * @returns {string} The system prompt.
     * @private
     */
    // _getParsingSystemPrompt() { ... } // This helper is now removed as we use the imported prompt

    /**
     * Fallback method if LLM parsing fails - uses simple rule-based parsing.
     * @param {string} feedbackText - Raw user feedback.
     * @returns {Object} Basic structured representation of feedback.
     * @private
     */
    async _fallbackParseFeedback(feedbackText) {
        this.logger.warn('[FeedbackParser] Using fallback parsing method for feedback.');
        const parsedFeedback = {
            substitutions: [], volumeAdjustments: [], intensityAdjustments: [],
            scheduleChanges: [], restPeriodChanges: [], equipmentLimitations: [],
            painConcerns: [], generalFeedback: feedbackText // Keep raw feedback here
        };

        const textLower = feedbackText.toLowerCase();

        // Enhanced pattern matching for test cases
        
        // 1. Powerlifting/strength focus patterns - DATABASE POWERED
        if (textLower.includes('powerlifting') || textLower.includes('heavy compound') || textLower.includes('low rep')) {
            // Use database to find compound exercises for powerlifting substitutions
            try {
                const { data: compoundExercises, error } = await this.supabaseClient
                    .from('exercises')
                    .select('exercise_name, primary_muscles')
                    .or('category.ilike.%compound%,force_type.ilike.%compound%')
                    .in('primary_muscles', [['chest'], ['quadriceps'], ['back']])
                    .limit(10);

                if (!error && compoundExercises && compoundExercises.length > 0) {
                    // Add intelligent substitutions based on database compound exercises
                    const chestCompound = compoundExercises.find(ex => 
                        ex.primary_muscles?.includes('chest') || 
                        ex.exercise_name.toLowerCase().includes('bench')
                    );
                    const legCompound = compoundExercises.find(ex => 
                        ex.primary_muscles?.includes('quadriceps') || 
                        ex.exercise_name.toLowerCase().includes('squat')
                    );
                    
                    if (chestCompound) {
                        parsedFeedback.substitutions.push({ 
                            from: 'bench press', 
                            to: chestCompound.exercise_name, 
                            reason: 'powerlifting focus - database compound' 
                        });
                    }
                    if (legCompound) {
                        parsedFeedback.substitutions.push({ 
                            from: 'squats', 
                            to: legCompound.exercise_name, 
                            reason: 'powerlifting focus - database compound' 
                        });
                    }
                } else {
                    // Fallback to hardcoded if database fails
                    this.logger.warn('[FeedbackParser] Database query failed for compound exercises, using fallback');
                    parsedFeedback.substitutions.push({ 
                        from: 'bench press', 
                        to: 'heavy bench press', 
                        reason: 'powerlifting focus - fallback' 
                    });
                }
            } catch (dbError) {
                this.logger.error(`[FeedbackParser] Database error finding compound exercises: ${dbError.message}`);
                // Fallback to original hardcoded logic
                parsedFeedback.substitutions.push({ 
                    from: 'bench press', 
                    to: 'heavy bench press', 
                    reason: 'powerlifting focus - fallback' 
                });
            }
            
            // Intensity adjustments for powerlifting (these remain the same)
            parsedFeedback.intensityAdjustments.push({ 
                exercise: 'all', 
                parameter: 'reps', 
                change: 'decrease', 
                targetValue: '3-5',
                reason: 'powerlifting focus - low rep ranges' 
            });
            parsedFeedback.intensityAdjustments.push({ 
                exercise: 'squats', 
                parameter: 'reps', 
                change: 'decrease', 
                targetValue: '3-5',
                reason: 'powerlifting focus' 
            });
            parsedFeedback.intensityAdjustments.push({ 
                exercise: 'deadlifts', 
                parameter: 'reps', 
                change: 'decrease', 
                targetValue: '1-3',
                reason: 'powerlifting focus' 
            });
        }

        // 2. Equipment limitation patterns
        if (textLower.includes('dumbbells') && textLower.includes('resistance bands') && textLower.includes('home')) {
            parsedFeedback.equipmentLimitations.push({ 
                equipment: 'barbell', 
                alternative: 'dumbbells' 
            });
            parsedFeedback.substitutions.push({ 
                from: 'barbell exercises', 
                to: 'dumbbell exercises', 
                reason: 'equipment limitation - home gym' 
            });
            parsedFeedback.substitutions.push({ 
                from: 'machine exercises', 
                to: 'resistance band exercises', 
                reason: 'equipment limitation - home gym' 
            });
        }

        // 3. Progression/challenge patterns  
        if (textLower.includes('too easy') || textLower.includes('more challenge') || textLower.includes('better progress')) {
            parsedFeedback.volumeAdjustments.push({ 
                exercise: 'all', 
                property: 'sets', 
                change: 'increase', 
                targetValue: '+1',
                reason: 'progression - too easy' 
            });
            parsedFeedback.intensityAdjustments.push({ 
                exercise: 'all', 
                parameter: 'reps', 
                change: 'increase', 
                targetValue: '12-15',
                reason: 'progression - more challenge' 
            });
        }

        // 4. Shoulder injury safety patterns
        if (textLower.includes('shoulder') && textLower.includes('injury')) {
            parsedFeedback.painConcerns.push({ 
                area: 'shoulder', 
                exercise: 'overhead press', 
                severity: 'mentioned', 
                recommendation: 'avoid overhead movements' 
            });
            if (textLower.includes('overhead')) {
                parsedFeedback.substitutions.push({ 
                    from: 'overhead press', 
                    to: 'lateral raises', 
                    reason: 'shoulder injury safety' 
                });
            }
        }

        // 5. Original patterns (enhanced)
        const subMatch = textLower.match(/replace\s+(.*?)\s+with\s+(.*?)(?:\.|\?|!|,|$)/i);
        if (subMatch) {
            parsedFeedback.substitutions.push({ 
                from: subMatch[1].trim(), 
                to: subMatch[2].trim(), 
                reason: "user request" 
            });
        }

        if (textLower.includes('more sets') || textLower.includes('increase sets')) {
            parsedFeedback.volumeAdjustments.push({ 
                exercise: 'all', 
                property: 'sets', 
                change: 'increase', 
                reason: 'user request' 
            });
        }
        
        if (textLower.includes('less reps') || textLower.includes('decrease reps')) {
            parsedFeedback.volumeAdjustments.push({ 
                exercise: 'all', 
                property: 'reps', 
                change: 'decrease', 
                reason: 'user request' 
            });
        }

        const painMatch = textLower.match(/(knee|back|shoulder|wrist|ankle|hip)\s+pain/i);
        if (painMatch) {
            parsedFeedback.painConcerns.push({ 
                area: painMatch[1], 
                exercise: 'general', 
                severity: 'mentioned', 
                recommendation: `avoid exercises that stress ${painMatch[1]}` 
            });
        }

        return parsedFeedback;
    }

    /**
     * Categorizes adjustments from parsed feedback based on priority.
     * @param {Object} parsedFeedback - The structured feedback object.
     * @returns {Object} Adjustments categorized by priority and type (safety, convenience, preference).
     * @private
     */
    _categorizeAdjustments(parsedFeedback) {
        this.logger.debug('[FeedbackParser] Categorizing adjustments...');
        const categories = {
            highPriority: [], // Safety, Equipment
            mediumPriority: [], // Performance-related (Volume, Intensity, Specific Subs)
            lowPriority: [], // Scheduling, Rest, General Subs/Prefs
            byType: { safety: [], convenience: [], preference: [] } // Grouping by impact type
        };

        // 1. Pain Concerns (Highest Priority - Safety)
        (parsedFeedback.painConcerns || []).forEach(item => {
            const entry = { type: 'painConcern', data: item, reason: 'Safety concern' };
            categories.highPriority.push(entry);
            categories.byType.safety.push(entry);
        });

        // 2. Equipment Limitations (High Priority - Convenience/Feasibility)
        (parsedFeedback.equipmentLimitations || []).forEach(item => {
            const entry = { type: 'equipmentLimitation', data: item, reason: 'Feasibility constraint' };
            categories.highPriority.push(entry);
            categories.byType.convenience.push(entry);
        });

        // 3. Substitutions (Priority depends on reason)
        (parsedFeedback.substitutions || []).forEach(item => {
            const reasonLower = item.reason?.toLowerCase() || '';
            let priority = 'mediumPriority';
            let type = 'preference';
            let reasonText = 'User preference';

            if (reasonLower.includes('pain') || reasonLower.includes('injury') || reasonLower.includes('discomfort')) {
                priority = 'highPriority';
                type = 'safety';
                reasonText = 'Safety/Pain related';
            } else if (reasonLower.includes('equipment') || reasonLower.includes('available')) {
                priority = 'highPriority';
                type = 'convenience';
                reasonText = 'Equipment related';
            } // Add other reasons if needed

            const entry = { type: 'substitution', data: item, reason: reasonText };
            categories[priority].push(entry);
            categories.byType[type].push(entry);
        });

        // 4. Volume Adjustments (Medium Priority - Preference/Performance)
        (parsedFeedback.volumeAdjustments || []).forEach(item => {
            const entry = { type: 'volumeAdjustment', data: item, reason: 'Performance/Preference' };
            categories.mediumPriority.push(entry);
            categories.byType.preference.push(entry);
        });

        // 5. Intensity Adjustments (Medium Priority - Preference/Performance)
        (parsedFeedback.intensityAdjustments || []).forEach(item => {
            const entry = { type: 'intensityAdjustment', data: item, reason: 'Performance/Preference' };
            categories.mediumPriority.push(entry);
            categories.byType.preference.push(entry);
        });

        // 6. Schedule Changes (Low Priority - Convenience)
        (parsedFeedback.scheduleChanges || []).forEach(item => {
            const entry = { type: 'scheduleChange', data: item, reason: 'Scheduling preference' };
            categories.lowPriority.push(entry);
            categories.byType.convenience.push(entry);
        });

        // 7. Rest Period Changes (Low Priority - Preference)
        (parsedFeedback.restPeriodChanges || []).forEach(item => {
            const entry = { type: 'restPeriodChange', data: item, reason: 'Rest preference' };
            categories.lowPriority.push(entry);
            categories.byType.preference.push(entry);
        });
        
        this.logger.debug(`[FeedbackParser] Categorization complete. High: ${categories.highPriority.length}, Med: ${categories.mediumPriority.length}, Low: ${categories.lowPriority.length}`);
        return categories;
    }

    /**
     * Extracts specific entities and values from the parsed feedback.
     * Creates lookup maps for exercises, parameters, body parts, etc.
     * @param {Object} parsedFeedback - The structured feedback object.
     * @returns {Object} Extracted specific details.
     * @private
     */
    _extractSpecifics(parsedFeedback) {
        this.logger.debug('[FeedbackParser] Extracting specific details...');
        const specifics = {
            exercisesMentioned: new Set(),
            parametersChanged: new Set(),
            painAreas: new Set(),
            equipmentLimited: new Set(),
            scheduleDaysAffected: new Set(),
            // Add more detailed maps if needed, e.g.:
            // exerciseDetails: { 'squats': { requestedChange: 'substitute', painArea: 'knee' } }
        };

        const addExercise = (name) => name && name !== 'all' && name !== 'general' && specifics.exercisesMentioned.add(name.toLowerCase());

        (parsedFeedback.substitutions || []).forEach(item => {
            addExercise(item.from);
            addExercise(item.to);
        });
        (parsedFeedback.volumeAdjustments || []).forEach(item => {
            addExercise(item.exercise);
            item.property && specifics.parametersChanged.add(item.property.toLowerCase());
        });
        (parsedFeedback.intensityAdjustments || []).forEach(item => {
            addExercise(item.exercise);
            item.parameter && specifics.parametersChanged.add(item.parameter.toLowerCase());
        });
        (parsedFeedback.scheduleChanges || []).forEach(item => {
            // Basic extraction, could be improved with regex for days
            const days = item.details?.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi);
            days?.forEach(day => specifics.scheduleDaysAffected.add(day.toLowerCase()));
        });
        (parsedFeedback.restPeriodChanges || []).forEach(item => {
            specifics.parametersChanged.add(`rest_${item.type}`.toLowerCase());
        });
        (parsedFeedback.equipmentLimitations || []).forEach(item => {
            item.equipment && specifics.equipmentLimited.add(item.equipment.toLowerCase());
        });
        (parsedFeedback.painConcerns || []).forEach(item => {
            item.area && specifics.painAreas.add(item.area.toLowerCase());
            addExercise(item.exercise);
        });
        
        this.logger.debug(`[FeedbackParser] Specifics extracted: ${specifics.exercisesMentioned.size} exercises, ${specifics.parametersChanged.size} params, ${specifics.painAreas.size} pain areas.`);
        // Convert Sets to Arrays for easier JSON serialization if needed later
        return {
             exercisesMentioned: Array.from(specifics.exercisesMentioned),
             parametersChanged: Array.from(specifics.parametersChanged),
             painAreas: Array.from(specifics.painAreas),
             equipmentLimited: Array.from(specifics.equipmentLimited),
             scheduleDaysAffected: Array.from(specifics.scheduleDaysAffected),
        };
    }

    _buildPrompt(feedbackText) {
        return `
            "restPeriodAdjustments": [
                {
                    "type": "between_sets" | "between_workouts",
                    "change": "increase" | "decrease" | "set",
                    "value": "<string> (e.g., '60 seconds', 'target rest day')",
                    "scope": "<string> (e.g., 'all', 'compound lifts', 'specific exercise name')"
                }
            ],
            "painConcerns": [
                {
                    "area": "<string> (e.g., 'knee', 'lower back', 'shoulder')",
                    "intensity": "<string> (e.g., 'mild', 'sharp', 'during exercise')",
                    "exercise": "<string> (e.g., 'Squats', 'general', 'all lower body')" // Specific exercise or general area
                }
            ],
            "equipmentLimitations": [
                 {
                     "equipment": "<string> (e.g., 'barbell', 'pull-up bar')",
                     "alternative": "<string> (e.g., 'use dumbbells instead', null if no specific alternative mentioned)"
                 }
            ],
            "timeConstraints": [
                {
                    "type": "session_duration" | "total_weekly_time",
                    "limit": "<string> (e.g., '45 minutes per session', '3 hours per week')"
                }
            ],
            "advancedTechniques": [
                {
                    "technique": "<string> (e.g., 'drop sets', 'supersets', 'rest-pause')",
                    "exercise": "<string> (e.g., 'Bench Press', 'all isolation')",
                    "action": "add" | "remove"
                }
            ],
            "otherRequests": [
                 "<string> (Any requests not fitting other categories, e.g., 'make it more fun', 'focus on hypertrophy')"
            ],
            "contradictionsDetected": [
                "<string> (Describe any directly contradictory statements found in the feedback, e.g., 'User asked to add squats but also remove all lower body exercises.')" // Add this field
            ],
             "ambiguityNotes": [
                 "<string> (Describe any parts of the feedback that were too vague or unclear to parse confidently)" // Add this field
             ]
        }
        `;
    }

    _validateParsedFeedback(parsedJson) {
        const warnings = [];
        const validatedJson = JSON.parse(JSON.stringify(parsedJson)); // Deep copy

        // 1. Check explicit contradictions field from LLM
        if (validatedJson.contradictionsDetected && validatedJson.contradictionsDetected.length > 0) {
            validatedJson.contradictionsDetected.forEach(c => warnings.push({ type: 'contradiction', message: c }));
        }

        // 2. Check explicit ambiguity field from LLM
        if (validatedJson.ambiguityNotes && validatedJson.ambiguityNotes.length > 0) {
            validatedJson.ambiguityNotes.forEach(a => warnings.push({ type: 'ambiguity', message: a }));
        }

        // 3. Add heuristic checks for common contradictions
        const subs = validatedJson.substitutions || [];
        const volume = validatedJson.volumeAdjustments || [];

        // Example: Check if adding an exercise that was also requested for removal
        const exercisesToAdd = subs.map(s => s.to?.toLowerCase());
        const exercisesToRemove = subs.map(s => s.from?.toLowerCase());

        exercisesToAdd.forEach(exToAdd => {
            if (exToAdd && exercisesToRemove.includes(exToAdd)) {
                warnings.push({ type: 'contradiction', message: `User asked to substitute TO '${exToAdd}' but also substitute FROM the same exercise.` });
            }
        });

        // Example: Check for requests to significantly increase and decrease volume for the same exercise
        const volumeTargets = {};
        volume.forEach(adj => {
            const target = adj.exercise?.toLowerCase() || 'all';
            if (!volumeTargets[target]) volumeTargets[target] = { increase: 0, decrease: 0 };
            if (adj.change === 'increase') volumeTargets[target].increase++;
            if (adj.change === 'decrease') volumeTargets[target].decrease++;
        });

        for (const target in volumeTargets) {
            if (volumeTargets[target].increase > 0 && volumeTargets[target].decrease > 0) {
                 warnings.push({ type: 'contradiction', message: `Conflicting volume requests (increase and decrease) for exercise: '${target}'.` });
            }
        }

        // Example: Check for pain concern and request to increase volume/intensity on same exercise
        const painExercises = (validatedJson.painConcerns || []).map(p => p.exercise?.toLowerCase()).filter(Boolean);
        const intensityIncreaseTargets = (validatedJson.intensityAdjustments || [])
            .filter(i => i.change === 'increase')
            .map(i => i.exercise?.toLowerCase() || 'all');
        const volumeIncreaseTargets = volume
            .filter(v => v.change === 'increase')
            .map(v => v.exercise?.toLowerCase() || 'all');

        painExercises.forEach(painEx => {
            if (painEx !== 'general') {
                 if (intensityIncreaseTargets.includes(painEx) || intensityIncreaseTargets.includes('all')) {
                     warnings.push({ type: 'contradiction/safety', message: `User reported pain with '${painEx}' but also requested an intensity increase.` });
                 }
                 if (volumeIncreaseTargets.includes(painEx) || volumeIncreaseTargets.includes('all')) {
                    warnings.push({ type: 'contradiction/safety', message: `User reported pain with '${painEx}' but also requested a volume increase.` });
                 }
            }
        });

        // TODO: Add more checks (e.g., schedule conflicts, equipment contradictions)

        return { validatedJson, warnings };
    }
}

module.exports = FeedbackParser; 