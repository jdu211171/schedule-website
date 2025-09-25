# Normalize Class Session Statuses (Conflict Alignment)

This runbook explains why some sessions look conflicted in the Day Calendar but don’t appear as conflicts in the Series table, and how to safely normalize `class_sessions.status` in local and production databases without deleting or modifying any other data.

## Background

- The Day Calendar paints a session as a “conflict” if either:
  - `status = 'CONFLICTED'`, or
  - there is a hard overlap (same date and overlapping times) with the same teacher, student, or booth (visual stripe), even if `status` is blank.
- The Series table counts conflicts strictly by `status = 'CONFLICTED'` per series.
- A prior import/generation batch created many sessions with blank `status`. These render as conflicts in the Day Calendar (due to overlap) but don’t count in the Series table. Normalizing statuses resolves the mismatch.

## Safety Principles

- Only update `class_sessions.status`. No deletes. No inserts. No schema changes.
- Perform a dry‑run count first, then update within a single transaction.
- If needed, add scope (date range/branch) to limit the blast radius.
- Production passwords with special characters (e.g., `@`) should be passed via libpq env vars, not raw URIs, to avoid encoding issues.

## Prerequisites

- psql client installed and reachable.
- Database credentials for the target (local or production).
- For local, consider mirroring production first for validation:
  - `scripts/mirror-prod-to-local.sh` (see repo) can help keep local in sync.

## What This Procedure Does

1) Detects all current hard overlaps (same date, overlapping time range) on any of: teacher, student, or booth (excluding cancelled), and marks them `CONFLICTED`.
2) Marks all remaining active sessions with blank status as `CONFIRMED`.

Result: Day Calendar visuals and Series table counts align, without removing any session.

---

## Local: Dry‑Run And Apply

Use the project’s local policy for psql (example):

```
PGPASSWORD=postgres psql -h localhost -U postgres -d schedulewebsite -c "SELECT 1;"
```

1) Dry‑run (counts only)

```
PGPASSWORD=postgres psql -h localhost -U postgres -d schedulewebsite -v ON_ERROR_STOP=1 -c "
WITH conflicts AS (
  SELECT DISTINCT cs1.class_id
  FROM class_sessions cs1
  JOIN class_sessions cs2
    ON cs1.date = cs2.date
   AND cs1.class_id <> cs2.class_id
   AND cs1.is_cancelled = false
   AND cs2.is_cancelled = false
   AND cs1.start_time < cs2.end_time
   AND cs1.end_time > cs2.start_time
   AND (
     (cs1.booth_id IS NOT NULL AND cs1.booth_id = cs2.booth_id) OR
     (cs1.teacher_id IS NOT NULL AND cs1.teacher_id = cs2.teacher_id) OR
     (cs1.student_id IS NOT NULL AND cs1.student_id = cs2.student_id)
   )
)
SELECT
  (SELECT count(*) FROM conflicts) AS total_conflicting_now,
  (SELECT count(*) FROM class_sessions WHERE status = 'CONFLICTED') AS currently_marked_conflicted,
  (SELECT count(*) FROM class_sessions WHERE (status IS NULL OR status='') AND is_cancelled = false) AS blanks_active;
"
```

2) Apply (single transaction, non‑destructive)

