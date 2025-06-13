-- Migration: Update medical_conditions from TEXT to JSONB
-- This aligns with healthcare data best practices and FHIR standards

-- Step 1: Add a new temporary column for the JSONB array
ALTER TABLE public.user_profiles 
ADD COLUMN medical_conditions_new JSONB DEFAULT '[]'::jsonb;

-- Step 2: Migrate existing data from TEXT to JSONB array
-- Convert any existing text data to a single-element array
UPDATE public.user_profiles 
SET medical_conditions_new = 
  CASE 
    WHEN medical_conditions IS NULL OR medical_conditions = '' THEN '[]'::jsonb
    ELSE jsonb_build_array(medical_conditions)
  END;

-- Step 3: Drop the old TEXT column
ALTER TABLE public.user_profiles DROP COLUMN medical_conditions;

-- Step 4: Rename the new column to the original name
ALTER TABLE public.user_profiles 
RENAME COLUMN medical_conditions_new TO medical_conditions;

-- Step 5: Add proper constraints for healthcare data validation
ALTER TABLE public.user_profiles 
ADD CONSTRAINT medical_conditions_is_array 
CHECK (jsonb_typeof(medical_conditions) = 'array');

-- Step 6: Add GIN index for efficient JSONB queries (for future contraindication lookups)
CREATE INDEX IF NOT EXISTS idx_user_profiles_medical_conditions 
ON public.user_profiles USING gin(medical_conditions);

-- Step 7: Add comment for documentation
COMMENT ON COLUMN public.user_profiles.medical_conditions 
IS 'JSONB array of medical conditions for healthcare data compliance and contraindication checking'; 