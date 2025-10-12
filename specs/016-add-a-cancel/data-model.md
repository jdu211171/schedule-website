# Data Model: Cancel From This Point

**Feature**: /home/user/Development/schedule-website/specs/016-add-a-cancel/spec.md  
**Date**: 2025-10-11

## Entities

- ClassSeries
  - seriesId: string (PK)
  - branchId: string | null
  - teacherId: string | null
  - studentId: string | null
  - subjectId: string | null
  - classTypeId: string | null
  - boothId: string | null
  - startDate: date (UTC)
  - endDate: date (UTC) | null
  - startTime: time (UTC)
  - endTime: time (UTC)
  - duration: number | null (minutes)
  - daysOfWeek: number[] (0–6)
  - status: enum { ACTIVE, PAUSED, ENDED }
  - lastGeneratedThrough: date (UTC) | null
  - notes: string | null

- ClassSession
  - classId: string (PK)
  - seriesId: string | null (FK → ClassSeries)
  - branchId: string | null
  - teacherId: string | null
  - studentId: string | null
  - subjectId: string | null
  - classTypeId: string | null
  - boothId: string | null
  - date: date (UTC)
  - startTime: time (UTC)
  - endTime: time (UTC)
  - duration: number | null (minutes)
  - notes: string | null
  - isCancelled: boolean (default false)
  - cancelledAt: datetime (UTC) | null
  - cancelledByUserId: string | null

## State Transitions

- ClassSession
  - SCHEDULED → CANCELED: via POST `/api/class-sessions/cancel`
  - CANCELED → SCHEDULED: via POST `/api/class-sessions/reactivate`
  - Side-effects: neighbor recomputation for conflict statuses

- ClassSeries
  - ACTIVE → PAUSED: via PATCH `/api/class-series/{seriesId}` with `{ status: "PAUSED" }`
  - PAUSED → ACTIVE: via PATCH with `{ status: "ACTIVE" }` (existing behavior)
  - Advance generation: only series with status ACTIVE are considered

## Validation Rules

- “From this point” scope includes the selected occurrence date and all future dates (>= selected date).
- Single cancel must not alter series status.
- Idempotency: repeat requests on already-cancelled sessions are no-ops and should not error.
- Permissions: same actor permissions as delete flows (ADMIN/STAFF with branch access).

