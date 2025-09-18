# Class Series Metadata (Blueprint) — Practical Plan (2025-09-10)

This document outlines a pragmatic approach to introduce explicit “series metadata” (a blueprint) for regular commuting classes, leveraging what already exists in the codebase. It focuses on low-risk changes that unlock per‑student commuting summaries, easier series‑level edits, and safer bulk generation.

## Current State (as of 2025-09-10)
- Persistence
  - `class_sessions` holds individual sessions. Regular sessions are implicitly linked via `series_id` (nullable). No first‑class series entity exists.
  - Archiving: old sessions are copied to `archives` then deleted from `class_sessions`. The `archives` table currently stores names and times but not `series_id`.
- API and behavior
  - Creation: `/api/class-sessions` supports single and recurring creation. Recurring creation generates one `series_id` for the batch and inserts all instances in a date range, with conflict detection (vacations, availability, overlaps).
  - Series ops: `/api/class-sessions/series/[seriesId]` supports GET, PATCH (bulk update future instances), and DELETE (remove future instances from a pivot).
  - “Regular vs special”: logic treats class type with lineage under `特別授業` as “special”. Everything else is considered regular/commuting.

Implications
- There is no single source of truth for series metadata (start/end, cadence, policy, assignments). Series‑level updates operate directly on future instances.
- Archiving breaks linkage needed for historical series stats (no `series_id` in `archives`).

## Goals
- Provide at-a-glance commuting stats:
  - Per student: total commuting classes (regular only), and counts per subject.
  - “How often” (weekly cadence) and expected end.
- Centralize edits for a series (replace teacher/student/subject/room; extend duration) and keep future instances in sync.
- Safer, faster creation: generate 1–2 months ahead with conflicts pre‑flagged for staff review.

### Design Philosophy & Purpose

The introduction of a `class_series` blueprint is intended to formalize the concept of a recurring class, which is currently only implicitly defined. This change serves several key purposes that address existing operational patterns and future needs:

- **Durability over Deletion**: Series blueprints are designed to be long-lasting. They will rarely be deleted. For instance, if a teacher leaves, the blueprint is not deleted; instead, it is updated with a new teacher. This change can then be propagated to all future (or all existing) class sessions associated with that series, providing a clear and simple mechanism for managing change.

- **Adapting to Current Workflows**: At present, staff create recurring sessions in one of two ways: either generating a large batch covering many months or creating smaller batches more frequently as the previous ones conclude. The blueprint model supports both patterns while adding a layer of predictability and control. By maintaining a blueprint, session generation becomes a deliberate, traceable action rather than an ad-hoc task, making it easier to manage schedules proactively.

## Data Model (additive, minimal-risk)

### 1) New table: `class_series` (the blueprint)
Backed by the existing `series_id` to avoid breaking links.

Prisma (illustrative — naming and maps align with repo style):

```prisma
model ClassSeries {
  seriesId              String   @id @map("series_id")
  // Default assignments
  branchId              String?  @map("branch_id")
  teacherId             String?  @map("teacher_id")
  studentId             String?  @map("student_id")
  subjectId             String?  @map("subject_id")
  classTypeId           String?  @map("class_type_id")
  boothId               String?  @map("booth_id")
  // Cadence & scope
  startDate             DateTime @map("start_date") @db.Date
  endDate               DateTime? @map("end_date") @db.Date
  startTime             DateTime @map("start_time") @db.Time(6)
  endTime               DateTime @map("end_time") @db.Time(6)
  duration              Int?     // minutes
  daysOfWeek            Json     @map("days_of_week") // [1,3,5] etc. Single series may cover multiple DOW
  // Lifecycle & automation
  status                String   @default("ACTIVE") // ACTIVE | PAUSED | ENDED | DISABLED
  // generationMode removed (2025-09-18): system always uses ADVANCE behavior
  lastGeneratedThrough  DateTime? @map("last_generated_through") @db.Date
  conflictPolicy        Json?    @map("conflict_policy") // e.g., { skipConflicts: true }
  notes                 String?  @db.VarChar(255)
  createdAt             DateTime @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt             DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamp(6)

  @@index([studentId])
  @@index([teacherId])
  @@index([branchId])
  @@index([classTypeId])
  @@index([status])
  @@map("class_series")
}
```

