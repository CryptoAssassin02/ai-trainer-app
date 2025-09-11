-- Add generation state tracking
ALTER TABLE workout_plans 
ADD COLUMN generation_state TEXT DEFAULT 'pending' CHECK (generation_state IN (
  'pending',
  'structure_generated', 
  'mesocycle_1_generating',
  'mesocycle_1_complete',
  'mesocycle_2_generating', 
  'mesocycle_2_complete',
  'mesocycle_3_generating',
  'mesocycle_3_complete',
  'mesocycle_4_generating',
  'mesocycle_4_complete',
  'completed',
  'failed'
));

-- Add mesocycle tracking
ALTER TABLE workout_plans
ADD COLUMN mesocycles_generated INTEGER DEFAULT 0,
ADD COLUMN total_mesocycles INTEGER DEFAULT 0,
ADD COLUMN current_mesocycle INTEGER DEFAULT 0;

-- Add generation metadata
ALTER TABLE workout_plans
ADD COLUMN generation_started_at TIMESTAMPTZ,
ADD COLUMN generation_completed_at TIMESTAMPTZ,
ADD COLUMN generation_errors JSONB DEFAULT '[]'::jsonb;

-- Index for cleanup queries
CREATE INDEX idx_workout_plans_generation_state ON workout_plans(generation_state, generation_started_at);
