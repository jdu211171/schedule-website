# Data Model — Instant day calendar update

No database schema changes are required for this feature. Entities are listed for clarity of interactions.

## Entities

- Class Session
  - Identity: `classId` (string, unique)
  - Attributes: `date (YYYY-MM-DD)`, `startTime (HH:mm)`, `endTime (HH:mm)`, `teacherId?`, `studentId?`, `subjectId?`, `classTypeId?`, `boothId?`, `branchId?`, `status`, `isCancelled?`, `seriesId?`
  - Notes: Placement and display use Asia/Tokyo; storage remains UTC-backed per project.

- Day Calendar View (UI state)
  - Identity: `date` (focused date)
  - Attributes: `filters (teacher, room/booth, class, status, ... )`, `scrollPosition`, `zoomLevel`
  - Behavior: Preserves state through creation; no auto-scroll on create.

- Class Series (blueprint)
  - Identity: `seriesId`
  - Attributes: `startDate`, `endDate?`, `startTime`, `endTime`, `daysOfWeek[]`, `status`, `lastGeneratedThrough?`, and associations
  - Notes: Series UI operates via same-page popup; session creation from series updates the day calendar for the same date.

## Relationships
- A Class Session may belong to a Class Series via `seriesId`.
- Day Calendar View lists Class Sessions for a given `date`, filtered by current `filters`.

## Constraints & Rules
- Identity & Uniqueness: `classId` is unique; calendar de-duplicates sessions by `classId`.
- Time placement: Use Asia/Tokyo for calendar slotting; display aligns with `src/components/admin-schedule/date.ts`.
- Filter respect: New sessions not matching current filters do not render; generic success toast is shown.
- State preservation: Date, scroll, zoom remain unchanged after creation; no auto-scroll.

