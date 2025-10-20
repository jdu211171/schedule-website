# Implementation Plan: Global Class Type Filter Visibility (Admin-Controlled)

**Branch**: `018-in-commit-a9a1a7d10907652c0c52a39f2bc00fe99491b851` | **Date**: 2025-10-15 | **Spec**: /Users/muhammadnurislomtukhtamishhoji-zoda/Development/schedule-website/specs/018-in-commit-a9a1a7d10907652c0c52a39f2bc00fe99491b851/spec.md
**Input**: Feature specification from the path above

## Summary

Shift class type filter visibility from per-user preferences to a single global flag controlled by Admins in マスターデータ管理 > 授業タイプ. Add a per-row toggle to the 授業タイプ table that sets `visibleInFilters` (default true). Remove the 表示管理 button and drop the legacy per-user visibility schema. All roles (students, teachers, staff) consume the same filter options; this setting affects filters-only, not calendar/content visibility. Include the field in class type CSV import/export.

## Technical Context

**Language/Version**: TypeScript (strict)  
**Primary Dependencies**: Next.js App Router, React, Tailwind CSS v4, Zod, Prisma (DB client), Bun  
**Storage**: PostgreSQL (Prisma migrations; local ops via psql)  
**Testing**: Vitest + React Testing Library (preferred)  
**Target Platform**: Web (Next.js)  
**Project Type**: Web application (Next.js single app)  
**Performance Goals**: N/A (filters-only, UI toggle; negligible load)  
**Constraints**: Follow repo ESLint/TS rules; use Bun; apply DB changes via Prisma migrations; local DB via psql as needed  
**Scale/Scope**: Existing app scale; no new high-throughput endpoints  
**User-provided implementation details**: None provided in this command

## Constitution Check

No explicit constitutional constraints defined; proceed with testable plan, contracts, and research artifacts. Ensure observability and versioning align with repo practices.

## Project Structure

### Documentation (this feature)

```
specs/018-in-commit-a9a1a7d10907652c0c52a39f2bc00fe99491b851/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (API/UI contracts)
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```
src/
├── app/                         # Next.js App Router
├── components/                  # UI components (incl. ui/)
├── lib/                         # utilities, Prisma client, helpers
├── services/                    # data/services layer
├── schemas/                     # Zod schemas
├── hooks/                       # reusable hooks
└── types/                       # shared types

prisma/
├── schema.prisma                # add visibleInFilters
└── migrations/                  # migration to add field & drop per-user schema

public/                          # static assets
```

**Structure Decision**: Single Next.js app; update admin マスターデータ管理 > 授業タイプ UI, Prisma schema/migration, and filter source queries. Reuse existing patterns for masterdata tables and toggles.

## Progress Tracking

| Phase   | Artifact(s)                              | Status    |
| ------- | ---------------------------------------- | --------- |
| Phase 0 | research.md                              | Completed |
| Phase 1 | data-model.md, contracts/, quickstart.md | Completed |
| Phase 2 | tasks.md                                 | Completed |

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| N/A       | —          | —                                    |
