# Class Series Metadata (Blueprint)

This document describes the new recurring class “blueprint” model, APIs, and UI, enabling series‑level edits, safer bulk generation, and per‑student commuting summaries.

- Data model: `class_series` table (blueprint) + `status` on `class_sessions` + `series_id` preserved in `archives`
- APIs: list/read/update/extend series, student summary
- UI: Student Commuting Summary card, Series Detail Drawer
- Ops: one‑time backfill and archive updates

## Data Model (DB)

- `class_series(series_id PK, branch_id?, teacher_id?, student_id?, subject_id?, class_type_id?, booth_id?, start_date, end_date?, start_time, end_time, duration?, days_of_week JSON[int[]], status, generation_mode, last_generated_through?, conflict_policy?, notes?, created_at, updated_at)`
- `class_sessions.status VARCHAR(20)` — e.g., `CONFIRMED`, `CONFLICTED`
- `archives.series_id` — preserved when sessions are archived

Migrations:
- `20250913035258_class_series_and_session_status`
- `20250913082845_add_series_id_to_archives`

## Branch Scoping & Roles

All endpoints require auth. Non‑admins must include header `X-Selected-Branch: <branch_id>` and are limited to that branch. Admins can access any branch and may filter by `branchId` on list.

Roles:
- Read: ADMIN, STAFF, TEACHER (summary/list/show)
- Mutate: ADMIN, STAFF (update/extend)

## Endpoints

- GET `/api/class-series` — filters: `studentId`, `teacherId`, `status`, `branchId`
- GET `/api/class-series/{seriesId}` — returns one blueprint
- PATCH `/api/class-series/{seriesId}` — update blueprint fields; also propagates to future sessions via existing `/api/class-sessions/series/{seriesId}` PATCH
- POST `/api/class-series/{seriesId}/extend` — generate sessions for next `{ months: number }` months, default 1; on‑demand generation creates `CONFIRMED` sessions
- GET `/api/class-series/summary?studentId=...&days=90` — `{ totalRegular, bySubject[] }` for regular (non‑special) sessions

Request headers:
- `X-Selected-Branch: <branch_id>`
- `Content-Type: application/json` for mutating endpoints

### Example: Extend a series

```bash
curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "X-Selected-Branch: $BRANCH" \
  -d '{"months":1}' \
  http://localhost:3003/api/class-series/$SID/extend
```

Response:
```json
{ "count": 8, "skipped": 1, "createdIds": ["..."], "skippedDetails": [{"date":"2025-01-14","reason":"OVERLAP"}] }
```

## Special Class Types

Series generation excludes class types under the `特別授業` lineage. PATCH/GET are allowed, but extend will reject with 400 if the type is special.

## UI Components

- `StudentCommutingSummary` — `src/components/student/student-commuting-summary.tsx`
  - Props: `studentId: string`, `days?: number`
  - Renders the total commuting classes, weekly cadence (from ACTIVE series), and expected end; shows by‑subject counts.
- `SeriesDetailDrawer` — `src/components/class-series/series-detail-drawer.tsx`
  - Props: `seriesId: string`, `open: boolean`, `onOpenChange(open)`
  - Change teacher/student/booth (PATCH), extend months (POST), view sessions link.

## Hooks

- `useClassSeriesList(filters)`
- `useClassSeries(seriesId)`
- `useUpdateClassSeries(seriesId)`
- `useExtendClassSeries(seriesId)`
- `useClassSeriesSummary(studentId, days?)`

All hooks add `X-Selected-Branch` automatically from `localStorage`.

## Backfill & Archive

- Backfill script: `scripts/backfill-class-series.ts` (supports `--dry-run`, `--limit=N`)
- Archive function now stores `series_id` in `archives` (SQL updated). Manual trigger: `POST /api/archives/trigger`.

## Known Limits / Next Steps

- Advance generation (cron script) planned via `scripts/generate-from-series.ts`.
- Drift detection between blueprint and instances is not implemented in v0.
- Summary counts by subject return subjectIds; map to names client‑side via existing subject data.

## Manual Testing

See `specs/001-class-series-metadata/manual-testing.md` for full step‑by‑step validation using psql + curl + UI.

