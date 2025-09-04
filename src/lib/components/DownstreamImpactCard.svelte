<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { supabase } from '$lib/supabase/client';
	import VoteButtons from './VoteButtons.svelte';
	import ImpactScore from './ImpactScore.svelte';
	import MetricsBadge from './MetricsBadge.svelte';

	export let impact: any;
	export let userId: string | undefined;

	let currentUserVote: number | null = null;
	let upvotes = 0;
	let downvotes = 0;
	let calculatedScore = impact.calculated_impact_score || 0.5;

	// Real-time subscription for vote updates
	let subscription: any = null;

	onMount(async () => {
		await loadVoteData();
		setupRealtimeSubscription();
	});

	onDestroy(() => {
		if (subscription) {
			subscription.unsubscribe();
		}
	});

	async function loadVoteData() {
		try {
			// Get all votes for the downstream impact
			const { data: votes } = await supabase
				.from('votes')
				.select('vote_type, user_id')
				.eq('downstream_impact_id', impact.id);

			if (votes) {
				upvotes = votes.filter(v => v.vote_type === 1).length;
				downvotes = votes.filter(v => v.vote_type === -1).length;

				// Set current user's vote if logged in
				if (userId) {
					const userVote = votes.find(v => v.user_id === userId);
					currentUserVote = userVote?.vote_type || null;
				}
			}
		} catch (error) {
			console.error('Error loading vote data:', error);
		}
	}

	const triggerRealtimeUpdate = async (payload: any) => {
		console.log("Postgres changes received:", payload);
		console.log("Payload structure:", JSON.stringify(payload, null, 2));

		// Handle postgres_changes payload
		console.log("Processing vote change for downstream impact:", impact.id);

		// Recalculate vote counts from database changes
		try {
			// Fetch current vote counts
			const { data: votes } = await supabase
				.from('votes')
				.select('vote_type,user_id')
				.eq('downstream_impact_id', impact.id);

			if (votes) {
				upvotes = votes.filter(v => v.vote_type === 1).length;
				downvotes = votes.filter(v => v.vote_type === -1).length;
			}

			// Update current user's vote if logged in
			if (userId) {
				const userVote = votes?.find(v => v.user_id === userId)
				currentUserVote = userVote?.vote_type || null;
			}

			// Fetch updated impact score
			const { data: updatedImpact } = await supabase
				.from('downstream_impacts')
				.select('calculated_impact_score')
				.eq('id', impact.id)
				.single();

			if (updatedImpact) {
				calculatedScore = updatedImpact.calculated_impact_score;
				console.log(`Updated impact score: ${calculatedScore}`);
			}

			console.log(`Recalculated votes for downstream impact ${impact.id}: ${upvotes} up, ${downvotes} down, user vote: ${currentUserVote}`);
		} catch (error) {
			console.error('Error recalculating vote data:', error);
		}
	}

	function setupRealtimeSubscription() {
		console.log(`Setting up realtime subscription for downstream impact ${impact.id}`);
		subscription = supabase
			.channel(`downstream_impact_votes_realtime_${impact.id}`)
			.on('postgres_changes',
			{
				event: '*',
				schema: 'public',
				table: 'votes',
				filter: `downstream_impact_id=eq.${impact.id}`
			}, async (payload) => {
				console.log('Postgres changes event received:', payload);
				await triggerRealtimeUpdate(payload);
			})
			.subscribe();
	}
</script>

<div class="bg-gray-50 border border-gray-200 rounded-lg p-4 ml-6">
	<!-- Impact Text -->
	<div class="mb-3">
		<p class="text-gray-900 text-base leading-relaxed">
			{impact.impact_text}
		</p>
	</div>

	<!-- Metrics -->
	{#if impact.statement_metrics && impact.statement_metrics.length > 0}
		<div class="mb-3">
			<div class="flex flex-wrap gap-2">
				{#each impact.statement_metrics as metric}
					<MetricsBadge
						name={metric.metric_name}
						value={metric.metric_value}
					/>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Impact Score and Voting -->
	<div class="flex items-center justify-between">
		<div class="flex items-center space-x-3">
			<ImpactScore score={calculatedScore} />
			<div class="text-sm text-gray-500">
				<span class="font-medium">{upvotes}</span> upvotes, <span class="font-medium">{downvotes}</span> downvotes
			</div>
		</div>

		{#if userId}
			<VoteButtons
				downstreamImpactId={impact.id}
				{currentUserVote}
				{upvotes}
				{downvotes}
			/>
		{:else}
			<div class="text-sm text-gray-500 bg-gray-100 px-3 py-2 rounded-md">
				Sign in to vote
			</div>
		{/if}
	</div>
</div>