import type { AnalysisState } from "$lib/server/llm/types";

// API Response wrapper for consistent error handling
export interface APIResponse<T = any> {
	success: boolean;
	data?: T;
	error?: string;
	details?: any;
}

// LLM Analysis API types
export interface LLMAnalyzeRequest {
	ideaId: string;
	proposal: {
		title: string;
		text: string;
	};
}

export interface LLMAnalyzeResponse {
	ideaId: string;
	analysis: AnalysisState;
}

// Statement Vote API types
export interface StatementVoteRequest {
	voteType: 1 | -1 | 0; // 1 = upvote, -1 = downvote, 0 = remove vote
}

export interface StatementVoteResponse {
	success: boolean;
}

// Idea API types
export interface IdeaResponse {
	id: string;
	title: string;
	text: string;
	createdAt: string;
	updatedAt: string;
	userId: string;
	published: boolean;
}

// API endpoint mapping
export interface APIEndpoints {
	'POST /api/llm/analyze': {
		request: LLMAnalyzeRequest;
		response: LLMAnalyzeResponse;
	};
	'POST /api/statements/:id/vote': {
		request: StatementVoteRequest;
		response: StatementVoteResponse;
	};
}