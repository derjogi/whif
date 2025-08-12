<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase/client';
	import { goto } from '$app/navigation';
	import Icon from '@iconify/svelte';
	import IdeaCard from '$lib/components/IdeaCard.svelte';
	import SearchBox from '$lib/components/SearchBox.svelte';
	import EmptyDashboard from '$lib/components/EmptyDashboard.svelte';
	
	let ideas: any[] = [];
	let loading = true;
	let searchQuery = '';
	let user: any = null;
	
	onMount(async () => {
		// Get current user
		const { data: { session } } = await supabase.auth.getSession();
		user = session?.user;
		
		if (user) {
			await loadIdeas();
		}
		loading = false;
	});
	
	async function loadIdeas() {
		try {
			const { data, error } = await supabase
				.from('ideas')
				.select('*')
				.eq('user_id', user.id)
				.order('created_at', { ascending: false });
				
			if (error) throw error;
			ideas = data || [];
		} catch (error) {
			console.error('Error loading ideas:', error);
		}
	}
	
	function handleSearch(query: string) {
		searchQuery = query;
		// In a real app, you'd filter the ideas here
	}
	
	function handleCreateIdea() {
		goto('/create');
	}
	
	$: filteredIdeas = ideas.filter(idea => 
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
	{#if loading}
		<div class="flex justify-center py-12">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
		</div>
	{:else if !user}
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
	{:else if ideas.length === 0}
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
