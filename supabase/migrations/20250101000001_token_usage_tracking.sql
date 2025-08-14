-- Add token usage tracking table
CREATE TABLE IF NOT EXISTS token_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  analysis_id UUID NOT NULL,
  model_name TEXT NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  cost NUMERIC(10, 6) NOT NULL, -- Cost in USD
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success BOOLEAN NOT NULL DEFAULT TRUE,
  error_message TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_token_usage_user_id ON token_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_analysis_id ON token_usage(analysis_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_model_name ON token_usage(model_name);
CREATE INDEX IF NOT EXISTS idx_token_usage_timestamp ON token_usage(timestamp);

-- Enable Row Level Security
ALTER TABLE token_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for token_usage table
CREATE POLICY "Users can view own token usage" ON token_usage
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Only system can insert token usage" ON token_usage
  FOR INSERT WITH CHECK (false); -- Only system/service role can insert

CREATE POLICY "Only system can update token usage" ON token_usage
  FOR UPDATE USING (false); -- Only system/service role can update

CREATE POLICY "Only system can delete token usage" ON token_usage
  FOR DELETE USING (false); -- Only system/service role can delete

-- Grant permissions
GRANT INSERT, UPDATE, DELETE ON token_usage TO service_role;