# Voting System & Real-time Updates

## Interactive & Mathematical Logic

### Impact Score Normalization
* All impact scores must be normalized to the range **-1 to +1**.
* **Initial State:** When results are first displayed, each statement's upvote and downvote counts should be zero, and its impact weight should be the default **0.5**.

### User Interaction (Voting)

#### Authentication Requirements
* **Authentication Required:** Only authenticated users can vote
* Clicking the **upvote** button increments the upvote count for that statement.
* Clicking the **downvote** button increments the downvote count.
* Each authenticated user can cast **one vote per statement** (either up or down).
* If a user changes their vote, the previous vote should be removed, and the new vote applied.

#### Voting Logic Implementation

```typescript
// src/lib/server/database/supabase/voteRepository.ts
import type { Vote, VoteUpsert } from '$lib/types';

export class VoteRepository {
  constructor(private supabase: SupabaseClient) {}
  
  async upsert(voteData: VoteUpsert): Promise<Vote> {
    const { data, error } = await this.supabase
      .from('votes')
      .upsert(
        {
          statement_id: voteData.statementId,
          user_id: voteData.userId,
          vote_type: voteData.voteType,
          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'statement_id, user_id'
        }
      )
      .select()
      .single();
      
    if (error) {
      throw new Error(`Failed to upsert vote: ${error.message}`);
    }
    
    return data;
  }
  
  async getVoteCountsForStatement(statementId: string): Promise<{ upvotes: number; downvotes: number }> {
    const { data, error } = await this.supabase
      .from('votes')
      .select('vote_type')
      .eq('statement_id', statementId);
      
    if (error) {
      throw new Error(`Failed to get vote counts: ${error.message}`);
    }
    
    const upvotes = data.filter(vote => vote.vote_type === 1).length;
    const downvotes = data.filter(vote => vote.vote_type === -1).length;
    
    return { upvotes, downvotes };
  }
  
  async getUserVoteForStatement(userId: string, statementId: string): Promise<Vote | null> {
    const { data, error } = await this.supabase
      .from('votes')
      .select()
      .eq('user_id', userId)
      .eq('statement_id', statementId)
      .maybeSingle();
      
    if (error) {
      throw new Error(`Failed to get user vote: ${error.message}`);
    }
    
    return data;
  }
}
```

### Impact Calculation Formula

* **Initial Weight Base**: Each statement has an inherent base weight of **0.5** that is used in calculations but not stored in the database. This represents neutral community confidence before any voting occurs.
* **Formula:** Let U = total upvotes for a statement, and D = total downvotes for a statement. The calculated impact weight (score) for a statement should be: `(U + 0.5) / (U + D + 1)`.

#### Impact Calculation Implementation

```typescript
// src/lib/server/services/impactCalculationService.ts
export function calculateImpactWeight(upvotes: number, downvotes: number): number {
  // Formula: (U + 0.5) / (U + D + 1)
  return (upvotes + 0.5) / (upvotes + downvotes + 1);
}

export function calculateWeightedImpact(
  originalScore: number, 
  impactWeight: number
): number {
  // statement_metric_value * calculated_weight
  const weightedImpact = originalScore * impactWeight;
  
  // Ensure result stays within -1 to +1 range
  return Math.max(-1, Math.min(1, weightedImpact));
}

export function aggregateMetricImpacts(statements: StatementWithMetrics[]): Record<string, number> {
  const metricAggregates: Record<string, number> = {};
  
  for (const statement of statements) {
    const impactWeight = calculateImpactWeight(
      statement.upvotes || 0, 
      statement.downvotes || 0
    );
    
    for (const metric of statement.metrics) {
      const weightedImpact = calculateWeightedImpact(metric.metric_value, impactWeight);
      
      if (!metricAggregates[metric.metric_name]) {
        metricAggregates[metric.metric_name] = 0;
      }
      
      metricAggregates[metric.metric_name] += weightedImpact;
    }
  }
  
  // Ensure aggregated values stay within bounds
  Object.keys(metricAggregates).forEach(key => {
    metricAggregates[key] = Math.max(-1, Math.min(1, metricAggregates[key]));
  });
  
  return metricAggregates;
}
```

