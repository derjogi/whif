import { PromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { z } from "zod";
import { LLM_MODELS, type AnalysisState } from "../types";
import { ChatOpenAI } from "@langchain/openai";
import { langfuseHandler } from "../langfuseIntegration";
import { callWithRetry } from "../retryUtils";

// Define the output schema
const outputSchema = z.object({
  categories: z.record(z.string(), z.array(z.string()))
});

const parser = StructuredOutputParser.fromZodSchema(outputSchema);

// Create the prompt template with proper formatting
const prompt = PromptTemplate.fromTemplate(`
You are an expert categorizer and organizer.

Task: Take a list of impactStatements and group them into logical categories. The categories should be high-level and relevant to a sustainability analysis (e.g., "Resource Impact", "Labor & Social", "Environmental", "Economic", "Governance"). The output should be a structured JSON object.

Input impactStatements: {statements}

{format_instructions}
`.trim());

export async function categorizeImpacts(state: AnalysisState): Promise<Partial<AnalysisState>> {
  try {
    console.log("Categorizing", state.downstreamImpacts.length, "downstream impacts...");
    
    // Invoke with retry mechanism and fallback models
    const result = await callWithRetry(
      prompt,
      parser,
      {
        statements: state.downstreamImpacts.join("\n"),
        format_instructions: parser.getFormatInstructions()
      },
      {
        model: LLM_MODELS.CLAUDE_3_HAIKU,
        temperature: 0,
        callbacks: [langfuseHandler]
      },
      {
        maxRetries: 3,
        fallbackModels: [LLM_MODELS.CLAUDE_3_7_SONNET]
      }
    );
    
    console.log("Successfully categorized impacts into", Object.keys(result.categories).length, "categories");
    console.debug("Categories: ", result.categories)
    
    return {
      groupedCategories: result.categories
    };
  } catch (error) {
    console.error("Error in categorizeImpacts:", error);
    return {
      groupedCategories: {}
    };
  }
}