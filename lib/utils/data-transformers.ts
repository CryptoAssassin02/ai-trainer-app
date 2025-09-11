/**
 * Data transformation utilities for converting between frontend camelCase 
 * and backend snake_case formats for workout plans and other entities.
 */

import type { WorkoutPlan } from '@/lib/api/types';

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
 * Transforms raw database workout plan to frontend WorkoutPlan format
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
  
  // Map specific database fields to frontend interface
  const workoutPlan: WorkoutPlan = {
    id: camelCasePlan.id,
    name: camelCasePlan.name || 'Untitled Workout',
    description: camelCasePlan.description || '',
    exercises: camelCasePlan.planData?.exercises || [],
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
 */
export function transformWorkoutPlanToDatabase(workoutPlan: Partial<WorkoutPlan>): any {
  const dbPlan = {
    name: workoutPlan.name,
    description: workoutPlan.description,
    plan_data: {
      exercises: workoutPlan.exercises || [],
      reasoning: workoutPlan.reasoning || ''
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
 * Transforms array of database workout plans to frontend format
 */
export function transformWorkoutPlansFromDatabase(dbPlans: any[]): WorkoutPlan[] {
  return dbPlans.map(transformWorkoutPlanFromDatabase);
}
