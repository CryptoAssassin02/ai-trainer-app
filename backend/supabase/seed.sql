-- backend/supabase/seed.sql
-- Example: Seeding a 'exercise_types' reference table
-- INSERT INTO public.exercise_types (name) VALUES
--   ('Cardio'),
--   ('Strength'),
--   ('Flexibility');

-- Add INSERT statements for any other non-user, non-auth-managed reference data.
-- If you have data like `contraindications.json`, convert it to SQL INSERTs here
-- if there's a corresponding table.
INSERT INTO public.contraindications (condition) VALUES ('Knee Injury'), ('Shoulder Pain'); 

-- Supabase Seed SQL for trAIner App (Local Development & Testing)
-- This file is executed by `supabase db reset` and during Jest global setup.

-- Clean up existing data (optional, as db reset should handle this)
-- DELETE FROM public.user_check_ins;
-- DELETE FROM public.workout_logs;
-- DELETE FROM public.notification_preferences;
-- DELETE FROM public.macro_plans;
-- DELETE FROM public.workouts;
-- DELETE FROM public.profiles;
-- DELETE FROM auth.users WHERE email LIKE '%@example.com';

-- Insert a test admin user
-- Password for this user is 'password123' (bcrypt hash generated for this password)
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, 
    email_confirmed_at, recovery_token, recovery_sent_at, last_sign_in_at, 
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, 
    confirmation_token, email_change, email_change_sent_at, is_sso_user, phone
)
VALUES (
    '00000000-0000-0000-0000-000000000000', -- instance_id (usually a specific UUID, using default here)
    '00000000-0000-0000-0000-000000000001', -- id (fixed UUID for admin test user)
    'authenticated', -- aud
    'admin',         -- role (set to admin)
    'admin@example.com', -- email
    '$2a$10$5J6B0.0g7X9T0VzFbLzXmO0K3h7O2t9Z1C6tT3x5jF1qP2h8sD0iG', -- encrypted_password (for 'password123')
    current_timestamp, -- email_confirmed_at
    NULL, NULL, NULL, -- recovery_token, recovery_sent_at, last_sign_in_at
    '{"provider":"email","providers":["email"], "name":"Admin User"}', -- raw_app_meta_data (with name)
    '{}', -- raw_user_meta_data
    current_timestamp, current_timestamp, -- created_at, updated_at
    NULL, '', NULL, false, NULL -- confirmation_token, email_change, email_change_sent_at, is_sso_user, phone
)
ON CONFLICT (id) DO UPDATE SET -- In case the user already exists from a previous partial seed
    role = EXCLUDED.role,
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    updated_at = current_timestamp;

-- Corresponding profile for the admin user
INSERT INTO public.user_profiles (user_id, name, updated_at, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000001', 
    'Admin User', 
    current_timestamp,
    current_timestamp
)
ON CONFLICT (user_id) DO UPDATE SET
    name = EXCLUDED.name,
    updated_at = current_timestamp;


-- Insert a regular test user
-- Password for this user is 'password123'
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, 
    email_confirmed_at, recovery_token, recovery_sent_at, last_sign_in_at, 
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, 
    confirmation_token, email_change, email_change_sent_at, is_sso_user, phone
)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000002', -- id (fixed UUID for regular test user)
    'authenticated',
    'authenticated', -- role (default role)
    'user@example.com', -- email
    '$2a$10$5J6B0.0g7X9T0VzFbLzXmO0K3h7O2t9Z1C6tT3x5jF1qP2h8sD0iG', -- encrypted_password (for 'password123')
    current_timestamp, 
    NULL, NULL, NULL, 
    '{"provider":"email","providers":["email"], "name":"Regular User"}', -- raw_app_meta_data (with name)
    '{}', 
    current_timestamp, current_timestamp, 
    NULL, '', NULL, false, NULL
)
ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    updated_at = current_timestamp;

-- Corresponding profile for the regular user
INSERT INTO public.user_profiles (user_id, name, updated_at, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000002', 
    'Regular User', 
    current_timestamp,
    current_timestamp
)
ON CONFLICT (user_id) DO UPDATE SET
    name = EXCLUDED.name,
    updated_at = current_timestamp;

-- You can add more seed data for other tables like workouts, workout_logs, etc., if needed for consistent testing scenarios.
-- For example:
-- INSERT INTO public.workouts (id, user_id, plan_name, exercises, created_at, updated_at) 
-- VALUES ('your-uuid-plan1', '00000000-0000-0000-0000-000000000002', 'Regular User Starter Plan', '{"[{\"name\": \"Push-ups\", \"sets\": 3, \"repsOrRange\": \"10-12\"}]"}'::jsonb, current_timestamp, current_timestamp);

SELECT pg_catalog.set_config('search_path', 'public', false); 