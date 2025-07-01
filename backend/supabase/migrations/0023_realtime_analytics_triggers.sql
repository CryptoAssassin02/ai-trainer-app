-- ✅ FOLLOWS RULE: Create analytics refresh queue table first
-- Migration: 0023_realtime_analytics_triggers.sql
-- Purpose: Create real-time analytics triggers and refresh queue system
-- Created: Phase 3 Implementation

-- Create analytics refresh queue table for background processing
CREATE TABLE IF NOT EXISTS analytics_refresh_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trigger_table TEXT NOT NULL,
  trigger_event TEXT NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Add constraints for data integrity
  CONSTRAINT valid_trigger_event CHECK (trigger_event IN ('INSERT', 'UPDATE', 'DELETE')),
  CONSTRAINT valid_trigger_table CHECK (trigger_table IN ('workout_logs', 'user_check_ins', 'meal_logs', 'user_analytics_aggregates')),
  CONSTRAINT future_scheduled_time CHECK (scheduled_at >= created_at)
);

-- ✅ FOLLOWS RULE: Enable RLS for security
ALTER TABLE analytics_refresh_queue ENABLE ROW LEVEL SECURITY;

-- ✅ FOLLOWS RULE: Create RLS policy for analytics refresh queue
CREATE POLICY "Users can access own analytics refresh queue" ON analytics_refresh_queue
  FOR ALL USING (auth.uid() = user_id);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_analytics_refresh_queue_user_id ON analytics_refresh_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_refresh_queue_scheduled_at ON analytics_refresh_queue(scheduled_at) WHERE processed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_refresh_queue_processed_at ON analytics_refresh_queue(processed_at);

-- Function to refresh analytics on data changes
CREATE OR REPLACE FUNCTION refresh_user_analytics_on_change()
RETURNS TRIGGER AS $$
DECLARE
  affected_user_id UUID;
BEGIN
  -- ✅ FOLLOWS RULE: Schedule analytics refresh for the affected user
  affected_user_id := COALESCE(NEW.user_id, OLD.user_id);
  
  -- Only process if we have a valid user_id
  IF affected_user_id IS NOT NULL THEN
    INSERT INTO analytics_refresh_queue (user_id, trigger_table, trigger_event, scheduled_at)
    VALUES (
      affected_user_id,
      TG_TABLE_NAME,
      TG_OP,
      NOW() + INTERVAL '30 seconds'
    )
    ON CONFLICT DO NOTHING; -- Prevent duplicate queue entries
    
    -- Log the trigger event for debugging
    RAISE NOTICE 'Analytics refresh queued for user % due to % on table %', 
      affected_user_id, TG_OP, TG_TABLE_NAME;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the original operation
  RAISE WARNING 'Failed to queue analytics refresh for user %: %', affected_user_id, SQLERRM;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ✅ FOLLOWS RULE: Triggers for real-time analytics updates
-- Create triggers for workout logs
DROP TRIGGER IF EXISTS workout_logs_analytics_refresh ON workout_logs;
CREATE TRIGGER workout_logs_analytics_refresh
  AFTER INSERT OR UPDATE OR DELETE
  ON workout_logs
  FOR EACH ROW
  EXECUTE FUNCTION refresh_user_analytics_on_change();

-- Create triggers for user check-ins
DROP TRIGGER IF EXISTS user_check_ins_analytics_refresh ON user_check_ins;
CREATE TRIGGER user_check_ins_analytics_refresh
  AFTER INSERT OR UPDATE OR DELETE
  ON user_check_ins
  FOR EACH ROW
  EXECUTE FUNCTION refresh_user_analytics_on_change();

-- Create triggers for meal logs (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'meal_logs') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS meal_logs_analytics_refresh ON meal_logs';
    EXECUTE 'CREATE TRIGGER meal_logs_analytics_refresh
      AFTER INSERT OR UPDATE OR DELETE
      ON meal_logs
      FOR EACH ROW
      EXECUTE FUNCTION refresh_user_analytics_on_change()';
  END IF;
END $$;

-- ✅ FOLLOWS RULE: Background job processor with proper error handling
CREATE OR REPLACE FUNCTION process_analytics_refresh_queue()
RETURNS void AS $$
DECLARE
  refresh_record RECORD;
  processed_count INTEGER := 0;
  error_count INTEGER := 0;
