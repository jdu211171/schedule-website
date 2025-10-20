# Repository Guidelines

## Project Structure & Module Organization

- `src/app/`: Next.js App Router (routes, layout, styles).
- `src/components/`: UI components (feature folders + `ui/`).
- `src/lib/`: utilities, Prisma client, LINE helpers, notifications.
- `src/hooks/`, `src/services/`, `src/schemas/`, `src/types/`: reusable logic, data, Zod schemas, and types.
- `prisma/`: `schema.prisma`, migrations, `seed.ts`. `scripts/`: operational TS scripts.
- `public/`: static assets. `docs/`: integration notes. Tests colocate as `*.test.ts(x)` or `__tests__/`.

## Build, Test, and Development Commands

- `bun dev`: run locally with Turbopack.
- `bun build` / `bun start`: build and serve production.
- `bun lint`: ESLint; `bun watch`: typecheck in watch mode.
- Prisma: `bun postinstall` runs `prisma generate`. Migrate via `npx prisma migrate dev`; explore with `npx prisma studio`.
- Direct DB (ops): use Postgres psql, e.g. `PGPASSWORD=postgres psql -h localhost -U postgres -d schedulewebsite -c "SELECT 1;"`.

## Coding Style & Naming Conventions

- Indentation: 2 spaces; TS strict mode.
- ESLint: extends `next/core-web-vitals`, `next/typescript` (rules: `object-curly-spacing: "always"`; warns on unused vars and `any`).
- Naming: components PascalCase (`Navbar.tsx`); folders/utilities kebab-case (`src/lib/conflict-resolution-helper.ts`).
- Styling: Tailwind CSS v4 (PostCSS). Use utility-first classes. Use `@/*` alias for `src/*` imports.

## Testing Guidelines

- Preferred: Vitest + React Testing Library when adding tests.
- Place tests near source as `*.test.ts(x)` or under `__tests__/`.
- Focus on critical paths: scheduling logic, Prisma queries, API handlers. Run with `bun test` if configured; otherwise follow tool docs.

## Commit & Pull Request Guidelines

- Commits: imperative, scoped, minimal. Example: `feat(schedule): add teacher availability grid`. Link issues (`Fixes #123`).
- PRs: clear description, screenshots for UI, verify steps, and note schema/migration changes.
- Keep PRs small and rebased on `main`. Before pushing: `bun lint` and local typecheck (`bun watch` or `bun run check-errors`).

## Security & Configuration

- Copy `.env.example` to `.env`; set `DATABASE_URL` and `DIRECT_URL`. Do not commit secrets.
- After schema changes: `npx prisma migrate dev && bun prisma generate`. Review `vercel.json` for deployment.

## Agent & Ops Notes

- Use Bun only for packages; fix TS errors after changes.
- Use Spec Kit for planning and tracking. Start sessions by reviewing the active spec under `specs/<id>-<slug>/` (especially `plan.md` and `tasks.md`), then run `git status` and check recent commits.
- Before writing new code, search the repo for similar/related implementations and reference them. Reuse established patterns (APIs, hooks, components, dialogs) and align naming, props, and behavior. Prefer `rg` for fast code search.

### Local Database Surf (psql)

- When you need to run direct DB reads/writes for ops or validation, use local Postgres via psql (not Prisma) per project policy:
  - `PGPASSWORD=postgres psql -h localhost -U postgres -d schedulewebsite -c "<your_command_here>"`
- Examples:
  - `PGPASSWORD=postgres psql -h localhost -U postgres -d schedulewebsite -c "SELECT 1;"`
  - `PGPASSWORD=postgres psql -h localhost -U postgres -d schedulewebsite -c "SELECT COUNT(*) FROM students;"`
- Be careful with destructive commands; prefer explicit transactions for any changes.

🚨 **MANDATORY AI CODING ASSISTANT RULES - NO EXCEPTIONS** 🚨

⚠️ **CRITICAL**: These rules are FREQUENTLY IGNORED - PAY ATTENTION! ⚠️

