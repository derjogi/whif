import type { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import { TokenTrackingCallback } from "./tokenTrackingCallback";
import type { TokenTrackingService } from "./tokenTrackingService";

/**
 * Example of how token tracking integrates with existing LangChain.js callbacks
 * This is a demonstration of the integration pattern, not meant to be used directly
 */
export class LangchainIntegrationExample {
  /**
   * Create a combined callback handler that includes both Langfuse tracing and token tracking
   * @param tokenTrackingService The token tracking service
   * @param userId The user ID
   * @param analysisId The analysis ID
   * @param langfuseHandler The existing Langfuse handler
   * @returns Array of callback handlers
   */
  static createCombinedCallbacks(
    tokenTrackingService: TokenTrackingService,
    userId: string,
    analysisId: string,
    langfuseHandler: BaseCallbackHandler
  ): BaseCallbackHandler[] {
    // Create the token tracking callback
    const tokenTrackingCallback = tokenTrackingService.createTrackingCallback(userId, analysisId);
    
    // Return both handlers
    return [
      langfuseHandler,      // Existing Langfuse tracing
      tokenTrackingCallback // New token tracking
    ];
  }

  /**
   * Example of how to use the combined callbacks in an LLM chain
   * @param chain The LLM chain
   * @param input The input data
   * @param callbacks The combined callbacks
   * @returns The chain result
   */
  static async invokeChainWithCallbacks(
    chain: any,
    input: any,
    callbacks: BaseCallbackHandler[]
  ): Promise<any> {
    try {
      // Invoke the chain with both callbacks
      const result = await chain.invoke(input, {
        callbacks
      });
      
      return result;
    } catch (error) {
      console.error("Error invoking chain with callbacks:", error);
      throw error;
    }
  }
}