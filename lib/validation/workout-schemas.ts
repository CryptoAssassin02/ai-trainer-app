/**
 * Workout Validation Schemas
 * Zod schemas for workout generation and management with backend alignment
 */

import { z } from 'zod';

// Fitness level validation - matches backend enum constraint
export const fitnessLevelSchema = z.enum([
  'beginner', 
  'intermediate', 
  'advanced'
], {
  required_error: 'Fitness level is required',
  invalid_type_error: 'Fitness level must be one of: beginner, intermediate, advanced'
});

// Goals validation - backend requires min 1 item
export const goalsSchema = z.array(z.string().min(1))
  .min(1, 'At least one goal is required')
  .max(3, 'Maximum 3 goals allowed')
  .refine(
    (goals) => goals.every(goal => goal.trim().length > 0),
    'Goals cannot be empty strings'
  );

// Equipment validation removed - equipment will be resolved from gym category
// Gym categories are handled at the profile level, not in workout generation

// Restrictions validation - backend allows empty array
export const restrictionsSchema = z.array(z.string().min(1))
  .max(15, 'Maximum 15 restrictions allowed')
  .optional()
  .default([])
  .refine(
    (restrictions) => !restrictions || restrictions.every(item => item.trim().length > 0),
    'Restrictions cannot be empty strings'
  );

// Exercise types validation - backend requires min 1 item
export const exerciseTypesSchema = z.array(z.string().min(1))
  .min(1, 'At least one exercise type is required')
  .max(10, 'Maximum 10 exercise types allowed')
  .refine(
    (types) => types.every(type => type.trim().length > 0),
    'Exercise types cannot be empty strings'
  );

// Workout frequency validation - backend allows optional string
export const workoutFrequencySchema = z.string()
  .min(1, 'Workout frequency cannot be empty')
  .max(50, 'Workout frequency description too long')
  .optional()
  .refine(
    (frequency) => !frequency || frequency.trim().length > 0,
    'Workout frequency cannot be only whitespace'
  );

// Additional notes validation - backend max 500 chars
export const additionalNotesSchema = z.string()
  .max(500, 'Additional notes cannot exceed 500 characters')
  .optional()
  .default('')
  .transform(val => val?.trim() || '');

// Primary workout generation schema - mirrors backend workoutGenerationSchema
export const workoutGenerationSchema = z.object({
  fitnessLevel: fitnessLevelSchema,
  goals: goalsSchema,
  primaryGoal: z.string().min(1).optional(), // Optional primary goal
  // Equipment will be resolved from user profile gym category
  restrictions: restrictionsSchema,
  exerciseTypes: exerciseTypesSchema,
  workoutFrequency: workoutFrequencySchema,
  additionalNotes: additionalNotesSchema,
})
.refine((data: any) => {
  // Validate primaryGoal is in goals array if provided
  if (data.primaryGoal && data.goals && !data.goals.includes(data.primaryGoal)) {
    return false;
  }
  return true;
}, {
  message: "Primary goal must be one of the selected goals",
  path: ["primaryGoal"]
})
.refine((data) => {
  // Cross-field validation: ensure goals and exercise types align reasonably
  // FIXED: More flexible validation logic that doesn't over-constrain user choices
  
  if (!data.goals || !data.exerciseTypes) return true;
  
  const hasCardioGoal = data.goals.some((goal: string) => 
    goal.toLowerCase().includes('cardio') || goal.toLowerCase().includes('endurance')
  );
  const hasStrengthGoal = data.goals.some((goal: string) => 
    goal.toLowerCase().includes('strength') || goal.toLowerCase().includes('muscle') || goal.toLowerCase().includes('weight_loss') || goal.toLowerCase().includes('body_recomposition')
  );
  
  const hasCardioType = data.exerciseTypes.some((type: string) => 
    type.toLowerCase().includes('cardio') || type.toLowerCase().includes('hiit')
  );
  const hasStrengthType = data.exerciseTypes.some((type: string) => 
    type.toLowerCase().includes('strength') || type.toLowerCase().includes('weight') || type.toLowerCase().includes('functional') || type.toLowerCase().includes('resistance')
  );

  // RELAXED VALIDATION: Only flag obvious mismatches
  // If user has explicit cardio goals but chooses ONLY strength types (and vice versa)
  const onlyStrengthTypes = data.exerciseTypes.length > 0 && data.exerciseTypes.every((type: string) => 
    type.toLowerCase().includes('strength') || type.toLowerCase().includes('weight') || type.toLowerCase().includes('functional')
  );
  const onlyCardioTypes = data.exerciseTypes.length > 0 && data.exerciseTypes.every((type: string) => 
    type.toLowerCase().includes('cardio') || type.toLowerCase().includes('hiit') || type.toLowerCase().includes('endurance')
  );

  // Only fail if there's a clear mismatch
  if (hasCardioGoal && onlyStrengthTypes && data.exerciseTypes.length > 2) {
    return false;
  }
  
  // Most combinations are valid - users can mix goals and exercise types freely
  return true;
}, {
  message: 'Exercise types should generally align with your fitness goals',
  path: ['exerciseTypes']
});

