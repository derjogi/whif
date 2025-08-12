<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import Icon from '@iconify/svelte';
	
	const dispatch = createEventDispatcher();
	
	function handleCreateIdea() {
		dispatch('createIdea');
	}
</script>

<div class="text-center py-16">
	<div class="mx-auto w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-6">
		<Icon icon="mdi:lightbulb-outline" class="w-12 h-12 text-blue-600" />
	</div>
	
	<h3 class="text-2xl font-bold text-gray-900 mb-4">Welcome to WHIF!</h3>
	<p class="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
		You haven't created any ideas yet. Start by describing a solution, policy, or innovation you'd like to analyze for its potential impacts.
	</p>
	
	<button
		on:click={handleCreateIdea}
		class="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-3 mx-auto"
	>
		<Icon icon="mdi:plus" class="w-6 h-6" />
		<span>Create Your First Idea</span>
	</button>
	
	<div class="mt-8 text-sm text-gray-500">
		<p>WHIF helps you think critically about the long-term impacts of your ideas</p>
	</div>
</div>
