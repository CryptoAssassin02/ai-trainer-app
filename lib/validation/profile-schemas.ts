/**
 * Profile Validation Schemas
 * Comprehensive Zod schemas for user profile management with healthcare data validation
 */

import { z } from 'zod';

// Unit system validation
export const unitSystemSchema = z.enum(['metric', 'imperial'], {
  required_error: 'Unit preference is required',
  invalid_type_error: 'Unit preference must be either metric or imperial'
});

// Gender validation with inclusive options - Required for personalized recommendations
export const genderSchema = z.enum([
  'male', 
  'female', 
  'other', 
  'prefer_not_to_say', 
  'non-binary'
], {
  required_error: 'Gender is required for personalized fitness recommendations',
  invalid_type_error: 'Invalid gender selection'
});

// Experience level validation
export const experienceLevelSchema = z.enum([
  'beginner', 
  'intermediate', 
  'advanced'
], {
  required_error: 'Please select your fitness experience level',
  invalid_type_error: 'Invalid experience level'
}).optional();

// Name validation with length constraints
export const nameSchema = z.string()
  .min(2, 'Name must be at least 2 characters long')
  .max(100, 'Name must be 100 characters or less')
  .regex(/^[a-zA-ZÀ-ÿ\s\-'\.]+$/, 'Name can only contain letters, spaces, hyphens, apostrophes, and periods')
  .transform(val => val.trim())
  .refine(val => val.trim().length > 0, 'Name cannot be empty or only whitespace')
  .optional();

// Age validation with realistic bounds
export const ageSchema = z.number()
  .int('Age must be a whole number')
  .min(13, 'You must be at least 13 years old')
  .max(120, 'Please enter a valid age')
  .optional();

// Weight validation with appropriate ranges
export const weightSchema = z.number()
  .positive('Weight must be a positive number')
  .min(20, 'Weight seems too low - please check your entry')
  .max(1000, 'Weight seems too high - please check your entry')
  .optional();

// Height validation supporting metric/imperial units
export const heightMetricSchema = z.number()
  .positive('Height must be a positive number')
  .min(50, 'Height seems too low - please check your entry (cm)')
  .max(300, 'Height seems too high - please check your entry (cm)');

export const heightImperialSchema = z.object({
  feet: z.number()
    .int('Feet must be a whole number')
    .min(0, 'Feet cannot be negative')
    .max(10, 'Height seems too high - please check your entry'),
  inches: z.number()
    .int('Inches must be a whole number')
    .min(0, 'Inches cannot be negative')
    .max(11, 'Inches must be 11 or less')
});

// Dynamic height validation based on unit preference
export const createHeightSchema = (unitPreference?: 'metric' | 'imperial') => {
  return z.lazy(() => {
    if (unitPreference === 'imperial') {
      return heightImperialSchema;
    }
    return heightMetricSchema;
  }).optional();
};

// Medical conditions validation with healthcare data patterns
export const medicalConditionSchema = z.string()
  .min(1, 'Medical condition cannot be empty')
  .max(200, 'Medical condition description must be 200 characters or less')
  .regex(
    /^[a-zA-Z0-9\s\-.,()_\/&]+$/,
    'Medical condition contains invalid characters. Only letters, numbers, spaces, and basic punctuation are allowed'
  )
  .refine(
    (val) => !/<[^>]*>|javascript:|data:/i.test(val),
    'Invalid content detected in medical condition'
  )
  .transform(val => val.trim());

export const medicalConditionsSchema = z.string()
  .max(1000, 'Medical conditions description must be 1000 characters or less')
  .optional();

// Goals validation
export const goalsSchema = z.array(z.string().min(1))
  .max(3, 'Maximum 3 goals allowed')
  .optional()
  .default([]);

// Gym category validation
export const gymCategorySchema = z.enum([
  'full_service_commercial', 'budget_friendly', 'hardcore_strength',
  'luxury_athletic_club', 'franchise_24_7', 'community_recreation',
  'crossfit_functional', 'limited_residential', 'personal_home_setup',
  'minimal_home'
], {
  required_error: 'Gym category is required',
  invalid_type_error: 'Invalid gym category selected'
});

// Workout frequency validation
export const workoutFrequencySchema = z.string()
  .max(50, 'Workout frequency description too long')
  .optional();

// Primary profile creation schema
export const profileCreationSchema = z.object({
  unitPreference: unitSystemSchema,
  name: nameSchema,
  age: ageSchema,
  gender: genderSchema,
  height: z.union([heightMetricSchema, heightImperialSchema]).optional(),
  weight: weightSchema,
  experienceLevel: experienceLevelSchema,
  goals: goalsSchema,
  gymCategory: gymCategorySchema,
  // Note: Gym category replaces equipment, exercisePreferences, and equipmentPreferences
  medicalConditions: medicalConditionsSchema,
  workoutFrequency: workoutFrequencySchema,
})
.refine((data) => {
  // Custom validation for height based on unit preference
  if (data.unitPreference === 'imperial' && data.height) {
    return typeof data.height === 'object' && 'feet' in data.height && 'inches' in data.height;
  }
  if (data.unitPreference === 'metric' && data.height) {
    return typeof data.height === 'number';
  }
  return true;
}, {
  message: 'Height format must match selected unit system',
  path: ['height']
})
.refine((data) => {
  // Weight range validation based on unit system
  if (data.weight && data.unitPreference === 'imperial') {
    return data.weight >= 44 && data.weight <= 2200; // 44-2200 lbs
  }
  if (data.weight && data.unitPreference === 'metric') {
    return data.weight >= 20 && data.weight <= 1000; // 20-1000 kg
  }
  return true;
}, {
  message: 'Weight is outside the expected range for the selected unit system',
  path: ['weight']
});

// Profile update schema (all fields optional except unit preference changes)
export const profileUpdateSchema = z.object({
  name: nameSchema.optional(),
  age: ageSchema.optional(),
  gender: genderSchema.optional(),
  height: z.union([heightMetricSchema, heightImperialSchema]).optional(),
  weight: weightSchema.optional(),
  unitPreference: unitSystemSchema.optional(),
  experienceLevel: experienceLevelSchema.optional(),
  goals: goalsSchema.optional(),
  gymCategory: gymCategorySchema.optional(),
  medicalConditions: medicalConditionsSchema.optional(),
  workoutFrequency: workoutFrequencySchema.optional(),
})
.refine((data) => {
  // Height format validation for updates
  if (data.unitPreference === 'imperial' && data.height) {
    return typeof data.height === 'object';
  }
  if (data.unitPreference === 'metric' && data.height) {
    return typeof data.height === 'number';
  }
  return true;
}, {
  message: 'Height format must match unit system',
  path: ['height']
});

// Preference update schema
export const preferenceUpdateSchema = z.object({
  unitPreference: unitSystemSchema.optional(),
  goals: goalsSchema,
  gymCategory: gymCategorySchema,
  experienceLevel: experienceLevelSchema,
  workoutFrequency: workoutFrequencySchema,
})
.refine((data) => {
  // At least one field must be provided
  return Object.values(data).some(value => 
    value !== undefined && value !== null && 
    (Array.isArray(value) ? value.length > 0 : true)
  );
}, {
  message: 'At least one preference must be updated',
  path: ['root']
});

// Medical conditions specific schema for specialized forms
export const medicalConditionsFormSchema = z.object({
  medicalConditions: z.array(z.object({
    condition: medicalConditionSchema
  }))
    .max(10, 'Maximum 10 medical conditions allowed')
    .default([]), // Non-optional array for useFieldArray
  hasConditions: z.boolean().default(false),
  conditionsAffectWorkout: z.boolean().optional(),
  doctorClearance: z.boolean().optional(),
});

// Height-specific validation schema for height input components
export const heightFormSchema = z.object({
  unitPreference: unitSystemSchema,
  height: z.union([heightMetricSchema, heightImperialSchema]),
})
.refine((data) => {
  if (data.unitPreference === 'imperial') {
    return typeof data.height === 'object' && 'feet' in data.height;
  }
  return typeof data.height === 'number';
}, {
  message: 'Height format must match selected unit system',
  path: ['height']
});

// Type inference exports for TypeScript integration
export type ProfileCreationFormData = z.infer<typeof profileCreationSchema>;
export type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;
export type PreferenceUpdateFormData = z.infer<typeof preferenceUpdateSchema>;
export type MedicalConditionsFormData = z.infer<typeof medicalConditionsFormSchema>;
export type HeightFormData = z.infer<typeof heightFormSchema>;

// Validation helper functions
export const validateMedicalCondition = (condition: string): boolean => {
  // Empty string is considered valid (optional field)
  if (condition === '') {
    return true;
  }
  try {
    medicalConditionSchema.parse(condition);
    return true;
  } catch {
    return false;
  }
};

export const validateHeightFormat = (
  height: number | { feet: number; inches: number }, 
  unitPreference: 'metric' | 'imperial'
): boolean => {
  try {
    if (unitPreference === 'imperial') {
      heightImperialSchema.parse(height);
    } else {
      heightMetricSchema.parse(height);
    }
    return true;
  } catch {
    return false;
  }
};

// Schema factory for dynamic validation
export const createDynamicProfileSchema = (
  mode: 'create' | 'update',
  unitPreference?: 'metric' | 'imperial'
) => {
  const baseSchema = mode === 'create' ? profileCreationSchema : profileUpdateSchema;
  
  if (unitPreference) {
    return baseSchema.refine((data: any) => {
      if (data.height && unitPreference === 'imperial') {
        return typeof data.height === 'object';
      }
      if (data.height && unitPreference === 'metric') {
        return typeof data.height === 'number';
      }
      return true;
    }, {
      message: `Height format must match ${unitPreference} unit system`,
      path: ['height']
    });
  }
  
  return baseSchema;
};

// Error message customization
export const getFieldErrorMessage = (
  field: string,
  error: z.ZodError
): string | undefined => {
  const fieldError = error.errors.find(err => err.path.includes(field));
  return fieldError?.message;
};

// Validation constants for UI components
export const VALIDATION_CONSTANTS = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  AGE_MIN: 13,
  AGE_MAX: 120,
  WEIGHT_MIN_METRIC: 20,
  WEIGHT_MAX_METRIC: 1000,
  WEIGHT_MIN_IMPERIAL: 44,
  WEIGHT_MAX_IMPERIAL: 2200,
  HEIGHT_MIN_CM: 50,
  HEIGHT_MAX_CM: 300,
  HEIGHT_MAX_FEET: 10,
  MEDICAL_CONDITIONS_MAX: 10,
  MEDICAL_CONDITION_MAX_LENGTH: 200,
  GOALS_MAX: 3,
  GYM_CATEGORIES: [
    'full_service_commercial', 'budget_friendly', 'hardcore_strength',
    'luxury_athletic_club', 'franchise_24_7', 'community_recreation',
    'crossfit_functional', 'limited_residential', 'personal_home_setup',
    'minimal_home'
  ] as const,
} as const;
