import { pgTable, uuid, text, timestamp, boolean, integer, numeric, pgEnum, unique, check } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// Enums
export const voteTypeEnum = pgEnum('vote_type', ['1', '-1']);

// Tables
export const ideas = pgTable('ideas', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  text: text('text').notNull(),
  summary: text('summary'),
  published: boolean('published').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const ideaDocuments = pgTable('idea_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  ideaId: uuid('idea_id').notNull().references(() => ideas.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  filePath: text('file_path').notNull(),
  fileType: text('file_type').notNull(),
  fileSize: integer('file_size').notNull(),
  processed: boolean('processed').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  ideaId: uuid('idea_id').notNull().references(() => ideas.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  researchFindings: text('research_findings'),
  evaluatedScore: numeric('evaluated_score', { precision: 3, scale: 2 }).default('0.50').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const downstreamImpacts = pgTable('downstream_impacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  categoryId: uuid('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
  impactText: text('impact_text').notNull(),
  calculatedImpactScore: numeric('calculated_impact_score', { precision: 3, scale: 2 }).default('0.50').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const statementMetrics = pgTable('statement_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  downstreamImpactId: uuid('downstream_impact_id').notNull().references(() => downstreamImpacts.id, { onDelete: 'cascade' }),
  metricName: text('metric_name').notNull(),
  metricValue: numeric('metric_value', { precision: 3, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (t) => ([
  check('metric_bounds', sql`${t.metricValue} >= -1 AND ${t.metricValue} <= 1`)
]));

export const votes = pgTable('votes', {
  id: uuid('id').primaryKey().defaultRandom(),
  downstreamImpactId: uuid('downstream_impact_id').notNull().references(() => downstreamImpacts.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  voteType: integer('vote_type').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (t) => ([
  unique().on(t.downstreamImpactId, t.userId),
  check('vote_type_check', sql`${t.voteType} IN (1, -1)`)
]));

// Placeholder users table (Supabase Auth handles this, but we need it for relations)
export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: text('email'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
});

// Relations
export const ideasRelations = relations(ideas, ({ one, many }) => ({
  user: one(users, {
    fields: [ideas.userId],
    references: [users.id],
  }),
  documents: many(ideaDocuments),
  categories: many(categories),
}));

export const ideaDocumentsRelations = relations(ideaDocuments, ({ one }) => ({
  idea: one(ideas, {
    fields: [ideaDocuments.ideaId],
    references: [ideas.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  idea: one(ideas, {
    fields: [categories.ideaId],
    references: [ideas.id],
  }),
  downstreamImpacts: many(downstreamImpacts),
}));

export const downstreamImpactsRelations = relations(downstreamImpacts, ({ one, many }) => ({
  category: one(categories, {
    fields: [downstreamImpacts.categoryId],
    references: [categories.id],
  }),
  metrics: many(statementMetrics),
  votes: many(votes),
}));


export const statementMetricsRelations = relations(statementMetrics, ({ one }) => ({
  downstreamImpact: one(downstreamImpacts, {
    fields: [statementMetrics.downstreamImpactId],
    references: [downstreamImpacts.id],
  }),
}));

export const votesRelations = relations(votes, ({ one }) => ({
  downstreamImpact: one(downstreamImpacts, {
    fields: [votes.downstreamImpactId],
    references: [downstreamImpacts.id],
  }),
  user: one(users, {
    fields: [votes.userId],
    references: [users.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  ideas: many(ideas),
  votes: many(votes),
}));

// Types
export type Idea = typeof ideas.$inferSelect;
export type NewIdea = typeof ideas.$inferInsert;
export type IdeaDocument = typeof ideaDocuments.$inferSelect;
export type NewIdeaDocument = typeof ideaDocuments.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type DownstreamImpact = typeof downstreamImpacts.$inferSelect;
export type NewDownstreamImpact = typeof downstreamImpacts.$inferInsert;
export type StatementMetric = typeof statementMetrics.$inferSelect;
export type NewStatementMetric = typeof statementMetrics.$inferInsert;
export type Vote = typeof votes.$inferSelect;
export type NewVote = typeof votes.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// Token usage tracking
export const tokenUsage = pgTable('token_usage', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  analysisId: uuid('analysis_id').notNull(),
  modelName: text('model_name').notNull(),
  inputTokens: integer('input_tokens').notNull(),
  outputTokens: integer('output_tokens').notNull(),
  cost: numeric('cost', { precision: 10, scale: 6 }).notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),
  success: boolean('success').notNull().default(true),
  errorMessage: text('error_message')
});

export type TokenUsage = typeof tokenUsage.$inferSelect;
export type NewTokenUsage = typeof tokenUsage.$inferInsert;

// User balances and transactions
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

// Types for user balances and transactions
export type UserBalance = typeof userBalances.$inferSelect;
export type NewUserBalance = typeof userBalances.$inferInsert;
export type BalanceTransaction = typeof balanceTransactions.$inferSelect;
export type NewBalanceTransaction = typeof balanceTransactions.$inferInsert;
