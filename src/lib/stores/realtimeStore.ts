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

	// Subscribe to vote changes for a specific statement using broadcast subscriptions
	function subscribeToVotes(statementId: string, callback: (update: VoteUpdate) => void) {
		const subscription = supabase
			.channel(`statement_votes:${statementId}`)
			.on(
				'broadcast',
				{
					event: 'vote_change'
				},
				async (payload) => {
					console.log('Vote broadcast received in store:', payload);
					
					// Handle the broadcast payload directly
					if (payload.payload && payload.payload.statement_id === statementId) {
						const voteData = payload.payload;
						
						// Extract data from broadcast payload
						const upvotes = voteData.upvotes || 0;
						const downvotes = voteData.downvotes || 0;
						
						// Fetch impact score since it's not in the broadcast payload
						let impactScore = 0.5; // Default value
						try {
							const { data: statement } = await supabase
								.from('statements')
								.select('calculated_impact_score')
								.eq('id', statementId)
								.single();
								
							if (statement) {
								impactScore = statement.calculated_impact_score;
							}
						} catch (error) {
							console.error('Error fetching impact score in store:', error);
						}
						
						callback({
							statementId,
							upvotes,
							downvotes,
							impactScore
						});
						
						console.log(`Store updated votes for statement ${statementId}: ${upvotes} up, ${downvotes} down, impact: ${impactScore}`);
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
