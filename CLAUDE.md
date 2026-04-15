# CLAUDE.md - Evalu8 MVP

## Project Overview

Evalu8 is a multi-tenant web platform for sports player evaluation. It automates scheduling, provides real-time scoring tools, and delivers ranked player reports for sports associations (basketball, soccer, hockey, etc.).

## Tech Stack

- **Frontend:** React 19 + TypeScript (strict mode) + Vite
- **Styling:** Tailwind CSS + shadcn/ui (Radix UI primitives)
- **Routing:** React Router DOM
- **Forms:** React Hook Form + Zod validation
- **State:** React Context API (AuthContext) — no Redux/Zustand
- **Backend:** Supabase (hosted PostgreSQL + Auth + Edge Functions)
- **Auth:** Google OAuth via Supabase Auth
- **Package Manager:** pnpm
- **Node:** 20 LTS

## Commands

```bash
pnpm dev              # Start dev server (port 5173)
pnpm build            # TypeScript check + Vite production build
pnpm lint             # ESLint
pnpm type-check       # TypeScript strict type checking (tsc -b)
pnpm preview          # Preview production build
pnpm supabase:gen:types  # Regenerate database types from Supabase schema
```

## Project Structure

```
src/
  App.tsx              # Routes and layout
  main.tsx             # Entry point (AuthProvider, BrowserRouter)
  index.css            # Global styles + CSS theme variables
  components/
    ui/                # shadcn/ui components (do not edit manually — use shadcn CLI)
    associations/      # Association CRUD
    cohorts/           # Cohort management
    drills/            # Drill library
    locations/         # Locations
    players/           # Player management + bulk import
    positions/         # Position types
    previous-levels/   # Player level history
    seasons/           # Season management
    sessions/          # Session scheduling, drills, staff, evaluators (largest feature)
    users/             # User + association user management
    waves/             # Wave distribution
    sidebar/           # Navigation
    layout/            # Layout wrappers
  context/
    AuthContext.tsx     # Auth, association context, role management
  hooks/
    useAuth.ts         # Access auth context
    use-mobile.tsx     # Responsive breakpoint detection
    use-toast.ts       # Toast notification system
  lib/
    supabase.ts        # Supabase client init
    utils.ts           # Utility functions (cn, etc.)
  pages/               # Route page components
  types/
    database.types.ts  # Auto-generated from Supabase (do not edit manually)
supabase/
  migrations/          # 60+ sequential SQL migrations
  functions/           # Edge Functions (invite-association-user, invite-system-user)
scripts/               # Database debug and utility scripts
docs/                  # BDD specs, project briefs, technical architecture, user stories
@/components/ui/       # Legacy shadcn/ui copies (prefer src/components/ui/)
```

## Key Patterns

- **Components follow a Table + Dialog pattern:** `FooTable.tsx` for data display, `FooDialog.tsx` for CRUD modals
- **Database types** are auto-generated — run `pnpm supabase:gen:types` after schema changes, never edit `database.types.ts` by hand
- **Row-Level Security (RLS):** Multi-tenant isolation via `set_association_context()` RPC — always set association context before queries
- **Roles:** System Admin, Association Admin, Evaluator, Intake Personnel — check with `hasRole()` from `useAuth()`
- **Path alias:** `@/` maps to `src/` (configured in vite.config.ts and tsconfig.app.json)
- **Toast notifications** for user-facing feedback on async operations
- **Form validation** uses Zod schemas with React Hook Form resolvers

## Database

- Hosted on Supabase (PostgreSQL) — no local database
- Migrations in `supabase/migrations/` are sequential SQL files
- Key tables: `associations`, `users`, `association_users`, `cohorts`, `seasons`, `players`, `drills`, `sessions`, `session_drills`, `waves`, `evaluations`, `player_sessions`
- Business logic lives in PostgreSQL RPC functions (stored procedures)
- Environment variables in `.env.local` (not committed — see .gitignore)

## Environment Variables

Required in `.env.local`:
- `VITE_SUPABASE_URL` — Supabase project URL (exposed to client)
- `VITE_SUPABASE_ANON_KEY` — Public anon key (exposed to client)
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key (backend/scripts only)
- `SUPABASE_DB_PASSWORD` — Direct DB password (scripts only)

## Important Notes

- **No test framework** is configured yet (no Jest/Vitest)
- **Large page files** exist (SchedulingDashboardPage, CheckInPage, TestingOverviewPage) — these contain substantial inline logic
- **shadcn/ui components** in `src/components/ui/` should be added/updated via the shadcn CLI, not edited directly
- TypeScript strict mode is on — `noUnusedLocals` and `noUnusedParameters` are enforced
- The `docs/` folder contains comprehensive BDD specs and technical architecture docs — consult these for feature requirements
