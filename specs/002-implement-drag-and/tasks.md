# Tasks: Drag-and-Drop for Class Session Lesson Cards

**Input**: Design documents from `/home/user/Development/schedule-website/specs/002-implement-drag-and/`

## Phase 3.1: Setup
- [ ] T001 [P] Install `dnd-kit` libraries: `bun add @dnd-kit/core @dnd-kit/sortable`.

## Phase 3.2: Backend API
- [ ] T002 [P] Create an API test file `src/app/api/class-sessions/[sessionId]/lessons/reorder/route.test.ts` to verify the contract for the reorder endpoint.
- [ ] T003 Implement the API endpoint in `src/app/api/class-sessions/[sessionId]/lessons/reorder/route.ts`. This should handle the PUT request, update the `order` of the lessons in the database, and return a success response.

## Phase 3.3: Frontend Implementation
- [ ] T004 [P] Create a new component `src/components/class-session/DraggableLessonList.tsx` that will render the list of lesson cards and handle the drag-and-drop logic using `dnd-kit`.
- [ ] T005 In the `DraggableLessonList` component, use TanStack Query's `useMutation` to call the reorder API. Implement optimistic updates in `onMutate` and rollback in `onError`.
- [ ] T006 Replace the existing lesson list with the new `DraggableLessonList` component where lesson cards are displayed.
- [ ] T007 [P] Create an integration test file `src/components/class-session/DraggableLessonList.test.tsx` to test the drag-and-drop functionality, including optimistic updates and rollback.

## Phase 3.4: Polish
- [ ] T008 Perform manual testing as described in `specs/002-implement-drag-and/quickstart.md`.

## Dependencies
- T002 must be completed before T003.
- T004, T005, T006 are sequential.
- T007 can be done after T006.

## Parallel Example
```
# T001, T002 and T007 can be run in parallel

Task: "Install `dnd-kit` libraries: `bun add @dnd-kit/core @dnd-kit/sortable`"
Task: "Create an API test file `src/app/api/class-sessions/[sessionId]/lessons/reorder/route.test.ts` to verify the contract for the reorder endpoint."
Task: "Create an integration test file `src/components/class-session/DraggableLessonList.test.tsx` to test the drag-and-drop functionality, including optimistic updates and rollback."
```
