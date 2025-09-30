/**
 * Data transformation utilities for converting between frontend camelCase 
 * and backend snake_case formats for workout plans and other entities.
 */

import type { WorkoutPlan, EnhancedWorkoutPlan } from '@/lib/api/types';

/**
 * Converts snake_case keys to camelCase recursively
 */
function toCamelCase(obj: any): any {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(toCamelCase);
  }

  const camelCaseObj: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    // Convert snake_case to camelCase
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    camelCaseObj[camelKey] = toCamelCase(value);
  }

  return camelCaseObj;
}

/**
 * Converts camelCase keys to snake_case recursively
 */
function toSnakeCase(obj: any): any {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(toSnakeCase);
  }

  const snakeCaseObj: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    // Convert camelCase to snake_case
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    snakeCaseObj[snakeKey] = toSnakeCase(value);
  }

  return snakeCaseObj;
}

/**
 * Extract flat exercises array from structured mesocycles data
 * Supports both chunked generation and WorkoutGenerationAgent formats
 */
function extractExercisesFromMesocycles(mesocycles: any[]): any[] {
  const exercises: any[] = [];
  
  if (!Array.isArray(mesocycles)) return exercises;
  
  mesocycles.forEach((mesocycle: any) => {
    // Handle chunked mesocycle format (weeks[].workouts{})
    if (mesocycle.weeks && Array.isArray(mesocycle.weeks)) {
      mesocycle.weeks.forEach((week: any) => {
        if (week.workouts && typeof week.workouts === 'object') {
          // Iterate through daily workouts (Day 1, Day 2, etc.)
          Object.values(week.workouts).forEach((workout: any) => {
            if (typeof workout === 'object' && workout.exercises && Array.isArray(workout.exercises)) {
              exercises.push(...workout.exercises.map((exercise: any) => ({
                name: exercise.exercise || exercise.name,
                sets: exercise.sets,
                reps: exercise.reps || exercise.repsOrDuration,
                restTime: exercise.restTime || `${exercise.restSeconds}s`,
                notes: exercise.notes,
                category: exercise.category,
                primaryMuscles: exercise.primaryMuscles,
                intensity: exercise.intensity,
                rpe: exercise.rpe,
                equipment: exercise.equipment,
                difficulty: exercise.difficulty
              })));
            }
          });
        }
      });
    }
  });
  
  return exercises;
}

/**
 * Build legacy weekly schedule from mesocycles structure
 * Extracts first week's workout structure as template
 */
function buildWeeklyScheduleFromMesocycles(mesocycles: any[]): Record<string, any> {
  const weeklySchedule: Record<string, any> = {};
  
  if (!Array.isArray(mesocycles) || mesocycles.length === 0) return weeklySchedule;
  
  // Use first mesocycle's first week as template
  const firstMesocycle = mesocycles[0];
  if (firstMesocycle.weeks && Array.isArray(firstMesocycle.weeks) && firstMesocycle.weeks.length > 0) {
    const firstWeek = firstMesocycle.weeks[0];
    if (firstWeek.workouts && typeof firstWeek.workouts === 'object') {
      // Map daily workouts to legacy format
      Object.entries(firstWeek.workouts).forEach(([day, workout]) => {
        weeklySchedule[day] = {
          type: typeof workout === 'string' ? workout : 'workout',
          exercises: typeof workout === 'object' && (workout as any).exercises ? (workout as any).exercises : [],
          sessionName: typeof workout === 'object' ? (workout as any).sessionName : undefined,
          sessionType: typeof workout === 'object' ? (workout as any).sessionType : undefined
        };
      });
    }
  }
  
  return weeklySchedule;
}

/**
 * Generate formatted plan text from structured mesocycles data
 */
function generateFormattedPlan(mesocycles: any[], programName?: string): string {
  if (!Array.isArray(mesocycles) || mesocycles.length === 0) {
    return programName || 'Workout Plan';
  }
  
  let formatted = `${programName || 'AI-Generated Workout Plan'}\n\n`;
  
  mesocycles.forEach((mesocycle: any, index: number) => {
    formatted += `=== Mesocycle ${index + 1}: ${mesocycle.name || mesocycle.theme} ===\n`;
    formatted += `Duration: ${mesocycle.durationWeeks || mesocycle.duration} weeks\n`;
    formatted += `Focus: ${mesocycle.focus}\n`;
    if (mesocycle.phase) formatted += `Phase: ${mesocycle.phase}\n`;
    formatted += '\n';
    
    // Add week summary
    if (mesocycle.weeks && Array.isArray(mesocycle.weeks)) {
      formatted += `Weeks: ${mesocycle.weeks.length} planned\n`;
      const firstWeek = mesocycle.weeks[0];
      if (firstWeek && firstWeek.workouts) {
        const workoutDays = Object.keys(firstWeek.workouts).filter(day => 
          typeof firstWeek.workouts[day] === 'object'
        );
        formatted += `Training Days: ${workoutDays.join(', ')}\n`;
      }
    }
    formatted += '\n';
  });
  
  return formatted;
}

/**
 * Detect if data contains structured output format
 */
