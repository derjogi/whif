-- Add user balances and transactions tables
CREATE TABLE IF NOT EXISTS user_balances (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance NUMERIC(12, 6) NOT NULL DEFAULT 0.000000, -- Balance in USD
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_balances_user_id ON user_balances(user_id);

-- Enable Row Level Security
ALTER TABLE user_balances ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_balances table
CREATE POLICY "Users can view own balance" ON user_balances
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Only system can insert balances" ON user_balances
  FOR INSERT WITH CHECK (false); -- Only system/service role can insert

CREATE POLICY "Only system can update balances" ON user_balances
  FOR UPDATE USING (false); -- Only system/service role can update

-- Grant permissions
GRANT INSERT, UPDATE ON user_balances TO service_role;

-- Balance transactions table
CREATE TABLE IF NOT EXISTS balance_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(12, 6) NOT NULL, -- Positive for credits, negative for debits
  balance_before NUMERIC(12, 6) NOT NULL,
  balance_after NUMERIC(12, 6) NOT NULL,
  transaction_type TEXT NOT NULL, -- 'credit', 'debit', 'adjustment'
  description TEXT,
  reference_id UUID, -- Reference to token_usage.id or other related records
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_balance_transactions_user_id ON balance_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_balance_transactions_created_at ON balance_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_balance_transactions_reference_id ON balance_transactions(reference_id);

-- Enable Row Level Security
ALTER TABLE balance_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for balance_transactions table
CREATE POLICY "Users can view own transactions" ON balance_transactions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Only system can insert transactions" ON balance_transactions
  FOR INSERT WITH CHECK (false); -- Only system/service role can insert

-- Grant permissions
GRANT INSERT ON balance_transactions TO service_role;