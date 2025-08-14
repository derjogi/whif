# User Balance and Usage Tracking Database Integration Specification

## 1. Overview

This document outlines the technical specification for integrating database storage for user balances and usage tracking, replacing the current in-memory storage solution with a persistent database solution using the existing Supabase infrastructure.

## 2. Current Implementation Analysis

The current implementation uses an in-memory Map to store user balances in the `BalanceService`:

```typescript
const userBalances = new Map<string, UserBalance>();
```

This approach has several limitations:
- Data is lost when the server restarts
- No persistence across multiple server instances
- No ability to track historical balance changes
- No support for querying or reporting on user balances

## 3. Database Schema Design

### 3.1 User Balances Table

We'll add a new `user_balances` table to track user account balances:

```sql
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
```

### 3.2 Balance Transactions Table

To track all balance changes, we'll add a `balance_transactions` table:

```sql
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
```

### 3.3 Existing Token Usage Table

The `token_usage` table already exists and will be used for tracking LLM usage:

```sql
-- Already exists from previous migration
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
```

## 4. Integration Approach with Supabase Infrastructure

### 4.1 Database Schema Updates

We'll add the new tables to the Drizzle schema:

```typescript
// In src/lib/server/database/schema.ts
export const userBalances = pgTable('user_balances', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  balance: numeric('balance', { precision: 12, scale: 6 }).notNull().default('0'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const balanceTransactions = pgTable('balance_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  amount: numeric('amount', { precision: 12, scale: 6 }).notNull(),
  balanceBefore: numeric('balance_before', { precision: 12, scale: 6 }).notNull(),
  balanceAfter: numeric('balance_after', { precision: 12, scale: 6 }).notNull(),
  transactionType: text('transaction_type').notNull(), // 'credit', 'debit', 'adjustment'
  description: text('description'),
  referenceId: uuid('reference_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});
```

### 4.2 Repository Implementation

We'll create new repositories for the balance tables following the existing pattern:

```typescript
// src/lib/server/database/interfaces.ts
export interface IUserBalanceRepository extends IBaseRepository<UserBalance, NewUserBalance> {
  getByUserId(userId: string): Promise<UserBalance | null>;
  updateBalance(userId: string, newBalance: number): Promise<UserBalance>;
  createWithInitialBalance(userId: string, initialBalance: number): Promise<UserBalance>;
}

export interface IBalanceTransactionRepository extends IBaseRepository<BalanceTransaction, NewBalanceTransaction> {
  getByUserId(userId: string): Promise<BalanceTransaction[]>;
  getByUserIdAndDateRange(userId: string, startDate: Date, endDate: Date): Promise<BalanceTransaction[]>;
}
```

## 5. Updated BalanceService Design

### 5.1 Core Methods

The updated `BalanceService` will use database repositories instead of in-memory storage:

```typescript
export class BalanceService {
  constructor(
    private userBalanceRepository: IUserBalanceRepository,
    private balanceTransactionRepository: IBalanceTransactionRepository,
    private unitOfWork: IUnitOfWork
  ) {}

  // Get user balance
  async getUserBalance(userId: string): Promise<UserBalance> {
    let balance = await this.userBalanceRepository.getByUserId(userId);
    
    if (!balance) {
      // Create new user with $10 free credit
      balance = await this.userBalanceRepository.createWithInitialBalance(userId, 10.00);
    }
    
    return balance;
  }
  
  // Deduct cost from user balance with transactional integrity
  async deductCost(userId: string, cost: number, referenceId?: string): Promise<boolean> {
    // Use transaction to ensure atomicity
    await this.unitOfWork.beginTransaction();
    
    try {
      const balance = await this.getUserBalance(userId);
      
      if (balance.balance < cost) {
        await this.unitOfWork.rollback();
        return false; // Insufficient balance
      }
      
      const newBalance = balance.balance - cost;
      
      // Update user balance
      await this.userBalanceRepository.updateBalance(userId, newBalance);
      
      // Record transaction
      await this.balanceTransactionRepository.create({
        userId,
        amount: -cost,
        balanceBefore: balance.balance,
        balanceAfter: newBalance,
        transactionType: 'debit',
        description: `LLM usage cost`,
        referenceId
      });
      
      await this.unitOfWork.commit();
      return true;
    } catch (error) {
      await this.unitOfWork.rollback();
      throw error;
    }
  }
  
  // Add credit to user balance (e.g., when they purchase more)
  async addCredit(userId: string, amount: number, description?: string, referenceId?: string): Promise<void> {
    // Use transaction to ensure atomicity
    await this.unitOfWork.beginTransaction();
    
    try {
      const balance = await this.getUserBalance(userId);
      const newBalance = balance.balance + amount;
      
      // Update user balance
      await this.userBalanceRepository.updateBalance(userId, newBalance);
      
      // Record transaction
      await this.balanceTransactionRepository.create({
        userId,
        amount,
        balanceBefore: balance.balance,
        balanceAfter: newBalance,
        transactionType: 'credit',
        description: description || 'Credit added to account',
        referenceId
      });
      
      await this.unitOfWork.commit();
    } catch (error) {
      await this.unitOfWork.rollback();
      throw error;
    }
  }
  
  // Check if user has sufficient balance
  async hasSufficientBalance(userId: string, estimatedCost: number): Promise<boolean> {
    const balance = await this.getUserBalance(userId);
    return balance.balance >= estimatedCost;
  }
}
```

