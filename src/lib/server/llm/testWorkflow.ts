import { llmWorkflow } from './workflow';

async function testWorkflow() {
  try {
    // Test input
    const testProposal = "We should build a fleet of electric driverless vehicles for our city and replace trains to provide efficient transport for remote areas";
    
    // Initialize the state with the proposal
    const initialState = {
      proposal: testProposal,
      analysisId: "test-analysis-id",
      userId: "test-user-id",
      extractedStatements: [],
      downstreamImpacts: [],
      groupedCategories: {},
      researchFindings: {},
      evaluatedScores: {},
      finalSummary: ''
    };
    
    console.log("Starting LLM workflow test...");
    console.log("Input proposal:", testProposal);
    
    // Invoke the workflow
    const result = await llmWorkflow.invoke(initialState);
    
    console.log("Workflow completed successfully!");
    console.log("Final summary:", result.finalSummary);
    
    return result;
  } catch (error) {
    console.error("Error in testWorkflow:", error);
    throw error;
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testWorkflow().catch(console.error);
}

export { testWorkflow };