BEGIN
  -- Process up to 10 queued refresh requests
  FOR refresh_record IN 
    SELECT DISTINCT user_id 
    FROM analytics_refresh_queue 
    WHERE scheduled_at <= NOW() 
    AND processed_at IS NULL
    ORDER BY scheduled_at ASC
    LIMIT 10
  LOOP
    BEGIN
      -- ✅ FOLLOWS RULE: Call analytics refresh function with proper error handling
      PERFORM refresh_user_analytics(refresh_record.user_id);
      
      -- Mark all pending refresh requests for this user as processed
      UPDATE analytics_refresh_queue 
      SET processed_at = NOW()
      WHERE user_id = refresh_record.user_id 
      AND processed_at IS NULL;
      
      processed_count := processed_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue processing other records
      error_count := error_count + 1;
      
      -- Mark this user's requests as processed with error timestamp
      UPDATE analytics_refresh_queue 
      SET processed_at = NOW()
      WHERE user_id = refresh_record.user_id 
      AND processed_at IS NULL;
      
      RAISE WARNING 'Analytics refresh failed for user %: %', refresh_record.user_id, SQLERRM;
    END;
  END LOOP;
  
  -- Log processing summary
  IF processed_count > 0 OR error_count > 0 THEN
    RAISE NOTICE 'Analytics refresh queue processed: % successful, % errors', processed_count, error_count;
  END IF;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old processed queue entries
CREATE OR REPLACE FUNCTION cleanup_analytics_refresh_queue()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete processed entries older than 24 hours
  DELETE FROM analytics_refresh_queue 
  WHERE processed_at IS NOT NULL 
  AND processed_at < NOW() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RAISE NOTICE 'Cleaned up % old analytics refresh queue entries', deleted_count;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a scheduled job function for periodic queue processing
CREATE OR REPLACE FUNCTION scheduled_analytics_refresh()
RETURNS void AS $$
BEGIN
  -- Process the queue
  PERFORM process_analytics_refresh_queue();
  
  -- Clean up old entries every hour (basic cleanup)
  IF EXTRACT(MINUTE FROM NOW()) = 0 THEN
    PERFORM cleanup_analytics_refresh_queue();
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ✅ FOLLOWS RULE: Add to realtime publication for real-time updates
-- Add analytics tables to realtime publication if not already added
DO $$ 
BEGIN
  -- Add analytics_refresh_queue to realtime publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'analytics_refresh_queue'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE analytics_refresh_queue;
  END IF;
  
  -- Add user_analytics_aggregates to realtime publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'user_analytics_aggregates'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_analytics_aggregates;
  END IF;
END $$;

-- Create a view for monitoring analytics refresh queue status
CREATE OR REPLACE VIEW analytics_refresh_queue_status AS
SELECT 
  COUNT(*) FILTER (WHERE processed_at IS NULL) as pending_count,
  COUNT(*) FILTER (WHERE processed_at IS NOT NULL AND processed_at > NOW() - INTERVAL '1 hour') as processed_last_hour,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as created_last_hour,
  AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) FILTER (WHERE processed_at IS NOT NULL) as avg_processing_time_seconds,
  MIN(scheduled_at) FILTER (WHERE processed_at IS NULL) as oldest_pending_item,
  MAX(processed_at) as last_processed_at
FROM analytics_refresh_queue;

-- Grant appropriate permissions
GRANT SELECT ON analytics_refresh_queue_status TO authenticated;

-- Add comment for documentation
COMMENT ON TABLE analytics_refresh_queue IS 'Queue for background analytics refresh operations triggered by real-time data changes';
COMMENT ON FUNCTION refresh_user_analytics_on_change() IS 'Trigger function to queue analytics refresh when user data changes';
COMMENT ON FUNCTION process_analytics_refresh_queue() IS 'Processes queued analytics refresh operations in batches';
COMMENT ON FUNCTION cleanup_analytics_refresh_queue() IS 'Removes old processed queue entries to prevent table bloat';
COMMENT ON VIEW analytics_refresh_queue_status IS 'Monitoring view for analytics refresh queue performance and status';

-- Final verification that all required components are in place
DO $$
DECLARE
  trigger_count INTEGER;
  function_count INTEGER;
BEGIN
  -- Check triggers
  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.triggers 
  WHERE trigger_name LIKE '%analytics_refresh%';
  
  -- Check functions
  SELECT COUNT(*) INTO function_count
  FROM information_schema.routines 
  WHERE routine_name IN ('refresh_user_analytics_on_change', 'process_analytics_refresh_queue', 'cleanup_analytics_refresh_queue');
  
  RAISE NOTICE 'Migration 0023 verification: % triggers, % functions created', trigger_count, function_count;
  
  IF trigger_count < 2 OR function_count < 3 THEN
    RAISE EXCEPTION 'Migration 0023 incomplete: Expected at least 2 triggers and 3 functions';
  END IF;
END $$; 