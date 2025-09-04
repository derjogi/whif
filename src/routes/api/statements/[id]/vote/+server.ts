import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createRepositories } from '$lib/server/database/supabase';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Authentication required' }, { status: 401 });
	}

	try {
		const { voteType } = await request.json();
		console.log('Vote type requested:', voteType);
		
		// Validate vote type
		if (![1, -1, 0].includes(voteType)) {
			return json({ error: 'Invalid vote type' }, { status: 400 });
		}

		const repositories = createRepositories();
		
		if (voteType === 0) {
			// Remove vote (toggle off)
			console.log(`Deleting vote for user ${locals.user.id} on statement ${params.id}`);
			await repositories.votes.delete(locals.user.id, params.id);
			console.log('Vote deleted successfully');
		} else {
			// Upsert vote
			console.log(`Upserting vote type ${voteType} for user ${locals.user.id} on statement ${params.id}`);
			await repositories.votes.upsert({
				downstreamImpactId: params.id,
				userId: locals.user.id,
				voteType
			});
			console.log('Vote upserted successfully');
		}

		console.log('Vote operation completed, expecting realtime update');
		return json({ success: true });
	} catch (error) {
		console.error(`Vote action failed for statement ${params.id}:`, error);
		return json({ error: 'Vote failed' }, { status: 500 });
	}
};
