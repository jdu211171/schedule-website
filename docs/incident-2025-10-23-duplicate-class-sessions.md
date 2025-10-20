# Incident Report — 2025-10-23 Duplicate Class Sessions

## Summary
On 2025-10-23 (Thu), `public.class_sessions` contained 93 rows for the day, with extensive duplication for specific teacher–student pairs. Root cause was multiple duplicate `class_series` blueprints combined with non‑idempotent generation, and no DB uniqueness guard for exact 1:1 sessions.

## Impact
- 93 sessions on 2025-10-23; expected unique set is 65.
- Many duplicates marked `CONFLICTED`, confusing schedule views and potential downstream notifications.

## Timeline (JST)
- 2025-10-10 01:03–01:10 — Multiple duplicate `class_series` created minutes apart for the same pair/time/days.
- 2025-10-16/17 around every hour ~:03–:05 — Generators inserted repeated sessions, compounding duplicates.
- 2025-10-20 — Investigation, backup, cleanup, idempotency and uniqueness shipped.

## Root Causes
1) Duplicate ACTIVE `class_series` blueprints existed for the same (branch, teacher, student, start_time, end_time, days_of_week).  
2) Generator endpoints created sessions without a true uniqueness guard, assuming a DB constraint that did not exist.  
3) No partial unique index on `class_sessions` to block exact 1:1 duplicates.

## Evidence (queries)
- Count per target date:
  - `SELECT COUNT(*) FROM public.class_sessions WHERE date='2025-10-23';` → 93 (before), 65 (after cleanup)
- Unique vs duplicates proxy (date, start_time, end_time, teacher, student):
  - 65 unique, 28 excess duplicates for 10/23; 300 excess across table prior to cleanup.
- Heavy duplication for two pairs (examples):
  - 18× at `20:00–21:30` same teacher+student; 1 CONFIRMED + 17 CONFLICTED.
  - 13× around `18:00–20:15` same pair.
- Series duplicates:
  - Four ACTIVE series for the 18× pair, created minutes apart; seven for the 13× pair.

## Fixes Implemented
1) Full compressed backup (pg_dump): `backups/prod_backup_YYYYMMDD_HHMMSS.dump` (20251020_163649).  
2) Historical cleanup: deleted exact duplicates (non‑cancelled, 1:1) keeping earliest (300 rows removed).  
3) DB uniqueness & indexes (Prisma migration `20251020_dedupe_guards`):
   - `ux_class_sessions_unique_1on1` partial unique on (date,start_time,end_time,teacher_id,student_id) where non‑cancelled.
   - `ux_class_series_active_private` partial unique on (branch,teacher,student,start_time,end_time,days_of_week) where ACTIVE.
   - Helper lookup index for idempotency checks.
4) Idempotent generation:
   - `src/lib/series-advance.ts` — skip create if exact exists.
   - `src/app/api/class-series/[seriesId]/extend/route.ts` — skip create if exact exists (mark skipped reason).
5) Series creation dedup:
   - `POST /api/class-series` returns 409 if an ACTIVE blueprint already exists for the same private pair/time/days in the (effective) branch.
6) Resolved current duplicate ACTIVE series by setting later duplicates to `PAUSED` (24 rows) to preserve history but block generation.

## Post‑fix State
- 2025-10-23 now has 65 sessions (62 CONFIRMED, 3 CONFLICTED).
- Duplicate ACTIVE series reduced by pausing later duplicates; uniqueness guard prevents re‑creation.
- Generators and API are idempotent; DB indices enforce consistency.

## Rollback Plan
- Restore with `pg_restore` from `backups/prod_backup_<timestamp>.dump` if necessary.
- Drop indices by name (`ux_class_sessions_unique_1on1`, `ux_class_series_active_private`) if they must be temporarily disabled.

## Follow‑ups
- Keep `days_of_week` arrays normalized (sorted) to ensure intuitive uniqueness on JSONB array.
- Consider group‑class modeling if multiple students per teacher slot need to be first‑class (current unique key targets 1:1).
- Add an audit endpoint/report to surface “skipped due to existing” events for monitoring.

