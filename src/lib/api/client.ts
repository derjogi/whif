import type { APIEndpoints, APIResponse } from '$lib/types/api';

export class APIClient {
	private baseUrl: string;

	constructor(baseUrl: string = '') {
		this.baseUrl = baseUrl;
	}

	private async request<T extends keyof APIEndpoints>(
		method: string,
		path: string,
		data?: any
	): Promise<APIResponse<APIEndpoints[T]['response']>> {
		try {
			const response = await fetch(`${this.baseUrl}${path}`, {
				method,
				headers: {
					'Content-Type': 'application/json',
				},
				body: data ? JSON.stringify(data) : undefined,
			});

			const responseData = await response.json();

			if (!response.ok) {
				return {
					success: false,
					error: responseData.error || `HTTP ${response.status}: ${response.statusText}`,
					details: responseData.details,
				};
			}

			return {
				success: true,
				data: responseData,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error occurred',
			};
		}
	}

	async post<T extends keyof APIEndpoints>(
		path: T,
		data: APIEndpoints[T]['request'] & { [key: string]: any }
	): Promise<APIResponse<APIEndpoints[T]['response']>> {
		const [method, endpoint] = path.split(' ');
		const processedPath = endpoint.replace(/:\w+/g, (match) => {
			const paramName = match.slice(1);
			return data[paramName] || match;
		});
		
		// Remove path parameters from data
		const { id, ...bodyData } = data;
		
		return this.request<T>(method, processedPath, bodyData);
	}
}

// Create a default client instance
const apiClient = new APIClient();

// Type-safe API functions
export const llmAPI = {
	analyze: async (data: APIEndpoints['POST /api/llm/analyze']['request']) => {
		return apiClient.post('POST /api/llm/analyze', data);
	},
};

export const statementsAPI = {
	vote: async (statementId: string, data: APIEndpoints['POST /api/statements/:id/vote']['request']) => {
		return apiClient.post('POST /api/statements/:id/vote', { ...data, id: statementId });
	},
};

export { apiClient };