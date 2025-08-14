-- WHIF Database Schema Migration
-- This migration creates all tables, indexes, RLS policies, and realtime triggers

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ideas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  text TEXT NOT NULL,
  summary TEXT,
  published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS idea_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS statements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  calculated_impact_score NUMERIC(3,2) DEFAULT 0.50 NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS statement_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  statement_id UUID NOT NULL REFERENCES statements(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC(3,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  statement_id UUID NOT NULL REFERENCES statements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vote_type INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(statement_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_votes_statement_id ON votes(statement_id);
CREATE INDEX IF NOT EXISTS idx_statements_idea_id ON statements(idea_id);
CREATE INDEX IF NOT EXISTS idx_ideas_user_id ON ideas(user_id);
CREATE INDEX IF NOT EXISTS idx_idea_documents_idea_id ON idea_documents(idea_id);
CREATE INDEX IF NOT EXISTS idx_statement_metrics_statement_id ON statement_metrics(statement_id);
CREATE INDEX IF NOT EXISTS idx_statement_metrics_metric_name ON statement_metrics(metric_name);

-- Add constraints
ALTER TABLE ideas ADD CONSTRAINT ideas_text_length CHECK (char_length(text) <= 64000);
ALTER TABLE statement_metrics ADD CONSTRAINT metric_value_bounds CHECK (metric_value >= -1 AND metric_value <= 1);
ALTER TABLE votes ADD CONSTRAINT vote_type_values CHECK (vote_type IN (1, -1));

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE idea_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE statement_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for ideas table
CREATE POLICY "Users can view published ideas or own ideas" ON ideas
  FOR SELECT USING (
    published = true OR user_id = auth.uid() OR 
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Users can create ideas" ON ideas
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own ideas, admins can update any" ON ideas
  FOR UPDATE USING (
    user_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Users can delete own ideas, admins can delete any" ON ideas
  FOR DELETE USING (
    user_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin'
  );

-- RLS Policies for idea_documents table
CREATE POLICY "Users can view documents for accessible ideas" ON idea_documents
  FOR SELECT USING (
    idea_id IN (
      SELECT id FROM ideas 
      WHERE published = true OR user_id = auth.uid() OR 
      auth.jwt() ->> 'role' = 'admin'
    )
  );

CREATE POLICY "Users can upload to own ideas" ON idea_documents
  FOR INSERT WITH CHECK (
    idea_id IN (
      SELECT id FROM ideas WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for statements table
CREATE POLICY "Users can view statements for accessible ideas" ON statements
  FOR SELECT USING (
    idea_id IN (
      SELECT id FROM ideas 
      WHERE published = true OR user_id = auth.uid() OR 
      auth.jwt() ->> 'role' = 'admin'
    )
  );

-- Only system can manage statements (via service role)
CREATE POLICY "Only system can manage statements" ON statements
  FOR ALL USING (false);

-- RLS Policies for statement_metrics table
CREATE POLICY "Users can view metrics for accessible statements" ON statement_metrics
  FOR SELECT USING (
    statement_id IN (
      SELECT s.id FROM statements s
      JOIN ideas i ON s.idea_id = i.id
      WHERE i.published = true OR i.user_id = auth.uid()
    )
  );

-- Only system can manage metrics (via service role)
CREATE POLICY "Only system can manage metrics" ON statement_metrics
  FOR ALL USING (false);

-- RLS Policies for votes table
CREATE POLICY "Users can view vote aggregations" ON votes
  FOR SELECT USING (false); -- Prevent direct access, use views/functions

CREATE POLICY "Users can vote on accessible statements" ON votes
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    statement_id IN (
      SELECT s.id FROM statements s
      JOIN ideas i ON s.idea_id = i.id
      WHERE i.published = true OR i.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own votes" ON votes
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own votes" ON votes
  FOR DELETE USING (user_id = auth.uid());

-- Create function to update calculated impact score
CREATE OR REPLACE FUNCTION update_statement_impact_score()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE statements
  SET calculated_impact_score = (
    COALESCE((SELECT SUM(CASE WHEN vote_type = 1 THEN 1 ELSE 0 END) FROM votes WHERE statement_id = COALESCE(NEW.statement_id, OLD.statement_id)), 0) + 0.5
  ) / (
    COALESCE((SELECT COUNT(*) FROM votes WHERE statement_id = COALESCE(NEW.statement_id, OLD.statement_id)), 0) + 1
  ),
  updated_at = NOW()
  WHERE id = COALESCE(NEW.statement_id, OLD.statement_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update impact scores when votes change
DROP TRIGGER IF EXISTS update_statement_score_trigger ON votes;
CREATE TRIGGER update_statement_score_trigger
  AFTER INSERT OR UPDATE OR DELETE ON votes
  FOR EACH ROW
  EXECUTE FUNCTION update_statement_impact_score();

-- Enable realtime for votes table
ALTER TABLE votes REPLICA IDENTITY FULL;

-- Add to realtime publication (this will be done when Supabase starts)
-- ALTER PUBLICATION supabase_realtime ADD TABLE votes;

-- Create view for vote aggregations (safe for public access)
CREATE OR REPLACE VIEW vote_aggregations AS
SELECT 
  statement_id,
  COUNT(CASE WHEN vote_type = 1 THEN 1 END) as upvotes,
  COUNT(CASE WHEN vote_type = -1 THEN 1 END) as downvotes,
  COUNT(*) as total_votes
FROM votes
GROUP BY statement_id;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT SELECT ON vote_aggregations TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON ideas TO authenticated;
GRANT INSERT, UPDATE, DELETE ON idea_documents TO authenticated;
GRANT INSERT, UPDATE, DELETE ON votes TO authenticated;

-- Function to handle new user sign-ups and insert them into the public.users table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to activate the handle_new_user function on new auth.users inserts
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
