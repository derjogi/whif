<div class="animate-pulse space-y-6">
	<!-- Header Skeleton -->
	<div>
		<div class="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
		<div class="h-4 bg-gray-200 rounded w-full mb-2"></div>
		<div class="h-4 bg-gray-200 rounded w-5/6 mb-2"></div>
		<div class="h-4 bg-gray-200 rounded w-4/6"></div>
	</div>
	
	<!-- Disclaimer Skeleton -->
	<div class="bg-gray-100 rounded-lg p-4">
		<div class="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
		<div class="h-3 bg-gray-200 rounded w-full mb-1"></div>
		<div class="h-3 bg-gray-200 rounded w-5/6"></div>
	</div>
	
	<!-- Summary Skeleton -->
	<div class="bg-gray-100 rounded-lg p-6">
		<div class="h-5 bg-gray-200 rounded w-1/4 mb-3"></div>
		<div class="h-4 bg-gray-200 rounded w-full mb-2"></div>
		<div class="h-4 bg-gray-200 rounded w-5/6 mb-2"></div>
		<div class="h-4 bg-gray-200 rounded w-4/6"></div>
	</div>
	
	<!-- Statements Skeleton -->
	<div>
		<div class="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
		<div class="space-y-4">
			{#each Array(3) as _, i}
				<div class="bg-white border border-gray-200 rounded-lg p-6">
					<div class="h-4 bg-gray-200 rounded w-full mb-3"></div>
					<div class="h-4 bg-gray-200 rounded w-5/6 mb-3"></div>
					<div class="flex space-x-2 mb-4">
						<div class="h-6 bg-gray-200 rounded w-24"></div>
						<div class="h-6 bg-gray-200 rounded w-20"></div>
					</div>
					<div class="flex items-center justify-between">
						<div class="h-8 bg-gray-200 rounded w-16"></div>
						<div class="h-8 bg-gray-200 rounded w-20"></div>
						<div class="h-8 bg-gray-200 rounded w-16"></div>
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>
