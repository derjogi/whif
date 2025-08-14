import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import type { NewTokenUsage } from "../../database/schema";
import { CostCalculationService } from "./costCalculationService";
import type { TokenTrackingService } from "./tokenTrackingService";

/**
 * Custom callback handler for tracking token usage from LLM calls
 */
export class TokenTrackingCallback extends BaseCallbackHandler {
  name = "TokenTrackingCallback";

  private tokenTrackingService: TokenTrackingService;
  private userId: string;
  private analysisId: string;

  constructor(
    tokenTrackingService: TokenTrackingService,
    userId: string,
    analysisId: string
  ) {
    super();
    this.tokenTrackingService = tokenTrackingService;
    this.userId = userId;
    this.analysisId = analysisId;
  }

  /**
   * Handle the end of an LLM call to extract and record token usage
   * @param output The LLM output containing token usage information
   * @param runId The run ID
   * @param parentRunId The parent run ID
   */
  async handleLLMEnd(
    output: any,
    runId: string,
    parentRunId?: string
  ): Promise<void> {
    try {
      // Extract token usage from the LLM output
      const llmOutput = output?.llmOutput;
      const tokenUsage = llmOutput?.tokenUsage || output?.generations?.[0]?.[0]?.generationInfo?.tokenUsage;
      
      if (!tokenUsage) {
        console.warn("No token usage found in LLM output");
        return;
      }

      // Extract model information
      const modelName = llmOutput?.modelName || "unknown";
      
      // Extract token counts
      const inputTokens = tokenUsage.promptTokens || tokenUsage.inputTokens || 0;
      const outputTokens = tokenUsage.completionTokens || tokenUsage.outputTokens || 0;
      
      // Calculate cost
      const costCalculation = CostCalculationService.calculateCost(
        inputTokens,
        outputTokens,
        modelName
      );
      
      // Record token usage
      const usageData: NewTokenUsage = {
        userId: this.userId,
        analysisId: this.analysisId,
        modelName,
        inputTokens,
        outputTokens,
        cost: costCalculation.cost.toString(),
        success: true
      };
      
      await this.tokenTrackingService.recordTokenUsage(usageData);
    } catch (error) {
      console.error("Error in token tracking callback:", error);
      // Record the failed call
      await this.tokenTrackingService.recordFailedCall(
        this.userId,
        this.analysisId,
        "unknown",
        error instanceof Error ? error.message : "Unknown error in token tracking"
      );
    }
  }

  /**
   * Handle LLM errors to record failed calls
   * @param error The error that occurred
   * @param runId The run ID
   * @param parentRunId The parent run ID
   */
  async handleLLMError(
    error: any,
    runId: string,
    parentRunId?: string
  ): Promise<void> {
    try {
      // Record the failed call
      await this.tokenTrackingService.recordFailedCall(
        this.userId,
        this.analysisId,
        "unknown",
        error instanceof Error ? error.message : "Unknown error in LLM call"
      );
    } catch (recordError) {
      console.error("Error recording failed LLM call:", recordError);
    }
  }
}