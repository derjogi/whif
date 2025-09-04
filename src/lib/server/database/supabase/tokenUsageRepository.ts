import type { ITokenUsageRepository, AnalysisUsageSummary } from '../interfaces';
import type { TokenUsage, NewTokenUsage } from '../schema';
import { db } from '../connection';
import { tokenUsage } from '../schema';
import { eq, desc, asc, sql } from 'drizzle-orm';

export class DrizzleTokenUsageRepository implements ITokenUsageRepository {
	async create(data: NewTokenUsage): Promise<TokenUsage> {
		const result = await db.insert(tokenUsage).values({
			userId: data.userId,
			analysisId: data.analysisId,
			modelName: data.modelName,
			inputTokens: data.inputTokens,
			outputTokens: data.outputTokens,
			cost: data.cost,
			success: data.success,
			errorMessage: data.errorMessage
		}).returning();

		if (result.length === 0) {
			throw new Error('Failed to create token usage record: No data returned');
		}
		return result[0];
	}

	async getById(id: string): Promise<TokenUsage | null> {
		const result = await db.select().from(tokenUsage).where(eq(tokenUsage.id, id)).limit(1);
		return result.length > 0 ? result[0] : null;
	}

	async update(id: string, data: Partial<NewTokenUsage>): Promise<TokenUsage> {
		const result = await db
			.update(tokenUsage)
			.set(data)
			.where(eq(tokenUsage.id, id))
			.returning();

		if (result.length === 0) {
			throw new Error('Failed to update token usage: Record not found');
		}
		return result[0];
	}

	async delete(id: string): Promise<void> {
		await db.delete(tokenUsage).where(eq(tokenUsage.id, id));
	}

	async getByUserId(userId: string): Promise<TokenUsage[]> {
		return await db
			.select()
			.from(tokenUsage)
			.where(eq(tokenUsage.userId, userId))
			.orderBy(desc(tokenUsage.timestamp));
	}

	async getByAnalysisId(analysisId: string): Promise<TokenUsage[]> {
		return await db
			.select()
			.from(tokenUsage)
			.where(eq(tokenUsage.analysisId, analysisId))
			.orderBy(asc(tokenUsage.timestamp));
	}

	async getUsageSummary(analysisId: string): Promise<AnalysisUsageSummary> {
		// Get aggregated data using SQL functions
		const result = await db
			.select({
				totalInputTokens: sql<number>`sum(${tokenUsage.inputTokens})`,
				totalOutputTokens: sql<number>`sum(${tokenUsage.outputTokens})`,
				totalCost: sql<number>`sum(${tokenUsage.cost})`,
				modelUsages: sql`json_agg(json_build_object(
					'modelName', ${tokenUsage.modelName},
					'inputTokens', ${tokenUsage.inputTokens},
					'outputTokens', ${tokenUsage.outputTokens},
					'cost', ${tokenUsage.cost}
				))`
			})
			.from(tokenUsage)
			.where(eq(tokenUsage.analysisId, analysisId));

		if (result.length === 0) {
			return {
				analysisId,
				totalInputTokens: 0,
				totalOutputTokens: 0,
				totalCost: 0,
				modelUsages: []
			};
		}

		const row = result[0];

		// Group model usages
		const modelUsagesMap = new Map<string, { inputTokens: number; outputTokens: number; cost: number }>();
		const modelUsagesData = row.modelUsages as any[];

		if (modelUsagesData) {
			for (const usage of modelUsagesData) {
				const modelName = usage.modelName;
				if (!modelUsagesMap.has(modelName)) {
					modelUsagesMap.set(modelName, {
						inputTokens: 0,
						outputTokens: 0,
						cost: 0
					});
				}
				const existing = modelUsagesMap.get(modelName)!;
				existing.inputTokens += usage.inputTokens;
				existing.outputTokens += usage.outputTokens;
				existing.cost += parseFloat(usage.cost);
			}
		}

		const modelUsagesArray = Array.from(modelUsagesMap.entries()).map(([modelName, usage]) => ({
			modelName,
			inputTokens: usage.inputTokens,
			outputTokens: usage.outputTokens,
			cost: usage.cost
		}));

		return {
			analysisId,
			totalInputTokens: row.totalInputTokens || 0,
			totalOutputTokens: row.totalOutputTokens || 0,
			totalCost: parseFloat(row.totalCost?.toString() || '0'),
			modelUsages: modelUsagesArray
		};
	}

	async getCostForAnalysis(analysisId: string): Promise<number> {
		const result = await db
			.select({
				totalCost: sql<number>`sum(${tokenUsage.cost})`
			})
			.from(tokenUsage)
			.where(eq(tokenUsage.analysisId, analysisId));

		return parseFloat(result[0]?.totalCost?.toString() || '0');
	}
}