<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import Icon from '@iconify/svelte';
	
	export let id: string;
	
	const dispatch = createEventDispatcher();
	
	let dragActive = false;
	let fileInput: HTMLInputElement;
	
	const allowedTypes = [
		'application/pdf',
		'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		'application/msword',
		'text/plain',
		'text/markdown'
	];
	
	const maxFileSize = 10 * 1024 * 1024; // 10MB
	
	function handleFiles(files: FileList) {
		const validFiles: File[] = [];
		
		for (const file of files) {
			if (allowedTypes.includes(file.type) && file.size <= maxFileSize) {
				validFiles.push(file);
			}
		}
		
		if (validFiles.length > 0) {
			dispatch('upload', validFiles);
		}
	}
	
	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		dragActive = true;
	}
	
	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		dragActive = false;
	}
	
	function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragActive = false;
		
		if (e.dataTransfer?.files) {
			handleFiles(e.dataTransfer.files);
		}
	}
	
	function handleFileSelect() {
		fileInput?.click();
	}
	
	function handleInputChange(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files) {
			handleFiles(target.files);
			// Reset input value to allow selecting the same file again
			target.value = '';
		}
	}
</script>

<div
	role="button"
	tabindex="0"
	class="border-2 border-dashed rounded-lg p-6 text-center transition-colors {dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}"
	on:dragover={handleDragOver}
	on:dragleave={handleDragLeave}
	on:drop={handleDrop}
	on:keydown={(e) => e.key === 'Enter' && handleFileSelect()}
>
	<input
		{id}
		bind:this={fileInput}
		type="file"
		multiple
		accept=".pdf,.docx,.doc,.txt,.md"
		on:change={handleInputChange}
		class="hidden"
	/>
	
	<Icon icon="mdi:cloud-upload" class="w-12 h-12 text-gray-400 mx-auto mb-4" />
	
	<div class="mb-4">
		<p class="text-lg font-medium text-gray-900 mb-2">
			Upload supporting documents
		</p>
		<p class="text-sm text-gray-600">
			Drag and drop files here, or click to browse
		</p>
	</div>
	
	<button
		type="button"
		on:click={handleFileSelect}
		class="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
	>
		Choose Files
	</button>
	
	<div class="mt-4 text-xs text-gray-500">
		<p>Supported formats: PDF, DOCX, DOC, TXT, MD</p>
		<p>Maximum file size: 10MB</p>
	</div>
</div>
