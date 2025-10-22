# Research — 019 Dedupe Class Sessions

## Observations
- 2025-10-23 had 93 sessions; after dedup, 65 unique remained.
- Two pairs were massively duplicated:
  - 18x at 20:00–21:30 (Thu) same teacher+student; one CONFIRMED + 17 CONFLICTED.
  - 13x around 18:00–20:15 same pair; one CONFIRMED + rest CONFLICTED.
- `created_at` pattern around every hour (~:03–:05) on 2025-10-16/17 indicates recurring generator.
- Multiple ACTIVE `class_series` blueprints existed for same pair/time/days.

## Root causes
- No DB uniqueness on `class_sessions`; generator creates blindly and catches errors.
- No dedup check in `POST /api/class-series`; duplicates created minutes apart.
- Cron/extend generation runs per series → duplicates multiply when blueprints are duplicated.

## Fixes Implemented
- Backup: `backups/prod_backup_YYYYMMDD_HHMMSS.dump` via pg_dump (compressed).
- Dedup historical: delete duplicate 1:1 (non-cancelled) keeping earliest.
- Add partial unique indexes:
  - `ux_class_sessions_unique_1on1` on (date, start_time, end_time, teacher_id, student_id) when non-cancelled.
  - `ux_class_series_active_private` on (branch, teacher, student, start_time, end_time, days_of_week) when ACTIVE.
- Idempotency checks in `series-advance.ts` and extend route.
- 409 on duplicate series creation (POST /api/class-series).

## Notes & Risks
- `days_of_week` uniqueness is array-order-sensitive (jsonb). UI should submit normalized sorted arrays.
- Existing duplicates in `class_series` were paused (status = 'PAUSED') to preserve history.
- Group classes are not constrained by the 1:1 unique index (requires future modeling if needed).

