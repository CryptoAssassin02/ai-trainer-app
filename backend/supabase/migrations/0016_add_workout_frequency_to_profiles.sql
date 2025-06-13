-- Add workout_frequency field to user_profiles table
alter table public.user_profiles add column workout_frequency text null;

-- Add comment for documentation
comment on column public.user_profiles.workout_frequency is 'User''s preferred workout frequency (e.g. "3x per week", "daily")'; 