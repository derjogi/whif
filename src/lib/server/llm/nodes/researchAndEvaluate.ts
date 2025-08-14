import { PromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { z } from "zod";
import { LLM_MODELS, type AnalysisState } from "../types";
import { ChatOpenAI } from "@langchain/openai";
import { langfuseHandler } from "../langfuseIntegration";
import { callWithRetry } from "../retryUtils";

// Define the output schema
const outputSchema = z.object({
  researchSummary: z.string().describe("Research findings for the category"),
  score: z.number().describe("Numerical score between -1.0 and +1.0"),
});

const parser = StructuredOutputParser.fromZodSchema(outputSchema);

// Create the prompt template with proper formatting
const researchPrompt = PromptTemplate.fromTemplate(`
You are a meticulous researcher. Given an impactCategory and its statements, use a search tool to find concrete, numerical data.

ImpactCategory: {category}
Statements: {statements}
`.trim());

const evaluationPrompt = PromptTemplate.fromTemplate(`
You are an impartial judge. Your judgment is based on the principles of Doughnut Economics and the UN's Sustainable Development Goals (SDGs).

Research Findings: {research}
ImpactCategory: {category}
Statements: {statements}

Analyze the research findings and assign a numerical score between -1.0 (highly negative) and +1.0 (highly positive) to the category.

Scoring Criteria:
- Positive Score: The impact measurably improves a social or environmental metric
- Negative Score: The impact depletes a critical resource, harms a social foundation, or negatively affects an SDG
- The magnitude of the score should be proportional to the magnitude of the impact

{format_instructions}
`.trim());

export async function researchAndEvaluate(state: AnalysisState): Promise<Partial<AnalysisState>> {
  try {
    console.log("Researching and evaluating", Object.keys(state.groupedCategories).length, "categories...");
    
    const researchFindings: { [key: string]: string } = {};
    const evaluatedScores: { [key: string]: number } = {};
    
    // For each category, generate research findings and evaluate scores
    for (const category in state.groupedCategories) {
      try {
        console.log("Processing category:", category);
        
        // Generate research findings with retry mechanism
        const researchResult = await callWithRetry(
          researchPrompt,
          null, // No parser for research step
          {
            category: category,
            statements: state.groupedCategories[category].join("\n")
          },
          {
            model: LLM_MODELS.CLAUDE_4_SONNET,
            temperature: 0,
            callbacks: [langfuseHandler]
          },
          {
            maxRetries: 3,
            fallbackModels: [LLM_MODELS.CLAUDE_3_7_SONNET, LLM_MODELS.CLAUDE_3_HAIKU]
          }
        );
        
        researchFindings[category] = researchResult.content as string;
        console.log("Successfully generated research findings for category:", category);
        
        // Evaluate scores based on research findings with retry mechanism
        const evaluationResult = await callWithRetry(
          evaluationPrompt,
          parser, // Parser for evaluation step
          {
            research: researchFindings[category],
            category: category,
            statements: state.groupedCategories[category].join("\n"),
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
        
        evaluatedScores[category] = evaluationResult.score;
        console.log("Successfully evaluated score for category:", category, "Score:", evaluationResult.score);
      } catch (error) {
        console.error("Error processing category:", category, error);
        // Use default values on error
        researchFindings[category] = `Error generating research findings for ${category}`;
        evaluatedScores[category] = 0; // Neutral score on error
      }
    }
    
    console.log("Successfully researched and evaluated all categories");
    console.debug("Research findings: ", researchFindings)
    console.debug("Scores: ", evaluatedScores)
    
    return {
      researchFindings,
      evaluatedScores
    };
  } catch (error) {
    console.error("Error in researchAndEvaluate:", error);
    return {
      researchFindings: {},
      evaluatedScores: {}
    };
  }
}