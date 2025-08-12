# WHIF (What Happens If...) - Impact Estimation Tool

WHIF is a tool that helps users critically analyze the holistic, long-term impacts of their ideas, solutions, or policies by evaluating potential side effects and their alignment with global goals. It aims to foster critical thinking and exploration rather than providing definitive predictions.

## 🚀 Features

- **AI-Powered Impact Analysis**: Generate comprehensive impact statements for your ideas
- **SDG Integration**: Link impacts to Sustainable Development Goals and other metrics
- **Community Voting**: Vote on impact statements to refine analysis quality
- **Real-time Updates**: Live updates for voting and impact calculations
- **Document Support**: Upload supporting documents for enhanced analysis
- **Mobile-First Design**: Responsive design optimized for all devices

## 🛠️ Tech Stack

- **Frontend**: SvelteKit 5 + TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **State Management**: TanStack Query (Svelte Query)
- **ORM**: Drizzle ORM
- **Real-time**: Supabase Realtime

## 📋 Prerequisites

- Node.js 18+ 
- npm or pnpm
- Supabase CLI
- GitHub account (for OAuth)

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd whif
npm install
```

### 2. Set Up Supabase

1. **Create a new Supabase project**:
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Note your project URL and anon key

2. **Set up environment variables**:
   ```bash
   cp env.example .env.local
   ```
   
   Edit `.env.local` with your Supabase credentials:
   ```env
   PUBLIC_SUPABASE_URL=your_supabase_project_url
   PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
   ```

3. **Initialize database**:
   ```bash
   npm run db:generate
   npm run db:push
   ```

### 3. Configure GitHub OAuth

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create a new OAuth App
3. Set callback URL to: `https://your-project.supabase.co/auth/v1/callback`
4. Add the client ID and secret to your Supabase project settings

### 4. Run the Development Server

```bash
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173) to see your app!

## 🗄️ Database Schema

The application uses the following main tables:

- **ideas**: User-submitted ideas and solutions
- **statements**: AI-generated impact statements
- **statement_metrics**: SDG and metric linkages
- **votes**: User votes on statements
- **idea_documents**: Supporting document uploads

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run check` - Type check
- `npm run lint` - Lint code
- `npm run format` - Format code
- `npm run db:generate` - Generate database migrations
- `npm run db:push` - Push database changes
- `npm run db:studio` - Open Drizzle Studio

### Project Structure

```
src/
├── lib/
│   ├── components/          # Reusable UI components
│   ├── server/             # Server-only code
│   │   ├── database/       # Database schema and repositories
│   │   ├── ai/            # AI analysis services
│   │   └── services/      # Business logic services
│   ├── supabase/          # Supabase client configuration
│   └── queries/           # TanStack Query definitions
├── routes/                 # SvelteKit routes
└── app.html               # HTML template
```

## 🎯 Core Features Implementation

### 1. Idea Creation
- Text input with 64,000 character limit
- File upload support (PDF, DOCX, TXT, MD)
- AI analysis pipeline (placeholder implementation)

### 2. Impact Analysis
- AI-generated impact statements
- SDG and metric linkages
- Calculated impact scores

### 3. Voting System
- Upvote/downvote on statements
- Real-time vote updates
- Impact score recalculation

### 4. Authentication
- GitHub OAuth integration
- User session management
- Protected routes

## 🔮 Future Enhancements

- **Multi-Agent AI System**: Replace single-agent with specialized agents
- **Advanced Analytics**: Charts and visualizations
- **Collaboration Features**: Team workspaces and sharing
- **Export Functionality**: PDF reports and data export
- **API Integration**: Connect with external impact assessment tools

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

If you encounter any issues:

1. Check the [Supabase documentation](https://supabase.com/docs)
2. Review the [SvelteKit documentation](https://kit.svelte.dev)
3. Open an issue in this repository

## 🙏 Acknowledgments

- Built with [SvelteKit](https://kit.svelte.dev)
- Database powered by [Supabase](https://supabase.com)
- Styling with [Tailwind CSS](https://tailwindcss.com)
- Icons from [Iconify](https://iconify.design)
