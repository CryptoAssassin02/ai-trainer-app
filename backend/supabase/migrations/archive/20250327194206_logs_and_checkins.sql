/*
  # Workout Logs and Check-ins Schema

  1. Workout Logs Table Structure
    - Records completed workouts and user feedback
    - Links to workout plans and user profiles
    - Stores exercise completion data in JSONB
    - Tracks user feedback metrics and satisfaction

    JSONB Structure for exercises_completed:
    {
      "exercises": [
        {
          "id": "string",
          "name": "string",
          "sets_completed": number,
          "reps_completed": number,
          "weight_used": number,
          "duration": number,
          "difficulty": number,
          "notes": "string",
          "modifications": "string"
        }
      ],
      "warmup_completed": boolean,
      "cooldown_completed": boolean,
      "total_duration": number
    }

  2. User Check-ins Table Structure
    - Tracks regular user health and fitness metrics
    - Stores body measurements in flexible JSONB format
    - Records subjective wellness indicators
    - Maintains historical tracking data

    JSONB Structure for measurements:
    {
      "chest": number,
      "waist": number,
      "hips": number,
      "biceps": number,
      "thighs": number,
      "calves": number,
      "unit": "cm" | "in",
      "photos": ["url"],
      "additional_measurements": {
        "measurement_name": number
      }
    }

  3. Security
    - Enables Row Level Security (RLS)
    - Policies ensure users can only access their own data
    - References auth.users for user validation

  4. Performance Considerations
    - Indexes on frequently queried columns
    - Date-based indexes for time-series queries
    - Foreign key indexes for joins
*/

-- Create workout_logs table
CREATE TABLE IF NOT EXISTS workout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES workout_plans(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  completed BOOLEAN DEFAULT true,
  exercises_completed JSONB NOT NULL DEFAULT '{}',
  overall_difficulty INTEGER CHECK (overall_difficulty BETWEEN 1 AND 10),
  energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 10),
  satisfaction INTEGER CHECK (satisfaction BETWEEN 1 AND 10),
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_check_ins table
CREATE TABLE IF NOT EXISTS user_check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  weight DECIMAL CHECK (weight > 0),
  body_fat_percentage DECIMAL CHECK (body_fat_percentage BETWEEN 1 AND 50),
  measurements JSONB DEFAULT '{}',
  mood TEXT CHECK (mood IN ('poor', 'fair', 'good', 'excellent')),
  sleep_quality TEXT CHECK (sleep_quality IN ('poor', 'fair', 'good', 'excellent')),
  energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 10),
  stress_level INTEGER CHECK (stress_level BETWEEN 1 AND 10),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_workout_logs_user_id ON workout_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_plan_id ON workout_logs(plan_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_date ON workout_logs(date);
CREATE INDEX IF NOT EXISTS idx_workout_logs_user_date ON workout_logs(user_id, date);

CREATE INDEX IF NOT EXISTS idx_user_check_ins_user_id ON user_check_ins(user_id);
CREATE INDEX IF NOT EXISTS idx_user_check_ins_date ON user_check_ins(date);
CREATE INDEX IF NOT EXISTS idx_user_check_ins_user_date ON user_check_ins(user_id, date);

-- Enable Row Level Security
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_check_ins ENABLE ROW LEVEL SECURITY;

-- Create policies for workout_logs
CREATE POLICY "Users can view own workout logs"
  ON workout_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create workout logs"
  ON workout_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workout logs"
  ON workout_logs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own workout logs"
  ON workout_logs
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for user_check_ins
CREATE POLICY "Users can view own check-ins"
  ON user_check_ins
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create check-ins"
  ON user_check_ins
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own check-ins"
  ON user_check_ins
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own check-ins"
  ON user_check_ins
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create trigger for updated_at on workout_logs
CREATE TRIGGER update_workout_logs_updated_at
  BEFORE UPDATE ON workout_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for updated_at on user_check_ins
CREATE TRIGGER update_user_check_ins_updated_at
  BEFORE UPDATE ON user_check_ins
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 