### Aggregation Logic Example

When multiple statements affect the same SDG or metric:
* Calculate each statement's weighted impact: `statement_metric_value * calculated_weight`
* Sum all weighted impacts for that SDG/metric
* Example: Statement 1 (SDG 5 impact: +0.8, weight: 0.7) and Statement 2 (SDG 5 impact: -0.2, weight: 0.6) = (0.8 × 0.7) + (-0.2 × 0.6) = 0.56 - 0.12 = 0.44

## Real-time Updates Implementation

### Supabase Real-time Setup

#### Database Configuration
```sql
-- Enable realtime for votes table (already in database setup)
ALTER TABLE votes REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE votes;

-- Trigger function to update calculated impact scores (already in database setup)
CREATE OR REPLACE FUNCTION update_statement_impact_score()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE statements
  SET calculated_impact_score = (
    COALESCE((SELECT SUM(CASE WHEN vote_type = 1 THEN 1 ELSE 0 END) FROM votes WHERE statement_id = COALESCE(NEW.statement_id, OLD.statement_id)), 0) + 0.5
  ) / (
    COALESCE((SELECT COUNT(*) FROM votes WHERE statement_id = COALESCE(NEW.statement_id, OLD.statement_id)), 0) + 1
  ),
  updated_at = NOW()
  WHERE id = COALESCE(NEW.statement_id, OLD.statement_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
```

#### Client-side Real-time Integration

```typescript
// src/lib/stores/realtimeStore.ts
import { writable } from 'svelte/store';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '$lib/supabaseClient';

interface VoteUpdate {
  statementId: string;
  upvotes: number;
  downvotes: number;
  calculatedScore: number;
}

export const voteUpdates = writable<Record<string, VoteUpdate>>({});

let channel: RealtimeChannel | null = null;

export function subscribeToVoteUpdates(ideaId: string) {
  // Clean up existing subscription
  if (channel) {
    channel.unsubscribe();
  }
  
  // Create new subscription
  channel = supabase
    .channel(`votes-${ideaId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'votes',
      filter: `statement_id=in.(${getStatementIdsForIdea(ideaId)})`
    }, (payload) => {
      handleVoteChange(payload);
    })
    .subscribe();
}

export function unsubscribeFromVoteUpdates() {
  if (channel) {
    channel.unsubscribe();
    channel = null;
  }
}

async function handleVoteChange(payload: any) {
  const statementId = payload.new?.statement_id || payload.old?.statement_id;
  
  if (!statementId) return;
  
  // Fetch updated vote counts and calculated score
  const { data, error } = await supabase
    .from('statements')
    .select(`
      id,
      calculated_impact_score,
      votes!inner(vote_type)
    `)
    .eq('id', statementId)
    .single();
    
  if (error) {
    console.error('Failed to fetch updated vote data:', error);
    return;
  }
  
  const votes = data.votes || [];
  const upvotes = votes.filter(v => v.vote_type === 1).length;
  const downvotes = votes.filter(v => v.vote_type === -1).length;
  
  voteUpdates.update(current => ({
    ...current,
    [statementId]: {
      statementId,
      upvotes,
      downvotes,
      calculatedScore: data.calculated_impact_score
    }
  }));
}

// Helper function to get statement IDs for an idea (implement based on your data structure)
function getStatementIdsForIdea(ideaId: string): string {
  // This would need to be implemented based on how you track statements for an idea
  // For now, return a placeholder that can be replaced with actual logic
  return 'statement-ids-query';
}
```

#### Component Integration with Real-time Updates

```svelte
<!-- StatementCard.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { voteUpdates, subscribeToVoteUpdates, unsubscribeFromVoteUpdates } from '$lib/stores/realtimeStore';
  import { createVoteMutation } from '$lib/queries/voteQueries';
  
  export let statement: StatementWithMetrics;
  export let ideaId: string;
  export let currentUserVote: number | null = null;
  
  // Real-time vote data
  $: realtimeData = $voteUpdates[statement.id];
  $: displayUpvotes = realtimeData?.upvotes ?? statement.upvotes ?? 0;
  $: displayDownvotes = realtimeData?.downvotes ?? statement.downvotes ?? 0;
  $: displayScore = realtimeData?.calculatedScore ?? statement.calculated_impact_score ?? 0.5;
  
  const voteMutation = createVoteMutation();
  
  onMount(() => {
    subscribeToVoteUpdates(ideaId);
  });
  
  onDestroy(() => {
    unsubscribeFromVoteUpdates();
  });
  
  function handleVote(voteType: number) {
    $voteMutation.mutate({
      statementId: statement.id,
      voteType: currentUserVote === voteType ? 0 : voteType // Toggle vote
    });
  }
