-- Migration: Add 'analytics' to agent_memory_agent_type_check constraint
-- This allows the AnalyticsAgent to store insights and patterns in the memory system

-- Drop the existing constraint
ALTER TABLE "public"."agent_memory" DROP CONSTRAINT IF EXISTS "agent_memory_agent_type_check";

-- Add the updated constraint including 'analytics'
ALTER TABLE "public"."agent_memory" 
ADD CONSTRAINT "agent_memory_agent_type_check" 
CHECK (agent_type = ANY (ARRAY[
  'nutrition'::text, 
  'workout'::text, 
  'research'::text, 
  'adjustment'::text, 
  'system'::text, 
  'feedback'::text,
  'analytics'::text
]));

-- Validate the constraint
ALTER TABLE "public"."agent_memory" VALIDATE CONSTRAINT "agent_memory_agent_type_check"; 