/*
  # Enhanced Agent Memory Relationships Migration

  This migration enhances the agent_memory table by:
  1. Creating explicit relationships with workout_plans and workout_logs tables
  2. Adding proper timestamp tracking for updates
  3. Optimizing indexes for better query performance
  4. Ensuring proper cascading behavior for referential integrity

  Existing relationships are maintained through metadata.plan_id, but now we add
  explicit foreign key relationships for better data integrity and query performance.
*/

-- 1. First, add the foreign key columns if they don't exist
ALTER TABLE public.agent_memory
ADD COLUMN IF NOT EXISTS workout_plan_id UUID REFERENCES public.workout_plans(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS workout_log_id UUID REFERENCES public.workout_logs(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2. Migrate existing plan_id references from metadata to the new foreign key column
DO $migration_block$
DECLARE
    memory_record RECORD;
BEGIN
    -- Find records with plan_id in metadata that might match a workout plan
    FOR memory_record IN 
        SELECT 
            id, 
            metadata->'plan_id' AS plan_id_from_metadata
        FROM 
            public.agent_memory
        WHERE 
            metadata->'plan_id' IS NOT NULL
            AND workout_plan_id IS NULL
    LOOP
        -- Try to update with matching workout plan if exists
        BEGIN
            UPDATE public.agent_memory
            SET workout_plan_id = (
                SELECT id FROM public.workout_plans 
                WHERE id::text = memory_record.plan_id_from_metadata::text
                LIMIT 1
            )
            WHERE id = memory_record.id
            AND EXISTS (
                SELECT 1 FROM public.workout_plans 
                WHERE id::text = memory_record.plan_id_from_metadata::text
            );
        EXCEPTION WHEN OTHERS THEN
            -- Log error but continue processing
            RAISE NOTICE 'Error updating plan reference for memory ID %: %', memory_record.id, SQLERRM;
        END;
    END LOOP;
END;
$migration_block$;

-- 3. Add indexes for improved query performance on the new columns
CREATE INDEX IF NOT EXISTS idx_agent_memory_workout_plan_id ON public.agent_memory(workout_plan_id)
WHERE workout_plan_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agent_memory_workout_log_id ON public.agent_memory(workout_log_id)
WHERE workout_log_id IS NOT NULL;

-- 4. Add composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_agent_memory_user_plan ON public.agent_memory(user_id, workout_plan_id)
WHERE user_id IS NOT NULL AND workout_plan_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agent_memory_agent_type_plan ON public.agent_memory(agent_type, workout_plan_id)
WHERE agent_type IS NOT NULL AND workout_plan_id IS NOT NULL;

-- 5. Ensure the updated_at column is automatically updated
DO $function_block$
DECLARE
    func_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column'
    ) INTO func_exists;
    
    IF NOT func_exists THEN
        -- Create the function if it doesn't exist
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $trigger_function$
        BEGIN
            NEW.updated_at = now();
            RETURN NEW;
        END;
        $trigger_function$ language plpgsql;
    END IF;
END;
$function_block$;

-- 6. Create trigger for updating the updated_at timestamp
DROP TRIGGER IF EXISTS update_agent_memory_updated_at ON public.agent_memory;
CREATE TRIGGER update_agent_memory_updated_at
BEFORE UPDATE ON public.agent_memory
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 7. Update existing updated_at values if null
UPDATE public.agent_memory
SET updated_at = created_at
WHERE updated_at IS NULL;

-- 8. Make the updated_at column NOT NULL once populated
ALTER TABLE public.agent_memory
ALTER COLUMN updated_at SET NOT NULL;

-- 9. Add a change tracking column for versioning
ALTER TABLE public.agent_memory
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- 10. Create a trigger to increment version on update
CREATE OR REPLACE FUNCTION increment_version_on_update()
RETURNS TRIGGER AS $$
DECLARE
    old_version integer;
BEGIN
    old_version := COALESCE(OLD.version, 0);
    NEW.version := old_version + 1;
    RETURN NEW;
END;
$$ language plpgsql;

DROP TRIGGER IF EXISTS increment_agent_memory_version ON public.agent_memory;
CREATE TRIGGER increment_agent_memory_version
BEFORE UPDATE ON public.agent_memory
FOR EACH ROW
EXECUTE FUNCTION increment_version_on_update();

-- 11. Enhance the existing match_agent_memories function to include plan references
CREATE OR REPLACE FUNCTION public.match_agent_memories(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10,
  filter_user_id UUID DEFAULT NULL,
  filter_plan_id UUID DEFAULT NULL  -- New parameter for plan filtering
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  agent_type TEXT,
  content TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  workout_plan_id UUID,    -- Include new columns
  workout_log_id UUID,     -- Include new columns
  version INTEGER,         -- Include version
  similarity FLOAT
) AS $$
BEGIN
  IF query_embedding IS NULL THEN
    RAISE EXCEPTION 'query_embedding cannot be NULL';
  END IF;
  
  RETURN QUERY
  SELECT
    am.id,
    am.user_id,
    am.agent_type,
    am.content,
    am.metadata,
    am.created_at,
    am.updated_at,
    am.workout_plan_id,
    am.workout_log_id,
    am.version,
    1 - (am.embedding <=> query_embedding) AS similarity
  FROM
    public.agent_memory am
  WHERE
    am.embedding IS NOT NULL
    AND (filter_user_id IS NULL OR am.user_id = filter_user_id)
    AND (filter_plan_id IS NULL OR am.workout_plan_id = filter_plan_id)
    AND 1 - (am.embedding <=> query_embedding) > match_threshold
    AND am.is_archived = FALSE
  ORDER BY
    am.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Enhance the filter_agent_memories function to include relationships
CREATE OR REPLACE FUNCTION public.filter_agent_memories(
  user_id_param UUID,
  metadata_filter JSONB DEFAULT '{}'::jsonb,
  agent_type_param TEXT DEFAULT NULL,
  plan_id_param UUID DEFAULT NULL,  -- New parameter for workout plan filtering
  log_id_param UUID DEFAULT NULL,   -- New parameter for workout log filtering
  include_archived BOOLEAN DEFAULT FALSE,
  limit_param INT DEFAULT 10,
  offset_param INT DEFAULT 0,
  sort_by_param TEXT DEFAULT 'created_at',
  sort_direction_param TEXT DEFAULT 'desc'
)
RETURNS SETOF public.agent_memory AS $$
DECLARE
  query_text TEXT;
  sort_direction TEXT;
BEGIN
  -- Validate sort direction
  IF lower(sort_direction_param) NOT IN ('asc', 'desc') THEN
    sort_direction := 'desc';
  ELSE
    sort_direction := lower(sort_direction_param);
  END IF;

  -- Build the base query
  query_text := 'SELECT * FROM public.agent_memory WHERE user_id = $1';

  -- Add agent type filter if provided
  IF agent_type_param IS NOT NULL THEN
    query_text := query_text || ' AND agent_type = $4';
  END IF;

  -- Add workout plan filter if provided
  IF plan_id_param IS NOT NULL THEN
    query_text := query_text || ' AND workout_plan_id = $5';
  END IF;

  -- Add workout log filter if provided
  IF log_id_param IS NOT NULL THEN
    query_text := query_text || ' AND workout_log_id = $6';
  END IF;

  -- Add archived filter
  IF NOT include_archived THEN
    query_text := query_text || ' AND is_archived = FALSE';
  END IF;

  -- Add metadata filters (using @> for JSONB containment)
  IF metadata_filter IS NOT NULL AND metadata_filter != '{}'::jsonb THEN
    query_text := query_text || ' AND metadata @> $2';
  END IF;

  -- Add sorting
  -- Validate sort_by_param against allowed columns to prevent SQL injection
  IF sort_by_param NOT IN ('created_at', 'updated_at', 'agent_type', 'id', 'version') THEN
      sort_by_param := 'created_at'; -- Default to created_at if invalid
  END IF;
  query_text := query_text || ' ORDER BY ' || quote_ident(sort_by_param) || ' ' || sort_direction;

  -- Add pagination
  query_text := query_text || ' LIMIT $3 OFFSET $7';

  -- Execute the query with correct parameters
  RETURN QUERY EXECUTE query_text USING
    user_id_param, 
    metadata_filter, 
    limit_param, 
    agent_type_param, 
    plan_id_param,
    log_id_param,
    offset_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Grant execute permissions on the updated functions
GRANT EXECUTE ON FUNCTION public.match_agent_memories(vector, float, integer, uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.filter_agent_memories(uuid, jsonb, text, uuid, uuid, boolean, integer, integer, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION increment_version_on_update() TO authenticated, service_role;

COMMIT; 