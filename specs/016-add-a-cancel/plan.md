# Implementation Plan: Cancel Class Sessions From This Point (キャンセル)

**Branch**: `016-add-a-cancel` | **Date**: 2025-10-11 | **Spec**: /home/user/Development/schedule-website/specs/016-add-a-cancel/spec.md
**Input**: Feature specification from `/specs/016-add-a-cancel/spec.md`

## Summary

Add a キャンセル action to 授業の編集 (LessonDialog) alongside 削除 with scope options mirrored from delete: 「この授業のみキャンセル」 and 「この回以降をキャンセル」. For 「この回以降をキャンセル」, cancel the selected and all future occurrences, then PATCH ClassSeries to set `endDate = pivot` (inclusive), clamp `lastGeneratedThrough ≥ pivot`, and set status to `PAUSED` so no new sessions are generated unless explicitly resumed. Reuse existing cancellation and series update endpoints and preserve UI patterns used for 削除.

## Technical Context

**Language/Version**: TypeScript (strict), Next.js App Router  
**Primary Dependencies**: React, @tanstack/react-query, Prisma, Zod, sonner  
**Storage**: PostgreSQL (Prisma). Ops via psql for local DB administration  
**Testing**: Vitest + React Testing Library (preferred)  
**Target Platform**: Web (Next.js)  
**Project Type**: Web monorepo (single app in `src/`)  
**Performance Goals**: Cancel “from this point” completes under 30s for several hundred future sessions  
**Constraints**: Reuse existing endpoints; align copy/UX with 削除; idempotent operations; permissions identical to 削除  
**Scale/Scope**: Series commonly include dozens to hundreds of future sessions

Unknowns converted to research tasks (resolved in research.md):

- Compute “from this point” boundary from the selected occurrence date in LessonDialog.
- Confirm idempotency and neighbor recomputation behavior for cancel API.
- Confirm PAUSED series are excluded from advance generation.

## Constitution Check

Gates derived from repository standards and mandatory rules:

- Use Bun for packages (no npm/yarn) — PASS (no new packages planned)
- Fix TypeScript errors after changes — PASS (plan includes strict TS adherence)
- Use local PostgreSQL via psql for ops — PASS (no direct DB ops required for planning; validate via API/UI)
- Update Spec Kit docs as we work — PASS (spec and plan updated; research/design artifacts generated)
- Follow existing patterns; modify only relevant code — PASS (targeted changes in LessonDialog + reuse hooks/APIs)
- Input validation and error handling — PASS (reuse validated endpoints; UI messages aligned with current patterns)

Re-check post-design: PASS (no new violations introduced).

## Project Structure

### Documentation (this feature)

```
specs/016-add-a-cancel/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── contracts/           # Phase 1 output (OpenAPI YAML)
```

### Source Code (repository root)

```
src/
├── components/
│  ├── admin-schedule/DayCalendar/lesson-dialog.tsx        # 授業の編集 modal: add キャンセル w/ scope options
│  └── class-series/series-detail-dialog.tsx                # Existing cancel-all reference (no change)
├── hooks/
│  ├── useClassSessionMutation.ts                           # useClassSessionCancel (reuse)
│  └── use-class-series.ts                                  # useUpdateClassSeries (reuse)
└── app/api/
   ├── class-sessions/cancel/route.ts                       # Existing POST cancel (seriesId/fromDate or classIds)
   └── class-series/[seriesId]/route.ts                     # Existing PATCH to set status=PAUSED
```

**Structure Decision**: Single web app. Only targeted UI changes in LessonDialog; leverage existing hooks and API routes.

## Complexity Tracking

No constitution violations identified; no additional complexity to justify.
