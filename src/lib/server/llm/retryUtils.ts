import type { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import type { Runnable } from "@langchain/core/runnables";
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { LLM_MODELS, type LLMModel } from "$lib/server/llm/types";

// Define types for our retry utility
interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  fallbackModels?: LLMModel[];
  timeout?: number;
}

interface LLMCallOptions {
  model: LLMModel | string;
  temperature: number;
  callbacks?: BaseCallbackHandler[];
}

// Custom error classes for better error handling
class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}

class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
  }
}

/**
 * Helper function to instantiate an LLM model based on its name.
 * @param model The name of the model to instantiate.
 * @param temperature The temperature setting for the model.
 * @param timeout The timeout for the model.
 * @returns An instance of BaseChatModel.
 */
function getLLMModelInstance(model: LLMModel | string, temperature: number, timeout: number): BaseChatModel {
  const modelName = model
  if (modelName.toLowerCase().startsWith("gpt")) {
    return new ChatOpenAI({
      modelName: model,
      temperature: temperature,
      timeout: timeout
    });
  } else if (modelName.toLowerCase().startsWith("claude")) {
    return new ChatAnthropic({
      model,
      temperature: temperature,
      // Anthropic models handle timeout at the call level, not constructor.
      // This 'timeout' will be passed as a call option in invoke later.
    });
  } else if (modelName.toLowerCase().startsWith("gemini")) {
    // Google models
    return new ChatGoogleGenerativeAI({
      model,
      temperature: temperature,
    });
  }
  throw new Error(`Unsupported LLM model: ${model}`);
}

/**
 * Utility function to call LLM with retry and fallback mechanisms
 * @param prompt The prompt to use
 * @param parser The parser to use (if any)
 * @param input The input for the chain
 * @param llmOptions Options for the LLM (model name, temperature, etc.)
 * @param retryOptions Options for retry mechanism
 * @returns The result of the LLM call
 */
export async function callWithRetry(
  prompt: any,
  parser: any | null,
  input: any,
  llmOptions: LLMCallOptions,
  retryOptions: RetryOptions = {}
) {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    fallbackModels = [],
    timeout = 60000 // 60 seconds default timeout
  } = retryOptions;

  const modelsToTry = [llmOptions.model, ...fallbackModels];
  let lastError: Error | undefined;

  // Try each model in sequence
  for (let modelIndex = 0; modelIndex < modelsToTry.length; modelIndex++) {
    const currentModelName = modelsToTry[modelIndex];
    const isFallbackModel = modelIndex > 0;
    
    if (isFallbackModel) {
      console.log(`Attempting fallback to model: ${currentModelName}`);
    }

    // Try this model with retries
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Create a new model instance using the helper function
        const model = getLLMModelInstance(currentModelName, llmOptions.temperature, timeout);

        // Create the chain with the current model
        let chain: Runnable;
        if (parser) {
          chain = prompt.pipe(model).pipe(parser);
        } else {
          chain = prompt.pipe(model);
        }

        // Add a timeout wrapper
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new TimeoutError(`LLM call timed out after ${timeout}ms`)), timeout);
        });

        // Execute the LLM call with timeout
        const result = await Promise.race([
          chain.invoke(input, { callbacks: llmOptions.callbacks }),
          timeoutPromise
        ]);

        if (isFallbackModel) {
          console.log(`Successfully executed with fallback model: ${currentModelName}`);
        } else if (attempt > 0) {
          console.log(`Successfully executed after ${attempt} retries with model: ${currentModelName}`);
        }

        return result;
      } catch (error: any) {
        lastError = error;
        
        // Log the error
        console.error(`Error calling LLM with model ${currentModelName} (attempt ${attempt + 1}/${maxRetries + 1}):`, error);
        
        // If this is the last attempt with this model and we have more models to try, don't delay
        if (attempt === maxRetries && modelIndex < modelsToTry.length - 1) {
          continue;
        }
        
        // If this is the last attempt overall, rethrow the error
        if (attempt === maxRetries && modelIndex === modelsToTry.length - 1) {
          throw new Error(`LLM call failed after trying ${modelsToTry.length} models with ${maxRetries + 1} attempts each. Last error: ${lastError?.message || 'Unknown error'}`);
        }
        
        // Check if this is a rate limit error (529) or timeout
        const isRateLimitError = error?.response?.status === 429 ||
                                error?.code === 429 ||
                                (error?.message && error.message.includes("rate limit")) ||
                                error instanceof RateLimitError;
                                
        const isTimeoutError = error instanceof TimeoutError;
        
        // Don't retry on non-retryable errors (unless it's a rate limit or timeout)
        if (!isRateLimitError && !isTimeoutError && error?.response?.status && error.response.status >= 400 && error.response.status < 500) {
          throw error;
        }
        
        // Calculate delay with exponential backoff
        let delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        
        // Add jitter to prevent thundering herd
        delay = delay * (0.5 + Math.random() * 0.5);
        
        // Add additional delay for rate limit errors
        if (isRateLimitError) {
          // Extract retry-after header if available
          const retryAfter = error?.response?.headers?.["retry-after"];
          if (retryAfter) {
            delay = Math.max(delay, parseInt(retryAfter) * 1000);
          } else {
            // Default to longer delay for rate limits
            delay = Math.max(delay, 5000);
          }
          console.log(`Rate limit error detected, waiting ${delay}ms before retrying...`);
        } else if (isTimeoutError) {
          console.log(`Timeout error detected, waiting ${delay}ms before retrying...`);
        } else {
          console.log(`Error occurred, waiting ${delay}ms before retrying...`);
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // If we get here, all attempts failed
  throw new Error(`LLM call failed after trying all models. Last error: ${lastError?.message || 'Unknown error'}`);
}