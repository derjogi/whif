# Technical Specification: Replace Simulated LLM Responses with Actual LLM Calls

## 1. Overview

This document outlines the technical specification for replacing simulated LLM responses with actual LLM calls in all five nodes of the LangGraph.js workflow. The implementation will use the LangChain.js framework with OpenAI as the LLM provider, following the patterns specified in the developer instructions.

## 2. Current Implementation Analysis

The current implementation uses simulated responses in all five nodes:
1. `extractStatements` - Splits proposal text and creates basic statements
2. `generateDownstreamImpacts` - Generates template impacts for each statement
3. `categorizeImpacts` - Distributes impacts across predefined categories
4. `researchAndEvaluate` - Generates mock research findings and random scores
5. `summarizeFindings` - Creates a basic markdown summary from scores

All nodes follow the correct pattern with PromptTemplate, StructuredOutputParser, and proper error handling, but the actual LLM calls are commented out.

## 3. LangChain.js Integration Pattern

### 3.1. Core Components
- **Model**: OpenAI GPT models via `@langchain/openai`
- **Prompts**: `PromptTemplate` from `@langchain/core/prompts`
- **Output Parsing**: `StructuredOutputParser` from `@langchain/core/output_parsers`
- **Schema Validation**: `zod` for defining output schemas
- **Observability**: Langfuse integration via `langfuse-langchain`

### 3.2. Implementation Pattern
```typescript
import { ChatOpenAI } from "@langchain/openai";

// Initialize the model
const model = new ChatOpenAI({
  modelName: "gpt-4o-mini", // or gpt-4o for more complex tasks
  temperature: 0,
});

// Create chain
const chain = prompt.pipe(model).pipe(parser);

// Invoke with proper input
const result = await chain.invoke({
  // ... input variables
  format_instructions: parser.getFormatInstructions()
});
```

## 4. Exact Changes Needed in Each Node

### 4.1. extractStatements.ts
**Current**: Uses string splitting to simulate statement extraction
**Changes**:
1. Import `ChatOpenAI` from `@langchain/openai`
2. Initialize model: `new ChatOpenAI({ modelName: "gpt-4o-mini", temperature: 0 })`
3. Create chain: `prompt.pipe(model).pipe(parser)`
4. Replace simulated response with actual LLM call
5. Add proper logging for LLM calls

### 4.2. generateDownstreamImpacts.ts
**Current**: Generates template impacts for each statement
**Changes**:
1. Import `ChatOpenAI` from `@langchain/openai`
2. Initialize model: `new ChatOpenAI({ modelName: "gpt-4o-mini", temperature: 0.7 })`
3. Create chain: `prompt.pipe(model).pipe(parser)`
4. Replace simulated response with actual LLM calls (one per statement)
5. Add proper logging for LLM calls
6. Implement parallel execution with `Promise.all`

### 4.3. categorizeImpacts.ts
**Current**: Distributes impacts across predefined categories
**Changes**:
1. Import `ChatOpenAI` from `@langchain/openai`
2. Initialize model: `new ChatOpenAI({ modelName: "gpt-4o", temperature: 0 })`
3. Create chain: `prompt.pipe(model).pipe(parser)`
4. Replace simulated response with actual LLM call
5. Add proper logging for LLM calls

### 4.4. researchAndEvaluate.ts
**Current**: Generates mock research findings and random scores
**Changes**:
1. Import `ChatOpenAI` from `@langchain/openai`
2. Initialize models:
   - Research model: `new ChatOpenAI({ modelName: "gpt-4o", temperature: 0 })`
   - Evaluation model: `new ChatOpenAI({ modelName: "gpt-4o", temperature: 0 })`
3. Create chains for both research and evaluation
4. Replace simulated responses with actual LLM calls
5. Add proper logging for LLM calls
6. Implement sequential execution for each category

### 4.5. summarizeFindings.ts
**Current**: Creates a basic markdown summary from scores
**Changes**:
1. Import `ChatOpenAI` from `@langchain/openai`
2. Initialize model: `new ChatOpenAI({ modelName: "gpt-4o", temperature: 0 })`
3. Create chain: `prompt.pipe(model).pipe(parser)`
4. Replace simulated response with actual LLM call
5. Add proper logging for LLM calls

## 5. Error Handling and Retry Mechanisms

### 5.1. Error Handling
- Wrap all LLM calls in try-catch blocks
- Log errors with context information
- Return appropriate fallback values on error
- Maintain existing error handling structure

### 5.2. Retry Mechanisms
- Implement exponential backoff retry logic (3 attempts max)
- Use `chatModel.withRetry()` from LangChain
- Handle specific error types:
  - Rate limiting errors (429)
  - Timeout errors
  - Network errors
- Add jitter to retry delays to prevent thundering herd

### 5.3. Implementation Pattern
```typescript
try {
  const result = await chain.invoke(input, {
    retryOptions: {
      maxRetries: 3,
      delay: 1000, // Initial delay in ms
      backoff: "exponential", // Exponential backoff
    }
  });
  return result;
} catch (error) {
  console.error(`Error in ${nodeName}:`, error);
  // Return appropriate fallback
}
```

## 6. Environment Variable Requirements

### 6.1. Required Variables
- `OPENAI_API_KEY` - OpenAI API key for authentication

### 6.2. Optional Variables
- `OPENAI_BASE_URL` - Custom base URL for OpenAI API (for proxy/enterprise)
- `OPENAI_MODEL_NAME` - Override default model name
- `OPENAI_TEMPERATURE` - Override default temperature

### 6.3. Current Variables (already present)
- `LANGFUSE_PUBLIC_KEY` - For Langfuse integration
- `LANGFUSE_SECRET_KEY` - For Langfuse integration
- `LANGFUSE_HOST` - For Langfuse integration

## 7. Testing Strategy

### 7.1. Unit Testing
- Test each node function with mock inputs
- Verify correct output structure matches schema
- Test error handling paths
- Test retry mechanisms with mocked failures

### 7.2. Integration Testing
- Test complete workflow with sample proposals
- Verify Langfuse tracing is working
- Test with various proposal lengths and complexities
- Validate cost tracking integration

### 7.3. Performance Testing
- Measure latency for each node
- Monitor token usage and costs
- Test parallel execution performance
- Validate retry mechanism effectiveness

### 7.4. Test Implementation
- Use existing `testWorkflow.ts` for integration testing
- Add unit tests for individual node functions
- Implement mock LLM responses for unit tests
- Add test cases for error scenarios

## 8. Implementation Order
1. Update environment configuration
2. Implement extractStatements node
3. Implement generateDownstreamImpacts node
4. Implement categorizeImpacts node
5. Implement researchAndEvaluate node
6. Implement summarizeFindings node
7. Update testWorkflow for integration testing
8. Add comprehensive error handling and logging
9. Implement retry mechanisms
10. Validate with test cases

## 9. Monitoring and Observability
- All LLM calls will be automatically traced by Langfuse
- Add custom logging for input/output of each node
- Monitor token usage and costs through Langfuse
- Set up alerts for error rates and latency issues