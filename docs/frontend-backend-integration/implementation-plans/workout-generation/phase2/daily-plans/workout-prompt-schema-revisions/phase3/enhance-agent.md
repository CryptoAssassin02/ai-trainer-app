### **🎯 PHASE 3: ENHANCED WORKOUT GENERATION AGENT**

#### **3.1 Update WorkoutGenerationAgent (`backend/agents/workout-generation-agent.js`)**

**Add Goal Strategy Integration:**

```javascript
// Add to constructor
constructor({ openaiService, supabaseClient, memorySystem = null, logger = null, config = {} } = {}) {
    super({ memorySystem, logger, config });
    
    // Initialize goal strategies
    this.goalStrategies = new Map();
    this.multiGoalOrchestrator = new MultiGoalOrchestrator();
    
    // Register all goal strategies
    this.initializeGoalStrategies();
    
    // Existing initialization...
}

initializeGoalStrategies() {
    const StrengthStrategy = require('./goal-strategies/strength-strategy');
    const HypertrophyStrategy = require('./goal-strategies/hypertrophy-strategy');
    const WeightLossStrategy = require('./goal-strategies/weight-loss-strategy');
    const SportsPerformanceStrategy = require('./goal-strategies/sports-performance-strategy');
    const FlexibilityStrategy = require('./goal-strategies/flexibility-strategy');
    const GeneralFitnessStrategy = require('./goal-strategies/general-fitness-strategy');
    const EnduranceStrategy = require('./goal-strategies/endurance-strategy');
    const BodyRecompositionStrategy = require('./goal-strategies/body-recomposition-strategy');
    
    // Register strategies
    this.goalStrategies.set('strength', new StrengthStrategy());
    this.goalStrategies.set('hypertrophy', new HypertrophyStrategy());
    this.goalStrategies.set('muscle_gain', new HypertrophyStrategy()); // Alias
    this.goalStrategies.set('weight_loss', new WeightLossStrategy());
    this.goalStrategies.set('sports_performance', new SportsPerformanceStrategy());
    this.goalStrategies.set('flexibility', new FlexibilityStrategy());
    this.goalStrategies.set('general_fitness', new GeneralFitnessStrategy());
    this.goalStrategies.set('endurance', new EnduranceStrategy());
    this.goalStrategies.set('body_recomposition', new BodyRecompositionStrategy());
    
    // Register strategies with orchestrator
    this.goalStrategies.forEach((strategy, goalName) => {
        this.multiGoalOrchestrator.registerStrategy(goalName, strategy);
    });
}
```

**Update Process Method:**

