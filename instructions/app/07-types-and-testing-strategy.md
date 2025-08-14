# TypeScript Types & Testing Strategy

## Core TypeScript Interfaces

### Database Entity Types

```typescript
// src/lib/types/database.ts

export interface Idea {
  id: string;
  user_id: string;
  title: string;
  text: string;
  summary?: string;
  created_at: string;
  updated_at: string;
}

export interface IdeaInput {
  title: string;
  text: string;
  userId: string;
}

export interface IdeaDocument {
  id: string;
  idea_id: string;
  filename: string;
  file_path: string;
  file_type: string;
  file_size: number;
  processed: boolean;
  created_at: string;
}

export interface Statement {
  id: string;
  idea_id: string;
  text: string;
  calculated_impact_score: number;
  created_at: string;
  updated_at: string;
}

export interface StatementMetric {
  id: string;
  statement_id: string;
  metric_name: string;
  metric_value: number;
  created_at: string;
}

export interface Vote {
  id: string;
  statement_id: string;
  user_id: string;
  vote_type: number; // 1 for upvote, -1 for downvote
  created_at: string;
  updated_at: string;
}

export interface VoteUpsert {
  statementId: string;
  userId: string;
  voteType: number;
}

// Combined types for UI usage
export interface StatementWithMetrics extends Statement {
  metrics: StatementMetric[];
  upvotes?: number;
  downvotes?: number;
  currentUserVote?: number | null;
}

export interface IdeaWithDetails extends Idea {
  statements: StatementWithMetrics[];
  documents: IdeaDocument[];
  owner: {
    id: string;
    email?: string;
  };
}
```

### AI Analysis Types

```typescript
// src/lib/types/analysis.ts

export interface AnalysisResult {
  statements: StatementOutput[];
  summary: string;
}

export interface StatementOutput {
  id: string;
  text: string;
  metrics: MetricOutput[];
}

export interface MetricOutput {
  metric_name: string;
  metric_value: number; // -1 to 1
}

export interface ProcessedDocument {
  id: string;
  filename: string;
  fileType: string;
  fileSize: number;
  content: string;
  extractedText: string;
  processed: boolean;
  error?: string;
  processedAt: Date;
}

export interface UploadedDocument {
  id: string;
  ideaId: string;
  filename: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  processed: boolean;
  extractedText?: string;
  createdAt: Date;
}

export interface AnalysisConfig {
  maxStatements: number;
  sdgMappingThreshold: number;
  summaryLength: 'short' | 'medium' | 'long';
}

export interface AnalysisContext {
  ideaText: string;
  documents: ProcessedDocument[];
  knowledgeBase: KnowledgeEntry[];
  userPreferences?: AnalysisPreferences;
}

export interface AnalysisPreferences {
  focusAreas: string[];
  impactHorizon: 'short' | 'medium' | 'long';
  confidenceThreshold: number;
}

export interface KnowledgeEntry {
  id: string;
  content: string;
  source: string;
  relevanceScore: number;
  metadata: Record<string, any>;
}
```

### Repository Interfaces

```typescript
// src/lib/server/database/interfaces.ts

export interface IIdeaRepository {
  create(idea: IdeaInput): Promise<Idea>;
  getById(id: string): Promise<Idea | null>;
  getByUserId(userId: string): Promise<Idea[]>;
  update(id: string, updates: Partial<Idea>): Promise<Idea>;
  delete(id: string, userId: string): Promise<void>;
  search(query: string, userId?: string): Promise<Idea[]>;
}

export interface IStatementRepository {
  create(statement: Omit<Statement, 'id' | 'created_at' | 'updated_at'>): Promise<Statement>;
  getById(id: string): Promise<Statement | null>;
  getByIdeaId(ideaId: string): Promise<StatementWithMetrics[]>;
  update(id: string, updates: Partial<Statement>): Promise<Statement>;
  delete(id: string): Promise<void>;
  createMetric(metric: Omit<StatementMetric, 'id' | 'created_at'>): Promise<StatementMetric>;
  getMetricsByStatementId(statementId: string): Promise<StatementMetric[]>;
}

export interface IVoteRepository {
  upsert(vote: VoteUpsert): Promise<Vote>;
  delete(userId: string, statementId: string): Promise<void>;
  getVoteCountsForStatement(statementId: string): Promise<{ upvotes: number; downvotes: number }>;
  getUserVoteForStatement(userId: string, statementId: string): Promise<Vote | null>;
  getVotesForIdea(ideaId: string): Promise<Vote[]>;
}

export interface IDocumentRepository {
  create(document: Omit<IdeaDocument, 'id' | 'created_at'>): Promise<IdeaDocument>;
  getById(id: string): Promise<IdeaDocument | null>;
  getByIdeaId(ideaId: string): Promise<IdeaDocument[]>;
  update(id: string, updates: Partial<IdeaDocument>): Promise<IdeaDocument>;
  delete(id: string): Promise<void>;
  markAsProcessed(id: string): Promise<void>;
}

export interface IUnitOfWork {
  ideas: IIdeaRepository;
  statements: IStatementRepository;
  votes: IVoteRepository;
  documents: IDocumentRepository;
}
```

