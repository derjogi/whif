import { PromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { z } from "zod";
import { LLM_MODELS, type AnalysisState } from "../types";
import { ChatOpenAI } from "@langchain/openai";
import { langfuseHandler } from "../langfuseIntegration";
import { callWithRetry } from "../retryUtils";
// In a real implementation, we would integrate token tracking here
// For now, we'll keep the existing implementation
// Example of how token tracking would be integrated:
// import { TokenTrackingIntegrationExample } from "../costTracking/integrationExample";

// Define the output schema
const outputSchema = z.object({
  statements: z.array(z.string()).describe("Array of impact statements"),
});

const parser = StructuredOutputParser.fromZodSchema(outputSchema);

// Create the prompt template with proper formatting
const prompt = PromptTemplate.fromTemplate(`
You are an expert analyst with a talent for deconstructing complex ideas into simple, atomic statements.

Task: Take the user's proposal and identify all of its concrete components. Each component should be rephrased as a single, unambiguous statement of impact or action.

Input proposal: {proposal}

{format_instructions}

Example:
Input: proposal: "We should build a fleet of electric driverless vehicles for our city and replace trains to provide efficient transport for remote areas"
Output: ["Build a fleet of electric driverless vehicles", "Replace existing trains", "Provide efficient transport for remote areas"]
`.trim());

export async function extractStatements(state: AnalysisState): Promise<Partial<AnalysisState>> {
  try {
    console.log("Extracting statements from proposal...");
    
    // TODO: In a real implementation, we would add token tracking callback here:
    // const tokenTrackingCallback = TokenTrackingIntegrationExample.createTrackingCallbackForAnalysis(state);
    
    // Invoke with retry mechanism and fallback models
    const result = await callWithRetry(
      prompt,
      parser,
      {
        proposal: state.proposal,
        format_instructions: parser.getFormatInstructions()
      },
      {
        model: LLM_MODELS.CLAUDE_3_HAIKU,
        temperature: 0,
        callbacks: [
          langfuseHandler,
          // tokenTrackingCallback // TODO: Add token tracking callback
        ]
      },
      {
        maxRetries: 3,
        fallbackModels: [LLM_MODELS.CLAUDE_3_7_SONNET]
      }
    );
    
    console.log("Successfully extracted statements:", result.statements);
    
    return {
      extractedStatements: result.statements
    };
  } catch (error) {
    console.error("Error in extractStatements:", error);
    return {
      extractedStatements: []
    };
  }
}