import { DrizzleIdeaRepository } from './ideaRepository';
import { DrizzleCategoryRepository } from './categoryRepository';
import { DrizzleDownstreamImpactRepository } from './downstreamImpactRepository';
import { DrizzleVoteRepository } from './voteRepository';
import { DrizzleTokenUsageRepository } from './tokenUsageRepository';
import { DrizzleUserBalanceRepository } from './userBalanceRepository';
import { DrizzleBalanceTransactionRepository } from './balanceTransactionRepository';

// Export repository classes
export { DrizzleIdeaRepository } from './ideaRepository';
export { DrizzleCategoryRepository } from './categoryRepository';
export { DrizzleDownstreamImpactRepository } from './downstreamImpactRepository';
export { DrizzleVoteRepository } from './voteRepository';
export { DrizzleTokenUsageRepository } from './tokenUsageRepository';
export { DrizzleUserBalanceRepository } from './userBalanceRepository';
export { DrizzleBalanceTransactionRepository } from './balanceTransactionRepository';

// Factory function to create repositories
export function createRepositories() {
 	return {
  		ideas: new DrizzleIdeaRepository(),
  		categories: new DrizzleCategoryRepository(),
  		downstreamImpacts: new DrizzleDownstreamImpactRepository(),
  		votes: new DrizzleVoteRepository(),
  		tokenUsage: new DrizzleTokenUsageRepository(),
  		userBalances: new DrizzleUserBalanceRepository(),
  		balanceTransactions: new DrizzleBalanceTransactionRepository(),
  	};
}

// Export types for convenience
export type Repositories = ReturnType<typeof createRepositories>;
