-- Migration: Add primary_goal and exercise_types to user_profiles table
-- These fields support the simplified workout generation process by storing
-- user preferences in the profile instead of collecting them during workout creation

-- Add primary_goal column to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN primary_goal VARCHAR(50) NULL;

-- Add exercise_types column to user_profiles table  
ALTER TABLE public.user_profiles
ADD COLUMN exercise_types TEXT[] NULL DEFAULT '{}'::TEXT[];

-- Add constraint for primary_goal validation
ALTER TABLE public.user_profiles
ADD CONSTRAINT user_profiles_primary_goal_check 
CHECK (
  primary_goal IS NULL OR 
  primary_goal IN (
    'weight_loss',
    'muscle_gain', 
    'strength',
    'endurance',
    'flexibility',
    'general_fitness',
    'sports_performance',
    'body_recomposition'
  )
);

-- Add constraint for exercise_types validation (ensure non-empty strings if provided)
ALTER TABLE public.user_profiles
ADD CONSTRAINT user_profiles_exercise_types_check
CHECK (
  exercise_types IS NULL OR 
  (
    array_length(exercise_types, 1) IS NULL OR 
    (
      array_length(exercise_types, 1) >= 1 AND 
      array_length(exercise_types, 1) <= 10 AND
      NOT ('' = ANY(exercise_types))
    )
  )
);

-- Add comments for documentation
COMMENT ON COLUMN public.user_profiles.primary_goal 
IS 'User''s primary fitness goal selected from their goals array. Optional field that gets 60% priority in workout plans.';

COMMENT ON COLUMN public.user_profiles.exercise_types 
IS 'User''s preferred exercise types for workout generation (e.g., cardio, strength, hiit, yoga). Array of 1-10 non-empty strings.';

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_user_profiles_primary_goal 
ON public.user_profiles USING btree (primary_goal) 
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_user_profiles_exercise_types 
ON public.user_profiles USING gin (exercise_types) 
TABLESPACE pg_default;
