import type { NewTokenUsage } from "../../database/schema";
import type { IUnitOfWork } from "../../database/interfaces";
import type { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import { TokenTrackingCallback } from "./tokenTrackingCallback";

/**
 * Service for tracking token usage from LLM calls
 */
export class TokenTrackingService {
  private unitOfWork: IUnitOfWork;

  constructor(unitOfWork: IUnitOfWork) {
    this.unitOfWork = unitOfWork;
  }

  /**
   * Create a callback handler for tracking token usage
   * @param userId The user ID for tracking
   * @param analysisId The analysis ID for correlation
   * @returns A callback handler that tracks token usage
   */
  createTrackingCallback(userId: string, analysisId: string): BaseCallbackHandler {
    return new TokenTrackingCallback(this, userId, analysisId);
  }

  /**
   * Record token usage for an LLM call
   * @param usageData The token usage data to record
   */
  async recordTokenUsage(usageData: NewTokenUsage): Promise<void> {
    try {
      await this.unitOfWork.tokenUsage.create(usageData);
    } catch (error) {
      console.error("Error recording token usage:", error);
      // Don't throw error to avoid breaking the workflow
    }
  }

  /**
   * Record a failed LLM call
   * @param userId The user ID
   * @param analysisId The analysis ID
   * @param modelName The model name
   * @param errorMessage The error message
   */
  async recordFailedCall(
    userId: string,
    analysisId: string,
    modelName: string,
    errorMessage: string
  ): Promise<void> {
    try {
      await this.unitOfWork.tokenUsage.create({
        userId,
        analysisId,
        modelName,
        inputTokens: 0,
        outputTokens: 0,
        cost: "0",
        success: false,
        errorMessage
      });
    } catch (error) {
      console.error("Error recording failed call:", error);
      // Don't throw error to avoid breaking the workflow
    }
  }
}