import type { Idea, NewIdea, IdeaDocument, NewIdeaDocument, Category, NewCategory, DownstreamImpact, NewDownstreamImpact, StatementMetric, NewStatementMetric, Vote, NewVote, User, NewUser, TokenUsage, NewTokenUsage, UserBalance, NewUserBalance, BalanceTransaction, NewBalanceTransaction } from './schema';

/**
 * We're using a database interface so that in the future we could easily 
 * have different adapters and switch to e.g. nosql or others.
 */

// Base repository interface
export interface IBaseRepository<T, TNew> {
	create(data: TNew): Promise<T>;
	getById(id: string): Promise<T | null>;
	update(id: string, data: Partial<TNew>): Promise<T>;
	delete(id: string): Promise<void>;
}

// Idea repository interface
export interface IIdeaRepository extends IBaseRepository<Idea, NewIdea> {
	getByUserId(userId: string): Promise<Idea[]>;
	getPublished(): Promise<Idea[]>;
	publish(id: string, userId: string): Promise<Idea>;
	unpublish(id: string, userId: string): Promise<Idea>;
}

// Category repository interface
export interface ICategoryRepository extends IBaseRepository<Category, NewCategory> {
 	getByIdeaId(ideaId: string): Promise<Category[]>;
 	getWithDownstreamImpacts(ideaId: string): Promise<(Category & { downstreamImpacts: DownstreamImpact[] })[]>;
}

// Downstream impact repository interface
export interface IDownstreamImpactRepository extends IBaseRepository<DownstreamImpact, NewDownstreamImpact> {
 	getByCategoryId(categoryId: string): Promise<DownstreamImpact[]>;
 	getWithMetrics(categoryId: string): Promise<(DownstreamImpact & { metrics: StatementMetric[] })[]>;
 	getWithVotes(categoryId: string): Promise<(DownstreamImpact & { votes: Vote[] })[]>;
 	createBatchWithMetrics(impactsWithMetrics: Array<{
    impact: NewDownstreamImpact;
    metrics: NewStatementMetric[];
  }>): Promise<(DownstreamImpact & { metrics: StatementMetric[] })[]>;
}


// Vote repository interface - extends base but overrides delete method
export interface IVoteRepository extends Omit<IBaseRepository<Vote, NewVote>, 'delete'> {
 	upsert(voteData: { downstreamImpactId: string; userId: string; voteType: number }): Promise<Vote>;
 	getByDownstreamImpactId(downstreamImpactId: string): Promise<Vote[]>;
 	getUserVote(userId: string, downstreamImpactId: string): Promise<Vote | null>;
 	getVoteCounts(downstreamImpactId: string): Promise<{ upvotes: number; downvotes: number }>;
 	delete(userId: string, downstreamImpactId: string): Promise<void>;
}

// Document repository interface
export interface IDocumentRepository extends IBaseRepository<IdeaDocument, NewIdeaDocument> {
	getByIdeaId(ideaId: string): Promise<IdeaDocument[]>;
	markAsProcessed(id: string): Promise<IdeaDocument>;
}

// Unit of Work interface for transactions
export interface IUnitOfWork {
 	ideas: IIdeaRepository;
 	categories: ICategoryRepository;
 	downstreamImpacts: IDownstreamImpactRepository;
 	votes: IVoteRepository;
 	documents: IDocumentRepository;
 	tokenUsage: ITokenUsageRepository;
 	userBalances: IUserBalanceRepository;
 	balanceTransactions: IBalanceTransactionRepository;

 	beginTransaction(): Promise<void>;
 	commit(): Promise<void>;
 	rollback(): Promise<void>;
}

// Token usage repository interface
export interface ITokenUsageRepository extends IBaseRepository<TokenUsage, NewTokenUsage> {
	getByUserId(userId: string): Promise<TokenUsage[]>;
	getByAnalysisId(analysisId: string): Promise<TokenUsage[]>;
	getUsageSummary(analysisId: string): Promise<AnalysisUsageSummary>;
	getCostForAnalysis(analysisId: string): Promise<number>;
}

// Usage summary for an analysis
export interface AnalysisUsageSummary {
	analysisId: string;
	totalInputTokens: number;
	totalOutputTokens: number;
	totalCost: number;
	modelUsages: {
		modelName: string;
		inputTokens: number;
		outputTokens: number;
		cost: number;
	}[];
}

// User balance repository interface
export interface IUserBalanceRepository extends IBaseRepository<UserBalance, NewUserBalance> {
		getByUserId(userId: string): Promise<UserBalance | null>;
		updateBalance(userId: string, newBalance: number): Promise<UserBalance>;
		createWithInitialBalance(userId: string, initialBalance: number): Promise<UserBalance>;
}

// Balance transaction repository interface
export interface IBalanceTransactionRepository extends IBaseRepository<BalanceTransaction, NewBalanceTransaction> {
		getByUserId(userId: string): Promise<BalanceTransaction[]>;
		getByUserIdAndDateRange(userId: string, startDate: Date, endDate: Date): Promise<BalanceTransaction[]>;
}

// Add new types for user balances and transactions
export type { UserBalance, NewUserBalance, BalanceTransaction, NewBalanceTransaction } from './schema';