// Workout adjustment schema - for plan modifications
export const workoutAdjustmentSchema = z.object({
  feedback: z.string()
    .min(10, 'Feedback must be at least 10 characters')
    .max(2000, 'Feedback cannot exceed 2000 characters')
    .refine(
      (feedback) => feedback.trim().length >= 10,
      'Feedback must contain meaningful content'
    ),
  adjustmentType: z.enum([
    'difficulty', 
    'focus', 
    'equipment', 
    'schedule', 
    'medical'
  ]).optional(),
  priority: z.enum([
    'low', 
    'medium', 
    'high', 
    'urgent'
  ]).optional().default('medium'),
  preserveStructure: z.boolean().optional().default(false),
});

// Workout plan query schema - for filtering and pagination
export const workoutPlanQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  difficulty: fitnessLevelSchema.optional(),
  tags: z.array(z.string()).optional(),
  search: z.string().max(100).optional(),
  sortBy: z.enum([
    'createdAt', 
    'updatedAt', 
    'name', 
    'difficulty', 
    'estimatedDuration'
  ]).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// Type inference exports for TypeScript integration
export type WorkoutGenerationFormData = z.infer<typeof workoutGenerationSchema>;
export type WorkoutAdjustmentFormData = z.infer<typeof workoutAdjustmentSchema>;
export type WorkoutPlanQueryData = z.infer<typeof workoutPlanQuerySchema>;

// Validation helper functions
export const validateWorkoutGeneration = (data: unknown): WorkoutGenerationFormData => {
  return workoutGenerationSchema.parse(data);
};

export const validateWorkoutAdjustment = (data: unknown): WorkoutAdjustmentFormData => {
  return workoutAdjustmentSchema.parse(data);
};

export const validateWorkoutPlanQuery = (data: unknown): WorkoutPlanQueryData => {
  return workoutPlanQuerySchema.parse(data);
};

// Safe validation functions (returns success/error instead of throwing)
export const safeValidateWorkoutGeneration = (data: unknown) => {
  return workoutGenerationSchema.safeParse(data);
};

export const safeValidateWorkoutAdjustment = (data: unknown) => {
  return workoutAdjustmentSchema.safeParse(data);
};

export const safeValidateWorkoutPlanQuery = (data: unknown) => {
  return workoutPlanQuerySchema.safeParse(data);
};

// Validation constants for UI components
export const WORKOUT_VALIDATION_CONSTANTS = {
  GOALS_MIN: 1,
  GOALS_MAX: 3,
  EQUIPMENT_MAX: 20,
  RESTRICTIONS_MAX: 15,
  EXERCISE_TYPES_MIN: 1,
  EXERCISE_TYPES_MAX: 10,
  WORKOUT_FREQUENCY_MAX_LENGTH: 50,
  ADDITIONAL_NOTES_MAX_LENGTH: 500,
  FEEDBACK_MIN_LENGTH: 10,
  FEEDBACK_MAX_LENGTH: 2000,
  SEARCH_MAX_LENGTH: 100,
  QUERY_LIMIT_MIN: 1,
  QUERY_LIMIT_MAX: 100,
} as const;

// Error message helpers
export const getWorkoutValidationError = (
  field: string,
  error: z.ZodError
): string | undefined => {
  const fieldError = error.errors.find(err => 
    err.path.includes(field) || err.path[err.path.length - 1] === field
  );
  return fieldError?.message;
};

