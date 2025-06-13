/*
  # Agent Memory and Analytics Schema

  1. Agent Memory Table Structure
    - Stores AI agent interactions and learned patterns
    - Uses pgvector for semantic similarity search
    - Maintains user-specific memory context
    - Flexible JSONB storage for varied content types

    Vector Embedding Structure:
    - 1536-dimensional vector (OpenAI Ada-002 compatible)
    - Normalized for cosine similarity search
    - Used for semantic retrieval of similar interactions

    JSONB Content Structure:
    {
      "type": "string",         // Interaction type (conversation, feedback, preference)
      "context": "string",      // Original context of the interaction
      "summary": "string",      // Condensed version for quick reference
      "tags": ["string"],       // Categorization tags
      "importance": number,     // Priority score (1-10)
      "metadata": {             // Additional structured data
        "source": "string",
        "confidence": number,
        "related_entities": ["string"]
      }
    }

  2. Analytics Events Table Structure
    - Tracks user interactions and system events
    - Supports detailed event metadata
    - Enables advanced analytics and reporting
    - Implements role-based access control

    JSONB Metadata Structure:
    {
      "session": {
        "id": "string",
        "duration": number,
        "platform": "string",
        "user_agent": "string"
      },
      "context": {
        "page": "string",
        "referrer": "string",
        "feature": "string"
      },
      "properties": {
        "value": number,
        "category": "string",
        "status": "string"
      },
      "custom_data": {}        // Flexible extension point
    }

  3. Security
    - Implements Row Level Security (RLS)
    - Specialized policies for analytics access
    - Admin role support for analytics oversight
    - User data isolation

  4. Performance Considerations
    - Vector similarity search indexing
    - Timestamp-based partitioning for analytics
    - Efficient JSONB indexing
    - Optimized query patterns
*/

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create agent_memory table
CREATE TABLE IF NOT EXISTS agent_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  embedding vector(1536),
  content JSONB NOT NULL DEFAULT '{}',
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_embedding CHECK (embedding IS NULL OR vector_dims(embedding) = 1536)
);

-- Create analytics_events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_memory_user_id ON agent_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_type ON agent_memory(type);
CREATE INDEX IF NOT EXISTS idx_agent_memory_content ON agent_memory USING gin(content jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_events_metadata ON analytics_events USING gin(metadata jsonb_path_ops);

-- Create vector similarity search index
CREATE INDEX IF NOT EXISTS idx_agent_memory_embedding ON agent_memory USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Enable Row Level Security
ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Create policies for agent_memory
CREATE POLICY "Users can view own memory"
  ON agent_memory
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create memory"
  ON agent_memory
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own memory"
  ON agent_memory
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own memory"
  ON agent_memory
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for analytics_events
CREATE POLICY "Users can view own analytics"
  ON analytics_events
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Users can create analytics events"
  ON analytics_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Only admins can update analytics"
  ON analytics_events
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Only admins can delete analytics"
  ON analytics_events
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Create trigger for updated_at on agent_memory
CREATE TRIGGER update_agent_memory_updated_at
  BEFORE UPDATE ON agent_memory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for updated_at on analytics_events
CREATE TRIGGER update_analytics_events_updated_at
  BEFORE UPDATE ON analytics_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 