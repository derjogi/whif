import type { AnalysisState } from '../../lib/server/llm/types';

/**
 * Mock analysis result for testing
 */
export const mockAnalysisResult: Partial<AnalysisState> = {
  extractedStatements: [
    { text: 'Statement 1', impactScore: '0.75' },
    { text: 'Statement 2', impactScore: '0.60' }
  ],
  downstreamImpacts: [
    'Increased user engagement',
    'Potential infrastructure costs'
  ],
  groupedCategories: {
    positive: ['User satisfaction increase'],
    negative: ['Higher server load']
  },
  researchFindings: {
    marketData: 'Positive market response expected',
    technicalFeasibility: 'High feasibility with current tech stack'
  },
  evaluatedScores: [
    { feasibility: 0.8, impact: 0.7, risk: 0.3 },
    { feasibility: 0.6, impact: 0.9, risk: 0.4 }
  ],
  finalSummary: 'This proposal shows strong potential with moderate implementation risks.'
};

/**
 * Create a minimal mock analysis result
 */
export const createMockAnalysisResult = (overrides?: Partial<AnalysisState>): Partial<AnalysisState> => ({
  ...mockAnalysisResult,
  ...overrides
});