Notes
- Times are stored similarly to `class_sessions` for consistency and simpler comparisons.
- `daysOfWeek` as JSON avoids an extra join in v0. If we need per‑day time variants later, a child table (e.g., `class_series_patterns`) can be introduced without breaking the base model.
- A “single series across multiple DOW” matches today’s recurring create flow (one `series_id` per batch with multiple DOW values).

### 2) Extend `class_sessions`

#### `class_sessions`
- Add a `status` column (e.g., `VARCHAR(20)`). This will be used to flag sessions that require manual attention.
  - `'CONFIRMED'`: The default state for any session created successfully, whether manually or automatically.
  - `'CONFLICTED'`: For a session that was intended to be created by the advance generation script but could not be due to an availability or overlap issue. This serves as a direct flag for staff to review and resolve.

## Queries and Summaries (regular only)

Regular definition (v0): sessions whose class type is NOT under `特別授業` in the class type hierarchy. The code already has an `isSpecialClassType` helper; server‑side SQL can achieve the same by walking `class_types.parent_id` up to the root and excluding `特別授業`.

Common summaries
- Total commuting classes per student (future window):
  - Count of `class_sessions` with `student_id = :id AND is_cancelled = false AND series_id IS NOT NULL AND class_type` not under `特別授業`, within a date window (e.g., [today, +90d]).
- Per subject:
  - Same filter, grouped by `subject_id` (NULL → “未設定”).
- Cadence and expected end:
  - From `class_series`: `days_of_week.length` ≈ weekly frequency, `end_date` for expected end.

Proof‑of‑concept (psql; adjust window):

```sql
-- Total regular (commuting) sessions per student for the next 90 days
WITH special_root AS (
  SELECT class_type_id FROM class_types WHERE name = '特別授業' LIMIT 1
),
special_descendants AS (
  -- Simple recursive set; fallback is to compare by walking parent_id if needed
  SELECT ct.class_type_id
  FROM class_types ct
  JOIN special_root r ON (ct.class_type_id = r.class_type_id OR ct.parent_id = r.class_type_id)
)
SELECT cs.student_id, COUNT(*) AS total
FROM class_sessions cs
LEFT JOIN special_descendants sd ON cs.class_type_id = sd.class_type_id
WHERE cs.student_id = $1
  AND cs.is_cancelled = false
  AND cs.series_id IS NOT NULL
  AND sd.class_type_id IS NULL
  AND cs.date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '90 days')
GROUP BY cs.student_id;

-- Per subject for the same window
SELECT cs.student_id, cs.subject_id, COUNT(*) AS cnt
FROM class_sessions cs
LEFT JOIN special_descendants sd ON cs.class_type_id = sd.class_type_id
WHERE cs.student_id = $1
  AND cs.is_cancelled = false
  AND cs.series_id IS NOT NULL
  AND sd.class_type_id IS NULL
  AND cs.date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '90 days')
GROUP BY cs.student_id, cs.subject_id
ORDER BY cnt DESC;
```

Repo‑policy runbook examples:

```bash
PGPASSWORD=postgres psql -h localhost -U postgres -d schedulewebsite -c "<SQL above>"
```

## API Additions (keep existing endpoints intact)

New endpoints (v0)
- `GET /api/class-series` — list blueprints (filters: `studentId`, `teacherId`, `status`, `branchId`).
- `GET /api/class-series/[seriesId]` — get a blueprint + derived stats (occurrences/week from `days_of_week`, remaining occurrences, next N dates).
- `PATCH /api/class-series/[seriesId]` — update blueprint (teacher/student/subject/booth/times/dates). On success, also call the existing `/api/class-sessions/series/[seriesId]` PATCH to propagate to future instances.
- `POST /api/class-series/[seriesId]/extend` — Generates new class sessions for a series. This is the primary mechanism for `ON_DEMAND` generation and supports flexible scheduling. The request body can specify either:
    - `{ "months": <number> }`: To generate sessions for the next N months from the last generated date. N is set to 1 by default.
