import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseIdeaRepository } from './ideaRepository';
import { SupabaseCategoryRepository } from './categoryRepository';
import { SupabaseDownstreamImpactRepository } from './downstreamImpactRepository';
import { SupabaseVoteRepository } from './voteRepository';
import { SupabaseTokenUsageRepository } from './tokenUsageRepository';
import { SupabaseUserBalanceRepository } from './userBalanceRepository';
import { SupabaseBalanceTransactionRepository } from './balanceTransactionRepository';

// Export repository classes
export { SupabaseIdeaRepository } from './ideaRepository';
export { SupabaseCategoryRepository } from './categoryRepository';
export { SupabaseDownstreamImpactRepository } from './downstreamImpactRepository';
export { SupabaseVoteRepository } from './voteRepository';
export { SupabaseTokenUsageRepository } from './tokenUsageRepository';
export { SupabaseUserBalanceRepository } from './userBalanceRepository';
export { SupabaseBalanceTransactionRepository } from './balanceTransactionRepository';

// Factory function to create repositories
export function createRepositories(supabase: SupabaseClient) {
 	return {
 		ideas: new SupabaseIdeaRepository(supabase),
 		categories: new SupabaseCategoryRepository(supabase),
 		downstreamImpacts: new SupabaseDownstreamImpactRepository(supabase),
 		votes: new SupabaseVoteRepository(supabase),
 		tokenUsage: new SupabaseTokenUsageRepository(supabase),
 		userBalances: new SupabaseUserBalanceRepository(supabase),
 		balanceTransactions: new SupabaseBalanceTransactionRepository(supabase),
 	};
}

// Export types for convenience
export type Repositories = ReturnType<typeof createRepositories>;
