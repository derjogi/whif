import type { IIdeaRepository } from '../interfaces';
import type { Idea, NewIdea } from '../schema';
import { db } from '../connection';
import { ideas } from '../schema';
import { eq, desc } from 'drizzle-orm';

export class IdeaRepository implements IIdeaRepository {
	async create(data: NewIdea): Promise<Idea> {
		const result = await db.insert(ideas).values({
			userId: data.userId,
			title: data.title,
			text: data.text,
			summary: data.summary,
			published: data.published || true // Setting this to true by default, even though the database has 'false' as defaults. false means that users can't vote on statements etc
		}).returning();

		if (result.length === 0) {
			throw new Error('Failed to create idea: No data returned');
		}
		return result[0];
	}

	async getById(id: string): Promise<Idea | null> {
		const result = await db.select().from(ideas).where(eq(ideas.id, id)).limit(1);
		return result.length > 0 ? result[0] : null;
	}

	async update(id: string, data: Partial<NewIdea>): Promise<Idea> {
		const updateData: Partial<NewIdea> = {
			...data,
			updatedAt: new Date()
		};

		const result = await db
			.update(ideas)
			.set(updateData)
			.where(eq(ideas.id, id))
			.returning();

		if (result.length === 0) {
			throw new Error('Failed to update idea: Idea not found');
		}
		return result[0];
	}

	async delete(id: string): Promise<void> {
		await db.delete(ideas).where(eq(ideas.id, id));
	}

	async getByUserId(userId: string): Promise<Idea[]> {
		return await db
			.select()
			.from(ideas)
			.where(eq(ideas.userId, userId))
			.orderBy(desc(ideas.createdAt));
	}

	async getPublished(): Promise<Idea[]> {
		return await db
			.select()
			.from(ideas)
			.where(eq(ideas.published, true))
			.orderBy(desc(ideas.createdAt));
	}

	async publish(id: string, userId: string): Promise<Idea> {
		const result = await db
			.update(ideas)
			.set({
				published: true,
				updatedAt: new Date()
			})
			.where(eq(ideas.id, id))
			.returning();

		if (result.length === 0) {
			throw new Error('Failed to publish idea: Idea not found');
		}
		return result[0];
	}

	async unpublish(id: string, userId: string): Promise<Idea> {
		const result = await db
			.update(ideas)
			.set({
				published: false,
				updatedAt: new Date()
			})
			.where(eq(ideas.id, id))
			.returning();

		if (result.length === 0) {
			throw new Error('Failed to unpublish idea: Idea not found');
		}
		return result[0];
	}
}
