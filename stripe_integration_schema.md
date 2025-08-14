# Stripe Integration Database Schema Design

## 1. Payment Transactions Table

This table will track all payment transactions processed through Stripe.

```sql
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT NOT NULL UNIQUE,
  amount NUMERIC(12, 6) NOT NULL, -- Amount in USD
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL, -- 'pending', 'succeeded', 'failed', 'canceled'
  credit_amount NUMERIC(12, 6) NOT NULL, -- Amount of credits purchased
  description TEXT,
  stripe_customer_id TEXT,
  stripe_payment_method_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_stripe_payment_intent_id ON payment_transactions(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON payment_transactions(created_at);
```

## 2. Credit Packages Table

This table will define the available credit packages for purchase.

```sql
CREATE TABLE IF NOT EXISTS credit_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(12, 6) NOT NULL, -- Dollar amount
  credit_amount NUMERIC(12, 6) NOT NULL, -- Credit amount
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default credit packages
INSERT INTO credit_packages (name, description, amount, credit_amount, sort_order) VALUES
  ('Small Package', 'Perfect for light usage', 5.00, 5.00, 1),
  ('Medium Package', 'Great for regular usage', 15.00, 15.00, 2),
  ('Large Package', 'Best value for heavy usage', 30.00, 30.00, 3);
```

## 3. Integration with Existing Tables

The existing `user_balances` and `balance_transactions` tables will be used to track credit balances and transactions.

### user_balances table (already exists)
```sql
-- This table already exists from user_balance_tracking.sql
CREATE TABLE IF NOT EXISTS user_balances (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance NUMERIC(12, 6) NOT NULL DEFAULT 0.000000, -- Balance in USD
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### balance_transactions table (already exists)
```sql
-- This table already exists from user_balance_tracking.sql
CREATE TABLE IF NOT EXISTS balance_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(12, 6) NOT NULL, -- Positive for credits, negative for debits
  balance_before NUMERIC(12, 6) NOT NULL,
  balance_after NUMERIC(12, 6) NOT NULL,
  transaction_type TEXT NOT NULL, -- 'credit', 'debit', 'adjustment'
  description TEXT,
  reference_id UUID, -- Reference to token_usage.id or payment_transactions.id
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## 4. Drizzle ORM Schema

```typescript
// In src/lib/server/database/schema.ts
export const paymentTransactions = pgTable('payment_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  stripePaymentIntentId: text('stripe_payment_intent_id').notNull().unique(),
  amount: numeric('amount', { precision: 12, scale: 6 }).notNull(),
  currency: text('currency').notNull().default('usd'),
  status: text('status').notNull(), // 'pending', 'succeeded', 'failed', 'canceled'
  creditAmount: numeric('credit_amount', { precision: 12, scale: 6 }).notNull(),
  description: text('description'),
  stripeCustomerId: text('stripe_customer_id'),
  stripePaymentMethodId: text('stripe_payment_method_id'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const creditPackages = pgTable('credit_packages', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  amount: numeric('amount', { precision: 12, scale: 6 }).notNull(),
  creditAmount: numeric('credit_amount', { precision: 12, scale: 6 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

// Types
export type PaymentTransaction = typeof paymentTransactions.$inferSelect;
export type NewPaymentTransaction = typeof paymentTransactions.$inferInsert;
export type CreditPackage = typeof creditPackages.$inferSelect;
export type NewCreditPackage = typeof creditPackages.$inferInsert;
```

## 5. Repository Interfaces

```typescript
// In src/lib/server/database/interfaces.ts
export interface IPaymentTransactionRepository extends IBaseRepository<PaymentTransaction, NewPaymentTransaction> {
  getByUserId(userId: string): Promise<PaymentTransaction[]>;
  getByStripePaymentIntentId(stripePaymentIntentId: string): Promise<PaymentTransaction | null>;
  updateStatus(id: string, status: string): Promise<PaymentTransaction>;
}

export interface ICreditPackageRepository extends IBaseRepository<CreditPackage, NewCreditPackage> {
  getActivePackages(): Promise<CreditPackage[]>;
  getByAmount(amount: number): Promise<CreditPackage | null>;
}
```

## 6. Row Level Security (RLS) Policies

```sql
-- Enable Row Level Security
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_packages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment_transactions table
CREATE POLICY "Users can view own payment transactions" ON payment_transactions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Only system can insert payment transactions" ON payment_transactions
  FOR INSERT WITH CHECK (false); -- Only system/service role can insert

CREATE POLICY "Only system can update payment transactions" ON payment_transactions
  FOR UPDATE USING (false); -- Only system/service role can update

-- RLS Policies for credit_packages table
CREATE POLICY "Everyone can view active credit packages" ON credit_packages
  FOR SELECT USING (is_active = true);

CREATE POLICY "Only admins can insert credit packages" ON credit_packages
  FOR INSERT WITH CHECK (false); -- Only admin/service role can insert

CREATE POLICY "Only admins can update credit packages" ON credit_packages
  FOR UPDATE USING (false); -- Only admin/service role can update

-- Grant permissions
GRANT INSERT, UPDATE ON payment_transactions TO service_role;
GRANT SELECT ON credit_packages TO anon, authenticated;