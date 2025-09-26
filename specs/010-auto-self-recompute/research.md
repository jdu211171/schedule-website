# Research / Notes

Related code
- Self/neighbor status helpers: `src/lib/conflict-status.ts`
- Class session PATCH: `src/app/api/class-sessions/[classId]/route.ts`
- Series PATCH (bulk update): `src/app/api/class-sessions/series/[seriesId]/route.ts`
- Confirm endpoint (explicit override): `src/app/api/class-sessions/confirm/route.ts`

Behavioral intent
- Auto clear status when hard overlaps are removed by the edit and policy doesn’t elevate soft conflicts.
- Preserve explicit confirm flow for staff to override soft warnings where policy marks them.

