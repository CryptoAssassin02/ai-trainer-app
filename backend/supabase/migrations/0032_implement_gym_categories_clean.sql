-- Migration: Implement Gym Categories - Clean Replacement
-- Phase 1 of Option 3: Replace equipment selections with gym categories
-- Development-only context: No existing user data to preserve

DO $$ 
BEGIN
  -- Add gym_category column
  ALTER TABLE public.user_profiles 
  ADD COLUMN gym_category VARCHAR(50);
  
  -- Create gym category constraint
  ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_gym_category_check 
  CHECK (gym_category IN (
    'full_service_commercial', 'budget_friendly', 'hardcore_strength',
    'luxury_athletic_club', 'franchise_24_7', 'community_recreation',
    'crossfit_functional', 'limited_residential', 'personal_home_setup',
    'minimal_home'
  ));
  
  -- Clean removal of equipment field (no data to preserve)
  -- Note: equipment_preferences and exercise_preferences are frontend-only fields
  -- that map to the equipment column in backend processing
  ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS equipment;
  
  -- Add comment for documentation
  COMMENT ON COLUMN public.user_profiles.gym_category 
  IS 'User gym category for equipment constraint resolution in workout generation';
  
END $$;