// Schema factory for dynamic validation based on user profile
export const createDynamicWorkoutSchema = (
  userProfile?: {
    experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
    goals?: string[];
    equipment?: string[];
    medicalConditions?: string[];
  }
) => {
  if (!userProfile) {
    return workoutGenerationSchema;
  }

  // Create a new schema with profile defaults applied
  return workoutGenerationSchema.transform((data: any) => ({
    ...data,
    fitnessLevel: data.fitnessLevel || userProfile.experienceLevel || 'beginner',
    goals: data.goals && data.goals.length > 0 ? data.goals : (userProfile.goals || []),
    // Equipment will be resolved from user profile gym category
    restrictions: data.restrictions && data.restrictions.length > 0
      ? data.restrictions
      : (userProfile.medicalConditions || []),
  }));
};

// ==========================================
// CRITICAL INTEGRATION CHECKPOINT VALIDATORS
// ==========================================

/**
 * Validates profile completeness before allowing workout generation
 * Aligns with existing profile completion patterns from useProfileCompletion
 */
export const validateProfileCompleteness = (profile: any): {
  isComplete: boolean;
  missingFields: string[];
  recommendations: string[];
} => {
  if (!profile) {
    return {
      isComplete: false,
      missingFields: ['Complete profile required'],
      recommendations: ['Please complete your profile before generating workouts'],
    };
  }

  // Required fields for workout generation (matches existing profile patterns)
  const requiredForWorkouts = [
    'name', 'age', 'gender', 'height', 'weight', 
    'experienceLevel', 'goals', 'unitPreference'
  ];

  const missingFields = requiredForWorkouts.filter(field => {
    const value = profile[field];
    return value === null || value === undefined || value === '' || 
           (Array.isArray(value) && value.length === 0);
  });

  const recommendations = [];
  if (missingFields.length > 0) {
    recommendations.push(`Complete required fields: ${missingFields.join(', ')}`);
  }

  // Optional but recommended for better workout generation
  const recommendedFields = ['gymCategory', 'workoutFrequency'];
  const missingRecommended = recommendedFields.filter(field => {
    const value = profile[field];
    return value === null || value === undefined || value === '' || 
           (Array.isArray(value) && value.length === 0);
  });

  if (missingRecommended.length > 0 && missingFields.length === 0) {
    recommendations.push(`Consider adding: ${missingRecommended.join(', ')} for better recommendations`);
  }

  return {
    isComplete: missingFields.length === 0,
    missingFields,
    recommendations,
  };
};

/**
 * Validates authentication status before workout operations
 * Aligns with existing auth patterns from AuthProvider
 */
export const validateAuthenticationStatus = (): {
  isAuthenticated: boolean;
  hasToken: boolean;
  error?: string;
} => {
  try {
    // Check for auth token in storage (matches API client patterns)
    const token = sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token');
    const userId = sessionStorage.getItem('user_id') || localStorage.getItem('user_id');

    if (!token) {
      return {
        isAuthenticated: false,
        hasToken: false,
        error: 'No authentication token found. Please sign in.',
      };
    }

    if (!userId) {
      return {
        isAuthenticated: false,
        hasToken: true,
        error: 'Invalid authentication state. Please sign in again.',
      };
    }

    return {
      isAuthenticated: true,
      hasToken: true,
    };
  } catch (error) {
    return {
      isAuthenticated: false,
      hasToken: false,
      error: 'Failed to check authentication status.',
    };
  }
};

/**
 * Combined pre-flight validation for workout generation
 * Ensures all critical integration checkpoints are met
 */
export const validateWorkoutGenerationReadiness = (profile: any): {
  canGenerate: boolean;
  authStatus: ReturnType<typeof validateAuthenticationStatus>;
  profileStatus: ReturnType<typeof validateProfileCompleteness>;
  errors: string[];
  recommendations: string[];
} => {
  const authStatus = validateAuthenticationStatus();
  const profileStatus = validateProfileCompleteness(profile);

  const errors = [];
  const recommendations = [];

  if (!authStatus.isAuthenticated) {
    errors.push(authStatus.error || 'Authentication required');
  }

  if (!profileStatus.isComplete) {
    errors.push('Profile completion required');
    recommendations.push(...profileStatus.recommendations);
  }

  return {
    canGenerate: authStatus.isAuthenticated && profileStatus.isComplete,
    authStatus,
    profileStatus,
    errors,
    recommendations,
  };
};
