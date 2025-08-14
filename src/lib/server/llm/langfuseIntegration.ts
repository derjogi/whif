import { CallbackHandler } from "langfuse-langchain";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Initialize Langfuse CallbackHandler for Langchain (tracing)
export const langfuseHandler = new CallbackHandler({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
  secretKey: process.env.LANGFUSE_SECRET_KEY!,
  baseUrl: process.env.LANGFUSE_HOST || "https://cloud.langfuse.com",
});

// Function to wrap the workflow invocation with Langfuse tracing
export async function invokeWithTracing(workflow: any, input: any) {
  try {
    // Pass to the LangGraph invocation
    // Note: Langfuse's integration with LangChain.js expects the callback in the config object
    const result = await workflow.invoke(
      input,
      { callbacks: [langfuseHandler] }
    );
    return result;
  } catch (error) {
    console.error("Error in invokeWithTracing:", error);
    throw error;
  } finally {
    // Ensure the trace is flushed
    await langfuseHandler.flushAsync();
  }
}