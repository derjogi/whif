<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase/client';
	import { goto } from '$app/navigation';
	import Icon from '@iconify/svelte';	
	let loading = true;
	let user: any = null;
	
	onMount(async () => {
		// Check if user is already signed in
		const { data: { user } } = await supabase.auth.getUser();
		
		if (user) {
			goto('/');
			return;
		}
		
		loading = false;
	});
	
	async function handleGitHubSignIn() {
		try {
			const { error } = await supabase.auth.signInWithOAuth({
				provider: 'github',
				options: {
					redirectTo: `${window.location.origin}/auth/callback`
				}
			});
			
			if (error) throw error;
		} catch (error) {
			console.error('GitHub sign in error:', error);
		}
	}
	
	async function handleEmailSignIn() {
		// TODO: Implement email/password authentication
		console.log('Email sign in not implemented yet');
	}
</script>

<div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
	<div class="sm:mx-auto sm:w-full sm:max-w-md">
		<div class="flex justify-center">
			<Icon icon="mdi:lightbulb-on" class="w-12 h-12 text-blue-600" />
		</div>
		<h2 class="mt-6 text-center text-3xl font-bold text-gray-900">
			Welcome to WHIF
		</h2>
		<p class="mt-2 text-center text-sm text-gray-600">
			Sign in to analyze the impact of your ideas
		</p>
	</div>
	
	<div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
		<div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
			{#if loading}
				<div class="flex justify-center">
					<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
				</div>
			{:else}
				<div class="space-y-4">
					<!-- GitHub Sign In -->
					<button
						on:click={handleGitHubSignIn}
						class="w-full flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
					>
						<Icon icon="mdi:github" class="w-5 h-5 mr-2" />
						Sign in with GitHub
					</button>
					
					<!-- Divider -->
					<div class="relative">
						<div class="absolute inset-0 flex items-center">
							<div class="w-full border-t border-gray-300"></div>
						</div>
						<div class="relative flex justify-center text-sm">
							<span class="px-2 bg-white text-gray-500">Or</span>
						</div>
					</div>
					
					<!-- Email Sign In (Placeholder) -->
					<button
						on:click={handleEmailSignIn}
						disabled
						class="w-full flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 text-sm font-medium text-gray-400 cursor-not-allowed"
					>
						<Icon icon="mdi:email" class="w-5 h-5 mr-2" />
						Sign in with Email (Coming Soon)
					</button>
				</div>
				
				<div class="mt-6">
					<div class="relative">
						<div class="absolute inset-0 flex items-center">
							<div class="w-full border-t border-gray-300"></div>
						</div>
						<div class="relative flex justify-center text-sm">
							<span class="px-2 bg-white text-gray-500">About WHIF</span>
						</div>
					</div>
					
					<div class="mt-4 text-center text-sm text-gray-600">
						<p class="mb-2">
							WHIF (What Happens If...) helps you critically analyze the holistic, long-term impacts of your ideas, solutions, or policies.
						</p>
						<p>
							Explore potential side effects and their alignment with global goals through AI-powered analysis.
						</p>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
