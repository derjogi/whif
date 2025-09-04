import type { SupabaseClient } from '@supabase/supabase-js';
import type { IDownstreamImpactRepository } from '../interfaces';
import type { DownstreamImpact, NewDownstreamImpact, StatementMetric, NewStatementMetric, Vote } from '../schema';

export class SupabaseDownstreamImpactRepository implements IDownstreamImpactRepository {
  constructor(private supabase: SupabaseClient) {}

  async create(data: NewDownstreamImpact): Promise<DownstreamImpact> {
    const { data: impact, error } = await this.supabase
      .from('downstream_impacts')
      .insert(data)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create downstream impact: ${error.message}`);
    }

    return impact;
  }

  async getById(id: string): Promise<DownstreamImpact | null> {
    const { data, error } = await this.supabase
      .from('downstream_impacts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return null;
    }

    return data;
  }

  async update(id: string, data: Partial<NewDownstreamImpact>): Promise<DownstreamImpact> {
    const { data: impact, error } = await this.supabase
      .from('downstream_impacts')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update downstream impact: ${error.message}`);
    }

    return impact;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('downstream_impacts')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete downstream impact: ${error.message}`);
    }
  }

  async getByCategoryId(categoryId: string): Promise<DownstreamImpact[]> {
    const { data, error } = await this.supabase
      .from('downstream_impacts')
      .select('*')
      .eq('category_id', categoryId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to get downstream impacts by category ID: ${error.message}`);
    }

    return data || [];
  }

  async getWithMetrics(categoryId: string): Promise<(DownstreamImpact & { metrics: StatementMetric[] })[]> {
    const { data, error } = await this.supabase
      .from('downstream_impacts')
      .select(`
        *,
        metrics:statement_metrics(*)
      `)
      .eq('category_id', categoryId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to get downstream impacts with metrics: ${error.message}`);
    }

    return data || [];
  }

  async getWithVotes(categoryId: string): Promise<(DownstreamImpact & { votes: Vote[] })[]> {
    const { data, error } = await this.supabase
      .from('downstream_impacts')
      .select(`
        *,
        votes:votes(*)
      `)
      .eq('category_id', categoryId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to get downstream impacts with votes: ${error.message}`);
    }

    return data || [];
  }

  async createBatchWithMetrics(impactsWithMetrics: Array<{
    impact: NewDownstreamImpact;
    metrics: NewStatementMetric[];
  }>): Promise<(DownstreamImpact & { metrics: StatementMetric[] })[]> {
    if (impactsWithMetrics.length === 0) {
      return [];
    }

    // Create all impacts first
    const impactsData: NewDownstreamImpact[] = impactsWithMetrics.map(item => item.impact);
    const { data: insertedImpacts, error: impactsError } = await this.supabase
      .from('downstream_impacts')
      .insert(impactsData)
      .select();

    if (impactsError) {
      throw new Error(`Failed to create downstream impacts batch: ${impactsError.message}`);
    }

    if (!insertedImpacts || insertedImpacts.length === 0) {
      throw new Error('No downstream impacts were created');
    }

    // Create all metrics
    const allMetrics: NewStatementMetric[] = [];
    insertedImpacts.forEach((impact, index) => {
      const metrics = impactsWithMetrics[index].metrics;
      const metricsWithImpactId = metrics.map(metric => ({
        ...metric,
        downstream_impact_id: impact.id
      }));
      allMetrics.push(...metricsWithImpactId);
    });

    let insertedMetrics: StatementMetric[] = [];
    if (allMetrics.length > 0) {
      const { data: metricsData, error: metricsError } = await this.supabase
        .from('statement_metrics')
        .insert(allMetrics)
        .select();

      if (metricsError) {
        // Attempt to rollback impacts if metrics fail
        const impactIds = insertedImpacts.map(i => i.id);
        await this.supabase.from('downstream_impacts').delete().in('id', impactIds);
        throw new Error(`Failed to create impact metrics: ${metricsError.message}`);
      }

      insertedMetrics = metricsData || [];
    }

    // Group metrics by impact ID
    const metricsByImpactId = new Map<string, StatementMetric[]>();
    insertedMetrics.forEach(metric => {
      if (!metricsByImpactId.has(metric.downstreamImpactId)) {
        metricsByImpactId.set(metric.downstreamImpactId, []);
      }
      metricsByImpactId.get(metric.downstreamImpactId)!.push(metric);
    });

    // Return combined results
    return insertedImpacts.map(impact => ({
      ...impact,
      metrics: metricsByImpactId.get(impact.id) || []
    }));
  }
}