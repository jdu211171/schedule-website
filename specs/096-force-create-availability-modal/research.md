Research / Decisions

- Code references
  - src/components/admin-schedule/DayCalendar/create-lesson-dialog.tsx (availability modal)
  - src/lib/conflict-types.ts (soft vs hard conflict typing)
  - src/app/api/class-sessions/route.ts (forceCreate, checkAvailability flags)
  - src/app/api/class-series/* (series preview/extend behavior)

- Decision
  - Implement 強制作成 by bypassing availability errors (checkAvailability=false / preview filter).
  - Preserve hard-conflict flow: still show conflict table when overlaps exist.
  - Do not introduce new backend flags; reuse existing behavior to minimize risk.

- Assumptions
  - Modal only triggers when availability mismatch is detected in the UI grid (soft flags).
  - Force-create semantics are limited to availability checks, matching current user expectations.

