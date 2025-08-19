-- Migration: 0025_analytics_aggregates_table.sql
-- Purpose: Add missing columns to user_analytics_aggregates table for Phase 3 analytics
-- Created: For Analytics Integration Testing

-- Add missing columns that comparative analytics service expects
-- (The table already exists from migration 0020)

-- Add workout_adherence_rate column (maps to existing workout_consistency_score)
ALTER TABLE user_analytics_aggregates 
ADD COLUMN IF NOT EXISTS workout_adherence_rate DECIMAL(3,2) DEFAULT 0;

-- Add strength_progression column 
ALTER TABLE user_analytics_aggregates 
ADD COLUMN IF NOT EXISTS strength_progression DECIMAL(5,2) DEFAULT 0;

-- Add endurance_score column
ALTER TABLE user_analytics_aggregates 
ADD COLUMN IF NOT EXISTS endurance_score DECIMAL(5,2) DEFAULT 0;

-- Add current_weight column (maps to existing avg_weight)
ALTER TABLE user_analytics_aggregates 
ADD COLUMN IF NOT EXISTS current_weight DECIMAL(5,2);

-- Add goal_completion_rate column
ALTER TABLE user_analytics_aggregates 
ADD COLUMN IF NOT EXISTS goal_completion_rate DECIMAL(3,2) DEFAULT 0;

-- Add overall_score column (maps to existing overall_adherence_score)
ALTER TABLE user_analytics_aggregates 
ADD COLUMN IF NOT EXISTS overall_score DECIMAL(5,2) DEFAULT 0;

-- Add constraints for new columns (using DO blocks to handle existence checks)
DO $$
BEGIN
  -- Add constraint for workout_adherence_rate
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'valid_adherence_rate_new' 
    AND table_name = 'user_analytics_aggregates'
  ) THEN
    ALTER TABLE user_analytics_aggregates 
    ADD CONSTRAINT valid_adherence_rate_new 
    CHECK (workout_adherence_rate >= 0 AND workout_adherence_rate <= 1);
  END IF;

  -- Add constraint for goal_completion_rate
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'valid_goal_completion_rate_new' 
    AND table_name = 'user_analytics_aggregates'
  ) THEN
    ALTER TABLE user_analytics_aggregates 
    ADD CONSTRAINT valid_goal_completion_rate_new 
    CHECK (goal_completion_rate >= 0 AND goal_completion_rate <= 1);
  END IF;
END $$;

-- Add indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_analytics_aggregates_workout_adherence_new 
ON user_analytics_aggregates(workout_adherence_rate);

CREATE INDEX IF NOT EXISTS idx_analytics_aggregates_strength_progression_new 
ON user_analytics_aggregates(strength_progression);

CREATE INDEX IF NOT EXISTS idx_analytics_aggregates_endurance_score_new 
ON user_analytics_aggregates(endurance_score);

-- Populate new columns with data from existing columns where appropriate
UPDATE user_analytics_aggregates SET 
  workout_adherence_rate = COALESCE(workout_consistency_score, 0),
  current_weight = avg_weight,
  overall_score = COALESCE(overall_adherence_score * 100, 0), -- Scale to 0-100
  goal_completion_rate = COALESCE(overall_adherence_score, 0)
WHERE workout_adherence_rate IS NULL OR workout_adherence_rate = 0;

-- Insert sample data for testing users (creates analytics data for peer comparison)
INSERT INTO user_analytics_aggregates (
  user_id, 
  date, 
  week_start, 
  month_start,
  workout_adherence_rate, 
  strength_progression, 
  endurance_score, 
  current_weight, 
  goal_completion_rate, 
  overall_score
)
SELECT 
  u.id,
  CURRENT_DATE,
  date_trunc('week', CURRENT_DATE)::date,
  date_trunc('month', CURRENT_DATE)::date,
  0.75 + (RANDOM() * 0.25), -- 75-100% adherence
  5.0 + (RANDOM() * 10.0),   -- 5-15 strength progression
  60.0 + (RANDOM() * 40.0),  -- 60-100 endurance score
  60.0 + (RANDOM() * 40.0),  -- 60-100 kg weight
  0.6 + (RANDOM() * 0.4),    -- 60-100% goal completion
  70.0 + (RANDOM() * 30.0)   -- 70-100 overall score
FROM auth.users u
WHERE u.email LIKE '%test%' OR u.email LIKE '%example%'
ON CONFLICT (user_id, date) DO UPDATE SET
  workout_adherence_rate = EXCLUDED.workout_adherence_rate,
  strength_progression = EXCLUDED.strength_progression,
  endurance_score = EXCLUDED.endurance_score,
  current_weight = EXCLUDED.current_weight,
  goal_completion_rate = EXCLUDED.goal_completion_rate,
  overall_score = EXCLUDED.overall_score;

-- Verification
DO $$
DECLARE
  column_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO column_count
  FROM information_schema.columns 
  WHERE table_name = 'user_analytics_aggregates' 
  AND column_name IN ('workout_adherence_rate', 'strength_progression', 'endurance_score');
  
  RAISE NOTICE 'Migration 0025 verification: % required columns found', column_count;
  
  IF column_count < 3 THEN
    RAISE EXCEPTION 'Migration 0025 incomplete: Expected 3+ required columns';
  END IF;
END $$; 