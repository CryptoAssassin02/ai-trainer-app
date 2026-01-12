-- Add primary_goal column to workout_plans table
-- This stores which goal was selected as primary during workout generation

ALTER TABLE public.workout_plans 
ADD COLUMN primary_goal VARCHAR(50) NULL;

-- Add comment to document the column purpose
COMMENT ON COLUMN public.workout_plans.primary_goal IS 'The primary goal selected by the user during workout generation. Must be one of the goals in the goals array.';

-- Create index for efficient querying by primary goal
CREATE INDEX IF NOT EXISTS idx_workout_plans_primary_goal 
ON public.workout_plans USING btree (primary_goal) 
TABLESPACE pg_default;

-- Add constraint to ensure primary_goal matches common goal types (optional validation)
ALTER TABLE public.workout_plans 
ADD CONSTRAINT workout_plans_primary_goal_check 
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
