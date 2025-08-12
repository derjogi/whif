import { createServerClient } from '@supabase/ssr';
import type { RequestEvent } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export function createClient(event: RequestEvent) {
	return createServerClient(
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
}
