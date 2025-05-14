-- Migration to enhance the existing agent_memory table

-- 1. Enable the pgvector extension if not already enabled
-- CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Ensure the schema exists
CREATE SCHEMA IF NOT EXISTS public;

-- 2. Add missing columns to the agent_memory table
ALTER TABLE public.agent_memory
ADD COLUMN IF NOT EXISTS agent_type TEXT, -- Add if missing, adjust based on original migration
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb, -- Add metadata column
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE, -- Add archiving flag
ADD COLUMN IF NOT EXISTS consolidated_into UUID REFERENCES public.agent_memory(id), -- Link for consolidation
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ; -- Timestamp for archiving

-- 3. Add constraints (adjust agent_type CHECK based on your needs)
-- Be cautious adding constraints that might conflict with existing data
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'agent_memory_agent_type_check' AND conrelid = 'public.agent_memory'::regclass
  ) THEN
    ALTER TABLE public.agent_memory 
    ADD CONSTRAINT agent_memory_agent_type_check 
    CHECK (agent_type IN ('nutrition', 'workout', 'research', 'adjustment', 'system', 'feedback')); -- Example types
  END IF;
END $$;

-- Update existing NULL agent_type values if necessary (example: set default)
-- UPDATE public.agent_memory SET agent_type = 'unknown' WHERE agent_type IS NULL;

-- Make agent_type NOT NULL if appropriate after handling NULLs
-- ALTER TABLE public.agent_memory ALTER COLUMN agent_type SET NOT NULL;

-- 4. Create indexes for improved query performance
CREATE INDEX IF NOT EXISTS idx_agent_memory_user_id ON public.agent_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_agent_type ON public.agent_memory(agent_type);
CREATE INDEX IF NOT EXISTS idx_agent_memory_created_at ON public.agent_memory(created_at);
CREATE INDEX IF NOT EXISTS idx_agent_memory_is_archived ON public.agent_memory(is_archived);

-- 5. Create vector index (using HNSW is generally preferred over IVFFlat)
-- Choose cosine distance for text embeddings
CREATE INDEX IF NOT EXISTS idx_agent_memory_embedding_hnsw ON public.agent_memory 
USING hnsw (embedding vector_cosine_ops); -- Using HNSW
-- DROP INDEX IF EXISTS idx_agent_memory_embedding; -- Drop old IVFFlat if it exists

-- 6. Create helper functions (adapted from the original migration)

-- Function to check if an extension exists (useful for checks)
CREATE OR REPLACE FUNCTION public.check_if_extension_exists(extension_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = extension_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to match documents by vector similarity (using cosine distance)
CREATE OR REPLACE FUNCTION public.match_agent_memories(
  query_embedding VECTOR(1536), -- Ensure dimension matches your model
  match_threshold FLOAT DEFAULT 0.7, -- Adjust threshold as needed
  match_count INT DEFAULT 10,
  filter_user_id UUID DEFAULT NULL -- Add user ID filter
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  agent_type TEXT,
  content TEXT, -- Changed from jsonb based on screenshot
  metadata JSONB,
  created_at TIMESTAMPTZ,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    am.id,
    am.user_id,
    am.agent_type,
    am.content, -- Use the text content column
    am.metadata,
    am.created_at,
    1 - (am.embedding <=> query_embedding) AS similarity -- Cosine similarity
  FROM
    public.agent_memory am
  WHERE
    am.embedding IS NOT NULL
    AND (filter_user_id IS NULL OR am.user_id = filter_user_id) -- Filter by user ID if provided
    AND 1 - (am.embedding <=> query_embedding) > match_threshold
    AND am.is_archived = FALSE -- Exclude archived memories by default
  ORDER BY
    am.embedding <=> query_embedding -- Order by distance (ascending for KNN)
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to filter memories by metadata and other criteria
CREATE OR REPLACE FUNCTION public.filter_agent_memories(
  user_id_param UUID,
  metadata_filter JSONB DEFAULT '{}'::jsonb,
  agent_type_param TEXT DEFAULT NULL,
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
  IF sort_by_param NOT IN ('created_at', 'updated_at', 'agent_type', 'id') THEN
      sort_by_param := 'created_at'; -- Default to created_at if invalid
  END IF;
  query_text := query_text || ' ORDER BY ' || quote_ident(sort_by_param) || ' ' || sort_direction;

  -- Add pagination
  query_text := query_text || ' LIMIT $3 OFFSET $5';

  -- Execute the query with correct parameters based on agent_type_param presence
  IF agent_type_param IS NOT NULL THEN
    RETURN QUERY EXECUTE query_text USING
      user_id_param, metadata_filter, limit_param, agent_type_param, offset_param;
  ELSE
    -- Need to adjust parameter indices if agent_type_param is skipped
    -- Simpler approach: Pass NULL for the unused parameter
    RETURN QUERY EXECUTE query_text USING
      user_id_param, metadata_filter, limit_param, NULL::text, offset_param;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Enable Row Level Security (RLS) if not already enabled
ALTER TABLE public.agent_memory ENABLE ROW LEVEL SECURITY;

-- 8. Create or Replace RLS policies
-- Policy for users to access their own records
CREATE POLICY "Users can CRUD their own agent_memory records" ON public.agent_memory
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy for service roles (e.g., backend server) to bypass RLS
CREATE POLICY "Service role can access all agent_memory records" ON public.agent_memory
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Note: Ensure the role your backend uses has the 'service_role' attribute or adjust accordingly.

-- 9. Grant necessary permissions (adjust based on roles)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.agent_memory TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.agent_memory TO service_role;
-- GRANT USAGE, SELECT ON SEQUENCE public.agent_memory_id_seq TO authenticated, service_role; -- If using a sequence

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.check_if_extension_exists(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.match_agent_memories(vector, float, integer, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.filter_agent_memories(uuid, jsonb, text, boolean, integer, integer, text, text) TO authenticated, service_role;


-- Optional: Update the existing 'content' column from JSONB to TEXT if needed
-- Note: This is a potentially destructive change if JSONB features were used.
-- ALTER TABLE public.agent_memory ALTER COLUMN content TYPE TEXT;

-- Optional: Drop the 'agent_source' column if it's redundant with 'agent_type' or 'metadata'
ALTER TABLE public.agent_memory DROP COLUMN IF EXISTS agent_source;

-- Optional: Ensure 'updated_at' updates automatically (if not already handled)
-- CREATE OR REPLACE FUNCTION update_updated_at_column()
-- RETURNS TRIGGER AS $$
-- BEGIN
--  NEW.updated_at = now();
--  RETURN NEW;
-- END;
-- $$ language 'plpgsql';

-- CREATE TRIGGER update_agent_memory_updated_at
-- BEFORE UPDATE ON public.agent_memory
-- FOR EACH ROW
-- EXECUTE FUNCTION update_updated_at_column();


COMMIT; 