-- Limit fitness goals to maximum of 3 per user
-- This migration adds constraints to enforce the 3-goal limit

DO $$ 
BEGIN
  -- Add constraint to user_profiles table
  ALTER TABLE public.user_profiles 
  ADD CONSTRAINT user_profiles_goals_max_three_check 
  CHECK (array_length(fitness_goals, 1) IS NULL OR array_length(fitness_goals, 1) <= 3);

  -- Add constraint to workout_plans table (goals stored in plan_data JSONB)
  ALTER TABLE public.workout_plans
  ADD CONSTRAINT workout_plans_goals_max_three_check 
  CHECK (jsonb_array_length(plan_data->'goals') IS NULL OR jsonb_array_length(plan_data->'goals') <= 3);
  
  -- Update any existing profiles with more than 3 goals (preserve first 3)
  UPDATE public.user_profiles 
  SET fitness_goals = fitness_goals[1:3]
  WHERE array_length(fitness_goals, 1) > 3;
  
  -- Update any existing workout plans with more than 3 goals (preserve first 3)
  UPDATE public.workout_plans
  SET plan_data = jsonb_set(
    plan_data,
    '{goals}',
    (SELECT jsonb_agg(value) FROM (
      SELECT value FROM jsonb_array_elements(plan_data->'goals') WITH ORDINALITY
      WHERE ordinality <= 3
    ) sub)
  )
  WHERE jsonb_array_length(plan_data->'goals') > 3;
  
END $$;
