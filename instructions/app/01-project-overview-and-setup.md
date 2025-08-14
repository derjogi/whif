# Project Overview & Initial Setup

## Project Overview & Core Concept

* **Project Name:** WHIF (What Happens If...) / Impact Estimation
* **Purpose:** To provide a tool that helps users critically analyze the holistic, long-term impacts of their ideas, solutions, or policies by evaluating potential side effects and their alignment with global goals. It aims to foster critical thinking and exploration rather than providing definitive predictions.
* **Target Audience:** Innovators, students, entrepreneurs, policy makers, and anyone interested in sustainable development and foresight.

## Tech Stack & Architecture Decisions

* **Frontend Framework:** **SvelteKit** for a full-stack approach, including client-side rendering, server-side rendering, load functions, form actions, and API routes.
* **Styling:** Exclusively use **Tailwind CSS** for all styling to ensure a modern, responsive, and utility-first design.
* **Database:** Use **Supabase** (PostgreSQL database with real-time features).
* **Authentication:** Use **Supabase Auth** exclusively for all user authentication.
* **Data Fetching & State Management:** 
  * **TanStack Query (Svelte Query)** for client-side data fetching, caching, and state management
  * **SvelteKit Load Functions** for server-side data loading and SEO optimization
  * **SvelteKit Form Actions** for server-side mutations and form handling

## Design Principles

* **Mobile-First:** Design and implement for mobile devices first, then enhance for larger screens.
* **Overall Layout:** A clean, modern, and intuitive application with multiple screens.
* Use a calm, professional color palette (e.g., muted blues, greens, and grays).
* **Accessibility:** No special accessibility requirements for MVP.

## Initial Project Setup Tasks

1. Initialize SvelteKit project
2. Install and configure Tailwind CSS
3. Install and configure TanStack Query for Svelte
4. Set up Supabase project and client configuration
5. Create basic directory structure following SvelteKit conventions
6. Set up environment variables structure
7. Create basic TypeScript configuration
8. Set up basic error handling patterns
9. Create placeholder components for the three main screens

## Directory Structure

```
src/lib/
├── server/           # Server-only code (never bundled for client)
│   ├── ai/          # AI API calls and processing
│   ├── database/    # Repository pattern implementation  
│   └── services/    # Business logic and external API integration
├── queries/         # TanStack Query definitions for client-side data fetching
├── types/           # Shared TypeScript interfaces and types
└── components/      # Reusable Svelte components
```

## Environment Configuration

* Use .env files for all configuration and API keys following standard practices
* Store API keys securely in **.env files** and access only from server-side code
* Set up separate environments for development and production
* Include Supabase URL and anon key configuration
* Prepare structure for future AI service API keys

## Code Quality Standards

* The entire codebase must be complete, self-contained, and runnable.
* Include extensive comments explaining logic, algorithms, function headers, and major sections.
* Implement robust error handling using try/catch blocks throughout.
* **UI Interactions:** Use custom modal UI elements instead of alert() or confirm() for all user interactions.
* **No Personal Data:** The system stores no personal user data beyond what Supabase Auth requires.
* **CORS:** Use default configurations; specific CORS setup not required for MVP.

## Next Steps

After completing this setup, proceed to:
1. Database schema and authentication setup
2. Basic UI components and navigation
3. Core application features implementation
