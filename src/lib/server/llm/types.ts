import { ChatAnthropic } from "@langchain/anthropic";

export interface AnalysisState {
    proposal: string;
    analysisId: string;
    userId: string;
    extractedStatements: string[];
    downstreamImpacts: string[];
    groupedCategories: { [key: string]: string[] };
    researchFindings: { [key: string]: string };
    evaluatedScores: { [key: string]: number };
    finalSummary: string;
}

export const LLM_MODELS = {
    GPT_3_5_TURBO: "gpt-3.5-turbo",
    GPT_4_TURBO: "gpt-4-turbo",
    GPT_4O_MINI: "gpt-4o-mini",
    GPT_4O: "gpt-4o",
    CLAUDE_3_HAIKU: "claude-3-5-haiku-latest",
    CLAUDE_3_SONNET: "claude-3-sonnet-20240229",
    CLAUDE_3_OPUS: "claude-3-opus-latest",
    CLAUDE_3_7_SONNET: "claude-3-7-sonnet-latest",
    CLAUDE_4_SONNET: "claude-sonnet-4-0",
    CLAUDE_4_OPUS: "claude-opus-4-0",
    GEMINI_PRO: "gemini-pro"
} as const; // 'as const' makes the object properties readonly and infers literal types

export type LLMModel = typeof LLM_MODELS[keyof typeof LLM_MODELS];

/**
 *  | 'claude-3-7-sonnet-latest'
  | 'claude-3-7-sonnet-20250219'
  | 'claude-3-5-haiku-latest'
  | 'claude-3-5-haiku-20241022'
  | 'claude-sonnet-4-20250514'
  | 'claude-sonnet-4-0'
  | 'claude-4-sonnet-20250514'
  | 'claude-3-5-sonnet-latest'
  | 'claude-3-5-sonnet-20241022'
  | 'claude-3-5-sonnet-20240620'
  | 'claude-opus-4-0'
  | 'claude-opus-4-20250514'
  | 'claude-4-opus-20250514'
  | 'claude-3-opus-latest'
  | 'claude-3-opus-20240229'
  | 'claude-3-sonnet-20240229'
  | 'claude-3-haiku-20240307'
  | 'claude-2.1'
  | 'claude-2.0'
 */

