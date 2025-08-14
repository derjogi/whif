<script lang="ts">
	import { enhance } from '$app/forms';
	import Icon from '@iconify/svelte';
	import TextArea from './TextArea.svelte';
	import FileUpload from './FileUpload.svelte';
	import FileList from './FileList.svelte';
	import CharacterCounter from './CharacterCounter.svelte';
	
	let title = '';
	let ideaText = '';
	let files: File[] = [];
	let isSubmitting = false;
	
	function handleFileUpload(event: CustomEvent<File[]>) {
		files = [...files, ...event.detail];
	}
	
	function handleFileRemove(event: CustomEvent<number>) {
		const index = event.detail;
		files = files.filter((_, i) => i !== index);
	}
</script>

<form 
	method="POST" 
	action="?/createIdea"
	use:enhance={() => {
		isSubmitting = true;
		return async ({ result }) => {
			isSubmitting = false;
			if (result.type === 'failure') {
				// Handle error - you could show a toast here
				console.error('Form submission failed:', result.data?.error);
			}
		};
	}}
	class="space-y-6"
>
	<!-- Title Input -->
	<div>
		<label for="title" class="block text-sm font-medium text-gray-700 mb-2">
			Idea Title *
		</label>
		<input
			id="title"
			name="title"
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
			name="idea"
			bind:value={ideaText}
			required
			placeholder="Describe your idea, solution, policy, or innovation in detail. Consider including context, goals, and implementation approach..."
			maxLength={64000}
		/>
		<CharacterCounter current={ideaText.length} max={64000} />
	</div>
	
	<!-- File Upload -->
	<div>
		<label for="file-upload" class="block text-sm font-medium text-gray-700 mb-2">
			Supporting Documents (Optional)
		</label>
		<FileUpload id="file-upload" on:upload={handleFileUpload} />
		{#if files.length > 0}
			<FileList {files} on:remove={handleFileRemove} />
		{/if}
	</div>
	
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
