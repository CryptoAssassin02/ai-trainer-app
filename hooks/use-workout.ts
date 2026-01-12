/**
 * Workout Context Hooks
 * 
 * Re-exports workout-related hooks from the context for better organization
 * and following established project patterns.
 */

export { 
  useWorkout, 
  useWorkoutGeneration, 
  useWorkoutAdjustment 
} from '@/contexts/workout-context';

// Type exports for convenience
export type { 
  WorkoutPlan, 
  WorkoutGenerationRequest, 
  WorkoutAdjustmentRequest 
} from '@/lib/api/types';