</script>

<div class="statement-card">
  <p>{statement.text}</p>
  
  <div class="metrics">
    {#each statement.metrics as metric}
      <span class="metric-badge">{metric.metric_name}: {metric.metric_value.toFixed(2)}</span>
    {/each}
  </div>
  
  <div class="voting-section">
    <button 
      class="vote-button upvote {currentUserVote === 1 ? 'active' : ''}"
      on:click={() => handleVote(1)}
      disabled={$voteMutation.isPending}
    >
      ▲ {displayUpvotes}
    </button>
    
    <span class="impact-score">
      Score: {displayScore.toFixed(3)}
    </span>
    
    <button 
      class="vote-button downvote {currentUserVote === -1 ? 'active' : ''}"
      on:click={() => handleVote(-1)}
      disabled={$voteMutation.isPending}
    >
      ▼ {displayDownvotes}
    </button>
  </div>
</div>
```

### Optimistic Updates with TanStack Query

```typescript
// src/lib/queries/voteQueries.ts
import { createMutation, useQueryClient } from '@tanstack/svelte-query';

export function createVoteMutation() {
  const queryClient = useQueryClient();
  
  return createMutation({
    mutationFn: async ({ statementId, voteType }: { statementId: string, voteType: number }) => {
      const response = await fetch(`/api/statements/${statementId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voteType })
      });
      
      if (!response.ok) {
        throw new Error('Vote failed');
      }
      
      return response.json();
    },
    
    // Optimistic update
    onMutate: async ({ statementId, voteType }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries(['statements']);
      
      // Snapshot previous value
      const previousData = queryClient.getQueryData(['statements']);
      
      // Optimistically update vote counts
      queryClient.setQueryData(['statements'], (old: any) => {
        if (!old) return old;
        
        return updateStatementsWithOptimisticVote(old, statementId, voteType);
      });
      
      return { previousData };
    },
    
    // Rollback on error
    onError: (error, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['statements'], context.previousData);
      }
      
      // Show error message
      console.error('Vote failed:', error);
    },
    
    // Always refetch after success or error
    onSettled: () => {
      queryClient.invalidateQueries(['statements']);
    }
  });
}

function updateStatementsWithOptimisticVote(
  statements: StatementWithMetrics[], 
  statementId: string, 
  voteType: number
): StatementWithMetrics[] {
  return statements.map(statement => {
    if (statement.id !== statementId) {
      return statement;
    }
    
    // Calculate optimistic vote counts
    let newUpvotes = statement.upvotes || 0;
    let newDownvotes = statement.downvotes || 0;
    
    // Handle vote toggle logic
    if (voteType === 1) {
      newUpvotes += 1;
      if (statement.currentUserVote === -1) {
        newDownvotes -= 1;
      }
    } else if (voteType === -1) {
      newDownvotes += 1;
      if (statement.currentUserVote === 1) {
        newUpvotes -= 1;
      }
    }
    
    // Calculate new impact score
    const newScore = calculateImpactWeight(newUpvotes, newDownvotes);
    
    return {
      ...statement,
      upvotes: newUpvotes,
      downvotes: newDownvotes,
      calculated_impact_score: newScore,
      currentUserVote: voteType
    };
  });
}
```

## Voting Form Actions

### Server-side Vote Handling

```typescript
// In relevant +page.server.ts file
export const actions = {
  vote: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { error: 'Authentication required' });
    }

    const formData = await request.formData();
    const statementId = formData.get('statementId') as string;
    const voteType = parseInt(formData.get('voteType') as string);

    // Validation
    if (!statementId || ![1, -1, 0].includes(voteType)) {
      return fail(400, { error: 'Invalid vote data' });
    }

    try {
      if (voteType === 0) {
        // Remove vote (toggle off)
        await repositories.votes.delete(locals.user.id, statementId);
      } else {
        // Upsert vote
        await repositories.votes.upsert({
          statementId,
          userId: locals.user.id,
          voteType
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Vote action failed:', error);
      return fail(500, { error: 'Vote failed' });
    }
  }
};
```

### Vote Repository Delete Method

```typescript
// Additional method for VoteRepository
export class VoteRepository {
  // ... existing methods ...
  
  async delete(userId: string, statementId: string): Promise<void> {
    const { error } = await this.supabase
      .from('votes')
      .delete()
      .eq('user_id', userId)
      .eq('statement_id', statementId);
      
    if (error) {
      throw new Error(`Failed to delete vote: ${error.message}`);
    }
  }
}
```

## Concurrent Voting Handling

### No Conflict Resolution Needed
* **Concurrent Voting:** No conflict resolution needed as users increment/decrement counters rather than modifying the same data
* Each user has their own vote record (enforced by unique constraint on `statement_id, user_id`)
* Vote counts are calculated dynamically, eliminating race conditions
* PostgreSQL's ACID properties handle concurrent vote updates automatically

### Database Trigger Performance

The PostgreSQL trigger that updates calculated impact scores is designed to be efficient:

```sql
-- Optimized trigger function (already included in database setup)
CREATE OR REPLACE FUNCTION update_statement_impact_score()
RETURNS TRIGGER AS $$
BEGIN
  -- Use COALESCE to handle null cases efficiently
  UPDATE statements
  SET calculated_impact_score = (
    COALESCE((
      SELECT SUM(CASE WHEN vote_type = 1 THEN 1 ELSE 0 END) 
      FROM votes 
      WHERE statement_id = COALESCE(NEW.statement_id, OLD.statement_id)
    ), 0) + 0.5
  ) / (
    COALESCE((
      SELECT COUNT(*) 
      FROM votes 
      WHERE statement_id = COALESCE(NEW.statement_id, OLD.statement_id)
    ), 0) + 1
  ),
  updated_at = NOW()
  WHERE id = COALESCE(NEW.statement_id, OLD.statement_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
```

## Performance Monitoring

### Key Metrics to Track

1. **Vote Response Time:** Time from vote submission to UI update
2. **Real-time Latency:** Delay between vote cast and real-time update received
3. **Database Performance:** Query execution time for vote operations
4. **Optimistic Update Success Rate:** Percentage of optimistic updates that don't need rollback

### Monitoring Implementation

```typescript
// src/lib/utils/performanceMonitor.ts
export class VotingPerformanceMonitor {
  private static instance: VotingPerformanceMonitor;
  
  static getInstance(): VotingPerformanceMonitor {
    if (!this.instance) {
      this.instance = new VotingPerformanceMonitor();
    }
    return this.instance;
  }
  
  trackVoteLatency(startTime: number): void {
    const latency = Date.now() - startTime;
    console.log(`Vote latency: ${latency}ms`);
    
    // TODO: Send to monitoring service
    // analytics.track('vote_latency', { latency });
  }
  
  trackRealtimeLatency(voteTimestamp: number, receiveTimestamp: number): void {
    const latency = receiveTimestamp - voteTimestamp;
    console.log(`Real-time latency: ${latency}ms`);
    
    // TODO: Send to monitoring service
    // analytics.track('realtime_latency', { latency });
  }
  
  trackOptimisticUpdateRollback(statementId: string, reason: string): void {
    console.warn(`Optimistic update rollback for statement ${statementId}: ${reason}`);
    
    // TODO: Send to monitoring service
    // analytics.track('optimistic_update_rollback', { statementId, reason });
  }
}
```

This comprehensive voting system provides real-time updates, optimistic UI feedback, and robust error handling while maintaining data consistency and performance.