- `GET /api/class-series/summary?studentId=...` — returns `{ totalRegular, bySubject[] }` using the SQL above (window can be param’d; default next 90 days).

Notes
- RBAC mirrors current series PATCH/DELETE rules (ADMIN/STAFF for mutating).
- Keep `/api/class-sessions` as‑is; v0 only orchestrates it from the new endpoints.

## Generation Strategy (Always-Advance)

As of 2025-09-18, the per-series generation mode is removed. The system always behaves as ADVANCE:

- A scheduled endpoint (`/api/class-series/advance/cron`) periodically ensures upcoming sessions are generated ahead based on the configured lead window (`generationMonths`).
- For each target date, existing availability/overlap checks run:
  - No conflicts: create `'CONFIRMED'` session.
  - Conflicts: create `'CONFLICTED'` session for staff resolution.
- `last_generated_through` on the series is updated accordingly.
- Staff can still manually extend via `POST /api/class-series/[seriesId]/extend` when needed (e.g., immediate fill or controlled preview/resolution). This coexists with the automatic advance generation.

End-of-life behavior
- When a series’ `endDate` is reached (or already in the past), the backend deletes the `class_series` blueprint automatically and leaves any previously generated `class_sessions` intact. No automatic status change to ENDED occurs any more.

## Backfill Plan (one‑time)

1) Create `class_series`, extend `archives` with `series_id`, and add the `status` column to `class_sessions`.
2) Backfill blueprints from existing sessions:
   - Group by `series_id IS NOT NULL`.
   - Derive `start_date = MIN(date)`, `end_date = MAX(date)`, `days_of_week = ARRAY_AGG(DISTINCT EXTRACT(DOW FROM date))`, `start_time/end_time/duration` from first or majority; store anomalies in `notes`.
   - Choose default assignments (teacher/student/subject/booth/branch/class_type) by majority; if ties, prefer the latest.
3) Validate a sample of series and spot‑fix anomalies.
4) Update the archive function to also copy `series_id` (and optional IDs) into `archives` going forward.

Operational examples (psql; sketch)

```sql
-- Example: derive days_of_week per series
SELECT series_id,
       ARRAY_AGG(DISTINCT EXTRACT(DOW FROM date)::int ORDER BY 1) AS dows,
       MIN(date) AS start_date,
       MAX(date) AS end_date
FROM class_sessions
WHERE series_id IS NOT NULL
GROUP BY series_id
LIMIT 20;
```

## UI Surfaces (incremental)

- Student page: “通塾まとめ (Commuting Summary)” card showing:
  - Total regular sessions (next 90 days), counts per subject, weekly cadence (from `days_of_week`), expected end date.
- Teacher page: same summary, filtered by teacher.
- Series detail drawer (from a session chip): show blueprint fields and actions: replace teacher/student/room, extend series, and navigate to `/api/class-sessions/series/[seriesId]` view.

## Indexing and Performance

- `class_series`: indexes on `student_id`, `teacher_id`, `status`, `branch_id`, `class_type_id`.
- `class_sessions`: consider composite indexes for summaries: `(student_id, is_cancelled, class_type_id, date)` and `(student_id, subject_id, is_cancelled)`.
- If summaries become hot paths, consider a materialized view for “next 90 days” refreshed nightly.

## Edge Cases and Policies

- We only create `class_series` for regular/commuting classes. Special classes (`特別授業` lineage) may still use recurring creation if needed, but we keep their `series_id` out of `class_series` in v0 to avoid conflating policies.
- Instance drift: editing a single instance does not change the blueprint; series PATCH applies from pivot forward (matches current behavior). Add a lightweight “drift detector” later to flag when many instances deviate from the blueprint.
- Timezone: storage remains UTC; `days_of_week`/times assume Asia/Tokyo presentation. If DST ever matters, add a `timezone` field and compute in that TZ.

## Rollout Phases

1) Schema + backfill + minimal summary API
2) Series PATCH orchestration and extend endpoint
3) Generator script + cron
4) UI summaries + basic series drawer

This sequence delivers immediate value (summaries and centralized metadata) while minimizing risk by reusing existing create/patch logic for instances.
