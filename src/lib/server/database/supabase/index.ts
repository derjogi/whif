import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseIdeaRepository } from './ideaRepository';
import { SupabaseVoteRepository } from './voteRepository';
import { SupabaseTokenUsageRepository } from './tokenUsageRepository';
import { SupabaseUserBalanceRepository } from './userBalanceRepository';
import { SupabaseBalanceTransactionRepository } from './balanceTransactionRepository';

// Export repository classes
export { SupabaseIdeaRepository } from './ideaRepository';
export { SupabaseVoteRepository } from './voteRepository';
export { SupabaseTokenUsageRepository } from './tokenUsageRepository';
export { SupabaseUserBalanceRepository } from './userBalanceRepository';
export { SupabaseBalanceTransactionRepository } from './balanceTransactionRepository';

// Factory function to create repositories
export function createRepositories(supabase: SupabaseClient) {
	return {
		ideas: new SupabaseIdeaRepository(supabase),
		votes: new SupabaseVoteRepository(supabase),
		// TODO: Add other repositories as they're implemented
		// statements: new SupabaseStatementRepository(supabase),
		// documents: new SupabaseDocumentRepository(supabase),
		tokenUsage: new SupabaseTokenUsageRepository(supabase),
		userBalances: new SupabaseUserBalanceRepository(supabase),
		balanceTransactions: new SupabaseBalanceTransactionRepository(supabase),
	};
}

// Export types for convenience
export type Repositories = ReturnType<typeof createRepositories>;
