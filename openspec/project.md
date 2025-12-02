# Project Context

## Purpose
Just Dogs Training App is a comprehensive dog training management application for Just Dogs, a Cape Town-based dog training company. The app enables trainers, parents (dog owners), and administrators to manage training sessions, dog profiles, scheduling, billing, and communication in a unified platform.

**Key Goals:**
- Streamline booking and session management
- Enable real-time communication between trainers and parents
- Track dog progress and behavioral notes
- Manage billing and invoicing in South African Rands (ZAR)
- Provide role-based dashboards for different user types

## Tech Stack
- **Frontend Framework**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS 4, Headless UI components
- **Database**: Supabase (PostgreSQL) with Row Level Security (RLS)
- **Authentication**: Supabase Auth with PKCE flow
- **Form Handling**: React Hook Form with Zod validation
- **Icons**: Heroicons, Lucide React
- **Date Handling**: date-fns
- **Deployment**: Vercel (target platform)

## Project Conventions

### Code Style
- **TypeScript**: Strict mode enabled, prefer explicit types over `any`
- **Naming**: 
  - Components: PascalCase (`CreateBookingModal.tsx`)
  - Files: kebab-case for utilities (`auth.ts`, `utils.ts`)
  - Functions: camelCase (`handleCreateBooking`)
  - Constants: UPPER_SNAKE_CASE (`NEXT_PUBLIC_SUPABASE_URL`)
- **File Organization**: 
  - Feature-based structure under `app/(dashboard)/`
  - Shared components in `components/`
  - Utilities in `lib/` organized by domain
- **Formatting**: ESLint + Next.js config, prefer 2-space indentation
- **Imports**: Group by external → internal, alphabetical within groups

### Architecture Patterns
- **App Router**: Next.js 15 App Router with route groups `(auth)` and `(dashboard)`
- **Server/Client Separation**: 
  - Server components by default
  - `'use client'` only when needed (interactivity, hooks, browser APIs)
- **API Routes**: Next.js API routes for server-side operations (`/api/*`)
- **Database Access**:
  - Client-side: `lib/supabase/client.ts` for browser operations
  - Server-side: `lib/supabase/client-server.ts` for SSR/API routes
  - Service role: Used in API routes to bypass RLS when needed
- **State Management**: React hooks (`useState`, `useEffect`) for local state
- **Error Handling**: Try-catch blocks with user-friendly error messages
- **Data Fetching**: 
  - Client-side: Direct Supabase client calls
  - Server-side: Server components or API routes
- **Type Safety**: Shared types in `types/index.ts`, Supabase types in `types/supabase.d.ts`

### Testing Strategy
- **Current State**: Manual testing during development
- **Future**: Unit tests for utilities, integration tests for API routes
- **Test Files**: Co-located with source files (`.test.ts` or `.spec.ts`)

### Git Workflow
- **Branching**: Feature branches from `main`
- **Commits**: Conventional commits preferred (feat:, fix:, refactor:)
- **PR Process**: Review before merge to main
- **Worktrees**: Used for parallel development (`.cursor/worktrees/`)

## Domain Context

### User Roles
- **Admin**: Full system access, user management, revenue tracking, content management
- **Trainer**: Session management, dog feedback, scheduling, viewing assigned bookings
- **Parent**: Dog profile management, booking sessions, viewing feedback and invoices
- **Behaviorist**: Specialized role for behavioral consultations

### Key Entities
- **Users**: Authentication via Supabase Auth, profiles in `users` table
- **Dogs**: Belong to parents (owners), have medical/behavioral notes, photos
- **Bookings**: Training session requests (pending → confirmed → completed/cancelled)
- **Sessions**: Actual training sessions with notes, ratings, photos
- **Messages**: Internal communication system with announcements
- **Invoices**: Billing in ZAR, payment tracking

### Business Rules
- Trainers require admin approval before account activation
- Parents can only see/manage their own dogs
- Bookings start as "pending" and require trainer/admin confirmation
- All monetary values in South African Rands (ZAR)
- Mobile-first design (important for South African market with varying data speeds)

## Important Constraints
- **Data Privacy**: RLS policies enforce data isolation between users
- **Performance**: Optimize for low data usage (South African context)
- **Mobile**: Must be fully responsive and mobile-friendly
- **Authentication**: Email confirmation can be disabled for testing but required in production
- **Service Role Key**: Never expose in client-side code, only in API routes
- **Environment Variables**: All Supabase keys must be in `.env.local` (never committed)

## External Dependencies
- **Supabase**: 
  - Authentication service
  - PostgreSQL database with RLS
  - Storage for media files (future)
  - Real-time subscriptions (future)
- **Vercel**: Deployment platform
- **Next.js**: Framework and build system
