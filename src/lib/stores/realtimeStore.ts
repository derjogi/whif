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

	// Subscribe to vote changes for a specific statement using postgres_changes
	function subscribeToVotes(statementId: string, callback: (update: VoteUpdate) => void) {
		const subscription = supabase
			.channel(`votes_realtime_${statementId}`)
			.on('postgres_changes', { event: '*', schema: 'public', table: 'votes', filter: `statement_id=eq.${statementId}` }, async (payload) => {
				console.log('Postgres changes received in store:', payload);

				// Recalculate vote counts from database changes
				try {
					// Fetch current vote counts
					const { data: votes } = await supabase
						.from('votes')
						.select('vote_type')
						.eq('statement_id', statementId);

					let upvotes = 0;
					let downvotes = 0;
					if (votes) {
						upvotes = votes.filter(v => v.vote_type === 1).length;
						downvotes = votes.filter(v => v.vote_type === -1).length;
					}

					// Fetch impact score
					let impactScore = 0.5; // Default value
					const { data: statement } = await supabase
						.from('statements')
						.select('calculated_impact_score')
						.eq('id', statementId)
						.single();

					if (statement) {
						impactScore = statement.calculated_impact_score;
					}

					callback({
						statementId,
						upvotes,
						downvotes,
						impactScore
					});

					console.log(`Store recalculated votes for statement ${statementId}: ${upvotes} up, ${downvotes} down, impact: ${impactScore}`);
				} catch (error) {
					console.error('Error recalculating vote data in store:', error);
				}
			})
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
