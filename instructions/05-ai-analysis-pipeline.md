# AI Analysis Pipeline & Document Processing

## AI Agent Pipeline Design (MVP Implementation)

The analysis will be performed by a **simple, single-agent approach for MVP**, implemented within a **SvelteKit server-side API route (+server.ts)**.

### MVP Agent Architecture

* **MVP Agent:** A single general-purpose AI agent that:
  * Takes the user's idea/solution as input (max 64,000 characters)
  * Processes any uploaded supporting documents through RAG/knowledge database integration
  * Generates multiple impact statements with associated SDG linkages and impact scores
  * Produces a summary of the overall analysis
  * Returns structured JSON output for the frontend

* **Document Processing:** Backend handling of uploaded files:
  * Extract text content from various document formats
  * Integrate extracted content into knowledge database/RAG system
  * Use document content to enhance AI analysis quality

* **Input Validation:** Enforce 64,000 character limit and validate file uploads

* **Error Handling:** Implement robust error handling for AI operations:
  * Use try/catch blocks around all AI API calls
  * Display user-friendly error messages when AI services are unavailable
  * Provide fallback behavior when AI analysis fails

* **Future Extensibility:** Design the system architecture to easily accommodate the planned multi-agent orchestration system in later iterations, but implement a simple single-agent solution for MVP

* **Cost Management:** Cost monitoring will be handled externally through AI API dashboards; the application should focus on proper error handling and user feedback

## AI Agent Output Format

The AI agent must return data in the following JSON structure:

```json
{
  "statements": [
    {
      "id": "unique-uuid-1",
      "text": "The solution is likely to create new green jobs in the renewable energy sector.",
      "metrics": [
        {
          "metric_name": "SDG 8: Decent Work and Economic Growth",
          "metric_value": 0.7
        },
        {
          "metric_name": "SDG 7: Affordable and Clean Energy", 
          "metric_value": 0.4
        },
        {
          "metric_name": "Employment Rate",
          "metric_value": 0.3
        }
      ]
    },
    {
      "id": "unique-uuid-2", 
      "text": "There is a potential risk of increased demand on local water resources, impacting agriculture.",
      "metrics": [
        {
          "metric_name": "SDG 6: Clean Water and Sanitation",
          "metric_value": -0.2
        },
        {
          "metric_name": "SDG 2: Zero Hunger",
          "metric_value": -0.5
        },
        {
          "metric_name": "Environmental Health",
          "metric_value": -0.3
        }
      ]
    }
  ],
  "summary": "Overall, this solution shows strong positive impacts on economic growth and clean energy adoption, but poses risks to water resources and food security that should be carefully monitored."
}
```

## Core AI Service Implementation

### Primary AI Service Module