- **🔧 TOOLS - STRICT REQUIREMENTS**
  - 🛑 **MANDATORY**: Use Bun for package management (NOT npm, NOT yarn)
  - 🛑 **MANDATORY**: Fix TypeScript errors after ALL changes
  - 🛑 **MANDATORY**: Use the local PostgreSQL database via psql (with credentials) instead of Prisma for local DB operations, e.g.: `PGPASSWORD=postgres psql -h localhost -U postgres -d schedulewebsite -c "<your_command_here>"`

- **📝 CODE CHANGES - ZERO TOLERANCE POLICY**
  - ✅ **ONLY modify relevant code parts** - Do NOT touch unrelated code
  - ✅ **PRESERVE ALL**: formatting, names, and documentation unless EXPLICITLY requested
  - ✅ **FOLLOW EXISTING PATTERNS**: Refer to existing similar code structure when generating new code (components, API routes, utilities, types, assets)

- **📋 PROJECT MANAGEMENT - ABSOLUTELY REQUIRED**
  - 🔴 **MANDATORY**: Use Spec Kit specs for tasks, progress, and issues. Update `specs/<id>-<slug>/plan.md` and `tasks.md` regularly — NO EXCEPTIONS
  - 🔴 **SESSION START CHECKLIST**: review the active spec in `specs/`, run `git status`, check recent commits — DO NOT SKIP

- **⚡ DEVELOPMENT PROCESS - ENFORCE STRICTLY**
  - 🛑 **REQUIRED**: Plan and discuss approaches before coding - NO RUSHING
  - 🛑 **REQUIRED**: Make small, testable changes - NO BIG CHANGES
  - 🛑 **REQUIRED**: Eliminate duplicates proactively
  - 🛑 **REQUIRED**: Log questions, assumptions, and research in the spec: update `specs/<id>-<slug>/research.md` (and assumptions sections) — ALWAYS DOCUMENT

## Spec-Driven Development (Spec Kit)

- Specs live in `specs/<id>-<slug>/` and are the single source of truth for scope and progress.
- Key files per spec:
  - `spec.md` — problem statement, goals, acceptance criteria
  - `plan.md` — implementation plan and milestones
  - `tasks.md` — actionable task list for day‑to‑day tracking
  - `quickstart.md` — how to run or demo the feature
  - `research.md` — notes, questions, and decisions
  - `data-model.md` — entities, relationships, migrations impact
  - `contracts/` — API contracts (OpenAPI/JSON/YAML) + related tests
  - `integration-tests.ts` / `contract-tests.ts` — spec‑driven tests
- Session flow:
  - Start by opening the active spec folder and reading `plan.md` and `tasks.md`.
  - Update tasks as you work; keep `plan.md` synced with the actual approach.
  - When scope or acceptance criteria change, update `spec.md` and contracts.
  - Prefer adding or updating tests in the spec folder as you implement.
- Initializing Spec Kit (if missing):
  - Requires Python 3.11+ and `uv` (https://docs.astral.sh/uv/). Then run:
    - `uvx --from git+https://github.com/github/spec-kit.git specify init --here --ai claude --ignore-agent-tools`
  - This scaffolds `CLAUDE.md`, `GEMINI.md`, and `specs/` templates. If `specs/` already exists, skip init.

-### Active Spec Selection (by Branch)

- Convention: branches and spec folders share the same slug, e.g., `001-create-taskify` → `specs/001-create-taskify/`.
- If working on a feature branch, pick the spec whose folder name matches the branch suffix `NNN-slug`.
- Helper script: `scripts/active-spec.sh`
  - Export for current shell: `export ACTIVE_SPEC=$(scripts/active-spec.sh)`
  - Or source it: `. scripts/active-spec.sh` (prints and exports `ACTIVE_SPEC`)
- Day-to-day:
  - Edit `$ACTIVE_SPEC/tasks.md` as you progress.
  - Keep `$ACTIVE_SPEC/plan.md` consistent with implementation.
  - Update `$ACTIVE_SPEC/spec.md` and contracts if scope changes.

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
