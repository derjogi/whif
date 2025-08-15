import { json, type RequestHandler } from '@sveltejs/kit';
import { llmWorkflow } from '../../../../lib/server/llm/workflow';
import { invokeWithTracing } from '../../../../lib/server/llm/langfuseIntegration';
import { BalanceService } from '../../../../lib/server/llm/costTracking/balanceService';
import { createRepositories } from '../../../../lib/server/database/supabase';

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    // Check if user is authenticated
    if (!locals.user) {
      return json({ error: 'Authentication required' }, { status: 401 });
    }
    
    const { proposal } = await request.json();
    
    if (!proposal) {
      return json({ error: 'Proposal is required' }, { status: 400 });
    }
    
    // Create repositories and balance service
    const repositories = createRepositories(locals.supabase);
    const balanceService = new BalanceService(repositories.userBalances, repositories.balanceTransactions);
    
    // Check user balance (using a slightly higher estimated cost for now, to be on the safe side)
    // In a real implementation, this would be a more accurate estimate
    const estimatedCost = 1.0;
    const hasSufficientBalance = await balanceService.hasSufficientBalance(locals.user.id, estimatedCost);
    
    if (!hasSufficientBalance) {
      return json({
        error: 'Insufficient balance. Please add credits to your account to continue.'
      }, { status: 402 });
    }
    
    // Initialize the state with the proposal
    const initialState = {
      proposal,
      analysisId: "analysis-" + Date.now(), // Generate a unique analysis ID
      userId: locals.user.id, // Use the authenticated user ID
      extractedStatements: [],
      downstreamImpacts: [],
      groupedCategories: {},
      researchFindings: {},
      evaluatedScores: {},
      finalSummary: ''
    };
    
    // Invoke the workflow with tracing
    const result = await invokeWithTracing(llmWorkflow, initialState);
    
    // Store results in database
    try {
      // First, create an idea record for this proposal
      const proposalText = typeof proposal === 'string' ? proposal : JSON.stringify(proposal);
      const newIdea = await repositories.ideas.create({
        userId: locals.user.id,
        title: `Analysis: ${proposalText.substring(0, 100)}...`,
        text: proposalText,
        summary: result.finalSummary || '',
        published: false
      });

      // Store extracted statements using statementRepository
      if (result.extractedStatements && result.extractedStatements.length > 0) {
        const statementsWithMetrics = result.extractedStatements.map((statement: any, index: number) => {
          const statementText = statement.text || statement;
          const impactScore = statement.impactScore || '0.50';
          
          // Create statement data
          const statementData = {
            idea_id: newIdea.id,
            text: statementText,
            calculated_impact_score: impactScore
          };
          
          // Create metrics from evaluatedScores
          const metrics = [];
          const scores = result.evaluatedScores[index] || {};
          
          for (const [metricName, metricValue] of Object.entries(scores)) {
            if (typeof metricValue === 'number') {
              metrics.push({
                metricName,
                metricValue: metricValue.toString()
              });
            }
          }
          
          return {
            statement: statementData,
            metrics
          };
        });
        
        // Use statementRepository to create statements with metrics in batch
        if (statementsWithMetrics.length > 0) {
          try {
            await repositories.statements.createBatchWithMetrics(statementsWithMetrics);
            console.log(`Successfully stored ${statementsWithMetrics.length} statements with metrics`);
          } catch (error) {
            console.error('Error creating statements with metrics:', error);
          }
        }
      }
      
      console.log(`Analysis stored for idea ID: ${newIdea.id}`);
    } catch (dbError) {
      console.error('Failed to store analysis results:', dbError);
      // Continue with response even if database storage fails
    }

    return json({
      success: true,
      analysis: result
    });
  } catch (error) {
    console.error('Error in LLM analysis:', error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
};