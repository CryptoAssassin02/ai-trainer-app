-- Add RLS policies for workout_plans table
-- These policies ensure users can only access their own workout plans

-- Enable Row Level Security (should already be enabled, but ensuring it)
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own workout plans" ON public.workout_plans;
DROP POLICY IF EXISTS "Users can create workout plans" ON public.workout_plans;
DROP POLICY IF EXISTS "Users can update own workout plans" ON public.workout_plans;
DROP POLICY IF EXISTS "Users can delete own workout plans" ON public.workout_plans;

-- Create RLS policies for workout_plans
CREATE POLICY "Users can view own workout plans"
  ON public.workout_plans
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create workout plans"
  ON public.workout_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workout plans"
  ON public.workout_plans
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own workout plans"
  ON public.workout_plans
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id); 