import type { SupabaseClient } from '@supabase/supabase-js';
import type { IStatementRepository } from '../interfaces';
import type { Statement, NewStatement, StatementMetric, NewStatementMetric } from '../schema';

export class SupabaseStatementRepository implements IStatementRepository {
  constructor(private supabase: SupabaseClient) {}

  async create(data: NewStatement): Promise<Statement> {
    const { data: statement, error } = await this.supabase
      .from('statements')
      .insert(data)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create statement: ${error.message}`);
    }

    return statement;
  }

  async getById(id: string): Promise<Statement | null> {
    const { data, error } = await this.supabase
      .from('statements')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return null;
    }

    return data;
  }

  async update(id: string, data: Partial<NewStatement>): Promise<Statement> {
    const { data: statement, error } = await this.supabase
      .from('statements')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update statement: ${error.message}`);
    }

    return statement;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('statements')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete statement: ${error.message}`);
    }
  }

  async getByIdeaId(ideaId: string): Promise<Statement[]> {
    const { data, error } = await this.supabase
      .from('statements')
      .select('*')
      .eq('idea_id', ideaId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to get statements by idea ID: ${error.message}`);
    }

    return data || [];
  }

  async getWithMetrics(ideaId: string): Promise<(Statement & { metrics: StatementMetric[] })[]> {
    const { data, error } = await this.supabase
      .from('statements')
      .select(`
        *,
        metrics:statement_metrics(*)
      `)
      .eq('idea_id', ideaId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to get statements with metrics: ${error.message}`);
    }

    return data || [];
  }

  async getWithVotes(ideaId: string): Promise<(Statement & { votes: any[] })[]> {
    const { data, error } = await this.supabase
      .from('statements')
      .select(`
        *,
        votes:votes(*)
      `)
      .eq('idea_id', ideaId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to get statements with votes: ${error.message}`);
    }

    return data || [];
  }

  // Additional methods for handling statements with metrics in a unified way

  async createWithMetrics(statementData: NewStatement, metricsData: NewStatementMetric[]): Promise<Statement & { metrics: StatementMetric[] }> {
    // Start a transaction-like operation using Supabase's batch operations
    const { data: statement, error: statementError } = await this.supabase
      .from('statements')
      .insert(statementData)
      .select()
      .single();

    if (statementError) {
      throw new Error(`Failed to create statement: ${statementError.message}`);
    }

    let metrics: StatementMetric[] = [];
    if (metricsData.length > 0) {
      const metricsWithStatementId = metricsData.map(metric => ({
        ...metric,
        statement_id: statement.id
      }));

      const { data: insertedMetrics, error: metricsError } = await this.supabase
        .from('statement_metrics')
        .insert(metricsWithStatementId)
        .select();

      if (metricsError) {
        // Attempt to rollback the statement if metrics fail
        await this.supabase.from('statements').delete().eq('id', statement.id);
        throw new Error(`Failed to create statement metrics: ${metricsError.message}`);
      }

      metrics = insertedMetrics || [];
    }

    return {
      ...statement,
      metrics
    };
  }

  async createBatch(statements: NewStatement[]): Promise<Statement[]> {
    if (statements.length === 0) {
      return [];
    }

    const { data, error } = await this.supabase
      .from('statements')
      .insert(statements)
      .select();

    if (error) {
      throw new Error(`Failed to create statements batch: ${error.message}`);
    }

    return data || [];
  }

  async createBatchWithMetrics(statementsWithMetrics: Array<{
    statement: NewStatement;
    metrics: NewStatementMetric[];
  }>): Promise<(Statement & { metrics: StatementMetric[] })[]> {
    if (statementsWithMetrics.length === 0) {
      return [];
    }

    // Create all statements first
    const statementsData = statementsWithMetrics.map(item => item.statement);
    const { data: insertedStatements, error: statementsError } = await this.supabase
      .from('statements')
      .insert(statementsData)
      .select();

    if (statementsError) {
      throw new Error(`Failed to create statements batch: ${statementsError.message}`);
    }

    if (!insertedStatements || insertedStatements.length === 0) {
      throw new Error('No statements were created');
    }

    // Create all metrics
    const allMetrics: NewStatementMetric[] = [];
    insertedStatements.forEach((statement, index) => {
      const metrics = statementsWithMetrics[index].metrics;
      const metricsWithStatementId = metrics.map(metric => ({
        ...metric,
        statement_id: statement.id
      }));
      allMetrics.push(...metricsWithStatementId);
    });

    let insertedMetrics: StatementMetric[] = [];
    if (allMetrics.length > 0) {
      const { data: metricsData, error: metricsError } = await this.supabase
        .from('statement_metrics')
        .insert(allMetrics)
        .select();

      if (metricsError) {
        // Attempt to rollback statements if metrics fail
        const statementIds = insertedStatements.map(s => s.id);
        await this.supabase.from('statements').delete().in('id', statementIds);
        throw new Error(`Failed to create statement metrics: ${metricsError.message}`);
      }

      insertedMetrics = metricsData || [];
    }

    // Group metrics by statement ID
    const metricsByStatementId = new Map<string, StatementMetric[]>();
    insertedMetrics.forEach(metric => {
      if (!metricsByStatementId.has(metric.statementId)) {
        metricsByStatementId.set(metric.statementId, []);
      }
      metricsByStatementId.get(metric.statementId)!.push(metric);
    });

    // Return combined results
    return insertedStatements.map(statement => ({
      ...statement,
      metrics: metricsByStatementId.get(statement.id) || []
    }));
  }
}