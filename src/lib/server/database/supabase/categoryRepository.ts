import type { SupabaseClient } from '@supabase/supabase-js';
import type { ICategoryRepository } from '../interfaces';
import type { Category, NewCategory, DownstreamImpact } from '../schema';

export class SupabaseCategoryRepository implements ICategoryRepository {
  constructor(private supabase: SupabaseClient) {}

  async create(data: NewCategory): Promise<Category> {
    const { data: category, error } = await this.supabase
      .from('categories')
      .insert(data)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create category: ${error.message}`);
    }

    return category;
  }

  async getById(id: string): Promise<Category | null> {
    const { data, error } = await this.supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return null;
    }

    return data;
  }

  async update(id: string, data: Partial<NewCategory>): Promise<Category> {
    const { data: category, error } = await this.supabase
      .from('categories')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update category: ${error.message}`);
    }

    return category;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete category: ${error.message}`);
    }
  }

  async getByIdeaId(ideaId: string): Promise<Category[]> {
    const { data, error } = await this.supabase
      .from('categories')
      .select('*')
      .eq('idea_id', ideaId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to get categories by idea ID: ${error.message}`);
    }

    return data || [];
  }

  async getWithDownstreamImpacts(ideaId: string): Promise<(Category & { downstreamImpacts: DownstreamImpact[] })[]> {
    const { data, error } = await this.supabase
      .from('categories')
      .select(`
        *,
        downstreamImpacts:downstream_impacts(*)
      `)
      .eq('idea_id', ideaId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to get categories with downstream impacts: ${error.message}`);
    }

    return data || [];
  }
}