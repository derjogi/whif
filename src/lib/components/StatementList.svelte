<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase/client';
	import CategoryCard from './CategoryCard.svelte';

	export let categories: any[];
	export let ideaId: string;

	let currentUser: any = null;

	onMount(async () => {
		// Get current user for voting
		const { data: { user } } = await supabase.auth.getUser();
		currentUser = user;
	});
</script>

<div class="space-y-6">
	{#each categories as category (category.id)}
		<CategoryCard
			{category}
			userId={currentUser?.id}
		/>
	{/each}
</div>
