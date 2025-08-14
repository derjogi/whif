import type { ModelPricing, CostCalculation } from "./types";
import type { TokenUsage } from "../../database/schema";

/**
 * Service for calculating costs based on token usage and provider rates
 */
export class CostCalculationService {
  // Current pricing information (in USD per 1000 tokens)
  private static readonly PRICING: ModelPricing[] = [
    {
      modelName: "gpt-4o-mini",
      inputTokenPrice: 0.150, // $0.150 per 1M tokens = $0.00015 per 1K tokens
      outputTokenPrice: 0.600, // $0.600 per 1M tokens = $0.0006 per 1K tokens
      provider: "OpenAI"
    },
    {
      modelName: "gpt-4o",
      inputTokenPrice: 5.00, // $5.00 per 1M tokens = $0.005 per 1K tokens
      outputTokenPrice: 15.00, // $15.00 per 1M tokens = $0.015 per 1K tokens
      provider: "OpenAI"
    }
  ];

  /**
   * Calculate cost for a single LLM call based on token usage
   * @param inputTokens Number of input tokens
   * @param outputTokens Number of output tokens
   * @param modelName The model name
   * @returns Cost calculation result
   */
  static calculateCost(inputTokens: number, outputTokens: number, modelName: string): CostCalculation {
    const pricing = this.PRICING.find(p => p.modelName === modelName);
    
    if (!pricing) {
      // Use default pricing for unknown models
      console.warn(`Unknown model ${modelName}, using default pricing`);
      return {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        cost: 0,
        provider: "Unknown",
        model: modelName
      };
    }

    // Calculate cost per 1000 tokens
    const inputCost = (inputTokens / 1000) * pricing.inputTokenPrice;
    const outputCost = (outputTokens / 1000) * pricing.outputTokenPrice;
    const totalCost = inputCost + outputCost;

    return {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      cost: totalCost,
      provider: pricing.provider,
      model: modelName
    };
  }

  /**
   * Calculate total cost for an analysis based on all token usage records
   * @param usageRecords Array of token usage records
   * @returns Total cost for the analysis
   */
  static calculateTotalCost(usageRecords: TokenUsage[]): number {
    return usageRecords.reduce((total, record) => {
      return total + parseFloat(record.cost as string);
    }, 0);
  }

  /**
   * Get pricing information for a model
   * @param modelName The model name
   * @returns Model pricing information or null if not found
   */
  static getPricing(modelName: string): ModelPricing | null {
    return this.PRICING.find(p => p.modelName === modelName) || null;
  }

  /**
   * Get all available pricing information
   * @returns Array of all model pricing information
   */
  static getAllPricing(): ModelPricing[] {
    return [...this.PRICING];
  }
}