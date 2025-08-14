export interface UserBalance {
  userId: string;
  balance: number; // Dollar amount
  createdAt: Date;
  updatedAt: Date;
}

// Extended TokenUsage interface
export interface TokenUsage {
  id: string;
  userId: string;
  analysisId: string;
  modelName: string;
  inputTokens: number;
  outputTokens: number;
  cost: number; // Dollar amount
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
}

// Pricing information
export interface ModelPricing {
  modelName: string;
  inputTokenPrice: number; // Price per 1000 tokens
  outputTokenPrice: number; // Price per 1000 tokens
  provider: string;
}

export interface CostCalculation {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number; // Dollar amount
  provider: string;
  model: string;
}

// Usage summary for an analysis
export interface AnalysisUsageSummary {
  analysisId: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  modelUsages: {
    modelName: string;
    inputTokens: number;
    outputTokens: number;
    cost: number;
  }[];
}