-- Enable Row Level Security for user_check_ins (if not already enabled)
ALTER TABLE public.user_check_ins ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own check-ins" ON public.user_check_ins;
DROP POLICY IF EXISTS "Users can insert their own check-ins" ON public.user_check_ins;
DROP POLICY IF EXISTS "Users can update their own check-ins" ON public.user_check_ins;
DROP POLICY IF EXISTS "Users can delete their own check-ins" ON public.user_check_ins;

-- Create RLS policies for user_check_ins
-- Policy for users to select their own check-ins
CREATE POLICY "Users can view their own check-ins" ON public.user_check_ins
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Policy for users to insert their own check-ins
CREATE POLICY "Users can insert their own check-ins" ON public.user_check_ins
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Policy for users to update their own check-ins
CREATE POLICY "Users can update their own check-ins" ON public.user_check_ins
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy for users to delete their own check-ins
CREATE POLICY "Users can delete their own check-ins" ON public.user_check_ins
    FOR DELETE 
    USING (auth.uid() = user_id); 