function hasStructuredOutputFormat(planData: any): boolean {
  return planData && (
    // Check for mesocycles array (primary indicator)
    (Array.isArray(planData.mesocycles) && planData.mesocycles.length > 0) ||
    // Check for structured output fields
    planData.programName || 
    planData.programDuration ||
    planData.goalStructure ||
    planData.trainingFrequency
  );
}

/**
 * Transforms raw database workout plan to frontend WorkoutPlan format
 * Supports both legacy and structured output formats
 */
export function transformWorkoutPlanFromDatabase(dbPlan: any): WorkoutPlan {
  // Convert snake_case to camelCase
  const camelCasePlan = toCamelCase(dbPlan);
  
  // Helper function to ensure array of strings
  const ensureStringArray = (arr: any[]): string[] => {
    if (!Array.isArray(arr)) return [];
    return arr.map(item => {
      if (typeof item === 'string') return item;
      if (typeof item === 'object' && item?.name) return item.name;
      return String(item);
    });
  };
  
  // Determine if this is structured output format
  const hasStructuredData = hasStructuredOutputFormat(camelCasePlan.planData);
  
  // Extract exercises based on data format
  let exercises: any[] = [];
  if (hasStructuredData) {
    // Extract from mesocycles structure (structured outputs)
    exercises = extractExercisesFromMesocycles(
      camelCasePlan.planData?.mesocycles || 
      camelCasePlan.mesocycleStructure || 
      []
    );
  } else {
    // Use legacy exercises array
    exercises = camelCasePlan.planData?.exercises || [];
  }
  
  // Map specific database fields to frontend interface
  const workoutPlan: WorkoutPlan = {
    id: camelCasePlan.id,
    name: camelCasePlan.name || 'Untitled Workout',
    description: camelCasePlan.description || '',
    exercises: exercises, // Computed from structured data or legacy
    difficulty: camelCasePlan.difficultyLevel || 'intermediate',
    estimatedDuration: camelCasePlan.estimatedDuration || 45,
    equipmentRequired: ensureStringArray(camelCasePlan.equipmentRequired || []),
    tags: ensureStringArray(camelCasePlan.tags || []),
    createdAt: camelCasePlan.createdAt,
    updatedAt: camelCasePlan.updatedAt,
    reasoning: camelCasePlan.aiReasoning?.reasoning || camelCasePlan.planData?.reasoning || '',
    aiGenerated: camelCasePlan.aiGenerated || false,
    status: camelCasePlan.status || 'active',
    userId: camelCasePlan.userId
  };

  return workoutPlan;
}

/**
 * Transforms frontend WorkoutPlan to database format for storage
 * Handles both legacy and structured output data
 */
export function transformWorkoutPlanToDatabase(workoutPlan: Partial<WorkoutPlan>): any {
  const dbPlan = {
    name: workoutPlan.name,
    description: workoutPlan.description,
    plan_data: {
      // Legacy format for backward compatibility
      exercises: workoutPlan.exercises || [],
      reasoning: workoutPlan.reasoning || '',
      
      // Structured output format (if available from enhanced plan)
      ...(workoutPlan as any).planData && {
        programName: (workoutPlan as any).planData.programName,
        programDuration: (workoutPlan as any).planData.programDuration,
        goalStructure: (workoutPlan as any).planData.goalStructure,
        trainingFrequency: (workoutPlan as any).planData.trainingFrequency,
        mesocycles: (workoutPlan as any).planData.mesocycles,
        progressionStrategy: (workoutPlan as any).planData.progressionStrategy,
        recoveryRequirements: (workoutPlan as any).planData.recoveryRequirements,
        explanations: (workoutPlan as any).planData.explanations,
        warnings: (workoutPlan as any).planData.warnings,
        errors: (workoutPlan as any).planData.errors
      }
    },
    difficulty_level: workoutPlan.difficulty,
    estimated_duration: workoutPlan.estimatedDuration,
    equipment_required: workoutPlan.equipmentRequired || [],
    tags: workoutPlan.tags || [],
    ai_generated: workoutPlan.aiGenerated || false,
    status: workoutPlan.status || 'active',
    ai_reasoning: {
      reasoning: workoutPlan.reasoning || ''
    }
  };

  return dbPlan;
}

/**
 * Transform raw database response to EnhancedWorkoutPlan format
 * Specialized for structured output data with full mesocycles support
 */