### UI Component Props Types

```typescript
// src/lib/types/components.ts

export interface StatementCardProps {
  statement: StatementWithMetrics;
  ideaId: string;
  currentUserVote?: number | null;
  isAuthenticated: boolean;
  onVote?: (statementId: string, voteType: number) => void;
}

export interface IdeaCardProps {
  idea: Idea;
  showEdit?: boolean;
  onDelete?: (ideaId: string) => void;
  onEdit?: (ideaId: string) => void;
}

export interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  acceptedTypes?: string[];
  maxFileSize?: number;
  maxFiles?: number;
  currentFiles?: File[];
}

export interface LoadingState {
  isLoading: boolean;
  message?: string;
  progress?: number;
}

export interface ErrorState {
  error: Error | null;
  message?: string;
  canRetry?: boolean;
  onRetry?: () => void;
}

export interface EmptyState {
  title: string;
  message: string;
  actionText?: string;
  onAction?: () => void;
  icon?: string;
}
```

### Form and Validation Types

```typescript
// src/lib/types/forms.ts

export interface IdeaCreationForm {
  title: string;
  text: string;
  documents: File[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings?: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}

export interface FormState<T> {
  data: T;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
}

export interface FileValidation {
  isValid: boolean;
  errors: string[];
  file: File;
}
```

### API Response Types

```typescript
// src/lib/types/api.ts

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export interface CreateIdeaResponse {
  ideaId: string;
  analysis: AnalysisResult;
}

export interface VoteResponse {
  success: boolean;
  newCounts: {
    upvotes: number;
    downvotes: number;
  };
  calculatedScore: number;
}
```

## Testing Strategy & Test Scenarios

### Testing Implementation Guidelines

While unit test implementations are not required initially, maintain a comprehensive record of test scenarios using **GIVEN-WHEN-THEN** format for future implementation.

### Authentication & User Management Tests

```typescript
// Future test structure example
describe('Authentication & User Management', () => {
  describe('Voting Authentication', () => {
    test('GIVEN an unauthenticated user, WHEN they attempt to vote on a statement, THEN they should be prompted to authenticate', async () => {
      // Test implementation placeholder
    });

    test('GIVEN an authenticated user, WHEN they vote on a statement they haven\'t voted on before, THEN their vote should be recorded and the UI should update optimistically', async () => {
      // Test implementation placeholder
    });

    test('GIVEN an authenticated user who has already voted on a statement, WHEN they click the opposite vote button, THEN their previous vote should be removed and the new vote applied', async () => {
      // Test implementation placeholder
    });
  });
});
```

#### Test Scenarios for Authentication

* **GIVEN** an unauthenticated user, **WHEN** they attempt to vote on a statement, **THEN** they should be prompted to authenticate
* **GIVEN** an authenticated user, **WHEN** they vote on a statement they haven't voted on before, **THEN** their vote should be recorded and the UI should update optimistically
* **GIVEN** an authenticated user who has already voted on a statement, **WHEN** they click the opposite vote button, **THEN** their previous vote should be removed and the new vote applied

### Idea Management Tests

#### Test Scenarios for Idea Management

* **GIVEN** a user on the dashboard, **WHEN** they have no ideas, **THEN** they should see an empty state with a CTA to create their first idea
* **GIVEN** a user creating an idea, **WHEN** they exceed 64,000 characters, **THEN** they should see a character limit warning and be prevented from submitting
* **GIVEN** a user uploading documents, **WHEN** they select supported file formats, **THEN** the files should upload with progress indication
* **GIVEN** an idea creator, **WHEN** they view their own idea, **THEN** they should see edit/delete options
* **GIVEN** an admin user, **WHEN** they view any idea, **THEN** they should see edit/delete options

### AI Analysis Tests

#### Test Scenarios for AI Analysis

