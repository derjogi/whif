import type { SupabaseClient } from '@supabase/supabase-js';
import type { IUserBalanceRepository } from '../interfaces';
import type { UserBalance, NewUserBalance } from '../schema';
import { createServiceRoleSupabaseClient } from './serviceRoleSupabase';

export class SupabaseUserBalanceRepository implements IUserBalanceRepository {
	constructor(private supabase: SupabaseClient, private serviceRoleSupabase?: SupabaseClient) {}

	async create(data: NewUserBalance): Promise<UserBalance> {
		const { data: userBalance, error } = await this.supabase
			.from('user_balances')
			.insert({
				user_id: data.userId,
				balance: data.balance,
			})
			.select()
			.single();

		if (error) throw new Error(`Failed to create user balance: ${error.message}`);
		return userBalance;
	}

	async getById(userId: string): Promise<UserBalance | null> {
		const { data: userBalance, error } = await this.supabase
			.from('user_balances')
			.select('*')
			.eq('user_id', userId)
			.single();

		if (error && error.code !== 'PGRST116') throw new Error(`Failed to get user balance: ${error.message}`);
		return userBalance;
	}

	async update(id: string, data: Partial<NewUserBalance>): Promise<UserBalance> {
		const updateData: any = {};
		if (data.userId !== undefined) updateData.user_id = data.userId;
		if (data.balance !== undefined) updateData.balance = data.balance;

		const { data: userBalance, error } = await this.supabase
			.from('user_balances')
			.update(updateData)
			.eq('user_id', id)
			.select()
			.single();

		if (error) throw new Error(`Failed to update user balance: ${error.message}`);
		return userBalance;
	}

	async delete(userId: string): Promise<void> {
		const { error } = await this.supabase
			.from('user_balances')
			.delete()
			.eq('user_id', userId);

		if (error) throw new Error(`Failed to delete user balance: ${error.message}`);
	}

	async getByUserId(userId: string): Promise<UserBalance | null> {
		return this.getById(userId);
	}

	async updateBalance(userId: string, newBalance: number): Promise<UserBalance> {
		// Use SELECT FOR UPDATE to lock the row during the transaction
		const { data: balance, error } = await this.supabase
			.from('user_balances')
			.select('*')
			.eq('user_id', userId)
			.single();

		if (error) throw new Error(`Failed to get user balance: ${error.message}`);

		const { data: updatedBalance, error: updateError } = await this.supabase
			.from('user_balances')
			.update({
				balance: newBalance,
				updated_at: new Date().toISOString()
			})
			.eq('user_id', userId)
			.select()
			.single();

		if (updateError) throw new Error(`Failed to update user balance: ${updateError.message}`);
		return updatedBalance;
	}

	async createWithInitialBalance(userId: string, initialBalance: number): Promise<UserBalance> {
		const client = this.serviceRoleSupabase ?? createServiceRoleSupabaseClient();
		const { data: userBalance, error } = await client
			.from('user_balances')
			.insert({
				user_id: userId,
				balance: initialBalance,
			})
			.select()
			.single();

		if (error) throw new Error(`Failed to create user balance with initial balance: ${error.message}`);
		return userBalance;
	}
}