# Backend API Architecture & Server Implementation

## SvelteKit Backend Architecture

### Backend / API Architecture Structure

* **SvelteKit API Routes** (+server.ts files) for public endpoints accessible by clients
* **Server-Only Modules** (src/lib/server/) for private API calls and business logic that must never be exposed to clients
* **Form Actions** for server-side mutations, file uploads, and AI processing
* **Load Functions** for server-side data loading with private API access
* Store API keys securely in **.env files** and access only from server-side code

### Directory Structure Implementation

```
src/lib/
├── server/           # Server-only code (never bundled for client)
│   ├── ai/          # AI API calls and processing
│   │   ├── aiService.ts
│   │   ├── analysisEngine.ts
│   │   └── index.ts
│   ├── database/    # Repository pattern implementation  
│   │   ├── interfaces.ts
│   │   ├── index.ts
│   │   └── supabase/
│   │       ├── index.ts
│   │       ├── ideaRepository.ts
│   │       ├── statementRepository.ts
│   │       ├── voteRepository.ts
│   │       └── documentRepository.ts
│   └── services/    # Business logic and external API integration
│       ├── documentProcessor.ts
│       ├── ragService.ts
│       ├── fileHandler.ts
│       └── validationService.ts
├── queries/         # TanStack Query definitions for client-side data fetching
├── types/           # Shared TypeScript interfaces and types
└── components/      # Reusable Svelte components
```

## Data Loading Patterns

### 1. Server-Side Initial Load (+page.server.ts)

```typescript
// Example: Dashboard page load
export const load = async ({ locals, params, fetch }) => {
  // Server-only - can access private APIs, database, environment variables
  const userIdeas = await repositories.ideas.getByUserId(locals.user.id);
  return { ideas: userIdeas };
};

// Example: Idea details page load
export const load = async ({ locals, params }) => {
  const ideaId = params.ideaId;
  
  try {
    const idea = await repositories.ideas.getById(ideaId);
    const statements = await repositories.statements.getByIdeaId(ideaId);
    const documents = await repositories.documents.getByIdeaId(ideaId);
    
    return { 
      idea, 
      statements,
      documents
    };
  } catch (error) {
    throw error(404, 'Idea not found');
  }
};
```

### 2. Client-Side Data Fetching (TanStack Query)

```typescript
// lib/queries/ideaQueries.ts
export const createIdeaQuery = (ideaId: string) =>
  createQuery({
    queryKey: ['idea', ideaId],
    queryFn: () => fetch(`/api/ideas/${ideaId}`).then(r => r.json()),
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    cacheTime: 10 * 60 * 1000, // 10 minutes retention
  });

export const createStatementsQuery = (ideaId: string) =>
  createQuery({
    queryKey: ['statements', ideaId],
    queryFn: () => fetch(`/api/ideas/${ideaId}/statements`).then(r => r.json()),
    staleTime: 1 * 60 * 1000, // 1 minute cache for real-time data
  });

export const createVoteMutation = () =>
  createMutation({
    mutationFn: async ({ statementId, voteType }: { statementId: string, voteType: number }) => {
      const response = await fetch(`/api/statements/${statementId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voteType })
      });
      return response.json();
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries(['statements']);
    }
  });
```

### 3. Server-Side Mutations (Form Actions)

```typescript
// +page.server.ts - Idea Creation Form Actions
export const actions = {
  createIdea: async ({ request, locals }) => {
    const formData = await request.formData();
    const ideaText = formData.get('idea') as string;
    const title = formData.get('title') as string;
    const files = formData.getAll('documents') as File[];

    // Validation
    if (!ideaText || ideaText.length > 64000) {
      return fail(400, { error: 'Invalid idea text' });
    }

    try {
      // Process uploaded documents
      const processedDocs = await documentProcessor.processFiles(files);
      
      // Server-only AI processing
      const analysis = await aiService.analyzeIdea(ideaText, processedDocs);
      
      // Create idea with analysis results
      const idea = await repositories.ideas.create({
        userId: locals.user.id,
        title,
        text: ideaText,
        summary: analysis.summary
      });

      // Store statements and metrics
      for (const statement of analysis.statements) {
        const createdStatement = await repositories.statements.create({
          ideaId: idea.id,
          text: statement.text
        });

        // Store metrics for each statement
        for (const metric of statement.metrics) {
          await repositories.statements.createMetric({
            statementId: createdStatement.id,
            metricName: metric.metric_name,
            metricValue: metric.metric_value
          });
        }
      }

      return { success: true, ideaId: idea.id };
    } catch (error) {
      return fail(500, { error: 'Analysis failed' });
    }
  },

  vote: async ({ request, locals }) => {
    const formData = await request.formData();
    const statementId = formData.get('statementId') as string;
    const voteType = parseInt(formData.get('voteType') as string);

    if (!locals.user) {
      return fail(401, { error: 'Authentication required' });
    }

    try {
      await repositories.votes.upsert({
        statementId,
        userId: locals.user.id,
        voteType
      });

      return { success: true };
    } catch (error) {
      return fail(500, { error: 'Vote failed' });
    }
  }
};
```

## API Endpoint Design

### Public API Routes (client-accessible)

#### `/api/ideas/[id]/+server.ts`
```typescript
import { json } from '@sveltejs/kit';
import { repositories } from '$lib/server/database';

