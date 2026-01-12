-- Migration to drop the custom public.refresh_tokens table as it is no longer needed
-- after refactoring the authentication flow to use Supabase native session management.

DROP TABLE IF EXISTS public.refresh_tokens; 