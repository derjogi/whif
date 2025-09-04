import { IdeaRepository } from './ideaRepository';
import { CategoryRepository } from './categoryRepository';
import { DownstreamImpactRepository } from './downstreamImpactRepository';
import { VoteRepository } from './voteRepository';
import { TokenUsageRepository } from './tokenUsageRepository';
import { UserBalanceRepository } from './userBalanceRepository';
import { BalanceTransactionRepository } from './balanceTransactionRepository';

// Export repository classes
export { IdeaRepository as DrizzleIdeaRepository } from './ideaRepository';
export { CategoryRepository as DrizzleCategoryRepository } from './categoryRepository';
export { DownstreamImpactRepository as DrizzleDownstreamImpactRepository } from './downstreamImpactRepository';
export { VoteRepository as DrizzleVoteRepository } from './voteRepository';
export { TokenUsageRepository as DrizzleTokenUsageRepository } from './tokenUsageRepository';
export { UserBalanceRepository as DrizzleUserBalanceRepository } from './userBalanceRepository';
export { BalanceTransactionRepository as DrizzleBalanceTransactionRepository } from './balanceTransactionRepository';

// Factory function to create repositories
export function createRepositories() {
 	return {
  		ideas: new IdeaRepository(),
  		categories: new CategoryRepository(),
  		downstreamImpacts: new DownstreamImpactRepository(),
  		votes: new VoteRepository(),
  		tokenUsage: new TokenUsageRepository(),
  		userBalances: new UserBalanceRepository(),
  		balanceTransactions: new BalanceTransactionRepository(),
  	};
}

// Export types for convenience
export type Repositories = ReturnType<typeof createRepositories>;
