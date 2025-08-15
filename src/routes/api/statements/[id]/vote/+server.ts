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

		const repositories = createRepositories(locals.supabase);
		
		if (voteType === 0) {
			// Remove vote (toggle off)
			await repositories.votes.delete(locals.user.id, params.id);
		} else {
			// Upsert vote
			console.log('Upserting vote...');
			await repositories.votes.upsert({
				statementId: params.id,
				userId: locals.user.id,
				voteType
			});
		}

		return json({ success: true });
	} catch (error) {
		console.error(`Vote action failed for statement ${params.id}:`, error);
		return json({ error: 'Vote failed' }, { status: 500 });
	}
};
