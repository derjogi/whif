<script lang="ts">
	export let value = '';
	export let placeholder = '';
	export let maxLength: number | undefined = undefined;
	export let required = false;
	export let id = '';
	export let name = '';
</script>

<textarea
	{id}
	{name}
	{placeholder}
	maxlength={maxLength}
	{required}
	bind:value
	class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 resize-vertical min-h-32"
></textarea>