```typescript
// src/lib/server/ai/aiService.ts
import type { AnalysisResult, ProcessedDocument } from '$lib/types';

export async function analyzeIdea(
  ideaText: string, 
  documents?: ProcessedDocument[]
): Promise<AnalysisResult> {
  // TODO: Implement actual AI analysis with LangChain orchestration
  // For now, return mock data to keep the application functional
  
  // Validate input
  if (!ideaText || ideaText.length === 0) {
    throw new Error('Idea text is required for analysis');
  }
  
  if (ideaText.length > 64000) {
    throw new Error('Idea text exceeds maximum length of 64,000 characters');
  }
  
  try {
    // TODO: Replace with actual AI service calls
    // Example structure for future implementation:
    // const context = await buildAnalysisContext(ideaText, documents);
    // const statements = await generateImpactStatements(context);
    // const metrics = await linkStatementsToSDGs(statements);
    // const summary = await generateSummary(statements, metrics);
    
    return {
      statements: [
        {
          id: crypto.randomUUID(),
          text: "This is a placeholder AI-generated statement about the idea's positive impact on economic growth.",
          metrics: [
            {
              metric_name: "SDG 8: Decent Work and Economic Growth",
              metric_value: 0.7
            },
            {
              metric_name: "SDG 1: No Poverty",
              metric_value: 0.4
            },
            {
              metric_name: "Employment Rate",
              metric_value: 0.5
            }
          ]
        },
        {
          id: crypto.randomUUID(),
          text: "This is a placeholder statement about potential environmental concerns that may arise.",
          metrics: [
            {
              metric_name: "SDG 13: Climate Action",
              metric_value: -0.3
            },
            {
              metric_name: "SDG 15: Life on Land",
              metric_value: -0.2
            },
            {
              metric_name: "Environmental Health",
              metric_value: -0.4
            }
          ]
        }
      ],
      summary: "TODO: Replace with actual AI-generated summary. This placeholder analysis shows mixed impacts with strong economic benefits but environmental risks that need consideration."
    };
  } catch (error) {
    console.error('AI analysis failed:', error);
    throw new Error('Failed to analyze idea. Please try again later.');
  }
}

// TODO: Future implementation structure
export async function buildAnalysisContext(
  ideaText: string, 
  documents?: ProcessedDocument[]
): Promise<AnalysisContext> {
  // TODO: Combine idea text with document content
  // TODO: Retrieve relevant knowledge from RAG system
  // TODO: Structure context for AI analysis
  throw new Error('Not yet implemented');
}

export async function generateImpactStatements(context: AnalysisContext): Promise<ImpactStatement[]> {
  // TODO: Use AI to generate impact statements
  // TODO: Ensure statements cover positive and negative impacts
  // TODO: Generate diverse statement types (economic, social, environmental)
  throw new Error('Not yet implemented');
}

export async function linkStatementsToSDGs(statements: ImpactStatement[]): Promise<EnrichedStatement[]> {
  // TODO: Link each statement to relevant SDGs
  // TODO: Calculate impact scores for each metric
  // TODO: Normalize scores to -1 to +1 range
  throw new Error('Not yet implemented');
}

export async function generateSummary(
  statements: EnrichedStatement[], 
  metrics: any[]
): Promise<string> {
  // TODO: Generate comprehensive summary
  // TODO: Highlight most significant positive and negative impacts
  // TODO: Provide balanced perspective
  throw new Error('Not yet implemented');
}
```

### Analysis Engine Module

```typescript
// src/lib/server/ai/analysisEngine.ts
import type { IdeaInput, AnalysisConfig } from '$lib/types';

export class AnalysisEngine {
  private config: AnalysisConfig;
  
  constructor(config: AnalysisConfig) {
    this.config = config;
  }
  
  async analyzeImpacts(input: IdeaInput): Promise<AnalysisResult> {
    // TODO: Implement main analysis workflow
    // 1. Preprocess input text
    // 2. Extract key concepts and themes
    // 3. Generate impact scenarios
    // 4. Map to SDGs and metrics
    // 5. Score and rank impacts
    // 6. Generate summary
    
    console.log(`TODO: Analyze impacts for idea: ${input.text.substring(0, 100)}...`);
    
    // Placeholder implementation
    return await this.mockAnalysis(input);
  }
  
  private async mockAnalysis(input: IdeaInput): Promise<AnalysisResult> {
    // TODO: Replace with actual analysis
    const statements = await this.generateMockStatements(input);
    const summary = await this.generateMockSummary(input, statements);
    
    return {
      statements,
      summary
    };
  }
  
  private async generateMockStatements(input: IdeaInput): Promise<StatementWithMetrics[]> {
    // TODO: Replace with AI-generated statements
    return [
      {
        id: crypto.randomUUID(),
        text: `Placeholder: This idea about "${input.text.substring(0, 50)}..." could create positive economic impacts.`,
        metrics: [
          { metric_name: "SDG 8: Decent Work and Economic Growth", metric_value: 0.6 },
          { metric_name: "GDP Growth", metric_value: 0.4 }
        ]
      }
    ];
  }
  
  private async generateMockSummary(
    input: IdeaInput, 
    statements: StatementWithMetrics[]
  ): Promise<string> {
    // TODO: Replace with AI-generated summary
    return "TODO: This is a placeholder summary that will be replaced with AI-generated analysis.";
  }
}

// Factory function for creating analysis engine
export function createAnalysisEngine(): AnalysisEngine {
  const config: AnalysisConfig = {
    maxStatements: 10,
    sdgMappingThreshold: 0.1,
    summaryLength: 'medium'
  };
  
  return new AnalysisEngine(config);
}
```

## Document Processing Implementation

### Document Processor Service

