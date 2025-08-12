<script lang="ts">
	import { page } from '$app/stores';
	import { supabase } from '$lib/supabase/client';
	import { goto } from '$app/navigation';
	import Icon from '@iconify/svelte';
	
	let user: any = null;
	let loading = true;
	
	// Get current user
	supabase.auth.getSession().then(({ data: { session } }) => {
		user = session?.user ?? null;
		loading = false;
	});
	
	// Listen for auth changes
	supabase.auth.onAuthStateChange((_event, session) => {
		user = session?.user ?? null;
	});
	
	async function handleSignOut() {
		await supabase.auth.signOut();
		goto('/');
	}
</script>

<header class="bg-white shadow-sm border-b border-gray-200">
	<div class="container mx-auto px-4">
		<div class="flex justify-between items-center h-16">
			<!-- Logo and Navigation -->
			<div class="flex items-center space-x-8">
				<a href="/" class="flex items-center space-x-2">
					<Icon icon="mdi:lightbulb-on" class="w-8 h-8 text-blue-600" />
					<span class="text-xl font-bold text-gray-900">WHIF</span>
				</a>
				
				<nav class="hidden md:flex space-x-6">
					<a 
						href="/" 
						class="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium {$page.url.pathname === '/' ? 'text-blue-600 bg-blue-50' : ''}"
					>
						Dashboard
					</a>
					<a 
						href="/create" 
						class="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium {$page.url.pathname === '/create' ? 'text-blue-600 bg-blue-50' : ''}"
					>
						Create Idea
					</a>
				</nav>
			</div>
			
			<!-- User Menu -->
			<div class="flex items-center space-x-4">
				{#if loading}
					<div class="animate-pulse bg-gray-200 h-8 w-8 rounded-full"></div>
				{:else if user}
					<div class="relative group">
						<button class="flex items-center space-x-2 text-gray-700 hover:text-blue-600">
							<div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
								<span class="text-white text-sm font-medium">
									{user.email?.charAt(0).toUpperCase() || 'U'}
								</span>
							</div>
							<span class="hidden md:block text-sm">{user.email}</span>
						</button>
						
						<!-- Dropdown Menu -->
						<div class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
							<button
								on:click={handleSignOut}
								class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
							>
								Sign Out
							</button>
						</div>
					</div>
				{:else}
					<a
						href="/auth"
						class="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
					>
						Sign In
					</a>
				{/if}
			</div>
		</div>
	</div>
</header>
