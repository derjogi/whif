-- Create categories table
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    research_findings TEXT,
    evaluated_score NUMERIC(3,2) DEFAULT 0.50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create downstream_impacts table
CREATE TABLE downstream_impacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    impact_text TEXT NOT NULL,
    calculated_impact_score NUMERIC(3,2) DEFAULT 0.50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update votes table to reference downstream_impacts
ALTER TABLE votes RENAME COLUMN statement_id TO downstream_impact_id;
ALTER TABLE votes DROP CONSTRAINT votes_statement_id_fkey;
ALTER TABLE votes ADD CONSTRAINT votes_downstream_impact_id_fkey
    FOREIGN KEY (downstream_impact_id) REFERENCES downstream_impacts(id) ON DELETE CASCADE;

-- Update statement_metrics table to reference downstream_impacts
ALTER TABLE statement_metrics RENAME COLUMN statement_id TO downstream_impact_id;
ALTER TABLE statement_metrics DROP CONSTRAINT statement_metrics_statement_id_fkey;
ALTER TABLE statement_metrics ADD CONSTRAINT statement_metrics_downstream_impact_id_fkey
    FOREIGN KEY (downstream_impact_id) REFERENCES downstream_impacts(id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX idx_categories_idea_id ON categories(idea_id);
CREATE INDEX idx_downstream_impacts_category_id ON downstream_impacts(category_id);
CREATE INDEX idx_votes_downstream_impact_id ON votes(downstream_impact_id);
CREATE INDEX idx_statement_metrics_downstream_impact_id ON statement_metrics(downstream_impact_id);

-- Enable RLS (Row Level Security) for new tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE downstream_impacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for categories
CREATE POLICY "Users can view categories for their ideas" ON categories
    FOR SELECT USING (
        idea_id IN (
            SELECT id FROM ideas WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert categories for their ideas" ON categories
    FOR INSERT WITH CHECK (
        idea_id IN (
            SELECT id FROM ideas WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update categories for their ideas" ON categories
    FOR UPDATE USING (
        idea_id IN (
            SELECT id FROM ideas WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for downstream_impacts
CREATE POLICY "Users can view downstream impacts for their ideas" ON downstream_impacts
    FOR SELECT USING (
        category_id IN (
            SELECT id FROM categories WHERE idea_id IN (
                SELECT id FROM ideas WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert downstream impacts for their ideas" ON downstream_impacts
    FOR INSERT WITH CHECK (
        category_id IN (
            SELECT id FROM categories WHERE idea_id IN (
                SELECT id FROM ideas WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update downstream impacts for their ideas" ON downstream_impacts
    FOR UPDATE USING (
        category_id IN (
            SELECT id FROM categories WHERE idea_id IN (
                SELECT id FROM ideas WHERE user_id = auth.uid()
            )
        )
    );