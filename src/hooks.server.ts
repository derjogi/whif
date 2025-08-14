import { createServerClient } from '@supabase/ssr';
import type { Handle } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export const handle: Handle = async ({ event, resolve }) => {
	// Create Supabase server client
	const supabase = createServerClient(
		PUBLIC_SUPABASE_URL,
		PUBLIC_SUPABASE_ANON_KEY,
		{
			cookies: {
				get(name: string) {
					return event.cookies.get(name);
				},
				set(name: string, value: string, options: any) {
					event.cookies.set(name, value, options);
				},
				remove(name: string, options: any) {
					event.cookies.delete(name, options);
				},
			},
		}
	);

	// Get session and user
	const {
		data: { session }
	} = await supabase.auth.getSession();

	// Add Supabase client and session to locals
	event.locals.supabase = supabase;
	event.locals.session = session;
	event.locals.user = session?.user || null;

	// Handle auth callback
	if (event.url.pathname.startsWith('/auth/callback')) {
		const code = event.url.searchParams.get('code');
		if (code) {
			await supabase.auth.exchangeCodeForSession(code);
		}
	}

	return resolve(event);
};