## 6. Data Consistency and Transactional Integrity

### 6.1 Transactional Approach

All balance updates will use database transactions to ensure atomicity:

1. Begin transaction
2. Check current balance
3. Verify sufficient funds for debits
4. Update balance
5. Record transaction
6. Commit transaction or rollback on error

### 6.2 Error Handling

The system will implement comprehensive error handling:
- Database connection errors
- Constraint violations
- Insufficient balance errors
- Concurrent update conflicts

## 7. Concurrency Handling Strategy

### 7.1 Database-Level Locking

We'll use database-level locking to handle concurrent updates:

```typescript
// In the repository implementation
async updateBalanceWithLock(userId: string, newBalance: number): Promise<UserBalance> {
  // Use SELECT FOR UPDATE to lock the row during the transaction
  const { data: balance, error } = await this.supabase
    .from('user_balances')
    .select('*')
    .eq('user_id', userId)
    .single()
    .then(async (result) => {
      if (result.error) throw new Error(`Failed to get user balance: ${result.error.message}`);
      
      const { data: updatedBalance, error: updateError } = await this.supabase
        .from('user_balances')
        .update({ 
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();
      
      if (updateError) throw new Error(`Failed to update user balance: ${updateError.message}`);
      return updatedBalance;
    });
  
  return balance;
}
```

### 7.2 Retry Logic

For transient errors, we'll implement retry logic with exponential backoff:

```typescript
async function withRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        // Wait with exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 100));
      }
    }
  }
  
  throw lastError!;
}
```

## 8. Querying and Reporting Capabilities

### 8.1 Balance Queries

- Get current balance for a user
- Get balance history/transactions for a user
- Get balance history within a date range

### 8.2 Usage Queries

- Get total usage cost for a user
- Get usage by model
- Get usage by time period
- Get top users by usage

### 8.3 Reporting Views

We'll create database views for common reporting queries:

```sql
-- Monthly usage summary by user
CREATE OR REPLACE VIEW monthly_usage_summary AS
SELECT 
  user_id,
  DATE_TRUNC('month', timestamp) as month,
  SUM(cost) as total_cost,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens,
  COUNT(*) as total_calls
FROM token_usage
WHERE success = true
GROUP BY user_id, DATE_TRUNC('month', timestamp);

-- User balance summary
CREATE OR REPLACE VIEW user_balance_summary AS
SELECT 
  ub.user_id,
  u.email,
  ub.balance,
  COALESCE(SUM(CASE WHEN bt.amount > 0 THEN bt.amount ELSE 0 END), 0) as total_credits,
  COALESCE(SUM(CASE WHEN bt.amount < 0 THEN ABS(bt.amount) ELSE 0 END), 0) as total_debits
FROM user_balances ub
JOIN users u ON ub.user_id = u.id
LEFT JOIN balance_transactions bt ON ub.user_id = bt.user_id
GROUP BY ub.user_id, u.email, ub.balance;
```

## 9. Migration Strategy

### 9.1 Database Migration

We'll create a new Supabase migration file:

```sql
-- supabase/migrations/20250101000002_user_balance_tracking.sql
-- Add user balances and transactions tables
-- (SQL schema as defined in section 3)
```

### 9.2 Data Migration

Since the current implementation only uses in-memory storage with no persistent data, we don't need to migrate existing data. However, we'll need to:

1. Deploy the new database schema
2. Update the application code to use the new database-backed service
3. Ensure proper testing before going live

### 9.3 Deployment Approach

1. Deploy database schema changes
2. Deploy updated application code with feature flag
3. Test with a subset of users
4. Gradually roll out to all users
5. Monitor for issues
6. Remove in-memory implementation

## 10. Testing Strategy

### 10.1 Unit Tests

- Test balance retrieval
- Test balance updates (credits and debits)
- Test insufficient balance scenarios
- Test transaction recording

### 10.2 Integration Tests

- Test with actual database operations
- Test concurrent access scenarios
- Test error handling and recovery

### 10.3 Load Testing

- Test with high concurrent load
- Test database performance with large datasets
- Test transaction throughput

## 11. Security Considerations

### 11.1 Row Level Security

All new tables will implement Row Level Security (RLS) policies:
- Users can only view their own data
- Only system/service roles can modify data
- Proper authentication and authorization checks

### 11.2 Data Validation

- Validate all inputs
- Prevent negative balances (except in special cases)
- Ensure transactional integrity

## 12. Performance Considerations

### 12.1 Indexing

- Proper indexing on user_id for all tables
- Indexes on timestamp fields for time-based queries
- Indexes on frequently queried fields

### 12.2 Caching

- Consider caching frequently accessed balances
- Implement cache invalidation strategies
- Use appropriate cache TTL values

## 13. Monitoring and Observability

### 13.1 Metrics

- Track balance update operations
- Monitor for errors and failures
- Track transaction volumes

### 13.2 Logging

- Log all balance changes
- Log errors and exceptions
- Log performance metrics

## 14. Future Enhancements

### 14.1 Advanced Features

- Balance expiration policies
- Tiered pricing models
- Automated balance top-ups
- Detailed usage analytics

### 14.2 Scalability

- Horizontal scaling strategies
- Database sharding if needed
- Read replicas for reporting queries