/**
 * Impact Calculation Service
 * Implements the voting system's mathematical logic for calculating impact scores
 */

export interface VoteCounts {
	upvotes: number;
	downvotes: number;
	total: number;
}

export interface ImpactScore {
	raw: number; // -1 to +1
	normalized: number; // 0 to 1
	percentage: number; // 0 to 100
	confidence: number; // 0 to 1 (based on total votes)
}

export class ImpactCalculationService {
	/**
	 * Calculate impact score using the formula: (U + 0.5) / (U + D + 1)
	 * Where U = upvotes, D = downvotes
	 * This ensures scores are always between 0 and 1, with 0.5 as neutral
	 */
	static calculateImpactScore(upvotes: number, downvotes: number): ImpactScore {
		const U = Math.max(0, upvotes);
		const D = Math.max(0, downvotes);
		const total = U + D;
		
		// Apply the formula: (U + 0.5) / (U + D + 1)
		const rawScore = (U + 0.5) / (total + 1);
		
		// Normalize to -1 to +1 range
		const normalized = (rawScore - 0.5) * 2;
		
		// Convert to percentage (0-100)
		const percentage = rawScore * 100;
		
		// Calculate confidence based on total votes
		// More votes = higher confidence
		const confidence = Math.min(1, total / 10); // Max confidence at 10+ votes
		
		return {
			raw: rawScore,
			normalized,
			percentage,
			confidence
		};
	}

	/**
	 * Get impact score category and description
	 */
	static getImpactCategory(score: ImpactScore): {
		category: string;
		description: string;
		color: string;
		icon: string;
	} {
		const { normalized } = score;
		
		if (normalized >= 0.7) {
			return {
				category: 'High Positive Impact',
				description: 'Strong positive impact expected',
				color: 'green',
				icon: 'mdi:trending-up'
			};
		} else if (normalized >= 0.3) {
			return {
				category: 'Moderate Positive Impact',
				description: 'Some positive impact expected',
				color: 'blue',
				icon: 'mdi:trending-up'
			};
		} else if (normalized >= -0.3) {
			return {
				category: 'Neutral Impact',
				description: 'Minimal or unclear impact',
				color: 'gray',
				icon: 'mdi:minus'
			};
		} else if (normalized >= -0.7) {
			return {
				category: 'Moderate Negative Impact',
				description: 'Some negative impact expected',
				color: 'orange',
				icon: 'mdi:trending-down'
			};
		} else {
			return {
				category: 'High Negative Impact',
				description: 'Strong negative impact expected',
				color: 'red',
				icon: 'mdi:trending-down'
			};
		}
	}

	/**
	 * Calculate trend direction based on recent votes
	 */
	static calculateTrend(recentVotes: Array<{ voteType: number; timestamp: Date }>): {
		direction: 'up' | 'down' | 'stable';
		strength: number;
	} {
		if (recentVotes.length < 3) {
			return { direction: 'stable', strength: 0 };
		}

		// Sort by timestamp (newest first)
		const sortedVotes = recentVotes.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
		
		// Look at last 5 votes
		const recent = sortedVotes.slice(0, 5);
		const upvotes = recent.filter(v => v.voteType === 1).length;
		const downvotes = recent.filter(v => v.voteType === -1).length;
		
		if (upvotes > downvotes) {
			return { direction: 'up', strength: (upvotes - downvotes) / recent.length };
		} else if (downvotes > upvotes) {
			return { direction: 'down', strength: (downvotes - upvotes) / recent.length };
		} else {
			return { direction: 'stable', strength: 0 };
		}
	}

	/**
	 * Validate vote data
	 */
	static validateVote(voteType: number): boolean {
		return [1, -1, 0].includes(voteType);
	}

	/**
	 * Get minimum votes needed for reliable scoring
	 */
	static getMinimumVotesForReliability(): number {
		return 3; // At least 3 votes for reliable scoring
	}
}
