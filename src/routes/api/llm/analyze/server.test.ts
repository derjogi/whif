import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './+server';
import type { RequestEvent } from '@sveltejs/kit';
import { invokeWithTracing } from '../../../../lib/server/llm/langfuseIntegration';
import testAnalysisData from './test_analysis.json';

// Load test data

// Mock only the LLM workflow tracing function
vi.mock('../../../../lib/server/llm/langfuseIntegration', () => ({
	invokeWithTracing: vi.fn()
}));

vi.mock('../../../../lib/server/llm/costTracking/balanceService', () => ({
	BalanceService: vi.fn(() => ({
		hasSufficientBalance: vi.fn().mockResolvedValue(true)
	}))
}));
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

const supabase = createServerClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
		cookies: {
			getAll() {
				return []
			},
			setAll(cookiesToSet) {
				/**
				 * Note: You have to add the `path` variable to the
				 * set and remove method due to sveltekit's cookie API
				 * requiring this to be set, setting the path to an empty string
				 * will replicate previous/standard behavior (https://kit.svelte.dev/docs/types#public-types-cookies)
				 */
			},
		},
	})

const userId = '03a1416c-a3ff-4341-98a5-d0b54c4c694d';

describe('POST /api/llm/analyze', () => {
	const mockRequest = (body: any) =>
		({
			json: () => Promise.resolve(body)
		}) as Request;

	const mockLocals = {
		user: { id: userId },
		supabase
	};

	const mockRequestEvent: RequestEvent = {
		request: mockRequest({ proposal: 'Test proposal' }),
		locals: mockLocals
	} as any;

	beforeEach(async () => {
		vi.clearAllMocks();

		// Ensure the test user exists in the database
		try {
			const { error } = await supabase
				.from('users')
				.upsert({
					id: userId,
					email: 'test@example.com'
				}, {
					onConflict: 'id'
				});

			if (error) {
				console.warn('Failed to create test user:', error.message);
			}
		} catch (error) {
			console.warn('Error ensuring test user exists:', error);
		}
	});

	it('should successfully analyze a proposal and store results', async () => {
		// Use the real test data from the JSON file
		const mockWorkflowResult = testAnalysisData.analysis;

		vi.mocked(invokeWithTracing).mockResolvedValue(mockWorkflowResult);

		const response = await POST({
			request: mockRequest({ proposal: 'Test Akl Transport' }),
			locals: mockLocals
		} as any);
		const responseData = await response.json();

		// Verify the response
		expect(response.status).toBe(200);
		expect(responseData.success).toBe(true);
		expect(responseData.analysis).toEqual(mockWorkflowResult);

		// Verify workflow was called with correct parameters
		expect(invokeWithTracing).toHaveBeenCalledWith(
			expect.anything(), // workflow
			expect.objectContaining({
				proposal: 'Test Akl Transport',
				userId,
				extractedStatements: [],
				downstreamImpacts: [],
				groupedCategories: {},
				researchFindings: {},
				evaluatedScores: {},
				finalSummary: ''
			})
		);
	});

	it('should handle object proposals correctly', async () => {
		const objectProposal = {
			title: 'Test Proposal',
			text: 'Test description'
		};

		const mockRequestWithObject: RequestEvent = {
			request: mockRequest({ proposal: objectProposal }),
			locals: mockLocals
		} as any;

		const mockWorkflowResult = {
			extractedStatements: [],
			finalSummary: 'Test summary'
		};

		vi.mocked(invokeWithTracing).mockResolvedValue(mockWorkflowResult);

		const response = await POST(mockRequestWithObject);
		const responseData = await response.json();

		expect(response.status).toBe(200);
		expect(responseData.success).toBe(true);

		// Verify the proposal was converted to JSON string
		expect(invokeWithTracing).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				proposal: objectProposal
			})
		);
	});

	it('should return 401 if user is not authenticated', async () => {
		const unauthenticatedEvent: RequestEvent = {
			request: mockRequest({ proposal: 'Test' }),
			locals: { user: null, supabase: mockLocals.supabase }
		} as any;

		const response = await POST(unauthenticatedEvent);
		const responseData = await response.json();

		expect(response.status).toBe(401);
		expect(responseData.error).toBe('Authentication required');
	});

	it('should return 400 if proposal is missing', async () => {
		const requestWithoutProposal: RequestEvent = {
			request: mockRequest({}),
			locals: mockLocals
		} as any;

		const response = await POST(requestWithoutProposal);
		const responseData = await response.json();

		expect(response.status).toBe(400);
		expect(responseData.error).toBe('Proposal is required');
	});

	it('should handle insufficient balance', async () => {
		// Import and mock the BalanceService for this test
		const { BalanceService } = await import(
			'../../../../lib/server/llm/costTracking/balanceService'
		);
		const mockBalanceService = {
			hasSufficientBalance: vi.fn().mockResolvedValue(false)
		};
		vi.mocked(BalanceService).mockImplementation(() => mockBalanceService as any);

		const response = await POST(mockRequestEvent);
		const responseData = await response.json();

		expect(response.status).toBe(402);
		expect(responseData.error).toBe(
			'Insufficient balance. Please add credits to your account to continue.'
		);

		// Reset the mock
		vi.mocked(BalanceService).mockImplementation(
			() =>
				({
					hasSufficientBalance: vi.fn().mockResolvedValue(true)
				}) as any
		);
	});

	it('should handle workflow errors gracefully', async () => {
		vi.mocked(invokeWithTracing).mockRejectedValue(new Error('Workflow failed'));

		const response = await POST(mockRequestEvent);
		const responseData = await response.json();

		expect(response.status).toBe(500);
		expect(responseData.success).toBe(false);
		expect(responseData.error).toBe('Workflow failed');
	});
});
