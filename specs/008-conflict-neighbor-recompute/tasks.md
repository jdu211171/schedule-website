# Tasks — Auto-Recompute Neighbor Statuses

- [x] Add helper: `src/lib/conflict-status.ts` (decide status, recompute session, recompute neighbors)
- [x] Patch `PATCH /api/class-sessions/[classId]` to call neighbor recompute when placement/resources change
- [x] Patch `POST /api/class-sessions` (one-time create) to call neighbor recompute after create
- [x] Patch `PATCH /api/class-sessions/series/[seriesId]` to collect changes and recompute neighbors post-transaction
- [x] Typecheck with `bun x tsc --noEmit`
 - [x] Extend: recompute neighbors for DELETE flows
   - [x] Single delete `/api/class-sessions/[classId]`
   - [x] Bulk delete `/api/class-sessions`
   - [x] Series delete `/api/class-sessions/series/[seriesId]`
