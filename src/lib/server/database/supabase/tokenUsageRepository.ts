import { createServiceRoleSupabaseClient } from './serviceRoleSupabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ITokenUsageRepository, AnalysisUsageSummary } from '../interfaces';
import type { TokenUsage, NewTokenUsage } from '../schema';

export class SupabaseTokenUsageRepository implements ITokenUsageRepository {
	constructor(private supabase: SupabaseClient, private serviceRoleSupabase?: SupabaseClient) {}

	async create(data: NewTokenUsage): Promise<TokenUsage> {
		const client = this.serviceRoleSupabase ?? createServiceRoleSupabaseClient();
		const { data: tokenUsage, error } = await client
			.from('token_usage')
			.insert({
				user_id: data.userId,
				analysis_id: data.analysisId,
				model_name: data.modelName,
				input_tokens: data.inputTokens,
				output_tokens: data.outputTokens,
				cost: data.cost,
				success: data.success,
				error_message: data.errorMessage
			})
			.select()
			.single();

		if (error) throw new Error(`Failed to create token usage record: ${error.message}`);
		return tokenUsage;
	}

	async getById(id: string): Promise<TokenUsage | null> {
		const { data: tokenUsage, error } = await this.supabase
			.from('token_usage')
			.select('*')
			.eq('id', id)
			.single();

		if (error && error.code !== 'PGRST116') throw new Error(`Failed to get token usage: ${error.message}`);
		return tokenUsage;
	}

	async update(id: string, data: Partial<NewTokenUsage>): Promise<TokenUsage> {
		const client = this.serviceRoleSupabase ?? createServiceRoleSupabaseClient();
		const updateData: any = {};
		if (data.userId !== undefined) updateData.user_id = data.userId;
		if (data.analysisId !== undefined) updateData.analysis_id = data.analysisId;
		if (data.modelName !== undefined) updateData.model_name = data.modelName;
		if (data.inputTokens !== undefined) updateData.input_tokens = data.inputTokens;
		if (data.outputTokens !== undefined) updateData.output_tokens = data.outputTokens;
		if (data.cost !== undefined) updateData.cost = data.cost;
		if (data.success !== undefined) updateData.success = data.success;
		if (data.errorMessage !== undefined) updateData.error_message = data.errorMessage;

		const { data: tokenUsage, error } = await client
			.from('token_usage')
			.update(updateData)
			.eq('id', id)
			.select()
			.single();

		if (error) throw new Error(`Failed to update token usage: ${error.message}`);
		return tokenUsage;
	}

	async delete(id: string): Promise<void> {
		const client = this.serviceRoleSupabase ?? createServiceRoleSupabaseClient();
		const { error } = await client
			.from('token_usage')
			.delete()
			.eq('id', id);

		if (error) throw new Error(`Failed to delete token usage: ${error.message}`);
	}

	async getByUserId(userId: string): Promise<TokenUsage[]> {
		const { data: tokenUsages, error } = await this.supabase
			.from('token_usage')
			.select('*')
			.eq('user_id', userId)
			.order('timestamp', { ascending: false });

		if (error) throw new Error(`Failed to get user token usage: ${error.message}`);
		return tokenUsages || [];
	}

	async getByAnalysisId(analysisId: string): Promise<TokenUsage[]> {
		const { data: tokenUsages, error } = await this.supabase
			.from('token_usage')
			.select('*')
			.eq('analysis_id', analysisId)
			.order('timestamp', { ascending: true });

		if (error) throw new Error(`Failed to get analysis token usage: ${error.message}`);
		return tokenUsages || [];
	}

	async getUsageSummary(analysisId: string): Promise<AnalysisUsageSummary> {
		// Get all token usage records for this analysis
		const usageRecords = await this.getByAnalysisId(analysisId);
		
		// Calculate totals
		const totalInputTokens = usageRecords.reduce((sum, record) => sum + record.inputTokens, 0);
		const totalOutputTokens = usageRecords.reduce((sum, record) => sum + record.outputTokens, 0);
		const totalCost = usageRecords.reduce((sum, record) => sum + parseFloat(record.cost as string), 0);
		
		// Group by model
		const modelUsages: { [modelName: string]: { inputTokens: number; outputTokens: number; cost: number } } = {};
		
		for (const record of usageRecords) {
			if (!modelUsages[record.modelName]) {
				modelUsages[record.modelName] = {
					inputTokens: 0,
					outputTokens: 0,
					cost: 0
				};
			}
			
			modelUsages[record.modelName].inputTokens += record.inputTokens;
			modelUsages[record.modelName].outputTokens += record.outputTokens;
			modelUsages[record.modelName].cost += parseFloat(record.cost as string);
		}
		
		// Convert to array format
		const modelUsagesArray = Object.entries(modelUsages).map(([modelName, usage]) => ({
			modelName,
			inputTokens: usage.inputTokens,
			outputTokens: usage.outputTokens,
			cost: usage.cost
		}));
		
		return {
			analysisId,
			totalInputTokens,
			totalOutputTokens,
			totalCost,
			modelUsages: modelUsagesArray
		};
	}

	async getCostForAnalysis(analysisId: string): Promise<number> {
		const summary = await this.getUsageSummary(analysisId);
		return summary.totalCost;
	}
}