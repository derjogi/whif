<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Icon from '@iconify/svelte';	
	let status = 'Processing authentication...';
	let error: string | null = null;
	
	onMount(async () => {
		try {
			// The OAuth callback will be handled by Supabase automatically
			// We just need to wait a moment and then redirect
			status = 'Authentication successful! Redirecting...';
			
			// Wait a moment for the session to be established
			await new Promise(resolve => setTimeout(resolve, 1500));
			
			// Redirect to dashboard
			goto('/');
		} catch (err) {
			error = 'Authentication failed. Please try again.';
			console.error('Auth callback error:', err);
		}
	});
</script>

<div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
	<div class="sm:mx-auto sm:w-full sm:max-w-md">
		<div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
			{#if error}
				<Icon icon="mdi:alert-circle" class="w-16 h-16 text-red-400 mx-auto mb-4" />
				<h2 class="text-xl font-semibold text-gray-900 mb-2">Authentication Error</h2>
				<p class="text-gray-600 mb-6">{error}</p>
				<a
					href="/auth"
					class="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
				>
					Try Again
				</a>
			{:else}
				<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
				<h2 class="text-xl font-semibold text-gray-900 mb-2">Completing Sign In</h2>
				<p class="text-gray-600">{status}</p>
			{/if}
		</div>
	</div>
</div>
