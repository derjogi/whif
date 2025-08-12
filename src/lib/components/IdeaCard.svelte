<script lang="ts">
	import { goto } from '$app/navigation';
	import Icon from '@iconify/svelte';
	
	export let idea: any;
	
	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}
	
	function truncateText(text: string, maxLength: number = 150) {
		if (text.length <= maxLength) return text;
		return text.substring(0, maxLength) + '...';
	}
	
	function handleViewIdea() {
		goto(`/ideas/${idea.id}`);
	}
	
	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			handleViewIdea();
		}
	}
</script>

<button
	type="button"
	on:click={handleViewIdea}
	on:keydown={handleKeyDown}
	class="w-full text-left bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
	aria-label="View idea: {idea.title}"
>
	<div class="p-6">
		<div class="flex items-start justify-between mb-4">
			<h3 class="text-lg font-semibold text-gray-900 line-clamp-2">
				{idea.title}
			</h3>
			<div class="flex-shrink-0 ml-2">
				<Icon icon="mdi:lightbulb" class="w-5 h-5 text-blue-500" />
			</div>
		</div>
		
		<p class="text-gray-600 text-sm mb-4 line-clamp-3">
			{truncateText(idea.text)}
		</p>
		
		{#if idea.summary}
			<div class="mb-4 p-3 bg-blue-50 rounded-md">
				<p class="text-sm text-blue-800 line-clamp-2">
					{idea.summary}
				</p>
			</div>
		{/if}
		
		<div class="flex items-center justify-between text-sm text-gray-500">
			<span>Created {formatDate(idea.created_at)}</span>
			<div class="flex items-center space-x-1">
				<Icon icon="mdi:eye" class="w-4 h-4" />
				<span>View</span>
			</div>
		</div>
	</div>
</button>

<style>
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	
	.line-clamp-3 {
		display: -webkit-box;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