* **GIVEN** a submitted idea, **WHEN** AI analysis begins, **THEN** the user should see a loading state
* **GIVEN** a completed AI analysis, **WHEN** statements are generated, **THEN** each statement should have associated SDGs, impact scores, and voting buttons
* **GIVEN** an AI analysis failure, **WHEN** the service is unavailable, **THEN** the user should see a friendly error message with retry option

### Voting & Real-time Updates Tests

#### Test Scenarios for Voting System

* **GIVEN** multiple users viewing the same idea, **WHEN** one user votes, **THEN** all users should see the updated vote counts in real-time
* **GIVEN** a user voting on a statement, **WHEN** the vote is cast, **THEN** the impact calculations should update and charts should reflect the new data
* **GIVEN** a statement with votes, **WHEN** vote counts change, **THEN** the calculated impact score should recalculate using the formula (U + 0.5) / (U + D + 1)

### Data Visualization Tests

#### Test Scenarios for Data Visualization

* **GIVEN** analyzed statements with impact scores, **WHEN** viewing the results, **THEN** placeholder areas for charts should display with appropriate data structure
* **GIVEN** aggregated statement impacts for the same SDG, **WHEN** calculating overall SDG impact, **THEN** weighted impacts should sum correctly

### Navigation & UI Tests

#### Test Scenarios for Navigation

* **GIVEN** a user on any screen, **WHEN** they click the Dashboard/Home button, **THEN** they should navigate to the dashboard
* **GIVEN** mobile users, **WHEN** accessing any screen, **THEN** the interface should be fully functional and responsive
* **GIVEN** any loading operation, **WHEN** in progress, **THEN** appropriate loading indicators should display
* **GIVEN** successful user actions, **WHEN** completed, **THEN** success feedback animations should provide confirmation

### Security Tests

#### Test Scenarios for Security

* **GIVEN** a regular user, **WHEN** they try to access another user's private idea, **THEN** they should be denied access by RLS policies
* **GIVEN** an admin user, **WHEN** they access any idea, **THEN** they should have full access regardless of ownership
* **GIVEN** a user voting, **WHEN** they try to see other users' individual votes, **THEN** they should only see aggregated counts, not individual vote records
* **GIVEN** system operations (AI analysis), **WHEN** using service role, **THEN** RLS should be bypassed for necessary database operations
* **GIVEN** a user uploading documents, **WHEN** they try to access documents from other users' ideas, **THEN** they should be blocked by RLS policies

### TanStack Query & Caching Tests

#### Test Scenarios for State Management

* **GIVEN** a user voting optimistically, **WHEN** the server request fails, **THEN** the UI should rollback to the previous state and show an error
* **GIVEN** cached data exists, **WHEN** the user goes offline, **THEN** cached data should still be displayed
* **GIVEN** real-time updates from Supabase, **WHEN** another user votes, **THEN** the TanStack Query cache should invalidate and update automatically
* **GIVEN** stale data in the cache, **WHEN** the user returns to a screen, **THEN** background refetching should occur while showing cached data

### SvelteKit Load Function Tests

#### Test Scenarios for Server-side Data Loading

* **GIVEN** a user accessing the dashboard, **WHEN** the page loads, **THEN** their ideas should be loaded server-side before rendering
* **GIVEN** an unauthenticated user, **WHEN** accessing protected load functions, **THEN** they should be redirected to authentication
* **GIVEN** server-side data loading, **WHEN** external APIs are down, **THEN** appropriate fallbacks should be provided

### Form Action Tests

#### Test Scenarios for Form Actions

* **GIVEN** a user submitting an idea creation form, **WHEN** validation fails, **THEN** the form should show validation errors without losing user input
* **GIVEN** a file upload in progress, **WHEN** the upload fails, **THEN** the user should see upload error feedback and retry options
* **GIVEN** a voting form submission, **WHEN** the user has already voted, **THEN** the previous vote should be updated, not duplicated

## Test Utilities and Helpers

### Mock Data Factory

