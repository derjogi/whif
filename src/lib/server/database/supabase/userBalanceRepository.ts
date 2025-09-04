import type { IUserBalanceRepository } from '../interfaces';
import type { UserBalance, NewUserBalance } from '../schema';
import { db } from '../connection';
import { userBalances } from '../schema';
import { eq } from 'drizzle-orm';

export class UserBalanceRepository implements IUserBalanceRepository {
	async create(data: NewUserBalance): Promise<UserBalance> {
		const result = await db.insert(userBalances).values({
			userId: data.userId,
			balance: data.balance
		}).returning();

		if (result.length === 0) {
			throw new Error('Failed to create user balance: No data returned');
		}
		return result[0];
	}

	async getById(userId: string): Promise<UserBalance | null> {
		const result = await db.select().from(userBalances).where(eq(userBalances.userId, userId)).limit(1);
		return result.length > 0 ? result[0] : null;
	}

	async update(userId: string, data: Partial<NewUserBalance>): Promise<UserBalance> {
		const updateData: Partial<NewUserBalance> = {
			...data,
			updatedAt: new Date()
		};

		const result = await db
			.update(userBalances)
			.set(updateData)
			.where(eq(userBalances.userId, userId))
			.returning();

		if (result.length === 0) {
			throw new Error('Failed to update user balance: User balance not found');
		}
		return result[0];
	}

	async delete(userId: string): Promise<void> {
		await db.delete(userBalances).where(eq(userBalances.userId, userId));
	}

	async getByUserId(userId: string): Promise<UserBalance | null> {
		return this.getById(userId);
	}

	async updateBalance(userId: string, newBalance: number): Promise<UserBalance> {
		const result = await db
			.update(userBalances)
			.set({
				balance: newBalance.toString(), // Convert to string as per schema
				updatedAt: new Date()
			})
			.where(eq(userBalances.userId, userId))
			.returning();

		if (result.length === 0) {
			throw new Error('Failed to update user balance: User balance not found');
		}
		return result[0];
	}

	async createWithInitialBalance(userId: string, initialBalance: number): Promise<UserBalance> {
		const result = await db.insert(userBalances).values({
			userId: userId,
			balance: initialBalance.toString() // Convert to string as per schema
		}).returning();

		if (result.length === 0) {
			throw new Error('Failed to create user balance with initial balance: No data returned');
		}
		return result[0];
	}
}