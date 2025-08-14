<script lang="ts">
	import Icon from '@iconify/svelte';
	
	export let name: string;
	export let value: number;
	
	$: isPositive = value > 0;
	$: isNegative = value < 0;
	$: isNeutral = value === 0;
	
	$: badgeColor = isPositive ? 'bg-green-100 text-green-800 border-green-200' : 
	                isNegative ? 'bg-red-100 text-red-800 border-red-200' : 
	                'bg-gray-100 text-gray-800 border-gray-200';
	
	$: iconName = isPositive ? 'mdi:trending-up' : 
	              isNegative ? 'mdi:trending-down' : 
	              'mdi:minus';
</script>

<div class="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium border {badgeColor}">
	<Icon icon={iconName} class="w-3 h-3" />
	<span>{name}</span>
	<span class="font-semibold">({value.toFixed(2)})</span>
</div>
