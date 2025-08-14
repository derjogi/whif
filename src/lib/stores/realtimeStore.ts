import { writable, type Writable } from 'svelte/store';
import { supabase } from '$lib/supabase/client';
import type { Vote } from '$lib/server/database/schema';

interface RealtimeState {
	subscriptions: Map<string, any>;
	isConnected: boolean;
}

interface VoteUpdate {
	statementId: string;
	upvotes: number;
	downvotes: number;
	impactScore: number;
}

// Create the store
const createRealtimeStore = () => {
	const { subscribe, set, update }: Writable<RealtimeState> = writable({
		subscriptions: new Map(),
		isConnected: false
	});

	// Subscribe to vote changes for a specific statement
	function subscribeToVotes(statementId: string, callback: (update: VoteUpdate) => void) {
		const subscription = supabase
			.channel(`votes:${statementId}`)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'votes',
					filter: `statement_id=eq.${statementId}`
				},
				async (payload) => {
					// Fetch updated vote counts and impact score
					try {
						const { data: votes } = await supabase
							.from('votes')
							.select('vote_type')
							.eq('statement_id', statementId);

						const { data: statement } = await supabase
							.from('statements')
							.select('calculated_impact_score')
							.eq('id', statementId)
							.single();

						if (votes && statement) {
							const upvotes = votes.filter(vote => vote.vote_type === 1).length;
							const downvotes = votes.filter(vote => vote.vote_type === -1).length;
							
							callback({
								statementId,
								upvotes,
								downvotes,
								impactScore: statement.calculated_impact_score
							});
						}
					} catch (error) {
						console.error('Error fetching updated vote data:', error);
					}
				}
			)
			.subscribe();

		// Store the subscription
		update(state => {
			state.subscriptions.set(statementId, subscription);
			return state;
		});

		return subscription;
	}

	// Unsubscribe from a specific statement's votes
	function unsubscribeFromVotes(statementId: string) {
		update(state => {
			const subscription = state.subscriptions.get(statementId);
			if (subscription) {
				subscription.unsubscribe();
				state.subscriptions.delete(statementId);
			}
			return state;
		});
	}

	// Unsubscribe from all subscriptions
	function unsubscribeAll() {
		update(state => {
			state.subscriptions.forEach(subscription => {
				subscription.unsubscribe();
			});
			state.subscriptions.clear();
			return state;
		});
	}

	// Check connection status
	async function checkConnection() {
		try {
			const { data, error } = await supabase.from('votes').select('id').limit(1);
			update(state => ({ ...state, isConnected: !error }));
		} catch {
			update(state => ({ ...state, isConnected: false }));
		}
	}

	return {
		subscribe,
		subscribeToVotes,
		unsubscribeFromVotes,
		unsubscribeAll,
		checkConnection
	};
};

export const realtimeStore = createRealtimeStore();
