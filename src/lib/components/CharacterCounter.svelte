<script lang="ts">
	export let current: number;
	export let max: number;
	
	$: percentage = (current / max) * 100;
	$: isNearLimit = percentage > 80;
	$: isAtLimit = current >= max;
</script>

<div class="flex justify-between items-center text-sm">
	<span class="text-gray-500">
		{current.toLocaleString()} / {max.toLocaleString()} characters
	</span>
	
	<div class="flex items-center space-x-2">
		<div class="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
			<div 
				class="h-full transition-all duration-200 {isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-yellow-500' : 'bg-blue-500'}"
				style="width: {Math.min(percentage, 100)}%"
			></div>
		</div>
		
		{#if isAtLimit}
			<span class="text-red-600 font-medium">Limit reached</span>
		{:else if isNearLimit}
			<span class="text-yellow-600">Near limit</span>
		{/if}
	</div>
</div>
