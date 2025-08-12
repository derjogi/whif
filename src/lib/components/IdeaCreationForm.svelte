<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import Icon from '@iconify/svelte';
	import TextArea from './TextArea.svelte';
	import FileUpload from './FileUpload.svelte';
	import FileList from './FileList.svelte';
	import CharacterCounter from './CharacterCounter.svelte';
	
	const dispatch = createEventDispatcher();
	
	let title = '';
	let ideaText = '';
	let files: File[] = [];
	let isSubmitting = false;
	let error = '';
	
	function handleFileUpload(newFiles: File[]) {
		files = [...files, ...newFiles];
	}
	
	function handleFileRemove(index: number) {
		files = files.filter((_, i) => i !== index);
	}
	
	async function handleSubmit() {
		if (!title.trim() || !ideaText.trim()) {
			error = 'Please fill in both title and idea description';
			return;
		}
		
		if (ideaText.length > 64000) {
			error = 'Idea text exceeds maximum length of 64,000 characters';
			return;
		}
		
		isSubmitting = true;
		error = '';
		
		try {
			// TODO: Implement actual submission logic
			// For now, just simulate success
			await new Promise(resolve => setTimeout(resolve, 2000));
			
			dispatch('success', {
				title,
				text: ideaText,
				files
			});
		} catch (err) {
			error = 'Failed to submit idea. Please try again.';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<form on:submit|preventDefault={handleSubmit} class="space-y-6">
	<!-- Title Input -->
	<div>
		<label for="title" class="block text-sm font-medium text-gray-700 mb-2">
			Idea Title *
		</label>
		<input
			id="title"
			type="text"
			bind:value={title}
			required
			placeholder="Enter a descriptive title for your idea..."
			class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
		/>
	</div>
	
	<!-- Idea Text Input -->
	<div>
		<label for="idea" class="block text-sm font-medium text-gray-700 mb-2">
			Describe your idea or solution *
		</label>
		<TextArea
			id="idea"
			bind:value={ideaText}
			required
			placeholder="Describe your idea, solution, policy, or innovation in detail. Consider including context, goals, and implementation approach..."
			maxLength={64000}
		/>
		<CharacterCounter current={ideaText.length} max={64000} />
	</div>
	
	<!-- File Upload -->
	<div>
		<label class="block text-sm font-medium text-gray-700 mb-2">
			Supporting Documents (Optional)
		</label>
		<FileUpload on:upload={handleFileUpload} />
		{#if files.length > 0}
			<FileList {files} on:remove={handleFileRemove} />
		{/if}
	</div>
	
	<!-- Error Display -->
	{#if error}
		<div class="p-4 bg-red-50 border border-red-200 rounded-md">
			<div class="flex">
				<Icon icon="mdi:alert-circle" class="w-5 h-5 text-red-400 mr-2" />
				<p class="text-sm text-red-800">{error}</p>
			</div>
		</div>
	{/if}
	
	<!-- Submit Button -->
	<div class="flex justify-end">
		<button
			type="submit"
			disabled={isSubmitting || !title.trim() || !ideaText.trim()}
			class="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
		>
			{#if isSubmitting}
				<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
				<span>Analyzing...</span>
			{:else}
				<Icon icon="mdi:brain" class="w-5 h-5" />
				<span>Analyze Impact</span>
			{/if}
		</button>
	</div>
</form>
