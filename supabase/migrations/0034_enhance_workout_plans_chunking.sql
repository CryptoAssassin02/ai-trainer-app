-- Add Agent Identification to track which agent version generated each part
ALTER TABLE public.workout_plans
ADD COLUMN IF NOT EXISTS structure_agent_version VARCHAR(20) NULL, 
ADD COLUMN IF NOT EXISTS mesocycle_agent_version VARCHAR(20) NULL;

-- Add sub-states for better UX feedback
ALTER TABLE public.workout_plans
ADD COLUMN IF NOT EXISTS generation_substep VARCHAR(100); 
-- Examples: "analyzing_goals", "optimizing_schedule", "selecting_exercises", etc.

-- Add timing metrics
ALTER TABLE public.workout_plans
ADD COLUMN IF NOT EXISTS structure_generation_ms INTEGER,
ADD COLUMN IF NOT EXISTS mesocycle_generation_ms JSONB DEFAULT '{}';
-- Track each mesocycle timing: {"1": 2340, "2": 2180, ...}

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_workout_plans_structure_agent_version 
ON public.workout_plans USING btree (structure_agent_version);

CREATE INDEX IF NOT EXISTS idx_workout_plans_mesocycle_agent_version 
ON public.workout_plans USING btree (mesocycle_agent_version);

CREATE INDEX IF NOT EXISTS idx_workout_plans_generation_substep 
ON public.workout_plans USING btree (generation_substep);

CREATE INDEX IF NOT EXISTS idx_workout_plans_structure_generation_ms 
ON public.workout_plans USING btree (structure_generation_ms);

CREATE INDEX IF NOT EXISTS idx_workout_plans_mesocycle_generation_ms 
ON public.workout_plans USING gin (mesocycle_generation_ms);

-- Add comments for documentation
COMMENT ON COLUMN public.workout_plans.structure_agent_version 
IS 'Version of Structure Agent that generated the program structure (e.g., "v1.2.0")';

COMMENT ON COLUMN public.workout_plans.mesocycle_agent_version 
IS 'Version of Mesocycle Agent that generated the detailed workouts (e.g., "v1.1.5")';

COMMENT ON COLUMN public.workout_plans.generation_substep 
IS 'Current substep in generation process for granular UX feedback (e.g., "analyzing_goals", "selecting_exercises")';

COMMENT ON COLUMN public.workout_plans.structure_generation_ms 
IS 'Time taken to generate program structure in milliseconds';

COMMENT ON COLUMN public.workout_plans.mesocycle_generation_ms 
IS 'JSONB object tracking generation time for each mesocycle: {"1": 2340, "2": 2180, "3": 2456}';

-- Add constraints for data integrity (with conflict prevention)
DO $$ 
BEGIN
  -- Add timing constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'workout_plans_structure_generation_ms_check_v2'
  ) THEN
    ALTER TABLE public.workout_plans
    ADD CONSTRAINT workout_plans_structure_generation_ms_check_v2
      CHECK (structure_generation_ms IS NULL OR structure_generation_ms >= 0);
  END IF;
  
  -- Add version format constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'workout_plans_agent_versions_format_check_v2'
  ) THEN
    ALTER TABLE public.workout_plans
    ADD CONSTRAINT workout_plans_agent_versions_format_check_v2
      CHECK (
        (structure_agent_version IS NULL OR structure_agent_version ~ '^v\d+\.\d+\.\d+$') AND
        (mesocycle_agent_version IS NULL OR mesocycle_agent_version ~ '^v\d+\.\d+\.\d+$')
      );
  END IF;
END $$;