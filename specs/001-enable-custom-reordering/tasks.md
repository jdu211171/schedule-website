# Tasks for Custom Column Ordering

## T001: Setup - Install Dependencies

- Status: Skipped (not needed)
- Notes: Project already uses `@dnd-kit/*` and a shared `Sortable` wrapper. We will reuse these instead of introducing `react-dnd`.

## T002: Core - Create `useColumnOrder` Hook

- Status: Done
- Description: Manage column order persisted to localStorage, reconcile unknown/missing ids.
- File: `src/hooks/useColumnOrder.ts`
- Dependencies: None

## T003: Test - Unit Test `useColumnOrder` Hook [P]

- Status: Done
- Description: Validates default load, persistence, and appending new columns.
- File: `src/hooks/useColumnOrder.test.ts` (jsdom per-file environment)
- Dependencies: T002

## T004: Core - Enable Draggable Column Header

- Status: Done (adapted)
- Description: Added horizontal drag-reorder to the existing header used by Teacher/Student tables.
- File: `src/components/data-table-v0/generic-table-header-v0.tsx`
- Lib: Reused `@/components/ui/sortable` (dnd-kit)
- Notes: Supports pinned columns (left/right); reorders within each pinned segment.

## T005: Integration - Persist Column Order in Table State

- Status: Done (adapted)
- Description: Integrated `useColumnOrder` in `useStateDataTable` to control `columnOrder` and persist via `columnOrderStorageKey`.
- File: `src/hooks/use-state-data-table.ts`
- Dependencies: T002

## T006: Integration - Update Teacher and Student Tables

- Status: Done
- Description: Enabled persistence by passing `columnOrderStorageKey` props.
- File: `src/components/teacher/teacher-table.tsx`, `src/components/student/student-table.tsx`
- Dependencies: T005

## T007: Test - Integration Test `DataTable` [P]

- Status: Done
- Description: jsdom test validates that a persisted column order is applied on mount and that the "Reset column order" control restores defaults and clears storage.
- File: `src/components/data-table-v0/__tests__/column-reorder.test.tsx`
- Dependencies: T004, T005

## Parallel Execution Example

The following tasks can be executed in parallel:

- `T003: Test - Unit Test useColumnOrder Hook`
- `T007: Test - Integration Test DataTable`
