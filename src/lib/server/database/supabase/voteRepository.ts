import type { IVoteRepository } from '../interfaces';
import type { Vote, NewVote } from '../schema';
import { db } from '../connection';
import { votes } from '../schema';
import { eq, and, sql } from 'drizzle-orm';

export class DrizzleVoteRepository implements IVoteRepository {
	async create(data: NewVote): Promise<Vote> {
		const result = await db.insert(votes).values({
			downstreamImpactId: data.downstreamImpactId,
			userId: data.userId,
			voteType: data.voteType
		}).returning();

		if (result.length === 0) {
			throw new Error('Failed to create vote: No data returned');
		}
		return result[0];
	}

	async getById(id: string): Promise<Vote | null> {
		const result = await db.select().from(votes).where(eq(votes.id, id)).limit(1);
		return result.length > 0 ? result[0] : null;
	}

	async update(id: string, data: Partial<NewVote>): Promise<Vote> {
		const updateData: Partial<NewVote> = {
			...data,
			updatedAt: new Date()
		};

		const result = await db
			.update(votes)
			.set(updateData)
			.where(eq(votes.id, id))
			.returning();

		if (result.length === 0) {
			throw new Error('Failed to update vote: Vote not found');
		}
		return result[0];
	}

	async upsert(voteData: { downstreamImpactId: string; userId: string; voteType: number }): Promise<Vote> {
		// Drizzle doesn't have a direct upsert method like Supabase, so we need to handle this manually
		const existingVote = await db
			.select()
			.from(votes)
			.where(and(
				eq(votes.downstreamImpactId, voteData.downstreamImpactId),
				eq(votes.userId, voteData.userId)
			))
			.limit(1);

		if (existingVote.length > 0) {
			// Update existing vote
			const result = await db
				.update(votes)
				.set({
					voteType: voteData.voteType,
					updatedAt: new Date()
				})
				.where(eq(votes.id, existingVote[0].id))
				.returning();

			return result[0];
		} else {
			// Create new vote
			const result = await db.insert(votes).values({
				downstreamImpactId: voteData.downstreamImpactId,
				userId: voteData.userId,
				voteType: voteData.voteType
			}).returning();

			if (result.length === 0) {
				throw new Error('Failed to create vote: No data returned');
			}
			return result[0];
		}
	}

	async getByDownstreamImpactId(downstreamImpactId: string): Promise<Vote[]> {
		return await db
			.select()
			.from(votes)
			.where(eq(votes.downstreamImpactId, downstreamImpactId));
	}

	async getUserVote(userId: string, downstreamImpactId: string): Promise<Vote | null> {
		const result = await db
			.select()
			.from(votes)
			.where(and(
				eq(votes.userId, userId),
				eq(votes.downstreamImpactId, downstreamImpactId)
			))
			.limit(1);

		return result.length > 0 ? result[0] : null;
	}

	async getVoteCounts(downstreamImpactId: string): Promise<{ upvotes: number; downvotes: number }> {
		const result = await db
			.select({
				upvotes: sql<number>`count(case when ${votes.voteType} = 1 then 1 end)`,
				downvotes: sql<number>`count(case when ${votes.voteType} = -1 then 1 end)`
			})
			.from(votes)
			.where(eq(votes.downstreamImpactId, downstreamImpactId));

		return {
			upvotes: result[0]?.upvotes || 0,
			downvotes: result[0]?.downvotes || 0
		};
	}

	async delete(userId: string, downstreamImpactId: string): Promise<void> {
		await db
			.delete(votes)
			.where(and(
				eq(votes.userId, userId),
				eq(votes.downstreamImpactId, downstreamImpactId)
			));
	}
}
