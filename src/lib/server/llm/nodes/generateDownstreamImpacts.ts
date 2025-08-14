import { PromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { z } from "zod";
import { LLM_MODELS, type AnalysisState } from "../types";
import { ChatOpenAI } from "@langchain/openai";
import { langfuseHandler } from "../langfuseIntegration";
import { callWithRetry } from "../retryUtils";

// Define the output schema
const outputSchema = z.object({
  impacts: z.array(z.string()).describe("Array of downstream impacts"),
});

const parser = StructuredOutputParser.fromZodSchema(outputSchema);

// Create the prompt template with proper formatting
const prompt = PromptTemplate.fromTemplate(`
You are a systems thinking expert. You understand how a single action can ripple through an ecosystem.

Task: Given a single impactStatement, generate a list of 5-10 direct and indirect downstream consequences. Think broadly about resources, labor, environment, social effects, and economic factors.

Input impactStatement: {statement}

{format_instructions}
`.trim());

export async function generateDownstreamImpacts(state: AnalysisState): Promise<Partial<AnalysisState>> {
  try {
    console.log("Generating downstream impacts for", state.extractedStatements.length, "statements...");
    
    // Generate downstream impacts for each statement in parallel
    const impactPromises = state.extractedStatements.map(async (statement) => {
      try {
        console.log("Generating impacts for statement:", statement);
        
        // Invoke with retry mechanism and fallback models
        const result = await callWithRetry(
          prompt,
          parser,
          {
            statement: statement,
            format_instructions: parser.getFormatInstructions()
          },
          {
            model: LLM_MODELS.CLAUDE_3_HAIKU,
            temperature: 0.7,
            callbacks: [langfuseHandler]
          },
          {
            maxRetries: 3,
            fallbackModels: [LLM_MODELS.CLAUDE_3_7_SONNET]
          }
        );
        
        console.log("Successfully generated impacts for statement:", statement);
        console.debug("Impacts: ", result.impacts)
        return result.impacts;
      } catch (error) {
        console.error("Error generating impacts for statement:", statement, error);
        // Return empty array on error for this statement
        return [];
      }
    });
    
    // Wait for all promises to resolve
    const impactResults = await Promise.all(impactPromises);
    
    // Flatten the results into a single array
    const downstreamImpacts = impactResults.flat();
    
    console.log("Successfully generated", downstreamImpacts.length, "downstream impacts");
    
    return {
      downstreamImpacts
    };
  } catch (error) {
    console.error("Error in generateDownstreamImpacts:", error);
    return {
      downstreamImpacts: []
    };
  }
}