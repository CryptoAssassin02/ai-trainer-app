-- Create workout_plans table
CREATE TABLE IF NOT EXISTS workout_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  duration TEXT NOT NULL,
  sessions INTEGER NOT NULL,
  level TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  exercises JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  instructions TEXT,
  goals TEXT[] DEFAULT '{}',
  ai_reasoning JSONB
);

-- Create workout_progress table
CREATE TABLE IF NOT EXISTS workout_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  plan_id UUID NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  completed BOOLEAN DEFAULT false,
  exercises_completed JSONB NOT NULL DEFAULT '[]',
  overall_difficulty INTEGER,
  energy_level INTEGER,
  satisfaction INTEGER,
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_check_ins table
CREATE TABLE IF NOT EXISTS user_check_ins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  date DATE NOT NULL,
  weight NUMERIC,
  body_fat_percentage NUMERIC,
  measurements JSONB,
  mood TEXT,
  sleep_quality TEXT,
  energy_level INTEGER,
  stress_level INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS workout_plans_user_id_idx ON workout_plans(user_id);
CREATE INDEX IF NOT EXISTS workout_progress_user_id_idx ON workout_progress(user_id);
CREATE INDEX IF NOT EXISTS workout_progress_plan_id_idx ON workout_progress(plan_id);
CREATE INDEX IF NOT EXISTS user_check_ins_user_id_idx ON user_check_ins(user_id);
CREATE INDEX IF NOT EXISTS user_check_ins_date_idx ON user_check_ins(date);

-- Enable RLS (Row Level Security)
ALTER TABLE workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_check_ins ENABLE ROW LEVEL SECURITY;

-- Create policies for workout_plans
CREATE POLICY workout_plans_select_policy ON workout_plans 
  FOR SELECT USING (auth.uid()::text = user_id);
  
CREATE POLICY workout_plans_insert_policy ON workout_plans 
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);
  
CREATE POLICY workout_plans_update_policy ON workout_plans 
  FOR UPDATE USING (auth.uid()::text = user_id);
  
CREATE POLICY workout_plans_delete_policy ON workout_plans 
  FOR DELETE USING (auth.uid()::text = user_id);

-- Create policies for workout_progress
CREATE POLICY workout_progress_select_policy ON workout_progress 
  FOR SELECT USING (auth.uid()::text = user_id);
  
CREATE POLICY workout_progress_insert_policy ON workout_progress 
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);
  
CREATE POLICY workout_progress_update_policy ON workout_progress 
  FOR UPDATE USING (auth.uid()::text = user_id);
  
CREATE POLICY workout_progress_delete_policy ON workout_progress 
  FOR DELETE USING (auth.uid()::text = user_id);

-- Create policies for user_check_ins
CREATE POLICY user_check_ins_select_policy ON user_check_ins 
  FOR SELECT USING (auth.uid()::text = user_id);
  
CREATE POLICY user_check_ins_insert_policy ON user_check_ins 
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);
  
CREATE POLICY user_check_ins_update_policy ON user_check_ins 
  FOR UPDATE USING (auth.uid()::text = user_id);
  
CREATE POLICY user_check_ins_delete_policy ON user_check_ins 
  FOR DELETE USING (auth.uid()::text = user_id); 