-- WHIF Realtime Vote Updates Migration
-- This migration enables postgres_changes realtime functionality for vote changes
-- using Supabase's built-in database change notifications

-- Enable votes table in realtime publication for postgres_changes
ALTER PUBLICATION supabase_realtime ADD TABLE votes;

-- Grant necessary permissions for realtime functionality
GRANT USAGE ON SCHEMA public TO authenticated;

-- Create RLS policy for realtime subscriptions
-- This policy allows authenticated users to receive vote change notifications
-- for downstream impacts they can access (based on the existing idea visibility rules)
CREATE POLICY "Authenticated users can receive vote notifications" ON votes
  FOR SELECT USING (
    -- Users can receive notifications for votes on downstream impacts in published ideas
    -- or ideas they own (consistent with existing downstream impact access policies)
    downstream_impact_id IN (
      SELECT di.id FROM downstream_impacts di
      JOIN categories c ON di.category_id = c.id
      JOIN ideas i ON c.idea_id = i.id
      WHERE i.published = true OR i.user_id = auth.uid()
    )
  );

-- Migration completion message
SELECT 'Realtime vote postgres_changes migration completed successfully' as status;