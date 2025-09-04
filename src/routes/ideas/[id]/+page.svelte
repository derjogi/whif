<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { supabase } from '$lib/supabase/client';
	import Icon from '@iconify/svelte';
	import StatementList from '$lib/components/StatementList.svelte';
	import SummaryBox from '$lib/components/SummaryBox.svelte';
	import Disclaimer from '$lib/components/Disclaimer.svelte';
	import LoadingSkeleton from '$lib/components/LoadingSkeleton.svelte';
	
	let idea: any = null;
	let categories: any[] = [];
	let loading = true;
	let error: string | null = null;
	
	onMount(async () => {
		await loadIdeaData();
	});
	
	async function loadIdeaData() {
		try {
			const ideaId = $page.params.id;
			
			// Load idea details
			const { data: ideaData, error: ideaError } = await supabase
				.from('ideas')
				.select('*')
				.eq('id', ideaId)
				.single();
				
			if (ideaError) throw ideaError;
			idea = ideaData;
			
			// Load categories with downstream impacts
			const { data: categoriesData, error: categoriesError } = await supabase
				.from('categories')
				.select(`
					*,
					downstream_impacts(
						*,
						statement_metrics(*),
						votes(vote_type)
					)
				`)
				.eq('idea_id', ideaId)
				.order('created_at', { ascending: false });

			if (categoriesError) throw categoriesError;
			categories = categoriesData || [];
			
		} catch (err) {
			console.error('Error loading idea data:', err);
			error = 'Failed to load idea data. Please try again.';
		} finally {
			loading = false;
		}
	}
</script>

<div class="max-w-6xl mx-auto">
	{#if loading}
		<LoadingSkeleton />
	{:else if error}
		<div class="text-center py-12">
			<Icon icon="mdi:alert-circle" class="w-16 h-16 text-red-400 mx-auto mb-4" />
			<h3 class="text-lg font-medium text-gray-900 mb-2">Error Loading Idea</h3>
			<p class="text-gray-600 mb-6">{error}</p>
			<button
				on:click={loadIdeaData}
				class="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
			>
				Try Again
			</button>
		</div>
	{:else if idea}
		<!-- Header -->
		<div class="mb-8">
			<div class="flex items-start justify-between mb-4">
				<div>
					<h1 class="text-3xl font-bold text-gray-900">{idea.title}</h1>
					<p class="mt-2 text-gray-600 text-lg">
						{idea.text}
					</p>
				</div>
				<div class="flex-shrink-0 ml-4">
					<Icon icon="mdi:lightbulb" class="w-12 h-12 text-blue-500" />
				</div>
			</div>
			
			<div class="flex items-center space-x-4 text-sm text-gray-500">
				<span>Created {new Date(idea.created_at).toLocaleDateString()}</span>
				{#if idea.updated_at !== idea.created_at}
					<span>Updated {new Date(idea.updated_at).toLocaleDateString()}</span>
				{/if}
			</div>
		</div>
		
		<!-- Disclaimer -->
		<Disclaimer />
		
		<!-- Summary Box -->
		{#if idea.summary}
			<SummaryBox summary={idea.summary} />
		{/if}
		
		<!-- Statements -->
		<div class="mt-8">
			<h2 class="text-2xl font-bold text-gray-900 mb-6">Impact Analysis</h2>
			
			{#if categories.length === 0}
				<div class="text-center py-12 bg-gray-50 rounded-lg">
					<Icon icon="mdi:brain" class="w-16 h-16 text-gray-400 mx-auto mb-4" />
					<h3 class="text-lg font-medium text-gray-900 mb-2">No Analysis Results Yet</h3>
					<p class="text-gray-600">The AI analysis is still in progress or has not been completed.</p>
				</div>
			{:else}
				<StatementList {categories} ideaId={idea.id} />
			{/if}
		</div>
		
		<!-- Data Visualization Placeholder -->
		<div class="mt-12 p-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
			<div class="text-center">
				<Icon icon="mdi:chart-line" class="w-16 h-16 text-gray-400 mx-auto mb-4" />
				<h3 class="text-lg font-medium text-gray-900 mb-2">Impact Visualization</h3>
				<p class="text-gray-600 mb-4">
					Charts and visualizations will be implemented in future updates to help you better understand the aggregated impact data.
				</p>
				<div class="text-sm text-gray-500">
					<p>Planned features: Doughnut charts, bar charts, and trend visualizations</p>
				</div>
			</div>
		</div>
	{/if}
</div>
