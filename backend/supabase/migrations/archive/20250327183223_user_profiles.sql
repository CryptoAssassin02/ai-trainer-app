/*
  # User Profiles Schema

  1. Table Structure
    - Primary table for storing user profile information
    - Uses UUID for primary and foreign keys
    - Includes basic user information (name, age, gender, etc.)
    - Stores fitness-related data (height, weight, experience level)
    - Tracks preferences and equipment availability
    - Maintains audit timestamps

  2. Columns
    - id: Unique identifier for the profile
    - user_id: References auth.users for authentication
    - name: User's display name
    - age: User's age in years
    - gender: User's gender identification
    - height: User's height (units determined by unit_preference)
    - weight: User's weight (units determined by unit_preference)
    - experience_level: Fitness experience (beginner/intermediate/advanced)
    - fitness_goals: Array of user's fitness objectives
    - equipment: Array of available exercise equipment
    - medical_conditions: Any relevant health considerations
    - unit_preference: Preferred measurement system (metric/imperial)
    - created_at: Profile creation timestamp
    - updated_at: Last modification timestamp

  3. Security
    - Enables Row Level Security (RLS)
    - Policies ensure users can only access their own profile
    - Cascade deletion with auth.users table

  4. Performance
    - Index on user_id for faster lookups
    - Trigger for automatic updated_at maintenance
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT,
  age INTEGER CHECK (age >= 13 AND age <= 120),
  gender TEXT,
  height DECIMAL CHECK (height > 0),
  weight DECIMAL CHECK (weight > 0),
  experience_level TEXT CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
  fitness_goals TEXT[] DEFAULT '{}',
  equipment TEXT[] DEFAULT '{}',
  medical_conditions TEXT,
  unit_preference TEXT DEFAULT 'metric' CHECK (unit_preference IN ('metric', 'imperial')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Create index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for data access control
CREATE POLICY "Users can view own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile"
  ON user_profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create trigger for updating the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 