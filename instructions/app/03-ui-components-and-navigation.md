# UI Components & Navigation System

## Application Structure & Navigation

The application consists of three main screens with simple navigation:

### Screen Structure

**a) Dashboard Screen:**
* Shows existing ideas/projects in a list or grid format
* Includes search functionality to filter existing ideas
* Prominent CTA button to "Create New Idea"
* **Empty State:** If user has no ideas, show engaging CTA with placeholder text encouraging them to create their first idea

**b) Idea Creation Screen:**
* **Input Area:**
  * A prominent text area with a clear label such as "Describe your idea or solution."
  * **Character Limit:** 64,000 characters maximum with live character counter
  * **File Upload Area:** Support for uploading supporting documents/attachments
    * Accept common document formats (PDF, DOCX, TXT, etc.)
    * Show upload progress and file list
    * Backend should process these for RAG/knowledge database integration
  * Include a "Submit" button to trigger the analysis.
* **Empty State:** Clear instructions and examples of what to enter

**c) Idea View Screen (Results):**
* Displays the complete analysis results for a specific idea
* Contains the Results Display Area with all analysis components

### Navigation System
* **Simple Navigation:** Primary navigation consists of a "Dashboard" or "Home" button in the header
* **User Flow:** Dashboard ↔ Idea Creation ↔ Idea View
* **Future Extensibility:** Design navigation structure to easily accommodate tabs for managing multiple ideas in later iterations

## Component Architecture

### Core Components to Implement

#### 1. Layout Components
- `AppShell.svelte` - Main application wrapper with header and navigation
- `Header.svelte` - Top navigation with Dashboard/Home button
- `NavigationBar.svelte` - Future-ready navigation component

#### 2. Dashboard Components
- `Dashboard.svelte` - Main dashboard view
- `IdeaGrid.svelte` - Grid/list display of ideas
- `IdeaCard.svelte` - Individual idea preview card
- `SearchBox.svelte` - Search functionality for filtering ideas
- `EmptyDashboard.svelte` - Empty state when user has no ideas

#### 3. Idea Creation Components
- `IdeaCreationForm.svelte` - Main form for creating ideas
- `TextArea.svelte` - Text input with character counter
- `FileUpload.svelte` - Document upload component with progress
- `FileList.svelte` - Display uploaded files
- `CharacterCounter.svelte` - Live character count display

#### 4. Idea View Components
- `IdeaView.svelte` - Main results display container
- `ResultsDisplay.svelte` - Core results area
- `StatementList.svelte` - List of AI-generated statements
- `StatementCard.svelte` - Individual statement display
- `SummaryBox.svelte` - AI-generated summary display
- `Disclaimer.svelte` - Required disclaimer component

#### 5. Interactive Components
- `VoteButtons.svelte` - Upvote/downvote buttons
- `ImpactScore.svelte` - Display calculated impact scores
- `MetricsBadge.svelte` - Display SDGs and other metrics

#### 6. Loading & Error Components
- `LoadingSpinner.svelte` - Basic loading indicator
- `LoadingSkeleton.svelte` - Skeleton loader for content
- `ErrorMessage.svelte` - Error display with retry options
- `SuccessAnimation.svelte` - Success feedback animations

#### 7. Modal & Overlay Components
- `Modal.svelte` - Custom modal for user interactions (no alerts)
- `Toast.svelte` - Toast notifications for system messages
- `ConfirmDialog.svelte` - Custom confirmation dialogs

## Results Display Area Implementation

This area appears on the Idea View screen after analysis completion and contains:

### Loading States
* Display appropriate loading indicators throughout the application:
  * Loading skeleton or spinner while AI analysis is in progress
  * Loading indicators for voting actions and data updates
  * Standard loading states for all async operations

### Success Feedback
* Implement success animations/feedback where appropriate:
  * Vote confirmation animations
  * Successful idea submission feedback
  * Data update confirmations

### Statement List Display
The core of the output, displaying each AI-generated statement as an individual card or well-structured list item.

Each statement card must clearly show:
* The **text of the outcome/side-effect**
* The **linked Sustainable Development Goals (SDGs)** (e.g., "SDG 1: No Poverty") and other **impact metrics** (e.g., "GDP", "Environmental Health")
* The **current calculated impact score** (a numerical value between -1 and 1)
* Clearly visible **upvote and downvote buttons** (e.g., simple up/down arrows or thumbs up/down icons)

### Data Visualization Placeholder
* **Implementation Note:** Charts will be implemented separately later
* Include placeholder areas in the UI where charts will be integrated
* Ensure data structure supports passing aggregated impact data to future chart components
* Plan for multiple chart types: doughnut/donut charts, bar charts, and trend visualizations
* **Empty State:** Show placeholder message when no data is available for visualization

