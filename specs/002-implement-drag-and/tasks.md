# Tasks: Drag-and-Drop for Class Session Lesson Cards

**Input**: Design documents from `/home/user/Development/schedule-website/specs/002-implement-drag-and/`

## Phase 3.1: Setup
- [x] T001 [P] Install `dnd-kit` libraries: `bun add @dnd-kit/core @dnd-kit/sortable`.
  - Already present in package.json; no action needed.

## Phase 3.2: Backend API (Removed)
- [x] T002 [REMOVED] Placeholder reorder endpoint and test were pruned to keep scope focused on DayCalendar.

## Phase 3.3: Frontend Implementation (Adjusted)
- [x] T004 [REMOVED] Mobile list DnD component and integration were pruned.
- [x] T005 [REMOVED] Associated list DnD tests were pruned.
- [x] T006 [REMOVED] Student mobile week view restored to non-DnD rendering.
- [x] T007 DayCalendar DnD covered by manual validation and existing mutation logic.

## Phase 3.4: Polish
- [x] T008 Perform manual testing as described in `specs/002-implement-drag-and/quickstart.md`.
  - Verified on Admin Day Calendar: drag across time/booth, rollback on error, no scroll jump.

## Phase 3.5: DayCalendar Drag & Drop (scope update)
- [x] T009 Make `LessonCard` draggable with dnd-kit (whole card, not just a handle).
- [x] T010 Wrap `DayCalendar` with `DndContext` and make grid cells droppable (one day only).
- [x] T011 Add in-table ghost overlay sized to lesson duration; live update on hover.
- [x] T012 On drop, reschedule via `useClassSessionUpdate` (optimistic + rollback).
- [x] T013 Align ghost width with actual card width using slot indices.
- [x] T014 Manual verification on desktop and touch devices.

## Dependencies
- T002 must be completed before T003.
- T004, T005, T006 are sequential.
- T007 can be done after T006.

## Parallel Example
```
# T001, T002 and T007 can be run in parallel

Task: "Install `dnd-kit` libraries: `bun add @dnd-kit/core @dnd-kit/sortable`"
Task: "Create an API test file `src/app/api/class-sessions/[classId]/lessons/reorder/route.test.ts` to verify the contract for the reorder endpoint."
Task: "Create an integration test file `src/components/class-session/DraggableLessonList.test.tsx` to test the drag-and-drop functionality, including optimistic updates and rollback."
```
