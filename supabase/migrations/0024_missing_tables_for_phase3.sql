-- Migration: 0024_missing_tables_for_phase3.sql
-- Purpose: Create missing tables required for Phase 3 analytics integration
-- Created: For Phase 3 Integration Testing

-- Create user_goals table
CREATE TABLE IF NOT EXISTS user_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  target JSONB NOT NULL,
  baseline JSONB,
  timeframe TEXT,
  description TEXT,
  status TEXT DEFAULT 'active',
  progress_percentage DECIMAL(5,2) DEFAULT 0,
  last_progress_update TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Add constraints
  CONSTRAINT valid_goal_type CHECK (type IN ('weight_loss', 'muscle_gain', 'strength_increase', 'endurance', 'flexibility', 'general_fitness')),
  CONSTRAINT valid_status CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
  CONSTRAINT valid_progress CHECK (progress_percentage >= 0 AND progress_percentage <= 100)
);

-- Add RLS policies for user_goals
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own goals" ON user_goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals" ON user_goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals" ON user_goals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals" ON user_goals
  FOR DELETE USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_goals_user_id ON user_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_user_goals_status ON user_goals(status);
CREATE INDEX IF NOT EXISTS idx_user_goals_type ON user_goals(type);

-- Add updated_at trigger for user_goals
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_goals_updated_at BEFORE UPDATE ON user_goals 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE user_goals IS 'User fitness goals with progress tracking';

-- Final verification that all required components are in place
DO $$
DECLARE
  table_count INTEGER;
  column_count INTEGER;
BEGIN
  -- Check user_goals table exists
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables 
  WHERE table_name = 'user_goals';
  
  -- Check required columns exist in user_goals
  SELECT COUNT(*) INTO column_count
  FROM information_schema.columns 
  WHERE table_name = 'user_goals' AND column_name IN ('id', 'user_id', 'type', 'target', 'status');
  
  RAISE NOTICE 'Migration 0024 verification: % table created, % required columns found', table_count, column_count;
  
  IF table_count < 1 OR column_count < 5 THEN
    RAISE EXCEPTION 'Migration 0024 incomplete: Expected user_goals table with 5+ columns';
  END IF;
END $$; 