```typescript
// src/lib/server/services/documentProcessor.ts
import type { ProcessedDocument } from '$lib/types';

export async function processFiles(files: File[]): Promise<ProcessedDocument[]> {
  // TODO: Implement actual document processing and RAG integration
  // For now, return basic file metadata
  
  const processedDocs: ProcessedDocument[] = [];
  
  for (const file of files) {
    try {
      // TODO: Validate file type and size
      if (!isValidFileType(file)) {
        console.warn(`Skipping unsupported file type: ${file.type}`);
        continue;
      }
      
      // TODO: Extract text content based on file type
      const textContent = await extractTextContent(file);
      
      // TODO: Process content for RAG integration
      const processedContent = await preprocessTextForRAG(textContent);
      
      processedDocs.push({
        id: crypto.randomUUID(),
        filename: file.name,
        fileType: file.type,
        fileSize: file.size,
        content: processedContent,
        extractedText: textContent,
        processed: true,
        processedAt: new Date()
      });
      
    } catch (error) {
      console.error(`Failed to process file ${file.name}:`, error);
      
      // Add failed document with error info
      processedDocs.push({
        id: crypto.randomUUID(),
        filename: file.name,
        fileType: file.type,
        fileSize: file.size,
        content: "",
        extractedText: "",
        processed: false,
        error: `Processing failed: ${error.message}`,
        processedAt: new Date()
      });
    }
  }
  
  return processedDocs;
}

function isValidFileType(file: File): boolean {
  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain',
    'text/markdown',
    'application/rtf'
  ];
  
  return allowedTypes.includes(file.type);
}

async function extractTextContent(file: File): Promise<string> {
  // TODO: Implement actual text extraction based on file type
  switch (file.type) {
    case 'application/pdf':
      return await extractFromPDF(file);
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return await extractFromDOCX(file);
    case 'application/msword':
      return await extractFromDOC(file);
    case 'text/plain':
    case 'text/markdown':
      return await extractFromText(file);
    default:
      throw new Error(`Unsupported file type: ${file.type}`);
  }
}

async function extractFromPDF(file: File): Promise<string> {
  // TODO: Implement PDF text extraction
  // Consider using libraries like pdf-parse or pdf2pic
  console.log(`TODO: Extract text from PDF: ${file.name}`);
  return `TODO: Extracted text content from ${file.name}`;
}

async function extractFromDOCX(file: File): Promise<string> {
  // TODO: Implement DOCX text extraction
  // Consider using libraries like mammoth.js
  console.log(`TODO: Extract text from DOCX: ${file.name}`);
  return `TODO: Extracted text content from ${file.name}`;
}

async function extractFromDOC(file: File): Promise<string> {
  // TODO: Implement DOC text extraction
  console.log(`TODO: Extract text from DOC: ${file.name}`);
  return `TODO: Extracted text content from ${file.name}`;
}

async function extractFromText(file: File): Promise<string> {
  // Simple text file extraction
  const arrayBuffer = await file.arrayBuffer();
  const text = new TextDecoder('utf-8').decode(arrayBuffer);
  return text;
}

async function preprocessTextForRAG(text: string): Promise<string> {
  // TODO: Implement text preprocessing for RAG system
  // - Clean and normalize text
  // - Remove irrelevant content
  // - Extract key concepts
  // - Chunk text appropriately
  
  console.log(`TODO: Preprocess text for RAG (${text.length} characters)`);
  return text; // Return as-is for now
}
```

### File Handler Service

