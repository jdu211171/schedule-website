# Class Series Generation

This document explains configuration precedence, the advance generation cron, and manual testing steps.

## Configuration Precedence

Effective scheduling configuration is resolved in this order:

1. Per-Series Override (stored on `class_series.scheduling_override`)
2. Branch-Specific Override (`branch_scheduling_config`)
3. Global Base (`scheduling_config`)

Notes:
- `generationMonths` determines the advance lead window (months × 30 days) used by the cron.
- Conflict flags (e.g., `markTeacherConflict`, `allowOutsideAvailabilityTeacher`) apply to on-demand extension and any place where conflict policy is evaluated.

## Cron Schedule

- Vercel cron invokes `GET /api/class-series/advance/cron` (see `vercel.json`).
- Authorization: either `User-Agent: vercel-cron/1.0` or `Authorization: Bearer $CRON_SECRET` (recommended for production).
- Production safeguard: set `ENABLE_SERIES_GENERATION=true` to allow cron execution in production. Otherwise the endpoint returns 403.
- Query parameters:
  - `leadDays` (optional): override calculated lead days for all processed series.
  - `limit` (optional): limit number of series processed this run.
  - `branchId` (optional): process only a single branch.
  - `seriesId` (optional): process only a single series.

## Idempotency

Generation is idempotent. Before inserting, the system checks for an existing session with the same `seriesId`, `date`, `startTime`, and `endTime`. If found, it skips creation. Re-running cron or extend will not create duplicates.

Resume semantics: if any insert fails, `last_generated_through` is advanced only to the last successfully created date. Re-running will safely fill gaps while skipping already-created sessions.

## Cleanup Behavior

When the last generated date reaches or exceeds a series `endDate`, the blueprint (`class_series`) is deleted automatically. Existing `class_sessions` are preserved.

## Manual Test Steps

1. Seed the database: `bun tsx prisma/seed.ts` (requires local Postgres and `DATABASE_URL`).
2. Verify seeds via psql:
   - `PGPASSWORD=postgres psql -h localhost -U postgres -d schedulewebsite -c "SELECT count(*) FROM class_series;"`
   - `PGPASSWORD=postgres psql -h localhost -U postgres -d schedulewebsite -c "SELECT * FROM scheduling_config;"`
3. Extend a series manually:
   - `curl -X POST http://localhost:3000/api/class-series/<seriesId>/extend -H "Authorization: Bearer $CRON_SECRET" -d '{"months":1}'`
4. Run advance cron locally:
   - `curl -X GET "http://localhost:3000/api/class-series/advance/cron?limit=5" -H "Authorization: Bearer $CRON_SECRET"`
5. Re-run the same command to confirm idempotency (no new sessions created).

### Timezone/DST
- Optional per-series `timezone` (e.g., `America/New_York`) ensures local time-of-day remains stable across DST transitions. Stored session timestamps are UTC; display converts using the series timezone.

## Observability

- API responses include counts of created/skip/conflict items.
- Server logs include start/end markers and failures. Use platform logs to trace runs.
