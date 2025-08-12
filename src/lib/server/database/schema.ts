import { pgTable, uuid, text, timestamp, boolean, integer, numeric, pgEnum, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const voteTypeEnum = pgEnum('vote_type', ['1', '-1']);

// Tables
export const ideas = pgTable('ideas', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  text: text('text').notNull().check('length(text) <= 64000'),
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

export const statements = pgTable('statements', {
  id: uuid('id').primaryKey().defaultRandom(),
  ideaId: uuid('idea_id').notNull().references(() => ideas.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  calculatedImpactScore: numeric('calculated_impact_score', { precision: 3, scale: 2 }).default('0.50').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const statementMetrics = pgTable('statement_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  statementId: uuid('statement_id').notNull().references(() => statements.id, { onDelete: 'cascade' }),
  metricName: text('metric_name').notNull(),
  metricValue: numeric('metric_value', { precision: 3, scale: 2 }).notNull().check('metric_value >= -1 AND metric_value <= 1'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const votes = pgTable('votes', {
  id: uuid('id').primaryKey().defaultRandom(),
  statementId: uuid('statement_id').notNull().references(() => statements.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  voteType: integer('vote_type').notNull().check('vote_type IN (1, -1)'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  uniqueVote: unique().on(table.statementId, table.userId)
}));

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
  statements: many(statements),
}));

export const ideaDocumentsRelations = relations(ideaDocuments, ({ one }) => ({
  idea: one(ideas, {
    fields: [ideaDocuments.ideaId],
    references: [ideas.id],
  }),
}));

export const statementsRelations = relations(statements, ({ one, many }) => ({
  idea: one(ideas, {
    fields: [statements.ideaId],
    references: [ideas.id],
  }),
  metrics: many(statementMetrics),
  votes: many(votes),
}));

export const statementMetricsRelations = relations(statementMetrics, ({ one }) => ({
  statement: one(statements, {
    fields: [statementMetrics.statementId],
    references: [statements.id],
  }),
}));

export const votesRelations = relations(votes, ({ one }) => ({
  statement: one(statements, {
    fields: [votes.statementId],
    references: [statements.id],
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
export type Statement = typeof statements.$inferSelect;
export type NewStatement = typeof statements.$inferInsert;
export type StatementMetric = typeof statementMetrics.$inferSelect;
export type NewStatementMetric = typeof statementMetrics.$inferInsert;
export type Vote = typeof votes.$inferSelect;
export type NewVote = typeof votes.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
