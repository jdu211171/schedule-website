# Repository Guidelines

## Project Structure & Module Organization
- `src/app/`: Next.js App Router (pages, API routes, layout, styles).
- `src/components/`: UI components (feature folders + `ui/`).
- `src/lib/`: utilities, Prisma client, LINE/notification helpers.
- `src/hooks/`, `src/services/`, `src/schemas/`, `src/types/`: reusable logic, data access, Zod schemas, and types.
- `prisma/`: `schema.prisma`, migrations, and `seed.ts`.
- `scripts/`: operational TS scripts (data checks, notifications, populators).
- `public/`: static assets. `docs/`: integration notes.

## Build, Test, and Development Commands
- `bun dev`: Run locally with Next.js (Turbopack).
- `bun build`: Production build. `bun start`: Serve the build.
- `bun lint`: ESLint (Next.js rules). `bun watch`: TS typecheck in watch mode.
- Prisma: `bun postinstall` runs `prisma generate`.
  - Migrate: `npx prisma migrate dev` | Studio: `npx prisma studio`.
- Optional with Bun: `bun run dev`, `bun run lint` (a `bun.lock` exists). Prefer Bun consistently.

## Coding Style & Naming Conventions
- Indentation: 2 spaces (`.editorconfig`). TypeScript strict mode.
- ESLint: extends `next/core-web-vitals`, `next/typescript` with rules:
  - `object-curly-spacing: "always"`, warn on `@typescript-eslint/no-unused-vars` and `no-explicit-any`.
- Naming: React components in PascalCase (`Navbar.tsx`); folders and utilities kebab-case (`src/lib/conflict-resolution-helper.ts`).
- Styling: Tailwind CSS v4 via PostCSS (`postcss.config.mjs`). Use utility-first classes.
- Imports: use `@/*` path alias for `src/*`.

## Testing Guidelines
- No formal test runner configured. If adding tests, prefer Vitest + React Testing Library.
- Location: colocate as `*.test.ts(x)` near source or `__tests__/`.
- Aim for critical path coverage (scheduling logic, Prisma queries, API handlers).

## Commit & Pull Request Guidelines
- Commits: imperative mood, scoped and focused. Example: `feat(schedule): add teacher availability grid`. Link issues (`Fixes #123`).
- PRs: clear description, screenshots for UI, steps to verify, and any schema changes/migrations noted.
- Keep PRs small and rebased on `main`. Run `bun lint` and a local typecheck (`bun watch` or `bun run check-errors`) before pushing.

## Security & Configuration
- Copy `.env.example` to `.env` and set `DATABASE_URL` and `DIRECT_URL`. Never commit secrets.
- After schema changes: `npx prisma migrate dev && bun prisma generate`.
- Review `vercel.json` for deployment behavior when applicable.

🚨 **MANDATORY AI CODING ASSISTANT RULES - NO EXCEPTIONS** 🚨

⚠️ **CRITICAL**: These rules are FREQUENTLY IGNORED - PAY ATTENTION! ⚠️

- **🔧 TOOLS - STRICT REQUIREMENTS**

  - 🛑 **MANDATORY**: Use Bun for package management (NOT npm, NOT yarn)
  - 🛑 **MANDATORY**: Fix TypeScript errors after ALL changes
  - 🛑 **MANDATORY**: Use local Postgres via psql instead of Prisma for direct database commands. Example: PGPASSWORD=postgres psql -h localhost -U postgres -d schedulewebsite -c "<your_command_here>"

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
