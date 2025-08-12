<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import Icon from '@iconify/svelte';
	
	const dispatch = createEventDispatcher();
	
	export let files: File[] = [];
	
	function formatFileSize(bytes: number): string {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}
	
	function getFileIcon(fileType: string): string {
		if (fileType.includes('pdf')) return 'mdi:file-pdf-box';
		if (fileType.includes('word') || fileType.includes('document')) return 'mdi:file-word-box';
		if (fileType.includes('text') || fileType.includes('markdown')) return 'mdi:file-document';
		return 'mdi:file';
	}
	
	function handleRemove(index: number) {
		dispatch('remove', index);
	}
</script>

<div class="space-y-3">
	<h4 class="text-sm font-medium text-gray-700">Uploaded Files ({files.length})</h4>
	
	{#each files as file, index (index)}
		<div class="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-200">
			<div class="flex items-center space-x-3">
				<Icon icon={getFileIcon(file.type)} class="w-6 h-6 text-gray-500" />
				<div>
					<p class="text-sm font-medium text-gray-900">{file.name}</p>
					<p class="text-xs text-gray-500">{formatFileSize(file.size)}</p>
				</div>
			</div>
			
			<button
				type="button"
				on:click={() => handleRemove(index)}
				class="text-gray-400 hover:text-red-500 transition-colors"
				title="Remove file"
			>
				<Icon icon="mdi:close" class="w-5 h-5" />
			</button>
		</div>
	{/each}
</div>
