# Tasks: Conflicting Class Session Resolution

**Input**: Design documents from `/home/user/Development/schedule-website/specs/009-we-should-show/`

## Phase 3.1: Setup

- [x] T001 [P] Verify that all dependencies are installed by running `bun install`.

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

- [x] T002 [P] Write an integration test in a new file `tests/integration/conflict-resolution.spec.tsx` to verify that clicking the edit button on a conflicting class session navigates to the day calendar view.
- [x] T003 [P] Write an integration test in `tests/integration/conflict-resolution.spec.tsx` to verify that clicking the edit button on a non-conflicting class session opens the "Edit Class" modal.

## Phase 3.3: Core Implementation (ONLY after tests are failing)

- [x] T004 Modify the `onClick` handler for the edit button in the `src/components/admin-schedule/DayCalendar/lesson-card.tsx` component to differentiate between conflicting and non-conflicting sessions.
- [x] T005 Implement the logic within `src/components/admin-schedule/DayCalendar/lesson-card.tsx` to navigate to the day calendar view for the corresponding date when a conflicting session's edit button is clicked.
- [x] T006 Ensure that the existing logic to open the "Edit Class" modal is preserved for non-conflicting sessions in `src/components/admin-schedule/DayCalendar/lesson-card.tsx`.

## Phase 3.4: Integration

- (No new integration tasks needed for this feature)

## Phase 3.5: Polish

- [x] T007 [P] Write unit tests for the new logic in `src/components/admin-schedule/DayCalendar/lesson-card.tsx` in a new file `tests/unit/lesson-card.spec.tsx`.
- [x] T008 [P] Review and update documentation in `GEMINI.md` if necessary.
- [x] T009 Run manual testing scenarios from `specs/009-we-should-show/quickstart.md`.

## Phase 3.6: UI Tidy-Up

- [x] T011 Remove dialog header text and description from `src/components/admin-schedule/DayCalendar/fast-day-calendar-dialog.tsx` and make content flex to fit near full height inside modal.
- [x] T012 Render `DayCalendar` in plain mode (no card container, no internal header) within `fast-day-calendar-dialog`.

## Phase 3.7: Server Fix Backport

- [x] T013 Guard class-series PATCH when blueprint missing (return 404/403 instead of 500) and reuse existing row for branch checks and duration fallback.

## Incidental Bugfix (Server)

- [x] T010 Guard series PATCH when blueprint missing; return 404/403 instead of 500 (`src/app/api/class-series/[seriesId]/route.ts`).

## Dependencies

- T002 and T003 must be completed before T004, T005, and T006.
- T004, T005, and T006 should be done sequentially as they modify the same file.
- T007 can be done after T006.
- T008 and T009 can be done after all other tasks are complete.

## Parallel Example

```
# Launch T002 and T003 together:
Task: "Write an integration test in a new file `tests/integration/conflict-resolution.spec.ts` to verify that clicking the edit button on a conflicting class session navigates to the day calendar view."
Task: "Write an integration test in `tests/integration/conflict-resolution.spec.ts` to verify that clicking the edit button on a non-conflicting class session opens the 'Edit Class' modal."
```