### Summary Box
A concise, AI-generated summary that synthesizes the overall findings, highlighting the most significant positive and negative impacts.

### Empty States
Implement appropriate empty states throughout:
* **No statements generated:** Show error message with retry option (actionable)
* **No votes yet:** Show placeholder encouraging voting (informational)
* **Analysis in progress:** Show loading state (informational)

### Error Handling
Implement standard error display patterns:
* Show errors within the component that failed to load
* Use callouts or toast notifications for system-wide errors
* Graceful degradation when parts of the analysis fail

### Required Disclaimer
A very clear and prominent disclaimer must be displayed, stating: "The results are based on an AI-generated hypothetical analysis and should not be considered factual predictions. They are intended as a tool for critical thinking and exploration, not as a source of truth."

## Responsive Design Requirements

### Mobile-First Approach
* Design and implement for mobile devices first, then enhance for larger screens
* Ensure all components work well on touch devices
* Optimize button sizes for mobile interaction
* Consider mobile-specific navigation patterns

### Breakpoint Strategy
```css
/* Mobile first approach with Tailwind CSS */
/* Base styles: mobile (default) */
/* sm: 640px and up */
/* md: 768px and up */ 
/* lg: 1024px and up */
/* xl: 1280px and up */
```

### Component Responsiveness
* **IdeaGrid:** Switch between single column (mobile) and grid layout (desktop)
* **StatementCard:** Stack content vertically on mobile, use flex layout on desktop
* **Navigation:** Consider mobile menu patterns for future extensibility
* **FileUpload:** Adapt upload area size for different screen sizes
* **Modal:** Ensure modals are usable on mobile devices

## Styling Guidelines

### Tailwind CSS Implementation
* Use exclusively **Tailwind CSS** for all styling
* Follow utility-first design principles
* Create component-specific styles using Tailwind's `@apply` directive when needed

### Color Palette
Use a calm, professional color palette:
* **Primary:** Muted blues (e.g., `blue-600`, `blue-500`)
* **Secondary:** Muted greens (e.g., `green-600`, `green-500`)
* **Neutral:** Grays (e.g., `gray-100`, `gray-200`, `gray-600`, `gray-800`)
* **Success:** Green tones for positive feedback
* **Warning:** Amber tones for warnings
* **Error:** Red tones for error states

### Typography
* Use Tailwind's built-in typography scale
* Ensure good readability with appropriate font sizes and line heights
* Use font weights consistently throughout the application

## State Management Integration

### TanStack Query Integration
* Set up query client configuration for component-level data fetching
* Implement optimistic updates for voting interactions
* Handle loading and error states consistently across components

### Component State Patterns
```typescript
// Example component with TanStack Query
export let ideaId: string;

$: ideaQuery = createQuery({
  queryKey: ['idea', ideaId],
  queryFn: () => fetchIdeaById(ideaId),
  staleTime: 5 * 60 * 1000
});

$: statements = $ideaQuery.data?.statements ?? [];
$: isLoading = $ideaQuery.isLoading;
$: error = $ideaQuery.error;
```

### Real-time Updates
* Implement Supabase real-time subscriptions within relevant components
* Use reactive statements to update UI when real-time data changes
* Handle connection states and reconnection logic

## Accessibility Considerations

### Basic Accessibility (MVP)
* Ensure proper HTML semantic structure
* Use appropriate ARIA labels where necessary
* Maintain good color contrast ratios
* Make interactive elements keyboard accessible
* Use focus indicators for navigation

### Future Accessibility Enhancements
* Screen reader support
* High contrast mode
* Keyboard-only navigation
* Voice control compatibility

## Component Testing Strategy

### Component Test Scenarios (Future Implementation)
Each component should be designed with these test scenarios in mind:

* **Loading States:** Components properly display loading indicators
* **Error States:** Components gracefully handle and display errors
* **Empty States:** Components show appropriate empty state messaging
* **Interactive Elements:** Buttons, forms, and inputs work correctly
* **Responsive Behavior:** Components adapt properly to different screen sizes
* **Accessibility:** Components meet basic accessibility requirements

## Implementation Priority

### Phase 1 - Core Components
1. AppShell and Header
2. Dashboard with empty state
3. Basic IdeaCreationForm
4. Simple IdeaView structure

### Phase 2 - Interactive Features
1. StatementCard with voting
2. File upload functionality
3. Loading and error states
4. Modal system

### Phase 3 - Polish & Enhancement
1. Animations and transitions
2. Advanced responsive design
3. Performance optimizations
4. Enhanced accessibility
