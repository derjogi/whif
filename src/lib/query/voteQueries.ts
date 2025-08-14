import { createMutation, useQueryClient } from '@tanstack/svelte-query';
import { supabase } from '$lib/supabase/client';
import { ImpactCalculationService } from '$lib/server/services/impactCalculationService';
import { statementsAPI } from '$lib/api/client';
import type { StatementVoteRequest } from '$lib/types/api';

interface VoteData {
	statementId: string;
	voteType: StatementVoteRequest['voteType'];
}

interface VoteCounts {
	upvotes: number;
	downvotes: number;
}

export function useVoteMutation() {
	const queryClient = useQueryClient();

	return createMutation({
		mutationFn: async ({ statementId, voteType }: VoteData) => {
			const response = await statementsAPI.vote(statementId, { voteType });
			
			if (!response.success) {
				throw new Error(response.error || 'Vote failed');
			}

			return response.data;
		},
		onMutate: async ({ statementId, voteType }: VoteData) => {
			// Cancel any outgoing refetches
			await queryClient.cancelQueries({ queryKey: ['votes', statementId] });

			// Snapshot the previous value
			const previousVotes = queryClient.getQueryData(['votes', statementId]);

			// Optimistically update the vote counts
			queryClient.setQueryData(['votes', statementId], (old: VoteCounts | undefined) => {
				if (!old) return old;

				const newCounts = { ...old };
				
				if (voteType === 0) {
					// Removing vote - we need to know what the previous vote was
					// This is a simplified version - in practice you'd track the user's previous vote
					return old;
				} else if (voteType === 1) {
					newCounts.upvotes += 1;
				} else if (voteType === -1) {
					newCounts.downvotes += 1;
				}

				return newCounts;
			});

			// Return context with the snapshotted value
			return { previousVotes };
		},
		onError: (err: any, { statementId }: VoteData, context: any) => {
			// If the mutation fails, use the context returned from onMutate to roll back
			if (context?.previousVotes) {
				queryClient.setQueryData(['votes', statementId], context.previousVotes);
			}
		},
		onSettled: (data: any, error: any, { statementId }: VoteData) => {
			// Always refetch after error or success
			queryClient.invalidateQueries({ queryKey: ['votes', statementId] });
		},
	});
}

export function useVoteCounts(statementId: string) {
	return {
		queryKey: ['votes', statementId],
		queryFn: async (): Promise<VoteCounts> => {
			const { data: votes, error } = await supabase
				.from('votes')
				.select('vote_type')
				.eq('statement_id', statementId);

			if (error) throw error;

			const upvotes = votes?.filter(vote => vote.vote_type === 1).length || 0;
			const downvotes = votes?.filter(vote => vote.vote_type === -1).length || 0;

			return { upvotes, downvotes };
		},
		staleTime: 1000 * 60 * 5, // 5 minutes
	};
}

export function useUserVote(statementId: string, userId: string | undefined) {
	return {
		queryKey: ['userVote', statementId, userId],
		queryFn: async () => {
			if (!userId) return null;

			const { data: vote, error } = await supabase
				.from('votes')
				.select('vote_type')
				.eq('statement_id', statementId)
				.eq('user_id', userId)
				.maybeSingle();

			if (error) throw error;
			return vote;
		},
		enabled: !!userId,
		staleTime: 1000 * 60 * 5, // 5 minutes
	};
}

export function useImpactScore(upvotes: number, downvotes: number) {
	return {
		queryKey: ['impactScore', upvotes, downvotes],
		queryFn: () => ImpactCalculationService.calculateImpactScore(upvotes, downvotes),
		staleTime: 1000 * 60 * 5, // 5 minutes
	};
}
