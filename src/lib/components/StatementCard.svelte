<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { supabase } from '$lib/supabase/client';
	import VoteButtons from './VoteButtons.svelte';
	import ImpactScore from './ImpactScore.svelte';
	import MetricsBadge from './MetricsBadge.svelte';
	
	export let statement: any;
	export let userId: string | undefined;
	
	let currentUserVote: number | null = null;
	let upvotes = 0;
	let downvotes = 0;
	let calculatedScore = statement.calculated_impact_score || 0.5;
	
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
		if (!userId) return;
		
		try {
			// Get user's current vote
			const { data: userVote } = await supabase
				.from('votes')
				.select('vote_type')
				.eq('statement_id', statement.id)
				.eq('user_id', userId)
				.single();
				
			currentUserVote = userVote?.vote_type || null;
			
			// Get vote counts
			const { data: votes } = await supabase
				.from('votes')
				.select('vote_type')
				.eq('statement_id', statement.id);
				
			if (votes) {
				upvotes = votes.filter(v => v.vote_type === 1).length;
				downvotes = votes.filter(v => v.vote_type === -1).length;
			}
		} catch (error) {
			console.error('Error loading vote data:', error);
		}
	}
	
	const triggerRealtimeUpdate = async (payload: any) => {
		console.log("Postgres changes received:", payload);
		console.log("Payload structure:", JSON.stringify(payload, null, 2));

		// Handle postgres_changes payload
		// Since we have a filter on statement_id, we know this is for our statement
		console.log("Processing vote change for statement:", statement.id);

		// Recalculate vote counts from database changes
		try {
			// Fetch current vote counts
			const { data: votes } = await supabase
				.from('votes')
				.select('vote_type')
				.eq('statement_id', statement.id);

			if (votes) {
				upvotes = votes.filter(v => v.vote_type === 1).length;
				downvotes = votes.filter(v => v.vote_type === -1).length;
			}

			// Update current user's vote if logged in
			if (userId) {
				const { data: userVote } = await supabase
					.from('votes')
					.select('vote_type')
					.eq('statement_id', statement.id)
					.eq('user_id', userId)
					.single();

				currentUserVote = userVote?.vote_type || null;
			}

			// Fetch updated impact score
			const { data: updatedStatement } = await supabase
				.from('statements')
				.select('calculated_impact_score')
				.eq('id', statement.id)
				.single();

			if (updatedStatement) {
				calculatedScore = updatedStatement.calculated_impact_score;
				console.log(`Updated impact score: ${calculatedScore}`);
			}

			console.log(`Recalculated votes for statement ${statement.id}: ${upvotes} up, ${downvotes} down, user vote: ${currentUserVote}`);
		} catch (error) {
			console.error('Error recalculating vote data:', error);
		}
	}

	function setupRealtimeSubscription() {
		console.log(`Setting up realtime subscription for statement ${statement.id}`);
		subscription = supabase
			.channel(`votes_realtime_${statement.id}`)
			.on('postgres_changes',
			{
				event: '*',
				schema: 'public',
				table: 'votes',
				filter: `statement_id=eq.${statement.id}`
			}, async (payload) => {
				console.log('Postgres changes event received:', payload);
				await triggerRealtimeUpdate(payload);
			})
			.subscribe();
	}
</script>

<div class="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
	<!-- Statement Text -->
	<div class="mb-4">
		<p class="text-gray-900 text-lg leading-relaxed">
			{statement.text}
		</p>
	</div>
	
	<!-- Metrics -->
	{#if statement.statement_metrics && statement.statement_metrics.length > 0}
		<div class="mb-4">
			<div class="flex flex-wrap gap-2">
				{#each statement.statement_metrics as metric}
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
		<div class="flex items-center space-x-4">
			<ImpactScore score={calculatedScore} />
			<div class="text-sm text-gray-500">
				<span class="font-medium">{upvotes + downvotes}</span> votes
			</div>
		</div>
		
		{#if userId}
			<VoteButtons
				statementId={statement.id}
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
