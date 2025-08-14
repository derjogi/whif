# Token Usage Tracking and Cost Calculation System - Implementation Summary

## Overview

This document summarizes the implementation of the token usage tracking and cost calculation system for LLM calls as specified in the technical specification.

## Components Implemented

### 1. Database Schema
- Created `token_usage` table with fields for tracking user ID, analysis ID, model name, input/output tokens, cost, timestamp, success status, and error messages
- Added appropriate indexes for performance
- Implemented RLS policies for security

### 2. TypeScript Types
- Extended `TokenUsage` interface with all required fields
- Added `ModelPricing` interface for pricing information
- Added `AnalysisUsageSummary` interface for usage summaries
- Updated database schema and interfaces to include token usage

### 3. Services

#### TokenTrackingService
- Service for tracking token usage from LLM calls
- Provides methods for recording token usage and failed calls
- Creates callback handlers for integration with LangChain.js

#### CostCalculationService
- Service for calculating costs based on token usage and provider rates
- Supports OpenAI GPT-4o-mini and GPT-4o pricing
- Provides methods for calculating costs and getting pricing information

#### TokenTrackingCallback
- Custom LangChain.js callback handler for tracking token usage
- Extracts token usage from LLM outputs and records it
- Handles LLM errors and records failed calls

### 4. Repository Implementation
- Created `SupabaseTokenUsageRepository` implementing `ITokenUsageRepository`
- Provides methods for creating, retrieving, and querying token usage data
- Includes methods for getting usage summaries and costs for analyses

### 5. Integration Examples
- Created examples showing how to integrate token tracking with LLM nodes
- Demonstrated real-time cost calculation
- Provided error handling patterns for edge cases
- Showed integration with existing LangChain.js callbacks

## Key Features Implemented

### Token Tracking
- Tracks actual token usage for each LLM call (input tokens and output tokens)
- Records model information for pricing calculations
- Handles failed LLM calls with error recording

### Cost Calculation
- Calculates real costs based on provider rates (OpenAI pricing)
- Supports different models with different pricing
- Provides real-time cost calculation during analysis

### Data Storage
- Stores usage data for billing and monitoring purposes
- Implements proper database schema with indexes for performance
- Includes error handling for database storage failures

### Integration
- Integrates with existing LangChain.js callback system
- Works with existing Langfuse tracing setup
- Associates usage with analysis sessions and user IDs

### Error Handling
- Handles edge cases like failed LLM calls
- Provides fallback mechanisms for missing token information
- Implements retry logic for network issues
- Handles unknown models with default pricing

## Usage Examples

The implementation includes examples showing how to:

1. Create tracking callbacks for LLM calls
2. Integrate token tracking with existing LangChain.js workflows
3. Calculate costs in real-time during analysis
4. Handle various error conditions
5. Query usage data and generate summaries

## Future Integration Points

To fully integrate this system into the existing workflow:

1. Update LLM nodes to instantiate and use `TokenTrackingService`
2. Pass user and analysis IDs through the workflow state
3. Add token tracking callbacks to LLM chain invocations
4. Integrate cost calculations with the balance service for real-time deduction
5. Add usage summaries to analysis results for user feedback

## Testing Considerations

The implementation supports the testing strategy outlined in the specification:

- Unit tests for cost calculation with different models and token counts
- Unit tests for token tracking service and callback handler
- Integration tests for LangChain.js callback integration
- Integration tests for database storage and querying
- End-to-end tests for complete workflow with token tracking
- Performance tests for latency impact and scalability
- Error handling tests for various failure scenarios