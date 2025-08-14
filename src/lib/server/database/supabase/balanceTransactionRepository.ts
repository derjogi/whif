import { createServiceRoleSupabaseClient } from './serviceRoleSupabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { IBalanceTransactionRepository } from '../interfaces';
import type { BalanceTransaction, NewBalanceTransaction } from '../schema';

export class SupabaseBalanceTransactionRepository implements IBalanceTransactionRepository {
	constructor(private supabase: SupabaseClient, private serviceRoleSupabase?: SupabaseClient) {}

	async create(data: NewBalanceTransaction): Promise<BalanceTransaction> {
		const client = this.serviceRoleSupabase ?? createServiceRoleSupabaseClient();
		const { data: balanceTransaction, error } = await client
			.from('balance_transactions')
			.insert({
				user_id: data.userId,
				amount: data.amount,
				balance_before: data.balanceBefore,
				balance_after: data.balanceAfter,
				transaction_type: data.transactionType,
				description: data.description,
				reference_id: data.referenceId
			})
			.select()
			.single();

		if (error) throw new Error(`Failed to create balance transaction: ${error.message}`);
		return balanceTransaction;
	}

	async getById(id: string): Promise<BalanceTransaction | null> {
		const { data: balanceTransaction, error } = await this.supabase
			.from('balance_transactions')
			.select('*')
			.eq('id', id)
			.single();

		if (error && error.code !== 'PGRST116') throw new Error(`Failed to get balance transaction: ${error.message}`);
		return balanceTransaction;
	}

	async update(id: string, data: Partial<NewBalanceTransaction>): Promise<BalanceTransaction> {
		const updateData: any = {};
		if (data.userId !== undefined) updateData.user_id = data.userId;
		if (data.amount !== undefined) updateData.amount = data.amount;
		if (data.balanceBefore !== undefined) updateData.balance_before = data.balanceBefore;
		if (data.balanceAfter !== undefined) updateData.balance_after = data.balanceAfter;
		if (data.transactionType !== undefined) updateData.transaction_type = data.transactionType;
		if (data.description !== undefined) updateData.description = data.description;
		if (data.referenceId !== undefined) updateData.reference_id = data.referenceId;

		const { data: balanceTransaction, error } = await this.supabase
			.from('balance_transactions')
			.update(updateData)
			.eq('id', id)
			.select()
			.single();

		if (error) throw new Error(`Failed to update balance transaction: ${error.message}`);
		return balanceTransaction;
	}

	async delete(id: string): Promise<void> {
		const { error } = await this.supabase
			.from('balance_transactions')
			.delete()
			.eq('id', id);

		if (error) throw new Error(`Failed to delete balance transaction: ${error.message}`);
	}

	async getByUserId(userId: string): Promise<BalanceTransaction[]> {
		const { data: balanceTransactions, error } = await this.supabase
			.from('balance_transactions')
			.select('*')
			.eq('user_id', userId)
			.order('created_at', { ascending: false });

		if (error) throw new Error(`Failed to get user balance transactions: ${error.message}`);
		return balanceTransactions || [];
	}

	async getByUserIdAndDateRange(userId: string, startDate: Date, endDate: Date): Promise<BalanceTransaction[]> {
		const { data: balanceTransactions, error } = await this.supabase
			.from('balance_transactions')
			.select('*')
			.eq('user_id', userId)
			.gte('created_at', startDate.toISOString())
			.lte('created_at', endDate.toISOString())
			.order('created_at', { ascending: false });

		if (error) throw new Error(`Failed to get user balance transactions by date range: ${error.message}`);
		return balanceTransactions || [];
	}
}