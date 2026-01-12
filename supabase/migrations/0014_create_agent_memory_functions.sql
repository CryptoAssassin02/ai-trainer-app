        CREATE OR REPLACE FUNCTION public.check_if_extension_exists(extension_name TEXT)
        RETURNS BOOLEAN AS $$
        BEGIN
          RETURN EXISTS (
            SELECT 1 FROM pg_extension WHERE extname = extension_name
          );
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;

        CREATE OR REPLACE FUNCTION public.match_agent_memories(
          query_embedding VECTOR(1536),
          match_threshold FLOAT DEFAULT 0.7,
          match_count INT DEFAULT 10,
          filter_user_id UUID DEFAULT NULL,
          filter_plan_id UUID DEFAULT NULL
        )
        RETURNS TABLE (
          id UUID,
          user_id UUID,
          agent_type TEXT,
          content JSONB, -- Ensuring this matches the agent_memory table 'content' type
          metadata JSONB,
          created_at TIMESTAMPTZ,
          updated_at TIMESTAMPTZ,
          workout_plan_id UUID,
          workout_log_id UUID,
          version INTEGER,
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
            am.content, -- ensure this is selected
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

        CREATE OR REPLACE FUNCTION public.filter_agent_memories(
          user_id_param UUID,
          metadata_filter JSONB DEFAULT '{}'::jsonb,
          agent_type_param TEXT DEFAULT NULL,
          plan_id_param UUID DEFAULT NULL,
          log_id_param UUID DEFAULT NULL,
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

        -- Add grants for these functions as seen in the enhance scripts
        GRANT EXECUTE ON FUNCTION public.check_if_extension_exists(text) TO authenticated, service_role;
        GRANT EXECUTE ON FUNCTION public.match_agent_memories(vector, float, integer, uuid, uuid) TO authenticated, service_role;
        GRANT EXECUTE ON FUNCTION public.filter_agent_memories(uuid, jsonb, text, uuid, uuid, boolean, integer, integer, text, text) TO authenticated, service_role;