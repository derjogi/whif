import { StateGraph } from "@langchain/langgraph";
import type { AnalysisState } from "./types";
import { extractStatements } from "./nodes/extractStatements";
import { generateDownstreamImpacts } from "./nodes/generateDownstreamImpacts";
import { categorizeImpacts } from "./nodes/categorizeImpacts";
import { researchAndEvaluate } from "./nodes/researchAndEvaluate";
import { summarizeFindings } from "./nodes/summarizeFindings";

// Create the workflow graph
const graphBuilder = new StateGraph<AnalysisState>({
  channels: {
    proposal: null,
    analysisId: null,
    userId: null,
    extractedStatements: null,
    downstreamImpacts: null,
    groupedCategories: null,
    researchFindings: null,
    evaluatedScores: null,
    finalSummary: null,
  },
})
  .addNode("extract", extractStatements)
  .addNode("downstream", generateDownstreamImpacts)
  .addNode("categorize", categorizeImpacts)
  .addNode("evaluate", researchAndEvaluate)
  .addNode("summarize", summarizeFindings);

// Define the flow
graphBuilder.addEdge("extract", "downstream");
graphBuilder.addEdge("downstream", "categorize");
graphBuilder.addEdge("categorize", "evaluate");
graphBuilder.addEdge("evaluate", "summarize");

// Set the entry and finish points
graphBuilder.setEntryPoint("extract");
graphBuilder.setFinishPoint("summarize");

// Compile the graph
export const llmWorkflow = graphBuilder.compile();