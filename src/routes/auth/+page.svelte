<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase/client';
	import { goto } from '$app/navigation';
	import Icon from '@iconify/svelte';
	let loading = true;
	let user: any = null;
	let email = '';
	let password = '';
	let signInLoading = false;
	let signInError: string | null = null;
	let isSignUp = false;

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

	async function handleEmailSignIn(event: Event) {
		event.preventDefault();
		signInLoading = true;
		signInError = null;

		try {
			const { data, error } = await supabase.auth.signInWithPassword({
				email,
				password
			});

			if (error) throw error;

			// Sign in successful, redirect to home
			goto('/');
		} catch (error: any) {
			signInError = error.message || 'Sign in failed. Please try again.';
			console.error('Email sign in error:', error);
		} finally {
			signInLoading = false;
		}
	}

	async function handleEmailSignUp(event: Event) {
		event.preventDefault();
		signInLoading = true;
		signInError = null;

		try {
			const { data, error } = await supabase.auth.signUp({
				email,
				password
			});

			if (error) throw error;

			// Sign up successful, show confirmation message
			signInError = 'Please check your email for a confirmation link to complete your registration.';
		} catch (error: any) {
			signInError = error.message || 'Sign up failed. Please try again.';
			console.error('Email sign up error:', error);
		} finally {
			signInLoading = false;
		}
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
			{isSignUp ? 'Create an account to analyze the impact of your ideas' : 'Sign in to analyze the impact of your ideas'}
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

					<!-- Email Auth Form -->
					<form on:submit={isSignUp ? handleEmailSignUp : handleEmailSignIn} class="space-y-4">
						<div>
							<label for="email" class="block text-sm font-medium text-gray-700">Email</label>
							<input
								id="email"
								type="email"
								bind:value={email}
								required
								class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
								placeholder="Enter your email"
							/>
						</div>
						<div>
							<label for="password" class="block text-sm font-medium text-gray-700">Password</label>
							<input
								id="password"
								type="password"
								bind:value={password}
								required
								class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
								placeholder="Enter your password"
							/>
						</div>
						{#if signInError}
							<div class="text-sm {signInError.includes('confirmation') ? 'text-green-600' : 'text-red-600'}">{signInError}</div>
						{/if}
						<button
							type="submit"
							disabled={signInLoading}
							class="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{#if signInLoading}
								<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
							{:else}
								<Icon icon="mdi:email" class="w-5 h-5 mr-2" />
							{/if}
							{signInLoading ? (isSignUp ? 'Signing up...' : 'Signing in...') : (isSignUp ? 'Sign up with Email' : 'Sign in with Email')}
						</button>
					</form>

					<!-- Toggle between Sign In and Sign Up -->
					<div class="text-center">
						<button
							on:click={() => { isSignUp = !isSignUp; signInError = null; }}
							class="text-sm text-blue-600 hover:text-blue-500"
						>
							{isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
						</button>
					</div>
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
