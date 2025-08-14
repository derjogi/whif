import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createRepositories } from '$lib/server/database/supabase';

export const load: PageServerLoad = async ({ url, locals: { session } }) => {
	if (!session?.user) {
		throw redirect(303, `/auth?redirectTo=${url.pathname}`);
	}

	return {
		// You can pass user data to the +page.svelte component here if needed
		user: session.user
	};
};

export const actions: Actions = {
	createIdea: async ({ request, locals, fetch }) => {
		if (!locals.user) {
			return fail(401, { error: 'Authentication required' });
		}

		try {
			const formData = await request.formData();
			const title = formData.get('title') as string;
			const ideaText = formData.get('idea') as string;
			const files = formData.getAll('documents') as File[];

			// Validation
			if (!title?.trim() || !ideaText?.trim()) {
				return fail(400, { error: 'Title and idea text are required' });
			}

			if (ideaText.length > 64000) {
				return fail(400, { error: 'Idea text exceeds maximum length of 64,000 characters' });
			}

			const repositories = createRepositories(locals.supabase);

			// Todo: Handle files/documents

			// Create the idea
			console.log(`Idea to be added to user: ${locals.user.id}`);
			const idea = await repositories.ideas.create({
				userId: locals.user.id,
				title: title.trim(),
				text: ideaText.trim(),
				published: false
			});

			// Trigger AI analysis
			const response = await fetch(`/api/llm/analyze`, {
					method: 'POST',
					headers: {
							'Content-Type': 'application/json'
					},
					body: JSON.stringify({
							ideaId: idea.id,
							proposal: {
									title: title.trim(),
									text: ideaText.trim()
							}
					})
			});

			if (!response.ok) {
					console.error('Failed to trigger AI analysis:', response.status, response.statusText);
			}

			// Redirect to the idea view page
			redirect(303, `/ideas/${idea.id}`);
		} catch (error) {
			console.error('Failed to create idea:', error);
			return fail(500, { error: 'Failed to create idea. Please try again.' });
		}
	}
};
