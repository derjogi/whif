<script lang="ts">
	import Icon from '@iconify/svelte';
	
	export let summary: string;
</script>

<div class="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
	<div class="flex items-start">
		<Icon icon="mdi:summarize" class="w-6 h-6 text-blue-500 mr-3 mt-1 flex-shrink-0" />
		<div>
			<h3 class="text-lg font-semibold text-blue-900 mb-3">Analysis Summary</h3>
			<p class="text-blue-800 leading-relaxed">
				{summary}
			</p>
		</div>
	</div>
</div>
