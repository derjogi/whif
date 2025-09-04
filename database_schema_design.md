# Database Schema Design for Categories and Downstream Impacts

## Current Schema Analysis

The current database has:
- `statements` table: stores extracted statements with impact scores
- `votes` table: references statements for voting
- `statement_metrics` table: stores metrics for statements

## Proposed New Schema

### 1. Categories Table
```sql
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    research_findings TEXT,
    evaluated_score NUMERIC(3,2) DEFAULT 0.50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. Downstream Impacts Table (Rename/Repurpose statements)
Option 1: Rename existing statements table to downstream_impacts
```sql
-- Rename statements to downstream_impacts
ALTER TABLE statements RENAME TO downstream_impacts;
ALTER TABLE downstream_impacts ADD COLUMN category_id UUID REFERENCES categories(id) ON DELETE CASCADE;
ALTER TABLE downstream_impacts RENAME COLUMN text TO impact_text;
```

Option 2: Create new downstream_impacts table and migrate data
```sql
CREATE TABLE downstream_impacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    impact_text TEXT NOT NULL,
    calculated_impact_score NUMERIC(3,2) DEFAULT 0.50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. Update Votes Table
```sql
-- Update votes table to reference downstream_impacts instead of statements
ALTER TABLE votes RENAME COLUMN statement_id TO downstream_impact_id;
-- Update foreign key constraint
ALTER TABLE votes DROP CONSTRAINT votes_statement_id_fkey;
ALTER TABLE votes ADD CONSTRAINT votes_downstream_impact_id_fkey
    FOREIGN KEY (downstream_impact_id) REFERENCES downstream_impacts(id) ON DELETE CASCADE;
```

### 4. Update Statement Metrics (Optional)
If keeping statement_metrics, update to reference downstream_impacts:
```sql
ALTER TABLE statement_metrics RENAME COLUMN statement_id TO downstream_impact_id;
ALTER TABLE statement_metrics DROP CONSTRAINT statement_metrics_statement_id_fkey;
ALTER TABLE statement_metrics ADD CONSTRAINT statement_metrics_downstream_impact_id_fkey
    FOREIGN KEY (downstream_impact_id) REFERENCES downstream_impacts(id) ON DELETE CASCADE;
```

## Data Flow

1. **Analysis Process:**
   - LLM workflow generates: extractedStatements, downstreamImpacts, groupedCategories, researchFindings, evaluatedScores
   - Save categories with research_findings and evaluated_score
   - Save downstream_impacts linked to categories
   - Calculate impact scores for downstream impacts (could be inherited from category or calculated separately)

2. **Display Process:**
   - Load categories for an idea
   - For each category, load associated downstream impacts
   - Display category with expandable research findings
   - Show downstream impacts within category for voting

3. **Voting Process:**
   - Votes are cast on individual downstream impacts
   - Category scores could be calculated as aggregate of downstream impact votes
   - Real-time updates propagate vote changes

## Migration Strategy

1. Create new tables (categories, downstream_impacts)
2. Migrate existing statement data to downstream_impacts (if needed)
3. Update foreign key references in votes and statement_metrics
4. Update application code to use new schema
5. Test thoroughly before deploying

## Benefits

- Clear separation between categories and individual impacts
- Research findings stored with categories for expandability
- Voting on specific downstream impacts rather than broad statements
- Maintains all existing functionality (realtime updates, etc.)
- Scalable for future enhancements