export async function GET({ params, locals }) {
  try {
    const idea = await repositories.ideas.getById(params.id);
    return json(idea);
  } catch (error) {
    return json({ error: 'Idea not found' }, { status: 404 });
  }
}

export async function PUT({ params, request, locals }) {
  if (!locals.user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const updates = await request.json();
  
  try {
    const updatedIdea = await repositories.ideas.update(params.id, {
      ...updates,
      userId: locals.user.id
    });
    return json(updatedIdea);
  } catch (error) {
    return json({ error: 'Update failed' }, { status: 500 });
  }
}

export async function DELETE({ params, locals }) {
  if (!locals.user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await repositories.ideas.delete(params.id, locals.user.id);
    return json({ success: true });
  } catch (error) {
    return json({ error: 'Delete failed' }, { status: 500 });
  }
}
```

#### `/api/ideas/[id]/statements/+server.ts`
```typescript
import { json } from '@sveltejs/kit';
import { repositories } from '$lib/server/database';

export async function GET({ params }) {
  try {
    const statements = await repositories.statements.getByIdeaId(params.id);
    return json(statements);
  } catch (error) {
    return json({ error: 'Statements not found' }, { status: 404 });
  }
}
```

#### `/api/statements/[id]/vote/+server.ts`
```typescript
import { json } from '@sveltejs/kit';
import { repositories } from '$lib/server/database';

export async function POST({ params, request, locals }) {
  if (!locals.user) {
    return json({ error: 'Authentication required' }, { status: 401 });
  }

  const { voteType } = await request.json();
  
  try {
    await repositories.votes.upsert({
      statementId: params.id,
      userId: locals.user.id,
      voteType
    });

    return json({ success: true });
  } catch (error) {
    return json({ error: 'Vote failed' }, { status: 500 });
  }
}
```

#### `/api/auth/session/+server.ts`
```typescript
import { json } from '@sveltejs/kit';

export async function GET({ locals }) {
  return json({
    user: locals.user || null,
    session: locals.session || null
  });
}
```

### Private Server Functions (server-only modules)

#### `src/lib/server/ai/aiService.ts`
```typescript
export async function analyzeIdea(ideaText: string, documents?: ProcessedDocument[]): Promise<AnalysisResult> {
  // TODO: Implement actual AI analysis with LangChain orchestration
  // For now, return mock data to keep the application functional
  return {
    statements: [
      {
        id: crypto.randomUUID(),
        text: "This is a placeholder AI-generated statement about the idea's impact.",
        metrics: [
          {
            metric_name: "SDG 8: Decent Work and Economic Growth",
            metric_value: 0.5
          },
          {
            metric_name: "SDG 7: Affordable and Clean Energy", 
            metric_value: 0.3
          }
        ]
      }
    ],
    summary: "TODO: Replace with actual AI-generated summary. This is a placeholder summary."
  };
}
```

#### `src/lib/server/services/documentProcessor.ts`
```typescript
export async function processFiles(files: File[]): Promise<ProcessedDocument[]> {
  // TODO: Implement actual document processing and RAG integration
  // For now, return basic file metadata
  return files.map(file => ({
    id: crypto.randomUUID(),
    filename: file.name,
    content: "TODO: Extract actual text content from uploaded document",
    processed: false
  }));
}
```

#### `src/lib/server/services/ragService.ts`
```typescript
export async function addDocumentToKnowledge(document: ProcessedDocument): Promise<void> {
  // TODO: Implement RAG system integration
  // Placeholder: Just log the document for now
  console.log(`TODO: Add document ${document.filename} to knowledge base`);
}
```

## Caching Strategy

### TanStack Query Client Setup
```typescript
// lib/queryClient.ts
import { QueryClient } from '@tanstack/svelte-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes fresh
      cacheTime: 1000 * 60 * 10, // 10 minutes retention
      refetchOnWindowFocus: false,
      retry: 3,
    },
  },
});
```

### Server-Side Caching
* Use SvelteKit's built-in cache headers in load functions where appropriate
* Implement ETags for API responses where beneficial
* Consider Redis for future server-side caching needs

### Real-time Updates
* Combine TanStack Query with Supabase real-time subscriptions for live vote updates
* Implement optimistic updates for immediate UI feedback
* Use query invalidation to sync real-time changes

## Error Handling Patterns

### Server-Side Error Handling
```typescript
// Centralized error handling utility
export function handleServerError(error: unknown) {
  console.error('Server error:', error);
  
  if (error instanceof ValidationError) {
    return { status: 400, body: { error: error.message } };
  }
  
  if (error instanceof AuthenticationError) {
    return { status: 401, body: { error: 'Authentication required' } };
  }
  
  if (error instanceof NotFoundError) {
    return { status: 404, body: { error: 'Resource not found' } };
  }
  
  return { status: 500, body: { error: 'Internal server error' } };
}
```

### Client-Side Error Handling
```typescript
// Error boundary component usage
export const createIdeaMutation = () =>
  createMutation({
    mutationFn: createIdea,
    onError: (error) => {
      toast.error('Failed to create idea. Please try again.');
    },
    onSuccess: (data) => {
      toast.success('Idea created successfully!');
      goto(`/ideas/${data.ideaId}`);
    }
  });
