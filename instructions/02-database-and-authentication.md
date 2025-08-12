# Database Schema & Authentication Setup

## Supabase Configuration

### Initial Setup
1. Create Supabase project
2. Configure environment variables with Supabase URL and anon key
3. Set up Supabase client in SvelteKit
4. Enable Row Level Security (RLS) on all tables
5. Enable Supabase Realtime for the votes table

### Database Schema (public schema in PostgreSQL)

All database changes must be managed through **SQL migration files** for proper version control and deployment.

#### Table: ideas
```sql
CREATE TABLE ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  text TEXT NOT NULL CHECK (length(text) <= 64000),
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### Table: idea_documents
```sql
CREATE TABLE idea_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### Table: statements
```sql
CREATE TABLE statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  calculated_impact_score NUMERIC DEFAULT 0.5 NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### Table: statement_metrics
```sql
CREATE TABLE statement_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id UUID NOT NULL REFERENCES statements(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL CHECK (metric_value >= -1 AND metric_value <= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### Table: votes
```sql
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id UUID NOT NULL REFERENCES statements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_type INTEGER NOT NULL CHECK (vote_type IN (1, -1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(statement_id, user_id)
);
```

### Database Indexes

Create indexes where performance benefits are clear:

```sql
-- Vote aggregation
CREATE INDEX idx_votes_statement_id ON votes(statement_id);

-- Loading idea details
CREATE INDEX idx_statements_idea_id ON statements(idea_id);

-- User's ideas
CREATE INDEX idx_ideas_user_id ON ideas(user_id);

-- Loading idea documents
CREATE INDEX idx_idea_documents_idea_id ON idea_documents(idea_id);

-- Loading statement metrics
CREATE INDEX idx_statement_metrics_statement_id ON statement_metrics(statement_id);

-- Aggregating by specific metrics
CREATE INDEX idx_statement_metrics_metric_name ON statement_metrics(metric_name);
```

### Row Level Security (RLS) Policies

#### Ideas Table Policies
```sql
-- Users can view published ideas or their own ideas
CREATE POLICY "Users can view accessible ideas" ON ideas
  FOR SELECT USING (
    published = true OR user_id = auth.uid() OR 
    auth.jwt() ->> 'role' = 'admin'
  );

-- Users can insert their own ideas
CREATE POLICY "Users can create ideas" ON ideas
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own ideas, admins can update any
CREATE POLICY "Users can update own ideas, admins all" ON ideas
  FOR UPDATE USING (
    user_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin'
  );

-- Users can delete their own ideas, admins can delete any
CREATE POLICY "Users can delete own ideas, admins all" ON ideas
  FOR DELETE USING (
    user_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin'
  );
```

#### Statements Table Policies
```sql
-- Users can view statements for accessible ideas
CREATE POLICY "Users can view statements for accessible ideas" ON statements
  FOR SELECT USING (
    idea_id IN (
      SELECT id FROM ideas 
      WHERE published = true OR user_id = auth.uid() OR 
      auth.jwt() ->> 'role' = 'admin'
    )
  );

-- Only system can manage statements (via service role)
CREATE POLICY "Only system can manage statements" ON statements
  FOR ALL USING (false);
```

#### Statement Metrics Table Policies
```sql
-- Users can view metrics for statements they have access to
CREATE POLICY "Users can view metrics for accessible statements" ON statement_metrics
  FOR SELECT USING (
    statement_id IN (
      SELECT s.id FROM statements s
      JOIN ideas i ON s.idea_id = i.id
      WHERE i.published = true OR i.user_id = auth.uid()
    )
  );

-- Only system can manage metrics (via service role)
CREATE POLICY "Only system can manage metrics" ON statement_metrics
  FOR ALL USING (false);
```

#### Votes Table Policies
```sql
-- Users can view aggregated vote counts, not individual votes
CREATE POLICY "Users can view vote aggregations" ON votes
  FOR SELECT USING (false); -- Prevent direct access, use views/functions

-- Users can vote on statements for accessible ideas
CREATE POLICY "Users can vote on accessible statements" ON votes
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    statement_id IN (
      SELECT s.id FROM statements s
      JOIN ideas i ON s.idea_id = i.id
      WHERE i.published = true OR i.user_id = auth.uid()
    )
  );

-- Users can update their own votes
CREATE POLICY "Users can update own votes" ON votes
  FOR UPDATE USING (user_id = auth.uid());

-- Users can delete their own votes
CREATE POLICY "Users can delete own votes" ON votes
  FOR DELETE USING (user_id = auth.uid());
```

#### Idea Documents Table Policies
```sql
-- Users can view documents for ideas they can access
CREATE POLICY "Users can view documents for accessible ideas" ON idea_documents
  FOR SELECT USING (
    idea_id IN (
      SELECT id FROM ideas 
      WHERE published = true OR user_id = auth.uid() OR 
      auth.jwt() ->> 'role' = 'admin'
    )
  );

-- Users can upload documents to their own ideas
CREATE POLICY "Users can upload to own ideas" ON idea_documents
  FOR INSERT WITH CHECK (
    idea_id IN (
      SELECT id FROM ideas WHERE user_id = auth.uid()
    )
  );
```

## Authentication Implementation

### User Roles
* **Regular Users:** Can create, edit, and delete their own ideas and vote on all statements
* **Admin Users:** Can edit and delete any idea (role managed manually in Supabase for MVP)
* **Role Assignment:** Managed through Supabase Auth user metadata for MVP

### Authentication Requirements
* **Authentication Provider:** Use **Supabase Auth** exclusively for all user authentication.
* **Authentication Requirement:** Users **MUST** authenticate before they can vote on statements. Anonymous users should not be able to vote.
* **Authentication Flow:**
  * Users can view analyses without authentication
  * Authentication is required before any voting action
  * Use Supabase's built-in authentication flows and admin interface for management
  * Toggle between anonymous viewing and registered functionality through Supabase admin
* **User Session Management:** Leverage Supabase's built-in session management
* **Rate Limiting:** Each authenticated user can only vote once per statement (upvote OR downvote), which naturally prevents vote spam

### Real-time Setup

```sql
-- Enable realtime for votes table
ALTER TABLE votes REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE votes;

-- Create function to update calculated impact score
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

-- Create trigger to update impact scores when votes change
CREATE TRIGGER update_statement_score_trigger
  AFTER INSERT OR UPDATE OR DELETE ON votes
  FOR EACH ROW
  EXECUTE FUNCTION update_statement_impact_score();
```

## Repository Pattern Implementation

### Purpose
Decouple business logic from database specifics, enhance testability, improve maintainability, and facilitate future database migrations.

### Repository Interfaces (src/lib/server/database/interfaces.ts)
Define TypeScript interfaces for:
- IIdeaRepository
- IStatementRepository  
- IVoteRepository
- IDocumentRepository
- IUnitOfWork (combining all repositories)

### Supabase Implementations
Create concrete classes implementing the defined interfaces using the Supabase client in:
- `src/lib/server/database/supabase/ideaRepository.ts`
- `src/lib/server/database/supabase/statementRepository.ts`
- `src/lib/server/database/supabase/voteRepository.ts`
- `src/lib/server/database/supabase/documentRepository.ts`

### Usage Pattern
All server-side data interactions go through the repository layer:

```typescript
// In SvelteKit load functions or form actions
import { repositories } from '$lib/server/database';

export const load = async ({ locals }) => {
  const ideas = await repositories.ideas.getByUserId(locals.user.id);
  return { ideas };
};
```

## Performance Considerations

* Ensure RLS policies use indexed columns (user_id, idea_id) for optimal performance
* Consider creating partial indexes for commonly filtered data (e.g., published ideas)
* Monitor query performance with RLS enabled and adjust policies if needed
* Client-side subscriptions to vote updates via Supabase real-time channels
