# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
bun run dev          # Start development server with Turbopack
bun run build        # Build for production
bun run start        # Start production server

# Code Quality
bun run lint         # Run ESLint
bun run check-errors # Check TypeScript errors (tsc --noEmit --skipLibCheck)
bun run watch        # Watch for TypeScript errors

# Database
bun prisma generate  # Generate Prisma client (runs automatically on install)
bun prisma migrate deploy # Apply migrations
bun prisma db seed   # Seed database (uses ts-node)
```

## High-Level Architecture

### Authentication System
- **NextAuth v5 (beta)** with JWT session strategy
- **Providers**: Credentials (username/email + password) and Google OAuth
- **Google OAuth**: Restricted to existing users only - no new signups via OAuth
- **Roles**: ADMIN, STAFF, TEACHER, STUDENT
- **Multi-branch support**: Users can be assigned to specific branches
- **Route protection**: Handled by middleware using role-based redirects
- **Auth wrappers for API routes**:
  - `withRole(allowedRoles, handler)` - Basic role checking
  - `withBranchAccess(allowedRoles, handler)` - Role + branch access validation
  - Branch context passed via `X-Selected-Branch` header

### Database Design
- **Prisma ORM** with PostgreSQL (Supabase)
- **Connection pooling**: Uses `DATABASE_URL` for pooled connections, `DIRECT_URL` for migrations
- **Multi-tenant architecture**: Branch-based data isolation
- **Key relationships**:
  - Users → Branches (many-to-many via UserBranch)
  - Teachers/Students → Users (one-to-one)
  - ClassSessions → Teachers, Students, Subjects, Booths
  - Hierarchical ClassTypes with parent-child relationships
- **Order management**: Most entities have an `order` field for custom sorting

### API Architecture
- **RESTful routes** under `/app/api/`
- **Standard response format**:
  ```typescript
  {
    data: T[],
    pagination: {
      total: number,
      page: number,
      limit: number,
      pages: number
    }
  }
  ```
- **Branch context**: Selected branch ID passed via `X-Selected-Branch` header
- **Validation**: Zod schemas in `/src/schemas/`
- **Error handling**: Custom error class with status codes

### Frontend Patterns
- **State Management**:
  - Zustand for local UI state
  - TanStack Query for server state with custom hooks
- **Data Fetching**: Custom fetcher that automatically injects branch context
- **UI Components**: shadcn/ui components with Tailwind CSS
- **Hook Pattern**: Entity-specific hooks (e.g., `useStudentQuery`, `useStudentMutation`)
- **Layouts**: Role-based layouts that correspond to user roles

### Role-Based Access
- **Route structure**:
  - `/dashboard/*` - ADMIN and STAFF only
  - `/teacher/*` - TEACHER only
  - `/student/*` - STUDENT only
- **API protection**: All API routes check roles and branch access
- **Branch selection**: Stored in localStorage and passed in headers

### Key Development Patterns
1. **Always use Bun** for package management (not npm or yarn)
2. **Branch context is critical** - Most operations are branch-scoped
3. **Order fields** - Entities support custom ordering, maintain these when updating
4. **Validation first** - All API inputs validated with Zod schemas
5. **Transaction safety** - Complex operations use Prisma transactions
6. **TypeScript strict mode** - Resolve all type errors before completing work

### Environment Variables
```env
DATABASE_URL=       # Pooled connection string
DIRECT_URL=         # Direct connection for migrations
NEXTAUTH_URL=       # Auth callback URL
NEXTAUTH_SECRET=    # Auth JWT secret
GOOGLE_CLIENT_ID=   # OAuth credentials
GOOGLE_CLIENT_SECRET=
```

### Code Conventions
- **Modify only relevant code** - Don't change unrelated files
- **Preserve formatting** - Keep existing code style and structure
- **Check TypeScript errors** - Run `bun run check-errors` before finalizing
- **Complete code output** - Provide full files, not diffs
- **Absolute paths only** - Never use relative paths in responses

🚨 **MANDATORY AI CODING ASSISTANT RULES - NO EXCEPTIONS** 🚨

⚠️ **CRITICAL**: These rules are FREQUENTLY IGNORED - PAY ATTENTION! ⚠️

- **🔧 TOOLS - STRICT REQUIREMENTS**

  - 🛑 **MANDATORY**: Use Bun for package management (NOT npm, NOT yarn)
  - 🛑 **MANDATORY**: Fix TypeScript errors after ALL changes

- **📝 CODE CHANGES - ZERO TOLERANCE POLICY**

  - ✅ **ONLY modify relevant code parts** - Do NOT touch unrelated code
  - ✅ **PRESERVE ALL**: formatting, names, and documentation unless EXPLICITLY requested
  - ✅ **FOLLOW EXISTING PATTERNS**: Refer to existing similar code structure when generating new code (components, API routes, utilities, types, assets)

- **📋 PROJECT MANAGEMENT - ABSOLUTELY REQUIRED**

  - 🔴 **MANDATORY**: Use TODO.md for tasks, progress, and issues. Update regularly - NO EXCEPTIONS
  - 🔴 **SESSION START CHECKLIST**: review TODO.md, run `git status`, check recent commits - DO NOT SKIP

- **⚡ DEVELOPMENT PROCESS - ENFORCE STRICTLY**

  - 🛑 **REQUIRED**: Plan and discuss approaches before coding - NO RUSHING
  - 🛑 **REQUIRED**: Make small, testable changes - NO BIG CHANGES
  - 🛑 **REQUIRED**: Eliminate duplicates proactively
  - 🛑 **REQUIRED**: Log recurring issues in TODO.md - ALWAYS DOCUMENT

- **🔒 CODE QUALITY - NON-NEGOTIABLE STANDARDS**

  - ✅ **MANDATORY**: Handle errors and validate inputs - NO EXCEPTIONS
  - ✅ **MANDATORY**: Follow conventions and secure secrets - NEVER EXPOSE SECRETS
  - ✅ **MANDATORY**: Write clear, type-safe code - NO SHORTCUTS
  - ✅ **PRODUCTION RULE**: Remove ALL debug logs before production - CLEAN CODE ONLY

- **📐 DEVELOPMENT STANDARDS - ABSOLUTE REQUIREMENTS**
  - 🎯 **PRIORITY #1**: Simplicity and readability over clever solutions
  - 🎯 **APPROACH**: Start with minimal working functionality - BUILD INCREMENTALLY
  - 🎯 **CONSISTENCY**: Maintain consistent style throughout - NO STYLE MIXING

🔥 **FINAL WARNING**: If you violate these rules, you are COMPLETELY IGNORING the project standards!
