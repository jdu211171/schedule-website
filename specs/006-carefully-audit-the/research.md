# Research & Audit Notes — Class Series Generation

Date: 2025-09-23

## Current Implementation Map

- Schema
  - `class_series` (blueprint) exists (Prisma `ClassSeries`).
  - Added `scheduling_override` JSONB (per-series overrides, this change).
  - Global: `scheduling_config`; Branch override: `branch_scheduling_config`.
  - `class_sessions` holds generated instances.

- Generation Paths
  - On-demand extension: `src/app/api/class-series/[seriesId]/extend/route.ts`.
    - Computes candidate dates from `lastGeneratedThrough`/`startDate` to `months` ahead.
    - Uses centralized config and availability checks to mark conflicts.
    - Now merges per-series overrides and adds idempotency and advisory locks.
  - Scheduled advance (cron): `src/app/api/class-series/advance/cron/route.ts`.
    - Uses `src/lib/series-advance.ts` helpers.
    - Lead window = `generationMonths * 30` days (now honors per-series overrides).
    - Creates sessions with time/vacation conflict marking.
    - Now idempotent and guarded by advisory locks.

- Config Resolution
  - `src/lib/scheduling-config.ts`: resolves Global → Branch; new `applySeriesOverride()` overlays per-series JSON.

- Safeguards & Auth
  - Cron requires `CRON_SECRET` or vercel-cron UA; permissive in dev.
  - Branch scoping enforced for non-admins.

## Gaps vs. Spec (before changes)

- FR-001 (precedence): No per-series override → added `scheduling_override` + merge.
- FR-002 (idempotency): Re-runs could duplicate → added duplicate check on create.
- FR-010 (resume): Depended on `lastGeneratedThrough` only → idempotency ensures safe resume; could be incrementally updated in future for finer granularity.
- FR-011 (concurrency): No lock → added advisory locks per series.

## Open Questions / Assumptions

- Conflicting rules reporting (spec NEEDS CLARIFICATION): for now, log conflict reasons in API responses; consider admin notifications later.
- Timezone/DST: Dates/times are UTC with local presentation; if future TZ variability is needed, add `timezone` on series.

## Manual Validation Plan

1) Seed DB (global + east branch overrides + demo series).  
2) Run extend and cron twice; verify idempotency (same counts, no new rows).  
3) Set a series `endDate` in the past and extend; confirm blueprint deletion and sessions untouched.  
4) Toggle branch override (`generationMonths`) to 2 and ensure cron target window increases.

