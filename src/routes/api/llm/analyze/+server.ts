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

    console.log(`Analyzing ${typeof proposal === 'string' ? proposal : JSON.stringify(proposal)}`)
    
    if (!proposal) {
      return json({ error: 'Proposal is required' }, { status: 400 });
    }
    
    // Create repositories and balance service
    const repositories = createRepositories();
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
    const errors = [];
    try {
      // First, create an idea record for this proposal
      const proposalTitle = typeof proposal === 'string' ? proposal : proposal.title || 'Untitled Proposal';
      const proposalText = typeof proposal === 'string' ? proposal : proposal.text || proposal.description || '';
      const newIdea = await repositories.ideas.create({
        userId: locals.user.id,
        title: proposalTitle,
        text: proposalText,
        summary: result.finalSummary || '',
        published: false
      });

      // Store categories and downstream impacts
      if (result.groupedCategories && Object.keys(result.groupedCategories).length > 0) {
        for (const [categoryName, impacts] of Object.entries(result.groupedCategories)) {
          try {
            // Create category
            const category = await repositories.categories.create({
              ideaId: newIdea.id,
              name: categoryName,
              researchFindings: result.researchFindings?.[categoryName] || '',
              evaluatedScore: result.evaluatedScores?.[categoryName] || 0.5
            });

            // Create downstream impacts for this category
            const impactArray = impacts as string[];
            if (impactArray && impactArray.length > 0) {
              const impactsWithMetrics = impactArray.map((impact: string) => ({
                impact: {
                  categoryId: category.id,
                  impactText: impact,
                  calculatedImpactScore: result.evaluatedScores?.[categoryName] || 0.5
                },
                metrics: [] // Could add metrics here if needed
              }));

              await repositories.downstreamImpacts.createBatchWithMetrics(impactsWithMetrics);
            }

            console.log(`Successfully stored category "${categoryName}" with ${impactArray?.length || 0} downstream impacts`);
          } catch (error) {
            console.error(`Error creating category "${categoryName}":`, error);
            errors.push(`Category "${categoryName}": ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }

      console.log(`Analysis stored for idea ID: ${newIdea.id}`);
    } catch (dbError) {
      console.error('Failed to store analysis results:', dbError);
      // Insert this error at the first position:
      errors.unshift(`Failed to store analysis results: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
    }

    return json({
      success: errors.length === 0,
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