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
- Maintain `TODO.md` for tasks/progress. Start sessions by reviewing `TODO.md`, running `git status`, and checking recent commits.
- Before writing new code, search the repo for similar/related implementations and reference them. Reuse established patterns (APIs, hooks, components, dialogs) and align naming, props, and behavior. Prefer `rg` for fast code search.
