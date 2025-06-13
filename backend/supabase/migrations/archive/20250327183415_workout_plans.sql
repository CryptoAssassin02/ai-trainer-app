/*
  # Workout Plans Schema

  1. Table Structure
    - Stores customized workout plans for users
    - Links to user profiles through user_id
    - Uses JSONB for flexible exercise data and AI reasoning
    - Includes metadata like duration, difficulty level, and goals

  2. JSONB Structure
    - exercises JSONB field structure:
      {
        "exercises": [
          {
            "id": "string",
            "name": "string",
            "sets": number,
            "reps": number,
            "duration": number,
            "rest": number,
            "notes": "string",
            "alternatives": ["string"],
            "equipment": ["string"]
          }
        ],
        "warmup": [...],
        "cooldown": [...]
      }

    - ai_reasoning JSONB field structure:
      {
        "goals_analysis": "string",
        "equipment_considerations": "string",
        "progression_logic": "string",
        "adaptation_notes": "string",
        "safety_considerations": "string",
        "generated_timestamp": "string",
        "model_version": "string"
      }

  3. Security
    - Enables Row Level Security (RLS)
    - Policies ensure users can only access their own workout plans
    - References auth.users for user validation

  4. Relationships
    - Links to user_profiles through user_id
    - Cascading delete with auth.users table
*/

CREATE TABLE IF NOT EXISTS workout_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  plan_data JSONB NOT NULL DEFAULT '{}',
  ai_generated BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  estimated_duration INTEGER CHECK (estimated_duration > 0),
  schedule_frequency TEXT CHECK (schedule_frequency IN ('daily', 'weekly', 'monthly', 'custom')),
  tags TEXT[] DEFAULT '{}',
  goals TEXT[] DEFAULT '{}',
  equipment_required TEXT[] DEFAULT '{}',
  ai_reasoning JSONB DEFAULT '{}',
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_workout_plans_user_id ON workout_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_plans_status ON workout_plans(status);
CREATE INDEX IF NOT EXISTS idx_workout_plans_tags ON workout_plans USING gin(tags);

-- Enable Row Level Security
ALTER TABLE workout_plans ENABLE ROW LEVEL SECURITY;

-- Create policies for data access control
CREATE POLICY "Users can view own workout plans"
  ON workout_plans
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create workout plans"
  ON workout_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workout plans"
  ON workout_plans
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own workout plans"
  ON workout_plans
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_workout_plans_updated_at
  BEFORE UPDATE ON workout_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 