import type { IBalanceTransactionRepository } from '../interfaces';
import type { BalanceTransaction, NewBalanceTransaction } from '../schema';
import { db } from '../connection';
import { balanceTransactions } from '../schema';
import { eq, gte, lte, desc, and } from 'drizzle-orm';

export class BalanceTransactionRepository implements IBalanceTransactionRepository {
	async create(data: NewBalanceTransaction): Promise<BalanceTransaction> {
		const result = await db.insert(balanceTransactions).values({
			userId: data.userId,
			amount: data.amount,
			balanceBefore: data.balanceBefore,
			balanceAfter: data.balanceAfter,
			transactionType: data.transactionType,
			description: data.description,
			referenceId: data.referenceId
		}).returning();

		if (result.length === 0) {
			throw new Error('Failed to create balance transaction: No data returned');
		}
		return result[0];
	}

	async getById(id: string): Promise<BalanceTransaction | null> {
		const result = await db.select().from(balanceTransactions).where(eq(balanceTransactions.id, id)).limit(1);
		return result.length > 0 ? result[0] : null;
	}

	async update(id: string, data: Partial<NewBalanceTransaction>): Promise<BalanceTransaction> {
		const result = await db
			.update(balanceTransactions)
			.set(data)
			.where(eq(balanceTransactions.id, id))
			.returning();

		if (result.length === 0) {
			throw new Error('Failed to update balance transaction: Transaction not found');
		}
		return result[0];
	}

	async delete(id: string): Promise<void> {
		await db.delete(balanceTransactions).where(eq(balanceTransactions.id, id));
	}

	async getByUserId(userId: string): Promise<BalanceTransaction[]> {
		return await db
			.select()
			.from(balanceTransactions)
			.where(eq(balanceTransactions.userId, userId))
			.orderBy(desc(balanceTransactions.createdAt));
	}

	async getByUserIdAndDateRange(userId: string, startDate: Date, endDate: Date): Promise<BalanceTransaction[]> {
		return await db
			.select()
			.from(balanceTransactions)
			.where(and(
				eq(balanceTransactions.userId, userId),
				gte(balanceTransactions.createdAt, startDate),
				lte(balanceTransactions.createdAt, endDate)
			))
			.orderBy(desc(balanceTransactions.createdAt));
	}
}