```

## File Upload Implementation

### Server-Side File Handling
```typescript
// lib/server/services/fileHandler.ts
export async function handleFileUpload(file: File, ideaId: string): Promise<UploadedDocument> {
  // Validate file type and size
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new ValidationError('File type not allowed');
  }
  
  if (file.size > MAX_FILE_SIZE) {
    throw new ValidationError('File too large');
  }
  
  // Store file (placeholder implementation)
  const filePath = await storeFile(file, ideaId);
  
  // Process file for RAG integration
  const processedContent = await extractTextContent(file);
  
  return {
    id: crypto.randomUUID(),
    ideaId,
    filename: file.name,
    filePath,
    fileType: file.type,
    fileSize: file.size,
    processed: true,
    content: processedContent
  };
}
```

### Form Action for File Upload
```typescript
export const actions = {
  uploadDocument: async ({ request, params }) => {
    const formData = await request.formData();
    const file = formData.get('document') as File;
    const ideaId = params.ideaId;
    
    try {
      const uploadedDoc = await fileHandler.handleFileUpload(file, ideaId);
      await repositories.documents.create(uploadedDoc);
      
      return { success: true, document: uploadedDoc };
    } catch (error) {
      return fail(400, { error: error.message });
    }
  }
};
```

## Validation Service

### Input Validation
```typescript
// lib/server/services/validationService.ts
export function validateIdeaInput(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data.text || typeof data.text !== 'string') {
    errors.push('Idea text is required');
  }
  
  if (data.text && data.text.length > 64000) {
    errors.push('Idea text must be 64,000 characters or less');
  }
  
  if (!data.title || typeof data.title !== 'string') {
    errors.push('Title is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
```

## Authentication Middleware

### Session Handling
```typescript
// hooks.server.ts
import { createSupabaseServerClient } from '@supabase/auth-helpers-sveltekit';

export const handle = async ({ event, resolve }) => {
  const supabase = createSupabaseServerClient({
    supabaseUrl: SUPABASE_URL,
    supabaseKey: SUPABASE_ANON_KEY,
    event
  });
  
  const {
    data: { session }
  } = await supabase.auth.getSession();
  
  event.locals.supabase = supabase;
  event.locals.session = session;
  event.locals.user = session?.user || null;
  
  return resolve(event);
};
```

## Performance Considerations

### Database Query Optimization
* Use repository pattern to encapsulate complex queries
* Implement proper indexing strategy
* Use prepared statements where applicable
* Monitor query performance with RLS enabled

### Caching Strategy
* Implement appropriate cache headers
* Use TanStack Query for efficient client-side caching
* Consider implementing server-side caching for expensive operations

### Real-time Performance
* Limit real-time subscriptions to necessary data
* Implement proper connection management
* Handle offline/online states gracefully

## Security Considerations

### API Security
* Validate all inputs server-side
* Use Supabase RLS for data access control
* Implement rate limiting for API endpoints
* Sanitize user inputs to prevent XSS

### File Upload Security
* Validate file types and sizes
* Scan uploaded files for malware (future enhancement)
* Store files securely with proper access controls
* Implement virus scanning for uploaded documents
