# GitHub Copilot Instructions for Schedule Management System

## Project Overview

This is a class schedule management system built for educational institutions. It manages:

- Student and teacher schedules
- Class sessions (regular and special)
- Recurring class series
- Room assignments and availability
- Notifications via LINE messaging platform

## Tech Stack

- **Framework**: Next.js 15.4 (App Router, React 19)
- **Language**: TypeScript 5 (strict mode)
- **Styling**: Tailwind CSS v4
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js v5
- **UI Components**: Radix UI, shadcn/ui
- **Package Manager**: Bun (NOT npm or yarn)
- **Testing**: Vitest + React Testing Library
- **Deployment**: Vercel

## Project Structure

```
src/
├── app/              # Next.js App Router (routes, layouts, pages)
├── components/       # React components
│   ├── ui/          # Reusable UI components (shadcn/ui)
│   └── [feature]/   # Feature-specific components
├── lib/             # Utilities, Prisma client, helpers
├── hooks/           # Custom React hooks
├── services/        # Business logic and data access
├── schemas/         # Zod validation schemas
└── types/           # TypeScript type definitions

prisma/
├── schema.prisma    # Database schema
├── migrations/      # Database migrations
└── seed.ts          # Database seeding

specs/               # Spec-driven development artifacts
└── [id]-[slug]/
    ├── spec.md      # Requirements and acceptance criteria
    ├── plan.md      # Implementation plan
    ├── tasks.md     # Task tracking
    └── research.md  # Decisions and assumptions

docs/                # Feature documentation
scripts/             # Operational scripts
tests/               # Test files
```

## Development Commands

```bash
# Development
bun dev              # Run dev server with Turbopack
bun build            # Build for production
bun start            # Run production build
bun lint             # Run ESLint
bun watch            # TypeScript type checking in watch mode
bun test             # Run tests with Vitest

# Database
bun postinstall      # Generate Prisma client
bun prisma migrate dev    # Apply migrations
bun prisma studio    # Open Prisma Studio
PGPASSWORD=postgres psql -h localhost -U postgres -d schedulewebsite -c "SELECT 1;"  # Direct DB access
```

## Coding Standards

### TypeScript

- Use strict mode
- Prefer explicit types over `any`
- Use type-safe patterns for API responses
- Follow existing type patterns in `src/types/`

### Code Style

- Indentation: 2 spaces
- Use ESLint configuration (extends `next/core-web-vitals`, `next/typescript`)
- Object destructuring spacing: `{ always }`
- Prefer functional components with TypeScript
- Use `@/*` alias for imports from `src/`

### Naming Conventions

- Components: PascalCase (`StudentSchedule.tsx`)
- Files/folders: kebab-case (`class-session-utils.ts`)
- Constants: UPPER_SNAKE_CASE
- Functions: camelCase

### React Patterns

- Use React 19 features (Server Components, Actions)
- Prefer composition over prop drilling
- Use React Query for data fetching
- Keep components focused and single-purpose

## Common Patterns

### API Routes (Next.js App Router)

```typescript
// src/app/api/resource/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  // validation schema
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = schema.parse(body);
    // Handle request
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Error message" }, { status: 400 });
  }
}
```

### Database Queries

- Use Prisma for type-safe database access
- For operational queries, use psql directly: `PGPASSWORD=postgres psql -h localhost -U postgres -d schedulewebsite -c "..."`
- Always handle errors and edge cases
- Use transactions for related operations

### Form Handling

- Use React Hook Form with Zod resolvers
- Validate on client and server
- Provide clear error messages

## Testing Guidelines

- Place tests near source files as `*.test.ts(x)` or in `__tests__/`
- Test critical paths: scheduling logic, API handlers, database queries
- Mock external dependencies (database, APIs)
- Use descriptive test names
- Run tests before committing: `bun test`

## Security & Best Practices

- Never commit secrets or credentials
- Validate all user inputs (client and server)
- Use environment variables for configuration
- Handle errors gracefully without exposing internals
- Use TypeScript for type safety
- Remove debug logs before production

## Spec-Driven Development (Spec Kit)

This project uses Spec Kit for structured development:

- **Active spec**: Match branch name suffix to spec folder (`001-feature` → `specs/001-feature/`)
- **Key files per spec**:
  - `spec.md` — Requirements and acceptance criteria
  - `plan.md` — Implementation plan and milestones
  - `tasks.md` — Actionable task tracking
  - `research.md` — Questions, decisions, assumptions
  - `contracts/` — API contracts and tests

**Workflow**:

1. Start by reviewing active spec's `plan.md` and `tasks.md`
2. Align code with spec requirements
3. Update `tasks.md` as work progresses
4. Document decisions in `research.md`
5. Keep contracts in sync with implementation

---

## 🚨 MANDATORY RULES - STRICT ENFORCEMENT

⚠️ **These rules are CRITICAL - Follow them without exception**

### 🔧 Tools & Requirements

- ✅ **MANDATORY**: Use Bun for package management (NOT npm/yarn)
- ✅ **MANDATORY**: Fix TypeScript errors after ALL changes
- ✅ **MANDATORY**: Use psql for direct DB operations (not Prisma)
  - Example: `PGPASSWORD=postgres psql -h localhost -U postgres -d schedulewebsite -c "SELECT * FROM students;"`

### 📝 Code Changes

- ✅ **ONLY** modify relevant code parts
- ✅ **PRESERVE**: existing formatting, names, documentation
- ✅ **FOLLOW**: existing patterns when adding new code
- ✅ Search codebase before implementing to reuse patterns

### 📋 Project Management

- ✅ **USE**: Spec Kit for all tasks (update `plan.md` and `tasks.md`)
- ✅ **START**: every session by reviewing active spec, `git status`, recent commits
- ✅ **DOCUMENT**: questions and assumptions in `research.md`

### ⚡ Development Process

- ✅ **PLAN** before coding - no rushing
- ✅ **SMALL** testable changes - no big changes
- ✅ **ELIMINATE** duplicates proactively
- ✅ **UPDATE** spec artifacts regularly

### 🔒 Code Quality

- ✅ Handle errors and validate inputs
- ✅ Follow conventions and secure secrets
- ✅ Write clear, type-safe code
- ✅ Remove debug logs before production

### 📐 Development Standards

- ✅ **PRIORITY**: Simplicity and readability
- ✅ **APPROACH**: Minimal working functionality first
- ✅ **CONSISTENCY**: Maintain consistent style

🔥 **Violating these rules means ignoring project standards!**
