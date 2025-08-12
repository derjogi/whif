import { QueryClient } from '@tanstack/svelte-query';

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60 * 5, // 5 minutes fresh
			gcTime: 1000 * 60 * 10, // 10 minutes retention (formerly cacheTime)
			refetchOnWindowFocus: false,
			retry: 3,
		},
		mutations: {
			retry: 1,
		},
	},
});
