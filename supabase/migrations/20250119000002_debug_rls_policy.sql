-- Create a function to test the exact RLS policy logic
CREATE OR REPLACE FUNCTION test_vote_rls_policy(p_statement_id uuid, p_user_id uuid)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'statement_id', p_statement_id,
    'user_id', p_user_id,
    'auth_uid', auth.uid(),
    'statement_exists', EXISTS(
      SELECT 1 FROM statements WHERE id = p_statement_id
    ),
    'statement_accessible', EXISTS(
      SELECT s.id FROM statements s
      JOIN ideas i ON s.idea_id = i.id
      WHERE s.id = p_statement_id 
        AND (i.published = true OR i.user_id = auth.uid())
    ),
    'user_id_matches_auth', p_user_id = auth.uid(),
    'full_rls_check', (
      p_user_id = auth.uid() AND
      p_statement_id IN (
        SELECT s.id FROM statements s
        JOIN ideas i ON s.idea_id = i.id
        WHERE i.published = true OR i.user_id = auth.uid()
      )
    )
  );
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION test_vote_rls_policy(uuid, uuid) TO authenticated;