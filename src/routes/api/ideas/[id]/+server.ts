import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createRepositories } from '$lib/server/database/supabase';

export const GET: RequestHandler = async ({ params, locals }) => {
	try {
		const repositories = createRepositories(locals.supabase);
		const idea = await repositories.ideas.getById(params.id);
		
		if (!idea) {
			return json({ error: 'Idea not found' }, { status: 404 });
		}
		
		return json(idea);
	} catch (error) {
		console.error('Error fetching idea:', error);
		return json({ error: 'Failed to fetch idea' }, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const repositories = createRepositories(locals.supabase);
		const updates = await request.json();
		
		// Ensure user can only update their own ideas
		const existingIdea = await repositories.ideas.getById(params.id);
		if (!existingIdea || existingIdea.userId !== locals.user.id) {
			return json({ error: 'Forbidden' }, { status: 403 });
		}
		
		const updatedIdea = await repositories.ideas.update(params.id, updates);
		return json(updatedIdea);
	} catch (error) {
		console.error('Error updating idea:', error);
		return json({ error: 'Failed to update idea' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const repositories = createRepositories(locals.supabase);
		
		// Ensure user can only delete their own ideas
		const existingIdea = await repositories.ideas.getById(params.id);
		if (!existingIdea || existingIdea.userId !== locals.user.id) {
			return json({ error: 'Forbidden' }, { status: 403 });
		}
		
		await repositories.ideas.delete(params.id);
		return json({ success: true });
	} catch (error) {
		console.error('Error deleting idea:', error);
		return json({ error: 'Failed to delete idea' }, { status: 500 });
	}
};