```
PGPASSWORD=postgres psql -h localhost -U postgres -d schedulewebsite -v ON_ERROR_STOP=1 -c "
BEGIN;
WITH conflicts AS (
  SELECT DISTINCT cs1.class_id
  FROM class_sessions cs1
  JOIN class_sessions cs2
    ON cs1.date = cs2.date
   AND cs1.class_id <> cs2.class_id
   AND cs1.is_cancelled = false
   AND cs2.is_cancelled = false
   AND cs1.start_time < cs2.end_time
   AND cs1.end_time > cs2.start_time
   AND (
     (cs1.booth_id IS NOT NULL AND cs1.booth_id = cs2.booth_id) OR
     (cs1.teacher_id IS NOT NULL AND cs1.teacher_id = cs2.teacher_id) OR
     (cs1.student_id IS NOT NULL AND cs1.student_id = cs2.student_id)
   )
)
UPDATE class_sessions cs
   SET status = 'CONFLICTED'
 WHERE cs.class_id IN (SELECT class_id FROM conflicts)
   AND cs.status IS DISTINCT FROM 'CONFLICTED';

WITH conflicts AS (
  SELECT DISTINCT cs1.class_id
  FROM class_sessions cs1
  JOIN class_sessions cs2
    ON cs1.date = cs2.date
   AND cs1.class_id <> cs2.class_id
   AND cs1.is_cancelled = false
   AND cs2.is_cancelled = false
   AND cs1.start_time < cs2.end_time
   AND cs1.end_time > cs2.start_time
   AND (
     (cs1.booth_id IS NOT NULL AND cs1.booth_id = cs2.booth_id) OR
     (cs1.teacher_id IS NOT NULL AND cs1.teacher_id = cs2.teacher_id) OR
     (cs1.student_id IS NOT NULL AND cs1.student_id = cs2.student_id)
   )
)
UPDATE class_sessions cs
   SET status = 'CONFIRMED'
 WHERE cs.is_cancelled = false
   AND (cs.status IS NULL OR cs.status = '')
   AND cs.class_id NOT IN (SELECT class_id FROM conflicts);
COMMIT;
"
```

3) Verify

```
PGPASSWORD=postgres psql -h localhost -U postgres -d schedulewebsite -c "SELECT count(*) FROM class_sessions WHERE status='CONFLICTED';"
PGPASSWORD=postgres psql -h localhost -U postgres -d schedulewebsite -c "SELECT count(*) FROM class_sessions WHERE (status IS NULL OR status='') AND is_cancelled=false;"
```

Optional spot‑check a known day (e.g., 2025‑09‑22):

```
PGPASSWORD=postgres psql -h localhost -U postgres -d schedulewebsite -c "
SELECT date, class_id, to_char(start_time,'HH24:MI') s, to_char(end_time,'HH24:MI') e, status, is_cancelled
FROM class_sessions
WHERE date='2025-09-22'
ORDER BY start_time, class_id;"
```

---

## Production: Safe Execution

Prefer libpq environment variables to avoid URI password encoding issues:

```
export PGHOST=aws-0-ap-northeast-1.pooler.supabase.com
export PGPORT=5432
export PGDATABASE=postgres
export PGUSER=postgres.icrttrjpxuabpyfmoxve
export PGPASSWORD='<your exact password>'
export PGSSLMODE=require
```

1) Connectivity check

```
psql -v ON_ERROR_STOP=1 -c "SELECT 1;"
```

2) Dry‑run (counts only)

```
psql -v ON_ERROR_STOP=1 -c "
WITH conflicts AS (
  SELECT DISTINCT cs1.class_id
  FROM class_sessions cs1
  JOIN class_sessions cs2
    ON cs1.date = cs2.date
   AND cs1.class_id <> cs2.class_id
   AND cs1.is_cancelled = false
   AND cs2.is_cancelled = false
   AND cs1.start_time < cs2.end_time
   AND cs1.end_time > cs2.start_time
   AND (
     (cs1.booth_id IS NOT NULL AND cs1.booth_id = cs2.booth_id) OR
     (cs1.teacher_id IS NOT NULL AND cs1.teacher_id = cs2.teacher_id) OR
     (cs1.student_id IS NOT NULL AND cs1.student_id = cs2.student_id)
   )
)
SELECT
  (SELECT count(*) FROM conflicts) AS total_conflicting_now,
  (SELECT count(*) FROM class_sessions WHERE status = 'CONFLICTED') AS currently_marked_conflicted,
  (SELECT count(*) FROM class_sessions WHERE (status IS NULL OR status='') AND is_cancelled = false) AS blanks_active;
"
```