```typescript
// src/lib/testing/factories.ts

export class TestDataFactory {
  static createIdea(overrides: Partial<Idea> = {}): Idea {
    return {
      id: crypto.randomUUID(),
      user_id: crypto.randomUUID(),
      title: 'Test Idea',
      text: 'This is a test idea for unit testing purposes.',
      summary: 'Test summary',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides
    };
  }

  static createStatement(overrides: Partial<Statement> = {}): Statement {
    return {
      id: crypto.randomUUID(),
      idea_id: crypto.randomUUID(),
      text: 'This is a test impact statement.',
      calculated_impact_score: 0.5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides
    };
  }

  static createStatementWithMetrics(overrides: Partial<StatementWithMetrics> = {}): StatementWithMetrics {
    const statement = this.createStatement();
    return {
      ...statement,
      metrics: [
        {
          id: crypto.randomUUID(),
          statement_id: statement.id,
          metric_name: 'SDG 8: Decent Work and Economic Growth',
          metric_value: 0.7,
          created_at: new Date().toISOString()
        }
      ],
      upvotes: 0,
      downvotes: 0,
      currentUserVote: null,
      ...overrides
    };
  }

  static createVote(overrides: Partial<Vote> = {}): Vote {
    return {
      id: crypto.randomUUID(),
      statement_id: crypto.randomUUID(),
      user_id: crypto.randomUUID(),
      vote_type: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides
    };
  }
}
```

### Test Assertions

```typescript
// src/lib/testing/assertions.ts

export class TestAssertions {
  static assertImpactScoreInRange(score: number): void {
    expect(score).toBeGreaterThanOrEqual(-1);
    expect(score).toBeLessThanOrEqual(1);
  }

  static assertValidUUID(uuid: string): void {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(uuid).toMatch(uuidRegex);
  }

  static assertValidTimestamp(timestamp: string): void {
    expect(new Date(timestamp)).toBeInstanceOf(Date);
    expect(new Date(timestamp).getTime()).not.toBeNaN();
  }

  static assertFormValidation(result: ValidationResult, expectedErrors: string[]): void {
    expect(result.isValid).toBe(expectedErrors.length === 0);
    expect(result.errors.map(e => e.field)).toEqual(expectedErrors);
  }
}
```

### Component Testing Utilities

```typescript
// src/lib/testing/componentUtils.ts

export class ComponentTestUtils {
  static async waitForAsyncOperations(): Promise<void> {
    // Wait for pending promises and timers
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  static mockVoteResponse(upvotes: number, downvotes: number): VoteResponse {
    return {
      success: true,
      newCounts: { upvotes, downvotes },
      calculatedScore: (upvotes + 0.5) / (upvotes + downvotes + 1)
    };
  }

  static mockAnalysisResponse(): AnalysisResult {
    return {
      statements: [
        TestDataFactory.createStatementWithMetrics()
      ],
      summary: 'Test analysis summary'
    };
  }
}
```

## Type Validation and Runtime Checks

### Schema Validation

```typescript
// src/lib/types/validation.ts

export function validateIdea(data: any): data is Idea {
  return (
    typeof data.id === 'string' &&
    typeof data.user_id === 'string' &&
    typeof data.title === 'string' &&
    typeof data.text === 'string' &&
    data.text.length <= 64000 &&
    typeof data.created_at === 'string' &&
    typeof data.updated_at === 'string'
  );
}

export function validateVoteUpsert(data: any): data is VoteUpsert {
  return (
    typeof data.statementId === 'string' &&
    typeof data.userId === 'string' &&
    typeof data.voteType === 'number' &&
    [1, -1].includes(data.voteType)
  );
}

export function validateAnalysisResult(data: any): data is AnalysisResult {
  return (
    Array.isArray(data.statements) &&
    data.statements.every(validateStatementOutput) &&
    typeof data.summary === 'string'
  );
}

export function validateStatementOutput(data: any): data is StatementOutput {
  return (
    typeof data.id === 'string' &&
    typeof data.text === 'string' &&
    Array.isArray(data.metrics) &&
    data.metrics.every(validateMetricOutput)
  );
}

export function validateMetricOutput(data: any): data is MetricOutput {
  return (
    typeof data.metric_name === 'string' &&
    typeof data.metric_value === 'number' &&
    data.metric_value >= -1 &&
    data.metric_value <= 1
  );
}
```

### Runtime Type Guards

```typescript
// src/lib/types/guards.ts

export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

export function isLoadingState(value: unknown): value is LoadingState {
  return (
    typeof value === 'object' &&
    value !== null &&
    'isLoading' in value &&
    typeof (value as any).isLoading === 'boolean'
  );
}

export function isValidFileType(file: File): boolean {
  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain',
    'text/markdown'
  ];
  return allowedTypes.includes(file.type);
}

export function hasRequiredProperties<T>(
  obj: any,
  properties: (keyof T)[]
): obj is T {
  return properties.every(prop => prop in obj);
}
```

This comprehensive type system and testing strategy provides a solid foundation for maintaining code quality and reliability throughout the development process.
