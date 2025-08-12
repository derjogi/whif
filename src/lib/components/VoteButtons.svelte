<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import Icon from '@iconify/svelte';	
	const dispatch = createEventDispatcher();
	
	export let statementId: string;
	export let currentUserVote: number | null;
	export let upvotes: number;
	export let downvotes: number;
	
	let isVoting = false;
	
	async function handleVote(voteType: number) {
		if (isVoting) return;
		
		isVoting = true;
		
		try {
			// Optimistic update
			const newVoteType = currentUserVote === voteType ? null : voteType;
			
			if (newVoteType === null) {
				// Remove vote
				dispatch('vote', { statementId, voteType: 0 });
			} else {
				// Add/change vote
				dispatch('vote', { statementId, voteType: newVoteType });
			}
		} catch (error) {
			console.error('Vote failed:', error);
		} finally {
			isVoting = false;
		}
	}
</script>

<div class="flex items-center space-x-2">
	<!-- Upvote Button -->
	<button
		type="button"
		on:click={() => handleVote(1)}
		disabled={isVoting}
		class="flex items-center space-x-1 px-3 py-2 rounded-md transition-colors {currentUserVote === 1 ? 'bg-green-100 text-green-700 border border-green-200' : 'text-gray-600 hover:bg-gray-100'} disabled:opacity-50 disabled:cursor-not-allowed"
		title="Upvote this statement"
	>
		<Icon icon="mdi:thumb-up" class="w-4 h-4" />
		<span class="text-sm font-medium">{upvotes}</span>
	</button>
	
	<!-- Impact Score Display -->
	<div class="px-3 py-2 text-center min-w-[60px]">
		<div class="text-xs text-gray-500 mb-1">Score</div>
		<div class="text-sm font-semibold text-gray-900">
			{((upvotes + 0.5) / (upvotes + downvotes + 1)).toFixed(3)}
		</div>
	</div>
	
	<!-- Downvote Button -->
	<button
		type="button"
		on:click={() => handleVote(-1)}
		disabled={isVoting}
		class="flex items-center space-x-1 px-3 py-2 rounded-md transition-colors {currentUserVote === -1 ? 'bg-red-100 text-red-700 border border-red-200' : 'text-gray-600 hover:bg-gray-100'} disabled:opacity-50 disabled:cursor-not-allowed"
		title="Downvote this statement"
	>
		<Icon icon="mdi:thumb-down" class="w-4 h-4" />
		<span class="text-sm font-medium">{downvotes}</span>
	</button>
</div>
