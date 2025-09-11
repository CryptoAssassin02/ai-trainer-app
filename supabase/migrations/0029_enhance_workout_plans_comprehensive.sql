-- Add comprehensive columns for multi-goal orchestrator data storage
ALTER TABLE public.workout_plans
ADD COLUMN IF NOT EXISTS schema_version VARCHAR(20) DEFAULT 'v2.0',
ADD COLUMN IF NOT EXISTS generation_method VARCHAR(50) DEFAULT 'single_goal',
ADD COLUMN IF NOT EXISTS program_duration_weeks INTEGER,
ADD COLUMN IF NOT EXISTS mesocycle_count INTEGER,
ADD COLUMN IF NOT EXISTS training_frequency JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS orchestrator_data JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS mesocycle_structure JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS goal_strategy_data JSONB DEFAULT '{}'::jsonb;

-- Add comprehensive comments
COMMENT ON COLUMN public.workout_plans.schema_version IS 'Schema version (v1.0=legacy, v2.0=multi-goal)';
COMMENT ON COLUMN public.workout_plans.generation_method IS 'Generation method (single_goal, multi_goal_orchestrated)';
COMMENT ON COLUMN public.workout_plans.program_duration_weeks IS 'Total program duration in weeks (8-16)';
COMMENT ON COLUMN public.workout_plans.mesocycle_count IS 'Number of mesocycles in program (2-5)';
COMMENT ON COLUMN public.workout_plans.training_frequency IS 'Training frequency data (daysPerWeek, restDays, etc.)';
COMMENT ON COLUMN public.workout_plans.orchestrator_data IS 'Complete multi-goal orchestrator output';
COMMENT ON COLUMN public.workout_plans.mesocycle_structure IS 'Complete mesocycle structure with daily workouts';
COMMENT ON COLUMN public.workout_plans.goal_strategy_data IS 'Goal strategy intelligence and parameters';

-- Add constraints for data integrity
ALTER TABLE public.workout_plans
ADD CONSTRAINT workout_plans_program_duration_check 
  CHECK (program_duration_weeks IS NULL OR (program_duration_weeks >= 8 AND program_duration_weeks <= 16)),
ADD CONSTRAINT workout_plans_mesocycle_count_check 
  CHECK (mesocycle_count IS NULL OR (mesocycle_count >= 1 AND mesocycle_count <= 5)),
ADD CONSTRAINT workout_plans_schema_version_check 
  CHECK (schema_version IN ('v1.0', 'v2.0')),
ADD CONSTRAINT workout_plans_generation_method_check 
  CHECK (generation_method IN ('single_goal', 'multi_goal_orchestrated'));

-- Create comprehensive indexes for multi-goal queries
CREATE INDEX IF NOT EXISTS idx_workout_plans_generation_method 
ON public.workout_plans USING btree (generation_method);

CREATE INDEX IF NOT EXISTS idx_workout_plans_program_duration 
ON public.workout_plans USING btree (program_duration_weeks);

CREATE INDEX IF NOT EXISTS idx_workout_plans_mesocycle_count 
ON public.workout_plans USING btree (mesocycle_count);

-- GIN indexes for complex JSONB queries
CREATE INDEX IF NOT EXISTS idx_workout_plans_orchestrator_data 
ON public.workout_plans USING gin (orchestrator_data);

CREATE INDEX IF NOT EXISTS idx_workout_plans_mesocycle_structure 
ON public.workout_plans USING gin (mesocycle_structure);

CREATE INDEX IF NOT EXISTS idx_workout_plans_goal_strategy_data 
ON public.workout_plans USING gin (goal_strategy_data);

CREATE INDEX IF NOT EXISTS idx_workout_plans_training_frequency 
ON public.workout_plans USING gin (training_frequency);

-- Specific JSONB path indexes for common queries
CREATE INDEX IF NOT EXISTS idx_workout_plans_goal_priorities 
ON public.workout_plans USING gin ((orchestrator_data->'goalPriority'));

CREATE INDEX IF NOT EXISTS idx_workout_plans_compatibility 
ON public.workout_plans USING gin ((orchestrator_data->'compatibility'));

CREATE INDEX IF NOT EXISTS idx_workout_plans_exercise_priorities 
ON public.workout_plans USING gin ((orchestrator_data->'exercisePriorities'));

-- Composite indexes for multi-goal analytics
CREATE INDEX IF NOT EXISTS idx_workout_plans_multi_goal_composite 
ON public.workout_plans USING btree (primary_goal, array_length(goals, 1), generation_method) 
WHERE array_length(goals, 1) > 1;

-- Update existing plans to reflect their generation method and schema version
UPDATE public.workout_plans
SET 
  schema_version = 'v1.0',
  generation_method = CASE 
    WHEN array_length(goals, 1) > 1 THEN 'multi_goal_orchestrated'
    ELSE 'single_goal'
  END,
  program_duration_weeks = 8,  -- Default for existing plans
  mesocycle_count = 2          -- Default for existing plans
WHERE schema_version IS NULL;
