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
      const newIdea = await repositories.ideas.create({
        userId: locals.user.id,
        title: `Analysis: ${proposal.substring(0, 100)}...`,
        text: proposal,
        summary: result.finalSummary || '',
        published: false
      });

      // Store extracted statements using direct Supabase calls
      if (result.extractedStatements && result.extractedStatements.length > 0) {
        const statementInserts = result.extractedStatements.map((statement: any) => ({
          idea_id: newIdea.id,
          text: statement.text || statement,
          calculated_impact_score: statement.impactScore || '0.50'
        }));
        
        const { data: insertedStatements, error: statementsError } = await locals.supabase
          .from('statements')
          .insert(statementInserts)
          .select();
          
        if (statementsError) {
          console.error('Error inserting statements:', statementsError);
        } else {
          // Store statement metrics if available
          if (result.evaluatedScores && insertedStatements) {
            const metricInserts = [];
            for (let i = 0; i < insertedStatements.length; i++) {
              const statement = insertedStatements[i];
              const scores = result.evaluatedScores[i] || {};
              
              // Add metrics for each score type
              for (const [metricName, metricValue] of Object.entries(scores)) {
                if (typeof metricValue === 'number') {
                  metricInserts.push({
                    statement_id: statement.id,
                    metric_name: metricName,
                    metric_value: metricValue.toString()
                  });
                }
              }
            }
            
            if (metricInserts.length > 0) {
              const { error: metricsError } = await locals.supabase
                .from('statement_metrics')
                .insert(metricInserts);
                
              if (metricsError) {
                console.error('Error inserting statement metrics:', metricsError);
              }
            }
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