export function transformEnhancedWorkoutPlanFromDatabase(dbPlan: any): any {
  const camelCasePlan = toCamelCase(dbPlan);
  
  // Helper function to ensure array of strings
  const ensureStringArray = (arr: any[]): string[] => {
    if (!Array.isArray(arr)) return [];
    return arr.map(item => {
      if (typeof item === 'string') return item;
      if (typeof item === 'object' && item?.name) return item.name;
      return String(item);
    });
  };
  
  // Detect structured output format
  const hasStructuredData = hasStructuredOutputFormat(camelCasePlan.planData);
  const mesocycles = camelCasePlan.planData?.mesocycles || camelCasePlan.mesocycleStructure || [];
  
  return {
    // Basic WorkoutPlan fields
    id: camelCasePlan.id,
    name: camelCasePlan.name || 'Untitled Workout',
    description: camelCasePlan.description || '',
    exercises: hasStructuredData ? extractExercisesFromMesocycles(mesocycles) : (camelCasePlan.planData?.exercises || []),
    difficulty: camelCasePlan.difficultyLevel || 'intermediate',
    estimatedDuration: camelCasePlan.estimatedDuration || 60,
    equipmentRequired: ensureStringArray(camelCasePlan.equipmentRequired || []),
    tags: ensureStringArray(camelCasePlan.tags || []),
    createdAt: camelCasePlan.createdAt,
    updatedAt: camelCasePlan.updatedAt,
    reasoning: camelCasePlan.planData?.reasoning || '',
    aiGenerated: camelCasePlan.aiGenerated || false,
    status: camelCasePlan.status || 'active',
    userId: camelCasePlan.userId,

    // Enhanced fields
    schemaVersion: camelCasePlan.schemaVersion || 'v2.0',
    generationMethod: camelCasePlan.generationMethod || (hasStructuredData ? 'structured_output' : 'legacy'),
    programDurationWeeks: camelCasePlan.programDurationWeeks || camelCasePlan.planData?.programDuration?.totalWeeks || 8,
    mesocycleCount: camelCasePlan.mesocycleCount || camelCasePlan.planData?.programDuration?.mesocycles || mesocycles.length,
    primaryGoal: camelCasePlan.primaryGoal || camelCasePlan.planData?.goalStructure?.primaryGoal,

    // Structured data
    trainingFrequency: camelCasePlan.trainingFrequency || camelCasePlan.planData?.trainingFrequency || {
      daysPerWeek: 3,
      sessionsPerDay: 1,
      restDays: ['Sunday']
    },
    orchestratorData: camelCasePlan.orchestratorData,
    mesocycleStructure: mesocycles,
    goalStrategyData: camelCasePlan.goalStrategyData || {
      strategies: {},
      trainingParameters: {},
      exercisePriorities: { compound: 5, isolation: 3 },
      progressionStrategy: { primary: 'linear' },
      recoveryRequirements: { restBetweenSets: '60-90s', sleepRecommendation: '7-9 hours' }
    },

    // Enhanced plan_data structure
    planData: {
      // Legacy format (computed from structured data)
      exercises: hasStructuredData ? extractExercisesFromMesocycles(mesocycles) : (camelCasePlan.planData?.exercises || []),
      weeklySchedule: hasStructuredData ? buildWeeklyScheduleFromMesocycles(mesocycles) : (camelCasePlan.planData?.weeklySchedule || {}),
      formattedPlan: hasStructuredData ? 
        generateFormattedPlan(mesocycles, camelCasePlan.planData?.programName) : 
        (camelCasePlan.planData?.formattedPlan || ''),

      // Structured output data (primary source)
      programName: camelCasePlan.planData?.programName,
      programDuration: camelCasePlan.planData?.programDuration,
      goalStructure: camelCasePlan.planData?.goalStructure,
      trainingFrequency: camelCasePlan.planData?.trainingFrequency,
      mesocycles: mesocycles,
      progressionStrategy: camelCasePlan.planData?.progressionStrategy,
      recoveryRequirements: camelCasePlan.planData?.recoveryRequirements,

      // AI insights and reasoning
      explanations: camelCasePlan.planData?.explanations || '',
      reasoning: camelCasePlan.planData?.reasoning || '',
      warnings: camelCasePlan.planData?.warnings || [],
      errors: camelCasePlan.planData?.errors || []
    },

    // Enhanced ai_reasoning structure
    aiReasoning: {
      reasoning: camelCasePlan.aiReasoning?.reasoning || '',
      compatibility: camelCasePlan.aiReasoning?.compatibility,
      recommendations: camelCasePlan.aiReasoning?.recommendations || [],
      promptInstructions: camelCasePlan.aiReasoning?.promptInstructions,
      goalPriority: camelCasePlan.aiReasoning?.goalPriority
    },

    // Computed properties for legacy compatibility
    totalExercises: hasStructuredData ? extractExercisesFromMesocycles(mesocycles).length : (camelCasePlan.planData?.exercises || []).length,
    trainingDays: hasStructuredData ? Object.keys(buildWeeklyScheduleFromMesocycles(mesocycles)) : Object.keys(camelCasePlan.planData?.weeklySchedule || {}),
    programSummary: camelCasePlan.planData?.programName || camelCasePlan.name || 'Workout Program'
  };
}

/**
 * Transforms array of database enhanced workout plans to frontend format
 */
export function transformEnhancedWorkoutPlansFromDatabase(dbPlans: any[]): any[] {
  return dbPlans.map(transformEnhancedWorkoutPlanFromDatabase);
}

/**
 * Transforms array of database workout plans to frontend format
 */
export function transformWorkoutPlansFromDatabase(dbPlans: any[]): WorkoutPlan[] {
  return dbPlans.map(transformWorkoutPlanFromDatabase);
}
