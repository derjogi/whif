<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { supabase } from '$lib/supabase/client';
	import DownstreamImpactCard from './DownstreamImpactCard.svelte';
	import ImpactScore from './ImpactScore.svelte';

	export let category: any;
	export let userId: string | undefined;

	let showResearch = false;
	let downstreamImpacts = category.downstream_impacts || [];

	// Real-time subscription for category updates
	let subscription: any = null;

	onMount(async () => {
		setupRealtimeSubscription();
	});

	onDestroy(() => {
		if (subscription) {
			subscription.unsubscribe();
		}
	});

	function setupRealtimeSubscription() {
		console.log(`Setting up realtime subscription for category ${category.id}`);
		subscription = supabase
			.channel(`category_realtime_${category.id}`)
			.on('postgres_changes',
			{
				event: '*',
				schema: 'public',
				table: 'downstream_impacts',
				filter: `category_id=eq.${category.id}`
			}, async (payload) => {
				console.log('Category downstream impact change received:', payload);
				// Refresh downstream impacts when changes occur
				await refreshDownstreamImpacts();
			})
			.subscribe();
	}

	async function refreshDownstreamImpacts() {
		try {
			const { data, error } = await supabase
				.from('downstream_impacts')
				.select(`
					*,
					statement_metrics(*),
					votes(vote_type)
				`)
				.eq('category_id', category.id)
				.order('created_at', { ascending: true });

			if (error) throw error;
			downstreamImpacts = data || [];
		} catch (error) {
			console.error('Error refreshing downstream impacts:', error);
		}
	}
</script>

<div class="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
	<!-- Category Header -->
	<div class="mb-4">
		<div class="flex items-center justify-between mb-2">
			<h3 class="text-xl font-semibold text-gray-900">{category.name}</h3>
			<div class="flex items-center space-x-4">
				<ImpactScore score={category.evaluated_score} />
				<button
					on:click={() => showResearch = !showResearch}
					class="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
				>
				{#if showResearch}
					<span class="text-lg">▼</span>
					<span>Hide Research</span>
				{:else}
					<span class="text-lg">▶</span>
					<span>Show Research</span>
				{/if}
				</button>
			</div>
		</div>
	</div>

	<!-- Expandable Research Findings -->
	{#if showResearch && category.research_findings}
		<div class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
			<h4 class="text-sm font-medium text-blue-900 mb-2">Research Findings</h4>
			<div class="text-sm text-blue-800 whitespace-pre-wrap">
				{category.research_findings}
			</div>
		</div>
	{/if}

	<!-- Downstream Impacts -->
	<div class="space-y-4">
		<h4 class="text-lg font-medium text-gray-900 mb-3">
			Downstream Impacts ({downstreamImpacts.length})
		</h4>

		{#if downstreamImpacts.length === 0}
			<div class="text-center py-8 text-gray-500">
				<p>No downstream impacts available for this category.</p>
			</div>
		{:else}
			{#each downstreamImpacts as impact (impact.id)}
				<DownstreamImpactCard
					{impact}
					{userId}
				/>
			{/each}
		{/if}
	</div>
</div>