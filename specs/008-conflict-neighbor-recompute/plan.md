# Plan — Auto-Recompute Neighbor Statuses

Goal: When a class session moves (or is created) and removes/introduces overlaps, automatically recompute statuses of same-day neighbor sessions sharing teacher/student/booth so lingering `CONFLICTED` flags resolve without manual action.

Steps

1. Extract reusable status recompute helpers in `src/lib/`
2. Wire PATCH `/api/class-sessions/[classId]` to recompute neighbors when key fields change
3. Wire POST `/api/class-sessions` (one-time create path) to recompute neighbors
4. Wire PATCH `/api/class-sessions/series/[seriesId]` to recompute neighbors for each updated instance
5. Typecheck and keep changes minimal

Notes

- Only same-date, same-resource neighbors; skip cancelled.
- Overlap checks match existing server logic (touching endpoints are not overlaps).
- Availability policy respected via centralized `scheduling-config`.
- Non-blocking: errors during neighbor recompute do not fail the main request.

