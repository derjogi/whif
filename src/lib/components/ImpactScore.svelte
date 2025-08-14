<script lang="ts">
	import Icon from '@iconify/svelte';
	
	export let score: number;
	
	$: normalizedScore = Math.max(-1, Math.min(1, score));
	$: percentage = ((normalizedScore + 1) / 2) * 100;
	$: isPositive = normalizedScore > 0.5;
	$: isNegative = normalizedScore < 0.5;
	$: isNeutral = normalizedScore === 0.5;
	
	$: scoreColor = isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-600';
	$: bgColor = isPositive ? 'bg-green-100' : isNegative ? 'bg-red-100' : 'bg-gray-100';
	$: borderColor = isPositive ? 'border-green-200' : isNegative ? 'border-red-200' : 'border-gray-200';
</script>

<div class="flex items-center space-x-2">
	<div class="text-sm font-medium text-gray-700">Impact:</div>
	
	<div class="flex items-center space-x-2 px-3 py-2 rounded-md {bgColor} border {borderColor}">
		<div class="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
			<div 
				class="h-full transition-all duration-300 {isPositive ? 'bg-green-500' : isNegative ? 'bg-red-500' : 'bg-gray-400'}"
				style="width: {percentage}%"
			></div>
		</div>
		
		<span class="text-sm font-semibold {scoreColor} min-w-[40px] text-center">
			{normalizedScore.toFixed(3)}
		</span>
	</div>
	
	{#if isPositive}
		<Icon icon="mdi:trending-up" class="w-4 h-4 text-green-500" />
	{:else if isNegative}
		<Icon icon="mdi:trending-down" class="w-4 h-4 text-red-500" />
	{:else}
		<Icon icon="mdi:minus" class="w-4 h-4 text-gray-500" />
	{/if}
</div>
