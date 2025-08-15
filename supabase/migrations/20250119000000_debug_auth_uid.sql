-- Create a debug function to test auth.uid()
CREATE OR REPLACE FUNCTION auth_uid_debug()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT auth.uid();
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION auth_uid_debug() TO authenticated;