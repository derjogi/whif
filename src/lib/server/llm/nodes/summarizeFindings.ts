import { PromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { z } from "zod";
import { LLM_MODELS, type AnalysisState } from "../types";
import { ChatOpenAI } from "@langchain/openai";
import { langfuseHandler } from "../langfuseIntegration";
import { callWithRetry } from "../retryUtils";

// Define the output schema
const outputSchema = z.object({
  summary: z.string().describe("Well-formatted Markdown string suitable for direct display in the web application's UI"),
});

const parser = StructuredOutputParser.fromZodSchema(outputSchema);

// Create the prompt template with proper formatting
const prompt = PromptTemplate.fromTemplate(`
You are a senior analyst and advisor. Your goal is to provide a clear, concise, and professional summary.

Combine the original proposal, the evaluatedScores, and the researchFindings to generate a final summary and recommendation.

Summary Structure:
1. A brief, one-sentence overview of the proposal's overall impact.
2. A point-by-point breakdown of each category's score and the justification from the research.
3. A final, explicit recommendation.

Recommendation Logic: The system has a hard rule: a negative impact is only considered "acceptable" if the total positive score is at least 10 times the absolute value of the total negative score. If this condition is not met, the recommendation is to **not** proceed with the proposal as-is.

Original Proposal: {proposal}
Category Scores: {scores}
Research Findings: {findings}

{format_instructions}
`.trim());

export async function summarizeFindings(state: AnalysisState): Promise<Partial<AnalysisState>> {
  try {
    console.log("Summarizing findings...");
    
    // Invoke with retry mechanism and fallback models
    const result = await callWithRetry(
      prompt,
      parser,
      {
        proposal: state.proposal,
        scores: JSON.stringify(state.evaluatedScores),
        findings: JSON.stringify(state.researchFindings),
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
    
    console.log("Successfully generated summary");
    console.debug("Summary: ", result.summary);
    return {
      finalSummary: result.summary
    };
  } catch (error) {
    console.error("Error in summarizeFindings:", error);
    return {
      finalSummary: "Error generating summary."
    };
  }
}