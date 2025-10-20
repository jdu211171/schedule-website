# Quickstart: Verify Class Type Filters

## Prerequisites

- Run dev server: `bun dev`
- Ensure class types exist via `/api/class-types`

## Admin/Staff (日次・週次)

- Navigate to Schedules → 日次 tab
- Open Class Type filter, select "通常授業" → only regular classes show
- Multi-select add "特別授業" → both types show
- Switch to 週次 tab → selection persists
- Reload page → selection persists (per-role)

## Teacher/Student (Week/Month)

- Open Week view → select class types and confirm filtering
- Switch to Month → selection carries over; day cells reflect filter
- Click a day → navigates to Week with selection intact

## Persistence

- Switch branches → selection remains (shared per-role)
- Clear filter → all types shown (no selection = all)

## Notes

- Options load from `/api/class-types` (ordered)
- Exact match filtering (no descendant inclusion)
