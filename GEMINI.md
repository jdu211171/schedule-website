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

### **AI Coding Assistant Guidelines**

- **Tools**

  - Use Bun for package management.
  - Fix TypeScript errors after changes.
  - For local database operations, use local Postgres with psql (not Prisma CLI). Example: `PGPASSWORD=postgres psql -h localhost -U postgres -d schedulewebsite -c "<your_command_here>"`

- **Code Changes**

  - Modify only relevant code parts.
  - Preserve formatting, names, and documentation unless specified.
  
### Feature: Conflicted session edit flow (009-we-should-show)
- Behavior: From シリーズの授業一覧, clicking Edit on a conflicted session opens an embedded Fast Day Calendar dialog for that date. Users can edit lessons in place and close it to continue with other conflicts.
- Day Calendar LessonCard click behavior remains unchanged elsewhere (opens the standard "授業の編集" modal).
  - Output complete code if modified.

- **Spec Kit (Project Management)**

  - Treat `specs/<id>-<slug>/` as the source of truth for scope and progress.
  - At session start: open the active spec’s `plan.md` and `tasks.md`, then run `git status` and review recent commits.
  - Track progress in `tasks.md`; keep `plan.md` in sync; update `spec.md` and contracts when scope changes.
  - Log questions/assumptions in `research.md`.

- **Active Spec by Branch**

  - Convention: branch suffix `NNN-slug` maps to folder `specs/NNN-slug/`.
  - Use `scripts/active-spec.sh` to resolve the active spec:
    - Export: `export ACTIVE_SPEC=$(scripts/active-spec.sh)`
    - Or: `. scripts/active-spec.sh` (prints and exports `ACTIVE_SPEC`)

- **Git Practices**

  - Work on a feature branch tied to the spec slug (e.g., `001-create-taskify` or `feat/001-create-taskify`).
  - Run pre-commit checks.
  - Commit regularly with permission.

- **Development Process**

  - Plan and discuss approaches before coding.
  - Make small, testable changes.
  - Eliminate duplicates.
  - Keep spec artifacts updated alongside code.

- **Code Quality**

  - Handle errors and validate inputs.
  - Follow conventions and secure secrets.
  - Write clear, type-safe code.
  - Remove debug logs before production.

- **Documentation**

  - Document code structure (components, API routes, utilities, types, assets).

- **Development Standards**
  - Prioritize simplicity and readability.
  - Start with minimal working functionality.
  - Maintain consistent style.

## Feature: Conflicting Class Session Resolution (009-we-should-show)

- **Goal**: When a user clicks to edit a conflicting class session, they will be navigated to the day calendar view for that day to see the conflict in context and resolve it.
- **Key Changes**:
    - Modify the click handler for the edit button on class sessions in the day calendar.
    - Implement logic to differentiate between conflicting and non-conflicting sessions.
    - Navigate to the day calendar view when a conflicting session is clicked.
    - Ensure the standard "Edit Class" modal is shown for non-conflicting sessions.
