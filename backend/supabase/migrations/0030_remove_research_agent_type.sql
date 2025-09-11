-- Remove 'research' from agent_memory agent_type constraint
-- This migration removes the research agent type from the allowed values

-- Drop the existing constraint
ALTER TABLE public.agent_memory DROP CONSTRAINT IF EXISTS agent_memory_agent_type_check;

-- Recreate the constraint without 'research'
ALTER TABLE public.agent_memory ADD CONSTRAINT agent_memory_agent_type_check CHECK (
  (
    agent_type = any (
      array[
        'nutrition'::text,
        'workout'::text,
        'adjustment'::text,
        'system'::text,
        'feedback'::text
      ]
    )
  )
);

-- Clean up any existing research agent memory records (optional - uncomment if needed)
-- DELETE FROM public.agent_memory WHERE agent_type = 'research';
