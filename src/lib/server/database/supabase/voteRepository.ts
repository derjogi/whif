import type { SupabaseClient } from '@supabase/supabase-js';
import type { IVoteRepository } from '../interfaces';
import type { Vote, NewVote } from '../schema';

export class SupabaseVoteRepository implements IVoteRepository {
	constructor(private supabase: SupabaseClient) {}

	async create(data: NewVote): Promise<Vote> {
		const { data: vote, error } = await this.supabase
			.from('votes')
			.insert({
				statement_id: data.statementId,
				user_id: data.userId,
				vote_type: data.voteType
			})
			.select()
			.single();

		if (error) throw new Error(`Failed to create vote: ${error.message}`);
		return vote;
	}

	async getById(id: string): Promise<Vote | null> {
		const { data: vote, error } = await this.supabase
			.from('votes')
			.select('*')
			.eq('id', id)
			.single();

		if (error && error.code !== 'PGRST116') throw new Error(`Failed to get vote: ${error.message}`);
		return vote;
	}

	async update(id: string, data: Partial<NewVote>): Promise<Vote> {
		const updateData: any = {};
		if (data.voteType !== undefined) updateData.vote_type = data.voteType;
		updateData.updated_at = new Date().toISOString();

		const { data: vote, error } = await this.supabase
			.from('votes')
			.update(updateData)
			.eq('id', id)
			.select()
			.single();

		if (error) throw new Error(`Failed to update vote: ${error.message}`);
		return vote;
	}

	async upsert(voteData: { statementId: string; userId: string; voteType: number }): Promise<Vote> {
		const { data: vote, error } = await this.supabase
			.from('votes')
			.upsert(
				{
					statement_id: voteData.statementId,
					user_id: voteData.userId,
					vote_type: voteData.voteType,
					updated_at: new Date().toISOString()
				},
				{
					onConflict: 'statement_id, user_id'
				}
			)
			.select()
			.single();

		if (error) throw new Error(`Failed to upsert vote: ${error.message}`);
		return vote;
	}

	async getByStatementId(statementId: string): Promise<Vote[]> {
		const { data: votes, error } = await this.supabase
			.from('votes')
			.select('*')
			.eq('statement_id', statementId);

		if (error) throw new Error(`Failed to get votes: ${error.message}`);
		return votes || [];
	}

	async getUserVote(userId: string, statementId: string): Promise<Vote | null> {
		const { data: vote, error } = await this.supabase
			.from('votes')
			.select('*')
			.eq('user_id', userId)
			.eq('statement_id', statementId)
			.maybeSingle();

		if (error) throw new Error(`Failed to get user vote: ${error.message}`);
		return vote;
	}

	async getVoteCounts(statementId: string): Promise<{ upvotes: number; downvotes: number }> {
		const { data: votes, error } = await this.supabase
			.from('votes')
			.select('vote_type')
			.eq('statement_id', statementId);

		if (error) throw new Error(`Failed to get vote counts: ${error.message}`);

		const upvotes = votes?.filter(vote => vote.vote_type === 1).length || 0;
		const downvotes = votes?.filter(vote => vote.vote_type === -1).length || 0;

		return { upvotes, downvotes };
	}

	async delete(userId: string, statementId: string): Promise<void> {
		const { error } = await this.supabase
			.from('votes')
			.delete()
			.eq('user_id', userId)
			.eq('statement_id', statementId);

		if (error) throw new Error(`Failed to delete vote: ${error.message}`);
	}
}