3) Apply (single transaction, non‑destructive)

```
psql -v ON_ERROR_STOP=1 -c "
BEGIN;
WITH conflicts AS (
  SELECT DISTINCT cs1.class_id
  FROM class_sessions cs1
  JOIN class_sessions cs2
    ON cs1.date = cs2.date
   AND cs1.class_id <> cs2.class_id
   AND cs1.is_cancelled = false
   AND cs2.is_cancelled = false
   AND cs1.start_time < cs2.end_time
   AND cs1.end_time > cs2.start_time
   AND (
     (cs1.booth_id IS NOT NULL AND cs1.booth_id = cs2.booth_id) OR
     (cs1.teacher_id IS NOT NULL AND cs1.teacher_id = cs2.teacher_id) OR
     (cs1.student_id IS NOT NULL AND cs1.student_id = cs2.student_id)
   )
)
UPDATE class_sessions cs
   SET status = 'CONFLICTED'
 WHERE cs.class_id IN (SELECT class_id FROM conflicts)
   AND cs.status IS DISTINCT FROM 'CONFLICTED';

WITH conflicts AS (
  SELECT DISTINCT cs1.class_id
  FROM class_sessions cs1
  JOIN class_sessions cs2
    ON cs1.date = cs2.date
   AND cs1.class_id <> cs2.class_id
   AND cs1.is_cancelled = false
   AND cs2.is_cancelled = false
   AND cs1.start_time < cs2.end_time
   AND cs1.end_time > cs2.start_time
   AND (
     (cs1.booth_id IS NOT NULL AND cs1.booth_id = cs2.booth_id) OR
     (cs1.teacher_id IS NOT NULL AND cs1.teacher_id = cs2.teacher_id) OR
     (cs1.student_id IS NOT NULL AND cs1.student_id = cs2.student_id)
   )
)
UPDATE class_sessions cs
   SET status = 'CONFIRMED'
 WHERE cs.is_cancelled = false
   AND (cs.status IS NULL OR cs.status = '')
   AND cs.class_id NOT IN (SELECT class_id FROM conflicts);
COMMIT;
"
```

4) Verify

```
psql -c "SELECT count(*) FROM class_sessions WHERE status='CONFLICTED';"
psql -c "SELECT count(*) FROM class_sessions WHERE (status IS NULL OR status='') AND is_cancelled=false;"
```

Optional spot‑check (e.g., 2025‑09‑22):

```
psql -c "
SELECT date, class_id, to_char(start_time,'HH24:MI') s, to_char(end_time,'HH24:MI') e, status, is_cancelled
FROM class_sessions
WHERE date='2025-09-22'
ORDER BY start_time, class_id;"
```

---

## Optional Scoping (Date/Branch)

To restrict updates to a window or branch, add conditions in both `conflicts` CTEs and the final `UPDATE` statements. Examples:

- Limit by date range:

```
AND cs1.date BETWEEN '2025-09-01' AND '2025-10-31'
```

- Limit by branch:

```
AND cs1.branch_id = '<BRANCH_ID>'
```

Also add the same condition in the final `UPDATE ... WHERE` clauses, e.g. `AND cs.date BETWEEN ...` or `AND cs.branch_id = ...`.

---

## Rollback Notes

- This procedure is idempotent and conservative: it only sets statuses based on overlaps and blanks. Re‑running won’t damage data.
- If you need to undo, you must have a prior snapshot or a policy to recompute statuses from business rules. Because we don’t delete or change other fields, typical remediation is to re‑run with the correct scope or restore from a backup.

---

## Aftercare

- UI: The Series table will reflect updated conflict counts automatically (it queries `status='CONFLICTED'`). Day Calendar visuals continue to stripe overlaps as before.
- For local UI, just refresh. No Next.js build or Prisma schema changes are required.

