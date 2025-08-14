# **Developer Instructions for LLM Backend (Node.js/TypeScript)**

This document outlines the high-level architecture and implementation plan for the LLM-powered backend. The system will use a LangGraph.js-based workflow for orchestration and Langfuse for observability, debugging, and quality control.

## **1\. Architecture & Core Logic (LangGraph.js)**

The core logic will be implemented as a stateful LangGraph.js workflow. This approach is chosen for its ability to manage a complex, multi-step process with conditional and parallel execution, all within the TypeScript ecosystem.

### **1.1. Setup & Dependencies**

The following Node.js packages must be installed. The LLM provider (e.g., OpenAI) should be selected and its SDK included.  
npm install @langchain/core @langchain/langgraph langfuse  
npm install @langchain/openai \# Or your chosen LLM provider, e.g., @langchain/google-vertexai  
npm install zod \# For schema validation (useful with LLMs)

Define a State interface (or type) to maintain the state of the workflow. This will act as the single source of truth for the entire process.  
// src/lib/types.ts (or similar)  
export interface AnalysisState {  
    proposal: string;  
    extractedStatements: string\[\];  
    downstreamImpacts: string\[\];  
    groupedCategories: { \[key: string\]: string\[\] };  
    researchFindings: { \[key: string\]: string };  
    evaluatedScores: { \[key: string\]: number };  
    finalSummary: string;  
}

### **1.2. Define the Graph Nodes**

Each step in the analysis will be a node in the LangGraph.js graph. These nodes are TypeScript functions that take the current State as input and return an updated State.

* **extractStatements(state: AnalysisState): Promise\<Partial\<AnalysisState\>\>**:  
  * Takes the proposal and breaks it into discrete impact statements.  
  * Uses a **LangChain.js PromptTemplate** and an LLM to identify and rephrase distinct components. The prompt should be few-shot, with examples of a proposal and a clean list of statements.  
  * Returns an object updating extractedStatements.  
* **generateDownstreamImpacts(state: AnalysisState): Promise\<Partial\<AnalysisState\>\>**:  
  * For each statement in state.extractedStatements, generates a list of 5-10 direct and indirect consequences. This can be done using Promise.all for parallel execution.  
  * Uses a LangChain.js PromptTemplate emphasizing "systems thinking" and parallel impacts.  
  * Returns an object updating downstreamImpacts by consolidating the results into a single list.  
* **categorizeImpacts(state: AnalysisState): Promise\<Partial\<AnalysisState\>\>**:  
  * Takes the consolidated list of all impact statements (state.downstreamImpacts) and groups them into logical categories (e.g., "Resources", "Labor", "Environment", "Social Welfare").  
  * Uses a LangChain.js PromptTemplate to instruct the LLM to create a structured object with category names as keys and arrays of impact statements as values.  
  * Returns an object updating groupedCategories.  
* **researchAndEvaluate(state: AnalysisState): Promise\<Partial\<AnalysisState\>\>**:  
  * This is the most complex node, potentially implemented as a sub-graph or by using LangChain.js tools. It iterates through each category in state.groupedCategories.  
  * **Research Sub-step:** Use a **tool** (e.g., a web search tool integrated via LangChain.js, like @langchain/community/tools/tavily\_search) to find quantifiable data for each category. The search prompt must be highly specific.  
  * **Evaluation Sub-step:** Use a LangChain.js PromptTemplate to analyze the research and assign a numerical score between \-1.0 and \+1.0. The prompt must clearly define scoring criteria based on your project's SDGs and Doughnut Economics framework.  
  * Returns an object updating researchFindings and evaluatedScores.  
* **summarizeFindings(state: AnalysisState): Promise\<Partial\<AnalysisState\>\>**:  
  * The final node that consolidates all scores, research findings, and the original proposal.  
  * Uses a LangChain.js PromptTemplate to generate the final user-facing summary. The prompt must explicitly state all requirements: consolidate scores and research, provide an overall recommendation based on the predefined logic (e.g., the 10:1 positive-to-negative ratio), and maintain a professional, objective tone.  
  * Returns an object updating finalSummary.

### **1.3. Construct the LangGraph.js Workflow**

Define the graph's structure with clear entry and exit points and the flow between nodes.  
// src/lib/llmWorkflow.ts (or similar)  
import { StateGraph } from '@langchain/langgraph';  
import type { AnalysisState } from './types';  
// Import your node functions:  
// import { extractStatements, generateDownstreamImpacts, ... } from './nodes';

const graphBuilder \= new StateGraph\<AnalysisState\>()  
    .addNode("extract", async (state) \=\> extractStatements(state))  
    .addNode("downstream", async (state) \=\> generateDownstreamImpacts(state))  
    .addNode("categorize", async (state) \=\> categorizeImpacts(state))  
    .addNode("evaluate", async (state) \=\> researchAndEvaluate(state))  
    .addNode("summarize", async (state) \=\> summarizeFindings(state));

// Define the flow  
graphBuilder.addEdge("extract", "downstream");  
graphBuilder.addEdge("downstream", "categorize");  
graphBuilder.addEdge("categorize", "evaluate");  
graphBuilder.addEdge("evaluate", "summarize");

// Set the entry and finish points  
graphBuilder.setEntryPoint("extract");  
graphBuilder.setFinishPoint("summarize");

export const llmWorkflow \= graphBuilder.compile();

## **2\. Observability & Quality Control (Langfuse)**

Langfuse integration is critical for debugging, monitoring costs, and ensuring the quality of the LLM's output. Instrument the LangGraph.js workflow to send detailed traces to Langfuse.

### **2.1. Langfuse Setup & Integration**

