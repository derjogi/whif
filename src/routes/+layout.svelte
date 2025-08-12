<script lang="ts">
	import '../app.css';
	import { QueryClientProvider } from '@tanstack/svelte-query';
	import { queryClient } from '$lib/queryClient';
	import AppShell from '$lib/components/AppShell.svelte';
</script>

<QueryClientProvider client={queryClient}>
	<AppShell>
		<slot />
	</AppShell>
</QueryClientProvider>