```javascript
async process(context, options = {}) {
    this.log('info', 'Multi-goal workout generation process START');
    const startTime = Date.now();
    
    // CRITICAL: Extract additionalNotes from context (already implemented in Step 1)
    const { userProfile, goals, researchData, additionalNotes } = context;
    
    // Step 1: Orchestrate multiple goals
    const totalWeeks = this.determineProgramDuration(goals, userProfile);
    const orchestratedProgram = this.multiGoalOrchestrator.orchestrateGoals(
        goals, 
        userProfile, 
        totalWeeks
    );
    
    // Step 2: Enhanced state initialization with multi-goal support
    let state = {
        userProfile,
        goals,
        researchData,
        additionalNotes: additionalNotes || '', // Add additionalNotes to state
        orchestratedProgram,
        totalWeeks,
        // ... existing state properties (keep all existing state from current implementation)
        systemPrompt: null,
        rawApiResponse: null,
        parsedPlan: null,
        formattedPlan: null,
        explanations: null,
        errors: [],
        warnings: researchData?.warnings || [],
        reasoning: [],
        iteration: 0,
        maxIterations: this.config.maxRefinementAttempts || 1,
        medicalConditions: [],
        contraindications: [],
        pastWorkouts: [],
        userFeedback: []
    };
    
    // Step 3: Build enhanced system prompt with goal-specific instructions
    // CRITICAL: Use existing _buildSystemPrompt method with orchestrator enhancements
    state.systemPrompt = this._buildEnhancedSystemPrompt(
        state.userProfile,
        state.goals,
        state.researchData,
        state.orchestratedProgram,
        state.medicalConditions,
        state.contraindications,
        state.pastWorkouts,
        state.userFeedback,
        state.additionalNotes
    );
    
    // Continue with existing ReAct loop (keep all existing logic)...
}

determineProgramDuration(goals, userProfile) {
    // Get recommended duration from primary goal strategy
    const primaryGoal = goals[0];
    const strategy = this.goalStrategies.get(primaryGoal);
    
    if (strategy) {
        return strategy.getRecommendedDuration(userProfile);
    }
    
    // Default duration based on goal complexity
    if (goals.length > 3) return 16; // Longer for complex multi-goal programs
    if (goals.length > 1) return 12; // Standard for multi-goal
    return 8; // Shorter for single goal
}

// CRITICAL: Replace existing _buildSystemPrompt with enhanced version
_buildEnhancedSystemPrompt(userProfile, goals, researchData, orchestratedProgram, medicalConditions, contraindications, pastWorkouts = [], userFeedback = [], additionalNotes = '') {
    const { buildMultiGoalSystemPrompt } = require('../utils/workout-prompts');
    
    // Determine if this is a multi-goal scenario
    const isMultiGoal = goals.length > 1;
    const primaryGoal = goals[0];
    
    if (isMultiGoal && orchestratedProgram) {
        // Use the new multi-goal system with orchestrator data
        return buildMultiGoalSystemPrompt(
            userProfile,
            goals,
            researchData,
            '', // injury prompt will be built internally
            primaryGoal
        );
    } else {
        // For single goals, use existing _buildSystemPrompt logic but with orchestrator insights
        // Build injury prompt from medical conditions and contraindications
        let injuryPrompt = this._buildInjuryPrompt(medicalConditions, contraindications);
        
        // Build workout history prompt
        let workoutHistoryPrompt = this._buildWorkoutHistoryPrompt(pastWorkouts, userFeedback);
        
        // Build additional notes prompt
        let additionalNotesPrompt = "";
        if (additionalNotes && additionalNotes.trim()) {
            additionalNotesPrompt = `\n\n## ADDITIONAL USER CONTEXT:\n${additionalNotes.trim()}\n`;
        }
        
        // Use the dynamic goal loading system
        const { generateWorkoutPrompt } = require('../utils/workout-prompts');
        return generateWorkoutPrompt(
            userProfile,
            goals,
            researchData,
            injuryPrompt + workoutHistoryPrompt + additionalNotesPrompt,
            primaryGoal
        );
    }
}

// Helper method to build injury prompt (extract from existing logic)
_buildInjuryPrompt(medicalConditions, contraindications) {
    let injuryPrompt = "";
    if (medicalConditions && medicalConditions.length > 0) {
        injuryPrompt += `\n\n==== CRITICAL SAFETY REQUIREMENTS ====\nThe user has the following medical conditions and restrictions that MUST be followed:\n`;
        medicalConditions.forEach(condition => {
            const matchingContraindication = contraindications.find(
                c => c.condition && c.condition.toLowerCase() === condition.toLowerCase()
            );
            
            if (matchingContraindication && Array.isArray(matchingContraindication.exercises_to_avoid) && matchingContraindication.exercises_to_avoid.length > 0) {
                const exercises = matchingContraindication.exercises_to_avoid.join(', ');
                injuryPrompt += `- Condition: ${condition} - Avoid exercises: ${exercises}\n`;
            } else {
                // Generic safety rules based on condition type
                const lowerCondition = String(condition).toLowerCase().trim();
                if (lowerCondition.includes('knee')) {
                    injuryPrompt += `- Condition: ${condition} - STRICTLY AVOID: squats, lunges, jumping exercises, high-impact activities.\n`;
                } else if (lowerCondition.includes('shoulder')) {
                    injuryPrompt += `- Condition: ${condition} - STRICTLY AVOID: overhead press, shoulder press, overhead movements.\n`;
                } else if (lowerCondition.includes('back')) {
                    injuryPrompt += `- Condition: ${condition} - STRICTLY AVOID: deadlifts, heavy rows, twisting movements.\n`;
                } else {
                    injuryPrompt += `- Condition: ${condition} - STRICTLY AVOID high-impact activities that stress this area.\n`;
                }
            }
        });
        injuryPrompt += `\n==== END SAFETY REQUIREMENTS ====\n`;
    }
    return injuryPrompt;
}

