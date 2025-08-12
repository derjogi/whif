<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase/client';
	import { goto } from '$app/navigation';
	import Icon from '@iconify/svelte';	import IdeaCreationForm from '$lib/components/IdeaCreationForm.svelte';
	
	let user: any = null;
	let loading = true;
	
	onMount(async () => {
		// Get current user
		const { data: { session } } = await supabase.auth.getSession();
		user = session?.user;
		
		if (!user) {
			goto('/auth');
			return;
		}
		
		loading = false;
	});
	
	// Listen for auth changes
	supabase.auth.onAuthStateChange((_event, session) => {
		user = session?.user;
		if (!user) {
			goto('/auth');
		}
	});
</script>

<div class="max-w-4xl mx-auto">
	<!-- Header -->
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-gray-900">Create New Idea</h1>
		<p class="mt-2 text-gray-600">
			Describe your idea, solution, or policy to analyze its potential long-term impacts
		</p>
	</div>
	
	{#if loading}
		<div class="flex justify-center py-12">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
		</div>
	{:else}
		<IdeaCreationForm />
	{/if}
</div>
