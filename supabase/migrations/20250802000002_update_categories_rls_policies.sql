-- Update RLS policies for categories table
-- Allow public read access while restricting writes to service role

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view categories for their ideas" ON categories;
DROP POLICY IF EXISTS "Users can insert categories for their ideas" ON categories;
DROP POLICY IF EXISTS "Users can update categories for their ideas" ON categories;

-- Create new policies
-- Allow anyone to view categories (public read access)
CREATE POLICY "Anyone can view categories" ON categories
    FOR SELECT USING (true);

-- Restrict INSERT to service role only (no client-side inserts)
CREATE POLICY "Service role can insert categories" ON categories
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Restrict UPDATE to service role only (no client-side updates)
CREATE POLICY "Service role can update categories" ON categories
    FOR UPDATE USING (auth.role() = 'service_role');

-- Restrict DELETE to service role only (no client-side deletes)
CREATE POLICY "Service role can delete categories" ON categories
    FOR DELETE USING (auth.role() = 'service_role');

-- Also update downstream_impacts policies for consistency
DROP POLICY IF EXISTS "Users can view downstream impacts for their ideas" ON downstream_impacts;
DROP POLICY IF EXISTS "Users can insert downstream impacts for their ideas" ON downstream_impacts;
DROP POLICY IF EXISTS "Users can update downstream impacts for their ideas" ON downstream_impacts;

-- Allow anyone to view downstream impacts
CREATE POLICY "Anyone can view downstream impacts" ON downstream_impacts
    FOR SELECT USING (true);

-- Restrict INSERT to service role only
CREATE POLICY "Service role can insert downstream impacts" ON downstream_impacts
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Restrict UPDATE to service role only
CREATE POLICY "Service role can update downstream impacts" ON downstream_impacts
    FOR UPDATE USING (auth.role() = 'service_role');

-- Restrict DELETE to service role only
CREATE POLICY "Service role can delete downstream impacts" ON downstream_impacts
    FOR DELETE USING (auth.role() = 'service_role');