// Helper method to build workout history prompt (extract from existing logic)
_buildWorkoutHistoryPrompt(pastWorkouts, userFeedback) {
    let workoutHistoryPrompt = "";
    if (pastWorkouts && pastWorkouts.length > 0) {
        workoutHistoryPrompt = "\n\n## CRITICAL MEMORY-BASED PREFERENCES:\n";
        
        // Extract preferences from memory (simplified version of existing logic)
        const preferredExercises = new Set();
        const dislikedExercises = new Set();
        
        pastWorkouts.forEach(workout => {
            const workoutContent = typeof workout.content === 'string' 
                ? JSON.parse(workout.content) 
                : workout.content;
            
            if (workoutContent.effectiveExercises) {
                workoutContent.effectiveExercises.forEach(ex => preferredExercises.add(ex.toLowerCase()));
            }
        });
        
        if (preferredExercises.size > 0) {
            workoutHistoryPrompt += `PRIORITIZE these exercises the user has loved: ${Array.from(preferredExercises).join(', ')}\n`;
        }
        
        if (userFeedback.length > 0) {
            const sentiments = userFeedback.reduce((acc, feedback) => {
                const content = typeof feedback.content === 'string' 
                    ? JSON.parse(feedback.content) 
                    : feedback.content;
                const rating = content.rating || '';
                if (rating.includes('helpful') || rating.includes('positive')) acc.positive++;
                else if (rating.includes('not_helpful') || rating.includes('negative')) acc.negative++;
                return acc;
            }, { positive: 0, negative: 0 });
            
            workoutHistoryPrompt += `User Feedback Summary: ${sentiments.positive} positive, ${sentiments.negative} negative ratings.\n`;
        }
    }
    return workoutHistoryPrompt;
}

// CRITICAL: Update schema usage for multi-goal programs
_parseWorkoutResponse(responseContent) {
    // For multi-goal programs, expect multiGoalMesocycleSchema format
    // For single goals, use existing legacy schema format
    
    if (!responseContent) {
        this.log('warn', 'Empty response received from API');
        return null;
    }

    try {
        // Extract JSON from response (existing logic)
        const jsonMatch = responseContent.match(/```json\s*([\s\S]*?)\s*```/) || 
                         responseContent.match(/```\s*([\s\S]*?)\s*```/) ||
                         [null, responseContent];
        
        const jsonStr = jsonMatch[1].trim();
        const parsedData = JSON.parse(jsonStr);
        
        // Check if this is a multi-goal mesocycle response
        if (parsedData.programName && parsedData.mesocycles) {
            // Handle multiGoalMesocycleSchema format
            return this._transformMultiGoalResponse(parsedData);
        } else {
            // Handle legacy schema format (existing logic)
            return this._transformLegacyResponse(parsedData);
        }
        
    } catch (error) {
        this.log('warn', `Failed to parse API response: ${error.message}`);
        return null;
    }
}

_transformMultiGoalResponse(parsedData) {
    // Transform multiGoalMesocycleSchema to internal format
    // This is a placeholder - implement based on actual schema structure
    return {
        plan: this._extractExercisesFromMesocycles(parsedData.mesocycles),
        planName: parsedData.programName,
        weeklySchedule: this._buildWeeklyScheduleFromMesocycles(parsedData.mesocycles),
        programDuration: parsedData.programDuration,
        goalStructure: parsedData.goalStructure
    };
}

_transformLegacyResponse(parsedData) {
    // Existing legacy transformation logic
    if (!parsedData.planName || !parsedData.weeklySchedule) {
        return null;
    }
    
    const exercises = [];
    Object.entries(parsedData.weeklySchedule).forEach(([day, dayData]) => {
        if (dayData !== 'Rest' && dayData.exercises && Array.isArray(dayData.exercises)) {
            dayData.exercises.forEach(exercise => {
                exercises.push({
                    ...exercise,
                    day: day,
                    sessionName: dayData.sessionName
                });
            });
        }
    });
    
    return {
        plan: exercises,
        planName: parsedData.planName,
        weeklySchedule: parsedData.weeklySchedule,
        warmupSuggestion: parsedData.warmupSuggestion,
        cooldownSuggestion: parsedData.cooldownSuggestion
    };
}
```

## **CRITICAL IMPLEMENTATION NOTES:**

1. **Backward Compatibility**: The enhanced agent maintains full compatibility with existing single-goal workflows
2. **Schema Flexibility**: Automatically detects and handles both legacy and multi-goal schema formats
3. **Additional Notes Integration**: Properly integrates user's additional context throughout the prompt building process
4. **Memory System**: Leverages existing memory retrieval and preference extraction logic
5. **Safety First**: Maintains all existing safety validation and medical condition handling
6. **Orchestrator Integration**: Seamlessly integrates with MultiGoalOrchestrator when available

## **TESTING REQUIREMENTS:**

- Test single-goal generation (should work exactly as before)
- Test multi-goal generation with orchestrator
- Test additional notes integration
- Test memory system integration
- Test safety validation with medical conditions