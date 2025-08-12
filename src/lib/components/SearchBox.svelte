<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import Icon from '@iconify/svelte';	
	const dispatch = createEventDispatcher();
	
	let searchValue = '';
	
	function handleSearch() {
		dispatch('search', searchValue);
	}
	
	function handleInput() {
		handleSearch();
	}
</script>

<div class="relative">
	<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
		<Icon icon="mdi:magnify" class="h-5 w-5 text-gray-400" />
	</div>
	<input
		type="text"
		bind:value={searchValue}
		on:input={handleInput}
		placeholder="Search ideas..."
		class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
	/>
</div>