```typescript
// src/lib/server/services/fileHandler.ts
import type { UploadedDocument } from '$lib/types';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
  'text/markdown'
];

export async function handleFileUpload(
  file: File, 
  ideaId: string
): Promise<UploadedDocument> {
  // Validate file type and size
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new ValidationError(`File type ${file.type} is not allowed`);
  }
  
  if (file.size > MAX_FILE_SIZE) {
    throw new ValidationError(`File size ${file.size} exceeds maximum of ${MAX_FILE_SIZE}`);
  }
  
  try {
    // TODO: Store file in secure location (Supabase Storage, S3, etc.)
    const filePath = await storeFile(file, ideaId);
    
    // TODO: Extract text content from file
    const extractedText = await extractTextContent(file);
    
    // TODO: Add to RAG knowledge base
    await addToKnowledgeBase(extractedText, {
      filename: file.name,
      ideaId
    });
    
    return {
      id: crypto.randomUUID(),
      ideaId,
      filename: file.name,
      filePath,
      fileType: file.type,
      fileSize: file.size,
      processed: true,
      extractedText,
      createdAt: new Date()
    };
  } catch (error) {
    console.error('File upload failed:', error);
    throw new Error(`Failed to process file: ${error.message}`);
  }
}

async function storeFile(file: File, ideaId: string): Promise<string> {
  // TODO: Implement actual file storage
  // Options: Supabase Storage, AWS S3, local filesystem
  const filename = `${ideaId}/${crypto.randomUUID()}-${file.name}`;
  console.log(`TODO: Store file at path: ${filename}`);
  return filename;
}

async function addToKnowledgeBase(
  text: string, 
  metadata: { filename: string; ideaId: string }
): Promise<void> {
  // TODO: Add processed text to RAG knowledge base
  console.log(`TODO: Add document to knowledge base: ${metadata.filename}`);
}

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
```

## RAG System Integration

### RAG Service Implementation

```typescript
// src/lib/server/services/ragService.ts
import type { ProcessedDocument, KnowledgeEntry } from '$lib/types';

export async function addDocumentToKnowledge(
  document: ProcessedDocument
): Promise<void> {
  // TODO: Implement RAG system integration
  
  try {
    // TODO: Chunk document content into appropriate sizes
    const chunks = await chunkDocument(document.content);
    
    // TODO: Generate embeddings for each chunk
    const embeddings = await generateEmbeddings(chunks);
    
    // TODO: Store embeddings in vector database
    await storeEmbeddings(embeddings, document.id);
    
    console.log(`TODO: Added document ${document.filename} to knowledge base`);
  } catch (error) {
    console.error(`Failed to add document to knowledge base:`, error);
    throw error;
  }
}

export async function queryKnowledgeBase(
  query: string, 
  limit: number = 5
): Promise<KnowledgeEntry[]> {
  // TODO: Implement knowledge base querying
  
  try {
    // TODO: Generate embedding for query
    const queryEmbedding = await generateQueryEmbedding(query);
    
    // TODO: Perform vector similarity search
    const results = await vectorSearch(queryEmbedding, limit);
    
    // TODO: Return relevant knowledge entries
    return results;
  } catch (error) {
    console.error(`Knowledge base query failed:`, error);
    return [];
  }
}

async function chunkDocument(content: string): Promise<string[]> {
  // TODO: Implement intelligent document chunking
  // Consider sentence boundaries, paragraphs, semantic meaning
  const chunkSize = 1000; // characters
  const chunks: string[] = [];
  
  for (let i = 0; i < content.length; i += chunkSize) {
    chunks.push(content.substring(i, i + chunkSize));
  }
  
  return chunks;
}

async function generateEmbeddings(chunks: string[]): Promise<number[][]> {
  // TODO: Generate embeddings using AI service (OpenAI, Cohere, etc.)
  console.log(`TODO: Generate embeddings for ${chunks.length} chunks`);
  
  // Placeholder: return empty embeddings
  return chunks.map(() => Array(1536).fill(0)); // OpenAI embedding dimension
}

async function generateQueryEmbedding(query: string): Promise<number[]> {
  // TODO: Generate embedding for search query
  console.log(`TODO: Generate query embedding for: ${query}`);
  return Array(1536).fill(0); // Placeholder
}

async function storeEmbeddings(
  embeddings: number[][], 
  documentId: string
): Promise<void> {
  // TODO: Store in vector database (Pinecone, Weaviate, Supabase Vector, etc.)
  console.log(`TODO: Store ${embeddings.length} embeddings for document ${documentId}`);
}

async function vectorSearch(
  queryEmbedding: number[], 
  limit: number
): Promise<KnowledgeEntry[]> {
  // TODO: Perform vector similarity search
  console.log(`TODO: Search for ${limit} similar vectors`);
  return []; // Placeholder
}
```

## Error Handling and Fallbacks

### AI Service Error Handling

