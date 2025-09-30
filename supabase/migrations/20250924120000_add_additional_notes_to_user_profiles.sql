-- Add additional_notes column to user_profiles table
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS additional_notes TEXT NULL;

-- Document the column purpose
COMMENT ON COLUMN public.user_profiles.additional_notes 
IS 'Optional user-provided notes (preferences or constraints) entered in profile forms.';