* Configure the following **environment variables** (e.g., in a .env file, accessible via dotenv in Node.js) for Langfuse authentication:  
  * LANGFUSE\_PUBLIC\_KEY  
  * LANGFUSE\_SECRET\_KEY  
  * LANGFUSE\_HOST (e.g., https://cloud.langfuse.com)  
* Create a Langfuse **CallbackHandler** instance from langfuse-langchain (or use the core langfuse SDK for lower-level control).

// Example for a \+server.ts or API route file  
import { CallbackHandler } from 'langfuse-langchain';  
import { llmWorkflow } from '$lib/llmWorkflow'; // Your compiled LangGraph

// Initialize Langfuse CallbackHandler for Langchain (tracing)  
const langfuseHandler \= new CallbackHandler({  
    publicKey: process.env.LANGFUSE\_PUBLIC\_KEY\!,  
    secretKey: process.env.LANGFUSE\_SECRET\_KEY\!,  
    baseUrl: process.env.LANGFUSE\_HOST || 'https://cloud.langfuse.com',  
});

// Pass to the LangGraph invocation  
// Note: Langfuse's integration with LangChain.js expects the callback in the config object  
const result \= await llmWorkflow.invoke(  
    { proposal: "Your new idea..." },  
    { callbacks: \[langfuseHandler\] }  
);

### **2.2. Debugging and Evaluation**

* **Trace View:** Use the Langfuse UI to view the detailed traces of each run. This will visualize the graph's execution, show prompts, outputs, and any errors. This is the primary tool for debugging.  
* **Prompt Management:** All prompts used in the nodes should be version-controlled. Langfuse's prompt management features can be used to A/B test and systematically improve prompts without code changes.  
* **Evaluation:** A dataset of "golden" examples (proposals with ideal outputs) should be created in Langfuse. This will be used to run automated evaluations whenever a prompt or model is changed. This ensures that new changes don't degrade performance.  
* **Monitoring:** Use the Langfuse dashboard to monitor key metrics in production, such as:  
  * **Cost:** Track the token usage and cost per run.  
  * **Latency:** Monitor the time it takes for a full run to complete.  
  * **Error Rate:** Observe which steps are failing and why.

## **3\. Real Cost-Based Usage Limits & Stripe Integration**

To prevent abuse and manage costs, implement a comprehensive real cost-based usage limiting system that tracks actual LLM token usage and costs. LangChain and Langfuse provide excellent tracking capabilities for this purpose.

### **3.1. Real Cost-Based System (Selected Approach)**

**Core Principles:**
- Track actual token usage for each LLM call through LangChain
- Calculate real costs based on provider rates (e.g., OpenAI pricing)
- Users have a dollar balance instead of arbitrary credits
- Pay-per-use model: users pay exactly for what they consume

**User Balance System:**
- **New User Signup:** $10.00 free credit
- **Precise Deductions:** Each analysis deducts the exact calculated cost
- **Transparent Pricing:** Users see estimated costs before analysis and actual costs after completion

### **3.2. LangChain & Langfuse Usage Tracking**

LangChain and Langfuse provide comprehensive usage tracking:
- **Token Counts:** Exact token usage for each prompt and completion
- **Cost Calculation:** Real-time cost tracking based on provider rates
- **Usage Analytics:** Detailed breakdowns per user, per request, per time period
- **Rate Limiting:** Built-in support for limiting requests per user

### **3.3. Stripe Integration**

**Payment Processing:**
- Integrate with Stripe for credit card purchases
- Handle small dollar amounts efficiently
- Automatic balance top-ups when users purchase more credit
- Secure payment processing with webhook support

**User Experience:**
- Show estimated cost before analysis starts
- Display actual cost after completion
- Warn users when balance gets low (<$0.50)
- Block new analysis requests when balance is insufficient
- Allow current analysis to complete before blocking

### **3.4. Implementation Strategy**

1. **Database Schema:** Add user_balances table to track dollar amounts
2. **Stripe Integration:** Set up payment processing and webhooks
3. **Cost Calculation:** Implement real-time token counting and cost calculation
4. **Middleware:** Implement balance checking before processing requests
5. **Usage Logging:** Log all analysis requests with actual costs
6. **Graceful Degradation:** Provide informative messages when balance is insufficient

### **3.5. Cost Examples & User Experience**

**Cost Ranges:**
- **Simple Analysis:** 500 tokens total = ~$0.01
- **Complex Analysis:** 5000 tokens total = ~$0.10
- **Very Complex:** 15000 tokens total = ~$0.30

**User Flow:**
1. User submits proposal → System shows estimated cost
2. User confirms → Analysis proceeds
3. Analysis completes → System shows actual cost and deducts from balance
4. Low balance warning → User can purchase more credit
5. Insufficient balance → New analysis requests blocked (current analysis continues)

## **4\. Final Instructions for an AI Developer**

1. **Build the LangGraph.js:** Write the TypeScript code to define the AnalysisState interface, the five core node functions (asynchronous), and the graph's structure using StateGraph. Ensure the prompts are detailed and few-shot examples are provided where beneficial.  
2. **Integrate Langfuse:** Instrument the LangGraph.js workflow by passing the CallbackHandler to the graph's invoke method. Ensure all necessary environment variables are configured.  
3. **Implement Real Cost-Based Usage Limits:** Create the dollar balance system with Stripe integration, real-time cost calculation, and balance management.  
4. **Testing and Debugging:** Run the system with a variety of test inputs. Use the Langfuse dashboard to analyze the traces and verify that each node is performing as expected. Adjust prompts and logic as needed based on the insights from the traces.  
5. **Deployment:** Deploy the Node.js/TypeScript backend (e.g., as SvelteKit \+server.ts endpoints). The Langfuse integration will continue to provide real-time observability in production, enabling continuous monitoring and improvement.