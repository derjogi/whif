<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase/client';
	import StatementCard from './StatementCard.svelte';
	
	export let statements: any[];
	export let ideaId: string;
	
	let currentUser: any = null;
	
	onMount(async () => {
		// Get current user for voting
		const { data: { user } } = await supabase.auth.getUser();
		currentUser = user;
	});
</script>

<div class="space-y-6">
	{#each statements as statement (statement.id)}
		<StatementCard 
			{statement} 
			userId={currentUser?.id}
		/>
	{/each}
</div>
