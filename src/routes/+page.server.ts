import type { PageServerLoad } from './$types';
import { createRepositories } from '$lib/server/database/supabase';
import type { Idea } from '$lib/server/database/schema';

export const load: PageServerLoad = async ({ locals }) => {
	// If no user, return empty data
	if (!locals.user) {
		return {
			ideas: [],
			user: null
		};
	}

	try {
		const repositories = createRepositories();
		const ideas: Idea[] = await repositories.ideas.getPublished();
		
		return {
			ideas,
			user: locals.user
		};
	} catch (error) {
		console.error('Error loading dashboard data:', error);
		return {
			ideas: [],
			user: locals.user,
			error: 'Failed to load ideas'
		};
	}
};
