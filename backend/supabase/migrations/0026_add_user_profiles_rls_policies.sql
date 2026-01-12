-- Enable Row Level Security on user_profiles table
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own profile
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Policy for users to create their own profile  
CREATE POLICY "Users can create own profile" ON public.user_profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Policy for users to update their own profile
CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy for users to delete their own profile
CREATE POLICY "Users can delete own profile" ON public.user_profiles
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
