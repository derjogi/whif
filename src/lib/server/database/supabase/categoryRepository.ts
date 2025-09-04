import type { ICategoryRepository } from '../interfaces';
import type { Category, NewCategory, DownstreamImpact } from '../schema';
import { db } from '../connection';
import { categories, downstreamImpacts } from '../schema';
import { eq, asc } from 'drizzle-orm';

export class DrizzleCategoryRepository implements ICategoryRepository {
  async create(data: NewCategory): Promise<Category> {
    const result = await db.insert(categories).values({
      ideaId: data.ideaId,
      name: data.name,
      researchFindings: data.researchFindings,
      evaluatedScore: data.evaluatedScore
    }).returning();

    if (result.length === 0) {
      throw new Error('Failed to create category: No data returned');
    }

    return result[0];
  }

  async getById(id: string): Promise<Category | null> {
    const result = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
    return result.length > 0 ? result[0] : null;
  }

  async update(id: string, data: Partial<NewCategory>): Promise<Category> {
    const updateData: Partial<NewCategory> = {
      ...data,
      updatedAt: new Date()
    };

    const result = await db
      .update(categories)
      .set(updateData)
      .where(eq(categories.id, id))
      .returning();

    if (result.length === 0) {
      throw new Error('Failed to update category: Category not found');
    }

    return result[0];
  }

  async delete(id: string): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  async getByIdeaId(ideaId: string): Promise<Category[]> {
    return await db
      .select()
      .from(categories)
      .where(eq(categories.ideaId, ideaId))
      .orderBy(asc(categories.createdAt));
  }

  async getWithDownstreamImpacts(ideaId: string): Promise<(Category & { downstreamImpacts: DownstreamImpact[] })[]> {
    const result = await db
      .select({
        id: categories.id,
        ideaId: categories.ideaId,
        name: categories.name,
        researchFindings: categories.researchFindings,
        evaluatedScore: categories.evaluatedScore,
        createdAt: categories.createdAt,
        updatedAt: categories.updatedAt,
        downstreamImpacts: downstreamImpacts
      })
      .from(categories)
      .leftJoin(downstreamImpacts, eq(categories.id, downstreamImpacts.categoryId))
      .where(eq(categories.ideaId, ideaId))
      .orderBy(asc(categories.createdAt));

    // Group the results by category
    const categoryMap = new Map<string, Category & { downstreamImpacts: DownstreamImpact[] }>();

    for (const row of result) {
      const categoryId = row.id;
      if (!categoryMap.has(categoryId)) {
        categoryMap.set(categoryId, {
          id: row.id,
          ideaId: row.ideaId,
          name: row.name,
          researchFindings: row.researchFindings,
          evaluatedScore: row.evaluatedScore,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          downstreamImpacts: []
        });
      }

      if (row.downstreamImpacts) {
        categoryMap.get(categoryId)!.downstreamImpacts.push(row.downstreamImpacts);
      }
    }

    return Array.from(categoryMap.values());
  }
}