<script lang="ts">
	import { goto } from '$app/navigation';
	import Icon from '@iconify/svelte';
	import IdeaCard from '$lib/components/IdeaCard.svelte';
	import SearchBox from '$lib/components/SearchBox.svelte';
	import EmptyDashboard from '$lib/components/EmptyDashboard.svelte';
	import type { Idea } from '$lib/server/database/schema';
	import type { User } from '@supabase/supabase-js';
	
	export let data: {ideas: Idea[], user: User, error?: string};
	
	let searchQuery = '';
	
	function handleSearch(event: CustomEvent<string>) {
		searchQuery = event.detail;
		// TODO: filter the ideas here
	}
	
	function handleCreateIdea() {
		goto('/create');
	}
	
	$: filteredIdeas = data.ideas.filter((idea: Idea) => 
		idea.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
		idea.text.toLowerCase().includes(searchQuery.toLowerCase())
	);
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">Dashboard</h1>
			<p class="mt-2 text-gray-600">Manage and explore your impact analysis ideas</p>
		</div>
		
		<button
			on:click={handleCreateIdea}
			class="mt-4 sm:mt-0 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
		>
			<Icon icon="mdi:plus" class="w-5 h-5" />
			<span>Create New Idea</span>
		</button>
	</div>
	
	<!-- Search -->
	<SearchBox on:search={handleSearch} />
	
	<!-- Content -->
	{#if !data.user}
		<div class="text-center py-12">
			<Icon icon="mdi:account-lock" class="w-16 h-16 text-gray-400 mx-auto mb-4" />
			<h3 class="text-lg font-medium text-gray-900 mb-2">Sign in to view your ideas</h3>
			<p class="text-gray-600 mb-6">Create an account or sign in to start analyzing the impact of your ideas.</p>
			<a
				href="/auth"
				class="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
			>
				Sign In
			</a>
		</div>
	{:else if data.error}
		<div class="text-center py-12">
			<Icon icon="mdi:alert-circle" class="w-16 h-16 text-red-400 mx-auto mb-4" />
			<h3 class="text-lg font-medium text-gray-900 mb-2">Error Loading Ideas</h3>
			<p class="text-gray-600 mb-6">{data.error}</p>
			<button
				on:click={() => window.location.reload()}
				class="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
			>
				Try Again
			</button>
		</div>
	{:else if data.ideas.length === 0}
		<EmptyDashboard on:createIdea={handleCreateIdea} />
	{:else}
		<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
			{#each filteredIdeas as idea (idea.id)}
				<IdeaCard {idea} />
			{/each}
		</div>
		
		{#if filteredIdeas.length === 0 && searchQuery}
			<div class="text-center py-12">
				<Icon icon="mdi:magnify" class="w-16 h-16 text-gray-400 mx-auto mb-4" />
				<h3 class="text-lg font-medium text-gray-900 mb-2">No ideas found</h3>
				<p class="text-gray-600">Try adjusting your search terms or create a new idea.</p>
			</div>
		{/if}
	{/if}
</div>
