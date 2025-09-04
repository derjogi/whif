import type { IDownstreamImpactRepository } from '../interfaces';
import type { DownstreamImpact, NewDownstreamImpact, StatementMetric, NewStatementMetric, Vote } from '../schema';
import { db } from '../connection';
import { downstreamImpacts, statementMetrics, votes } from '../schema';
import { eq, asc } from 'drizzle-orm';

export class DrizzleDownstreamImpactRepository implements IDownstreamImpactRepository {
  async create(data: NewDownstreamImpact): Promise<DownstreamImpact> {
    const result = await db.insert(downstreamImpacts).values({
      categoryId: data.categoryId,
      impactText: data.impactText,
      calculatedImpactScore: data.calculatedImpactScore
    }).returning();

    if (result.length === 0) {
      throw new Error('Failed to create downstream impact: No data returned');
    }

    return result[0];
  }

  async getById(id: string): Promise<DownstreamImpact | null> {
    const result = await db.select().from(downstreamImpacts).where(eq(downstreamImpacts.id, id)).limit(1);
    return result.length > 0 ? result[0] : null;
  }

  async update(id: string, data: Partial<NewDownstreamImpact>): Promise<DownstreamImpact> {
    const updateData: Partial<NewDownstreamImpact> = {
      ...data,
      updatedAt: new Date()
    };

    const result = await db
      .update(downstreamImpacts)
      .set(updateData)
      .where(eq(downstreamImpacts.id, id))
      .returning();

    if (result.length === 0) {
      throw new Error('Failed to update downstream impact: Impact not found');
    }

    return result[0];
  }

  async delete(id: string): Promise<void> {
    await db.delete(downstreamImpacts).where(eq(downstreamImpacts.id, id));
  }

  async getByCategoryId(categoryId: string): Promise<DownstreamImpact[]> {
    return await db
      .select()
      .from(downstreamImpacts)
      .where(eq(downstreamImpacts.categoryId, categoryId))
      .orderBy(asc(downstreamImpacts.createdAt));
  }

  async getWithMetrics(categoryId: string): Promise<(DownstreamImpact & { metrics: StatementMetric[] })[]> {
    const result = await db
      .select({
        id: downstreamImpacts.id,
        categoryId: downstreamImpacts.categoryId,
        impactText: downstreamImpacts.impactText,
        calculatedImpactScore: downstreamImpacts.calculatedImpactScore,
        createdAt: downstreamImpacts.createdAt,
        updatedAt: downstreamImpacts.updatedAt,
        metrics: statementMetrics
      })
      .from(downstreamImpacts)
      .leftJoin(statementMetrics, eq(downstreamImpacts.id, statementMetrics.downstreamImpactId))
      .where(eq(downstreamImpacts.categoryId, categoryId))
      .orderBy(asc(downstreamImpacts.createdAt));

    // Group the results by impact
    const impactMap = new Map<string, DownstreamImpact & { metrics: StatementMetric[] }>();

    for (const row of result) {
      const impactId = row.id;
      if (!impactMap.has(impactId)) {
        impactMap.set(impactId, {
          id: row.id,
          categoryId: row.categoryId,
          impactText: row.impactText,
          calculatedImpactScore: row.calculatedImpactScore,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          metrics: []
        });
      }

      if (row.metrics) {
        impactMap.get(impactId)!.metrics.push(row.metrics);
      }
    }

    return Array.from(impactMap.values());
  }

  async getWithVotes(categoryId: string): Promise<(DownstreamImpact & { votes: Vote[] })[]> {
    const result = await db
      .select({
        id: downstreamImpacts.id,
        categoryId: downstreamImpacts.categoryId,
        impactText: downstreamImpacts.impactText,
        calculatedImpactScore: downstreamImpacts.calculatedImpactScore,
        createdAt: downstreamImpacts.createdAt,
        updatedAt: downstreamImpacts.updatedAt,
        votes: votes
      })
      .from(downstreamImpacts)
      .leftJoin(votes, eq(downstreamImpacts.id, votes.downstreamImpactId))
      .where(eq(downstreamImpacts.categoryId, categoryId))
      .orderBy(asc(downstreamImpacts.createdAt));

    // Group the results by impact
    const impactMap = new Map<string, DownstreamImpact & { votes: Vote[] }>();

    for (const row of result) {
      const impactId = row.id;
      if (!impactMap.has(impactId)) {
        impactMap.set(impactId, {
          id: row.id,
          categoryId: row.categoryId,
          impactText: row.impactText,
          calculatedImpactScore: row.calculatedImpactScore,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          votes: []
        });
      }

      if (row.votes) {
        impactMap.get(impactId)!.votes.push(row.votes);
      }
    }

    return Array.from(impactMap.values());
  }

  async createBatchWithMetrics(impactsWithMetrics: Array<{
    impact: NewDownstreamImpact;
    metrics: NewStatementMetric[];
  }>): Promise<(DownstreamImpact & { metrics: StatementMetric[] })[]> {
    if (impactsWithMetrics.length === 0) {
      return [];
    }

    // Create all impacts first
    const impactsData = impactsWithMetrics.map(item => ({
      categoryId: item.impact.categoryId,
      impactText: item.impact.impactText,
      calculatedImpactScore: item.impact.calculatedImpactScore
    }));

    const insertedImpacts = await db.insert(downstreamImpacts).values(impactsData).returning();

    if (insertedImpacts.length === 0) {
      throw new Error('No downstream impacts were created');
    }

    // Create all metrics
    const allMetrics: NewStatementMetric[] = [];
    insertedImpacts.forEach((impact, index) => {
      const metrics = impactsWithMetrics[index].metrics;
      const metricsWithImpactId = metrics.map(metric => ({
        ...metric,
        downstreamImpactId: impact.id
      }));
      allMetrics.push(...metricsWithImpactId);
    });

    let insertedMetrics: StatementMetric[] = [];
    if (allMetrics.length > 0) {
      try {
        insertedMetrics = await db.insert(statementMetrics).values(allMetrics).returning();
      } catch (error) {
        // Attempt to rollback impacts if metrics fail
        const impactIds = insertedImpacts.map(i => i.id);
        await db.delete(downstreamImpacts).where(eq(downstreamImpacts.id, impactIds[0])); // Simplified rollback
        throw new Error(`Failed to create impact metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
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