```typescript
// src/lib/server/ai/errorHandling.ts
export class AIServiceError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'AIServiceError';
  }
}

export async function withFallback<T>(
  operation: () => Promise<T>,
  fallback: () => Promise<T>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.warn('Primary operation failed, using fallback:', error);
    return await fallback();
  }
}

export function createFallbackAnalysis(ideaText: string): AnalysisResult {
  return {
    statements: [
      {
        id: crypto.randomUUID(),
        text: "Analysis temporarily unavailable. This idea has potential for positive impact.",
        metrics: [
          {
            metric_name: "Overall Impact",
            metric_value: 0.0
          }
        ]
      }
    ],
    summary: "AI analysis is temporarily unavailable. Please try again later."
  };
}
```

### Validation and Input Sanitization

```typescript
// src/lib/server/services/validationService.ts
export function validateAnalysisInput(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data.text || typeof data.text !== 'string') {
    errors.push('Idea text is required');
  }
  
  if (data.text && data.text.length > 64000) {
    errors.push('Idea text must be 64,000 characters or less');
  }
  
  if (data.text && data.text.trim().length < 10) {
    errors.push('Idea text must be at least 10 characters');
  }
  
  // Validate documents if provided
  if (data.documents && Array.isArray(data.documents)) {
    for (const doc of data.documents) {
      if (!doc.filename || !doc.content) {
        errors.push('Invalid document format');
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

export function sanitizeInput(text: string): string {
  // TODO: Implement input sanitization
  // - Remove potentially harmful content
  // - Normalize whitespace
  // - Handle encoding issues
  
  return text.trim();
}
```

## Integration with Form Actions

### Analysis Form Action Implementation

```typescript
// In relevant +page.server.ts file
import { analyzeIdea } from '$lib/server/ai/aiService';
import { processFiles } from '$lib/server/services/documentProcessor';
import { validateAnalysisInput } from '$lib/server/services/validationService';

export const actions = {
  analyze: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { error: 'Authentication required' });
    }

    const formData = await request.formData();
    const ideaText = formData.get('idea') as string;
    const title = formData.get('title') as string;
    const files = formData.getAll('documents') as File[];

    // Validate input
    const validation = validateAnalysisInput({ text: ideaText, title });
    if (!validation.isValid) {
      return fail(400, { errors: validation.errors });
    }

    try {
      // Process uploaded documents
      const processedDocs = files.length > 0 
        ? await processFiles(files) 
        : undefined;

      // Perform AI analysis
      const analysis = await analyzeIdea(ideaText, processedDocs);

      // Store results in database (handled by repository layer)
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

        for (const metric of statement.metrics) {
          await repositories.statements.createMetric({
            statementId: createdStatement.id,
            metricName: metric.metric_name,
            metricValue: metric.metric_value
          });
        }
      }

      return { 
        success: true, 
        ideaId: idea.id,
        analysis 
      };

    } catch (error) {
      console.error('Analysis failed:', error);
      return fail(500, { 
        error: 'Analysis failed. Please try again later.' 
      });
    }
  }
};
```

## Future Extensibility Considerations

### Multi-Agent Architecture Preparation

The current single-agent implementation should be designed to easily transition to a multi-agent system:

```typescript
// Future multi-agent structure (placeholder)
interface AgentOrchestrator {
  economicAgent: EconomicImpactAgent;
  socialAgent: SocialImpactAgent;
  environmentalAgent: EnvironmentalImpactAgent;
  synthesisAgent: SynthesisAgent;
}

// Design current implementation to be easily replaceable
export interface AnalysisProvider {
  analyzeIdea(text: string, docs?: ProcessedDocument[]): Promise<AnalysisResult>;
}

export class SingleAgentProvider implements AnalysisProvider {
  async analyzeIdea(text: string, docs?: ProcessedDocument[]): Promise<AnalysisResult> {
    // Current implementation
  }
}

// Future: MultiAgentProvider implements same interface
// export class MultiAgentProvider implements AnalysisProvider { ... }
```

### Versioning Support

Design the system to support multiple analysis versions:

```typescript
// Future versioning structure
interface AnalysisVersion {
  version: string;
  provider: AnalysisProvider;
  capabilities: string[];
}

const ANALYSIS_VERSIONS: Record<string, AnalysisVersion> = {
  'v1-single-agent': {
    version: '1.0.0',
    provider: new SingleAgentProvider(),
    capabilities: ['basic-impact', 'sdg-mapping']
  }
  // Future versions can be added here
};
```

This structure allows for backward compatibility and gradual migration to more sophisticated AI systems.
