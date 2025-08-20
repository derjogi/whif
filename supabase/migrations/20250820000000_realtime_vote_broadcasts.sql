-- WHIF Realtime Vote Broadcasts Migration
-- This migration implements broadcast-based realtime functionality for vote changes
-- following Supabase broadcast patterns for real-time vote aggregation updates

-- Enable votes table in realtime publication
-- This was previously commented out in the main schema migration
ALTER PUBLICATION supabase_realtime ADD TABLE votes;

-- Create function to broadcast vote changes with aggregation data
-- This function sends realtime broadcasts whenever votes are modified
CREATE OR REPLACE FUNCTION broadcast_vote_change()
RETURNS TRIGGER AS $$
DECLARE
  statement_uuid UUID;
  vote_data JSONB;
  aggregation_record RECORD;
BEGIN
  -- Get the statement_id from either NEW or OLD record
  statement_uuid := COALESCE(NEW.statement_id, OLD.statement_id);
  
  -- Validate that statement_id exists
  IF statement_uuid IS NULL THEN
    RAISE EXCEPTION 'Statement ID cannot be null for vote broadcast';
  END IF;
  
  -- Get current vote aggregation data using the existing view
  -- This ensures consistency with the application's vote counting logic
  SELECT 
    statement_id,
    upvotes,
    downvotes,
    total_votes
  INTO aggregation_record
  FROM vote_aggregations 
  WHERE statement_id = statement_uuid;
  
  -- Handle case where statement has no votes (record won't exist in view)
  IF aggregation_record IS NULL THEN
    SELECT 
      statement_uuid as statement_id,
      0 as upvotes,
      0 as downvotes,
      0 as total_votes
    INTO aggregation_record;
  END IF;
  
  -- Build the broadcast payload with vote aggregation data
  vote_data := jsonb_build_object(
    'type', 'vote_change',
    'statement_id', aggregation_record.statement_id,
    'upvotes', aggregation_record.upvotes,
    'downvotes', aggregation_record.downvotes,
    'total_votes', aggregation_record.total_votes,
    'operation', CASE 
      WHEN TG_OP = 'INSERT' THEN 'insert'
      WHEN TG_OP = 'UPDATE' THEN 'update'  
      WHEN TG_OP = 'DELETE' THEN 'delete'
      ELSE 'unknown'
    END,
    'timestamp', NOW()
  );
  
  -- Send the broadcast on the 'vote_changes' channel
  -- Clients can subscribe to this channel to receive real-time vote updates
  PERFORM pg_notify('vote_changes', vote_data::text);
  
  -- Also send a broadcast for the specific statement
  -- This allows clients to subscribe to updates for specific statements only
  PERFORM pg_notify(
    'statement_votes:' || statement_uuid::text, 
    vote_data::text
  );
  
  -- Return the appropriate record based on the operation
  RETURN COALESCE(NEW, OLD);
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the original operation
    -- This ensures that vote operations still succeed even if broadcasting fails
    RAISE WARNING 'Failed to broadcast vote change for statement %: %', statement_uuid, SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for vote change broadcasts
-- These triggers will fire after any INSERT, UPDATE, or DELETE operation on votes

-- Drop existing triggers if they exist to avoid conflicts
DROP TRIGGER IF EXISTS broadcast_vote_insert_trigger ON votes;
DROP TRIGGER IF EXISTS broadcast_vote_update_trigger ON votes;  
DROP TRIGGER IF EXISTS broadcast_vote_delete_trigger ON votes;

-- Create INSERT trigger
-- Fires when a new vote is created
CREATE TRIGGER broadcast_vote_insert_trigger
  AFTER INSERT ON votes
  FOR EACH ROW
  EXECUTE FUNCTION broadcast_vote_change();

-- Create UPDATE trigger  
-- Fires when an existing vote is modified (e.g., changing vote_type)
CREATE TRIGGER broadcast_vote_update_trigger
  AFTER UPDATE ON votes
  FOR EACH ROW
  EXECUTE FUNCTION broadcast_vote_change();

-- Create DELETE trigger
-- Fires when a vote is removed
CREATE TRIGGER broadcast_vote_delete_trigger
  AFTER DELETE ON votes
  FOR EACH ROW
  EXECUTE FUNCTION broadcast_vote_change();

-- Grant necessary permissions for realtime functionality
-- Authenticated users need to be able to receive broadcasts
GRANT USAGE ON SCHEMA public TO authenticated;

-- Create RLS policy for realtime subscriptions
-- This policy allows authenticated users to receive vote change broadcasts
-- for statements they can access (based on the existing idea visibility rules)
CREATE POLICY "Authenticated users can receive vote broadcasts" ON votes
  FOR SELECT USING (
    -- Users can receive broadcasts for votes on statements in published ideas
    -- or ideas they own (consistent with existing statement access policies)
    statement_id IN (
      SELECT s.id FROM statements s
      JOIN ideas i ON s.idea_id = i.id
      WHERE i.published = true OR i.user_id = auth.uid()
    )
  );

-- Create function to check if user can access vote broadcasts for a statement
-- This function can be used by client applications to validate access
CREATE OR REPLACE FUNCTION can_access_statement_vote_broadcasts(statement_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Return true if the statement exists and is accessible to the current user
  RETURN EXISTS(
    SELECT 1 FROM statements s
    JOIN ideas i ON s.idea_id = i.id  
    WHERE s.id = statement_uuid
      AND (i.published = true OR i.user_id = auth.uid())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION can_access_statement_vote_broadcasts(UUID) TO authenticated;

-- Create a view for real-time vote events (optional, for debugging/monitoring)
-- This view can help monitor broadcast activity and troubleshoot issues
CREATE OR REPLACE VIEW realtime_vote_events AS
SELECT 
  v.id as vote_id,
  v.statement_id,
  v.user_id,
  v.vote_type,
  v.created_at,
  v.updated_at,
  va.upvotes,
  va.downvotes,
  va.total_votes,
  s.idea_id,
  i.title as idea_title,
  i.published as idea_published
FROM votes v
JOIN vote_aggregations va ON v.statement_id = va.statement_id
JOIN statements s ON v.statement_id = s.id
JOIN ideas i ON s.idea_id = i.id
ORDER BY v.updated_at DESC;

-- Grant access to the monitoring view for authenticated users
GRANT SELECT ON realtime_vote_events TO authenticated;

-- Add helpful comments for documentation
COMMENT ON FUNCTION broadcast_vote_change() IS 
'Broadcasts vote changes with aggregated vote data to realtime subscribers. Sends notifications on both general and statement-specific channels.';

COMMENT ON FUNCTION can_access_statement_vote_broadcasts(UUID) IS 
'Checks if the current authenticated user has permission to receive vote broadcast updates for the specified statement.';

COMMENT ON VIEW realtime_vote_events IS 
'Debugging and monitoring view that shows recent vote events with aggregation data and associated idea information.';

-- Enable realtime for the vote_aggregations view as well
-- This allows clients to subscribe directly to aggregated vote data changes
ALTER VIEW vote_aggregations SET (security_barrier = false);
GRANT SELECT ON vote_aggregations TO authenticated, anon;

-- Migration completion message
SELECT 'Realtime vote broadcasts migration completed successfully' as status;