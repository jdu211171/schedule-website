# Research — Auto-Recompute Neighbor Statuses

Context

- Problem: Moving the “other” overlapping session did not clear lingering `CONFLICTED` on the original session because only the edited session recomputed status.
- Goal: Recompute neighbors (same date + overlapping time + shared teacher/student/booth) when a session is created or moved.

Design

- Helper `src/lib/conflict-status.ts`:
  - `decideNextStatusForContext(ctx)` — derives hard/soft reasons and returns CONFIRMED/CONFLICTED using centralized policy.
  - `recomputeAndUpdateSessionStatus(classId)` — loads session and persists updated status.
  - `recomputeNeighborsForChange(oldCtx, newCtx)` — finds impacted neighbors (overlap with old or new window) and recomputes their status.
- Endpoints updated:
  - `PATCH /api/class-sessions/[classId]`: after primary recompute, detect if placement/resources changed; if so, recompute neighbors.
  - `POST /api/class-sessions` (one-time): after create, recompute neighbors for the new context.
  - `PATCH /api/class-sessions/series/[seriesId]`: collect per-instance old/new contexts in transaction; recompute neighbors after commit.

Files Touched

- src/lib/conflict-status.ts
- src/app/api/class-sessions/[classId]/route.ts
- src/app/api/class-sessions/route.ts
- src/app/api/class-sessions/series/[seriesId]/route.ts

Notes

- Overlap predicate matches existing server logic (no conflict on touching endpoints).
- Skip cancelled sessions; availability checks respect branch policy (`allowOutsideAvailability`).
- Errors in neighbor recompute are swallowed to avoid disrupting main mutations.
