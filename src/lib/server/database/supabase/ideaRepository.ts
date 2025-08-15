import type { SupabaseClient } from '@supabase/supabase-js';
import type { IIdeaRepository } from '../interfaces';
import type { Idea, NewIdea } from '../schema';

export class SupabaseIdeaRepository implements IIdeaRepository {
	constructor(private supabase: SupabaseClient) {}

	async create(data: NewIdea): Promise<Idea> {
		const { data: idea, error } = await this.supabase
			.from('ideas')
			.insert({
				user_id: data.userId,
				title: data.title,
				text: data.text,
				summary: data.summary,
				published: data.published || true	// Setting this to true by default, even though the database has 'false' as defaults. false means that users can't vote on statements etc
			})
			.select()
			.single();

		if (error) throw new Error(`Failed to create idea: ${error.message}`);
		return idea;
	}

	async getById(id: string): Promise<Idea | null> {
		const { data: idea, error } = await this.supabase
			.from('ideas')
			.select('*')
			.eq('id', id)
			.single();

		if (error && error.code !== 'PGRST116') throw new Error(`Failed to get idea: ${error.message}`);
		return idea;
	}

	async update(id: string, data: Partial<NewIdea>): Promise<Idea> {
		const updateData: any = {};
		if (data.title !== undefined) updateData.title = data.title;
		if (data.text !== undefined) updateData.text = data.text;
		if (data.summary !== undefined) updateData.summary = data.summary;
		if (data.published !== undefined) updateData.published = data.published;
		
		updateData.updated_at = new Date().toISOString();

		const { data: idea, error } = await this.supabase
			.from('ideas')
			.update(updateData)
			.eq('id', id)
			.select()
			.single();

		if (error) throw new Error(`Failed to update idea: ${error.message}`);
		return idea;
	}

	async delete(id: string): Promise<void> {
		const { error } = await this.supabase
			.from('ideas')
			.delete()
			.eq('id', id);

		if (error) throw new Error(`Failed to delete idea: ${error.message}`);
	}

	async getByUserId(userId: string): Promise<Idea[]> {
		const { data: ideas, error } = await this.supabase
			.from('ideas')
			.select('*')
			.eq('user_id', userId)
			.order('created_at', { ascending: false });

		if (error) throw new Error(`Failed to get user ideas: ${error.message}`);
		return ideas || [];
	}

	async getPublished(): Promise<Idea[]> {
		const { data: ideas, error } = await this.supabase
			.from('ideas')
			.select('*')
			.eq('published', true)
			.order('created_at', { ascending: false });

		if (error) throw new Error(`Failed to get published ideas: ${error.message}`);
		return ideas || [];
	}

	async publish(id: string, userId: string): Promise<Idea> {
		const { data: idea, error } = await this.supabase
			.from('ideas')
			.update({ published: true, updated_at: new Date().toISOString() })
			.eq('id', id)
			.eq('user_id', userId)
			.select()
			.single();

		if (error) throw new Error(`Failed to publish idea: ${error.message}`);
		return idea;
	}

	async unpublish(id: string, userId: string): Promise<Idea> {
		const { data: idea, error } = await this.supabase
			.from('ideas')
			.update({ published: false, updated_at: new Date().toISOString() })
			.eq('id', id)
			.eq('user_id', userId)
			.select()
			.single();

		if (error) throw new Error(`Failed to unpublish idea: ${error.message}`);
		return idea;
	}
}
