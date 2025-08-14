import { CostCalculationService } from './costCalculationService';
import type { TokenUsage } from '../../database/schema';

/**
 * Example of how real-time cost calculation would work
 * This is a demonstration of the integration pattern, not meant to be used directly
 */
export class RealtimeCostCalculationExample {
  private accumulatedCost: number = 0;
  private accumulatedInputTokens: number = 0;
  private accumulatedOutputTokens: number = 0;

  /**
   * Update the accumulated cost with a new token usage record
   * @param tokenUsage The new token usage record
   */
  updateWithTokenUsage(tokenUsage: TokenUsage): void {
    if (tokenUsage.success) {
      this.accumulatedCost += parseFloat(tokenUsage.cost as string);
      this.accumulatedInputTokens += tokenUsage.inputTokens;
      this.accumulatedOutputTokens += tokenUsage.outputTokens;
    }
  }

  /**
   * Get the current accumulated cost
   * @returns The accumulated cost
   */
  getCurrentCost(): number {
    return this.accumulatedCost;
  }

  /**
   * Get the current accumulated token counts
   * @returns Object with input and output token counts
   */
  getCurrentTokenCounts(): { inputTokens: number; outputTokens: number } {
    return {
      inputTokens: this.accumulatedInputTokens,
      outputTokens: this.accumulatedOutputTokens
    };
  }

  /**
   * Calculate cost for a new LLM call without storing it
   * @param inputTokens Number of input tokens
   * @param outputTokens Number of output tokens
   * @param modelName The model name
   * @returns The calculated cost
   */
  calculateCostForCall(inputTokens: number, outputTokens: number, modelName: string): number {
    const costCalculation = CostCalculationService.calculateCost(inputTokens, outputTokens, modelName);
    return costCalculation.cost;
  }

  /**
   * Reset the accumulated values
   */
  reset(): void {
    this.accumulatedCost = 0;
    this.accumulatedInputTokens = 0;
    this.accumulatedOutputTokens = 0;
  }
}