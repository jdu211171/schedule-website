# Tasks: Class Type Filters Across Schedule Views

Feature dir: /Users/muhammadnurislomtukhtamishhoji-zoda/Development/schedule-website/specs/014-we-should-add
Plan: /Users/muhammadnurislomtukhtamishhoji-zoda/Development/schedule-website/specs/014-we-should-add/plan.md

## Phase 3.1: Setup
- [ ] T001 Ensure Vitest + RTL configured for Next.js (no new deps). Verify `bun test` runs with jsdom.
  - Files: package.json, vitest.config.ts (if present)
  - Note: Use Bun for scripts; do not add npm/yarn steps.

- [ ] T002 [P] Create per-role persistence helper for Class Type selection
  - File: /Users/muhammadnurislomtukhtamishhoji-zoda/Development/schedule-website/src/lib/class-type-filter-persistence.ts
  - Contents: `getClassTypeSelection(role)`, `setClassTypeSelection(role, ids)`, key `filter:classTypes:{role}`; no-branch scoping.

- [ ] T003 [P] Fetch options helper for Class Types (ordered by order then name)
  - File: /Users/muhammadnurislomtukhtamishhoji-zoda/Development/schedule-website/src/lib/class-type-options.ts
  - Contents: `fetchClassTypeOptions(): Promise<Array<{value:string,label:string}>>` using `/api/class-types`.

## Phase 3.2: Tests First (TDD)
Contract tests (1 per contract file) — must be written and fail before impl

- [ ] T004 [P] Contract test: GET /api/class-types returns ordered items and pagination
  - File: /Users/muhammadnurislomtukhtamishhoji-zoda/Development/schedule-website/specs/014-we-should-add/contracts/__tests__/class-types.contract.test.ts
  - Based on: contracts/class-types.yaml

- [ ] T005 [P] Contract test: GET /api/teachers/me/class-sessions supports classTypeIds filter
  - File: /Users/muhammadnurislomtukhtamishhoji-zoda/Development/schedule-website/specs/014-we-should-add/contracts/__tests__/teachers-me-class-sessions.contract.test.ts
  - Based on: contracts/teachers-me-class-sessions.yaml

- [ ] T006 [P] Contract test: GET /api/students/me/class-sessions supports classTypeIds filter
  - File: /Users/muhammadnurislomtukhtamishhoji-zoda/Development/schedule-website/specs/014-we-should-add/contracts/__tests__/students-me-class-sessions.contract.test.ts
  - Based on: contracts/students-me-class-sessions.yaml

Integration tests (from user stories; UI-level where practical)

- [ ] T007 Integration: Admin 日次 filter “通常授業” shows only regular sessions
  - File: /Users/muhammadnurislomtukhtamishhoji-zoda/Development/schedule-website/specs/014-we-should-add/integration-tests/admin-day-filter.test.tsx
  - Target: /Users/muhammadnurislomtukhtamishhoji-zoda/Development/schedule-website/src/components/admin-schedule/DayCalendar/day-calendar-filters.tsx

- [ ] T008 Integration: Admin 日次 multi-select “通常授業”+“特別授業” shows union
  - File: same as T007 (sequential in same file)

- [ ] T009 [P] Integration: Admin 週次 retains selection from 日次 and shows filtered
  - File: /Users/muhammadnurislomtukhtamishhoji-zoda/Development/schedule-website/specs/014-we-should-add/integration-tests/admin-week-filter.test.tsx
  - Target: /Users/muhammadnurislomtukhtamishhoji-zoda/Development/schedule-website/src/components/admin-schedule/WeekCalendar/admin-calendar-week.tsx

- [ ] T010 [P] Integration: Teacher Week/Month respects selection and carries over Month→Week
  - File: /Users/muhammadnurislomtukhtamishhoji-zoda/Development/schedule-website/specs/014-we-should-add/integration-tests/teacher-week-month-filter.test.tsx
  - Targets:
    - /Users/muhammadnurislomtukhtamishhoji-zoda/Development/schedule-website/src/app/teacher/page.tsx
    - /Users/muhammadnurislomtukhtamishhoji-zoda/Development/schedule-website/src/components/student-schedule/student-schedule-week-viewer.tsx
    - /Users/muhammadnurislomtukhtamishhoji-zoda/Development/schedule-website/src/components/student-schedule/student-schedule-month-viewer.tsx

- [ ] T011 [P] Integration: Student Week/Month respects selection; reload persists per-role; branch switch remains
  - File: /Users/muhammadnurislomtukhtamishhoji-zoda/Development/schedule-website/specs/014-we-should-add/integration-tests/student-week-month-filter.test.tsx
  - Targets:
    - /Users/muhammadnurislomtukhtamishhoji-zoda/Development/schedule-website/src/app/student/page.tsx
    - /Users/muhammadnurislomtukhtamishhoji-zoda/Development/schedule-website/src/components/student-schedule/student-schedule-week-viewer.tsx
    - /Users/muhammadnurislomtukhtamishhoji-zoda/Development/schedule-website/src/components/student-schedule/student-schedule-month-viewer.tsx

## Phase 3.3: Core Implementation
Admin filters

- [ ] T012 Add Class Type multi-select to admin 日次 filters UI
  - File: /Users/muhammadnurislomtukhtamishhoji-zoda/Development/schedule-website/src/components/admin-schedule/DayCalendar/day-calendar-filters.tsx
  - Use: `Faceted` components for searchable multi-select; options via class-type-options.ts; persist via class-type-filter-persistence.ts
  - Sequential with T013 (same file)

- [ ] T013 Wire selected classTypeIds to DayFilters and queries/rendering
  - Files: same as T012; and /Users/muhammadnurislomtukhtamishhoji-zoda/Development/schedule-website/src/hooks/useClassSessionQuery.ts (extend DayFilters and query params)

Admin week

- [ ] T014 Add Class Type filter UI to admin 週次 header (next to WeekSelector)
  - File: /Users/muhammadnurislomtukhtamishhoji-zoda/Development/schedule-website/src/components/admin-schedule/WeekCalendar/admin-calendar-week.tsx
  - Use the same Faceted control and persistence

- [ ] T015 Apply selected classTypeIds to week data queries (useMultipleWeeksClassSessions)
  - File: /Users/muhammadnurislomtukhtamishhoji-zoda/Development/schedule-website/src/hooks/useClassSessionQuery.ts (append classTypeIds to params and/or client filter)

Teacher and student views

- [ ] T016 Add Class Type filter control to Teacher page toolbar and persist per-role
  - File: /Users/muhammadnurislomtukhtamishhoji-zoda/Development/schedule-website/src/app/teacher/page.tsx
  - Pass `classTypeIds` to `useTeacherClassSessionsDateRange`

- [ ] T017 Update `useTeacherClassSessionsDateRange` to accept optional `classTypeIds` and pass to API
  - File: /Users/muhammadnurislomtukhtamishhoji-zoda/Development/schedule-website/src/hooks/useClassSessionQuery.ts

- [ ] T018 Add Class Type filter control to Student views (parent container) and persist per-role
  - File: /Users/muhammadnurislomtukhtamishhoji-zoda/Development/schedule-website/src/app/student/page.tsx

- [ ] T019 Update `useStudentClassSessionsDateRange` to accept optional `classTypeIds` and pass to API
  - File: /Users/muhammadnurislomtukhtamishhoji-zoda/Development/schedule-website/src/hooks/useClassSessionQuery.ts

## Phase 3.4: Integration (API support)

- [ ] T020 Extend GET /api/teachers/me/class-sessions to support `classTypeIds` (CSV) exact-match IN filter
  - File: /Users/muhammadnurislomtukhtamishhoji-zoda/Development/schedule-website/src/app/api/teachers/me/class-sessions/route.ts
  - Back-compat: keep existing single `classTypeId` behavior

- [ ] T021 Extend GET /api/students/me/class-sessions to support `classTypeIds` (CSV) exact-match IN filter
  - File: /Users/muhammadnurislomtukhtamishhoji-zoda/Development/schedule-website/src/app/api/students/me/class-sessions/route.ts
  - Back-compat: keep existing single `classTypeId` behavior

## Phase 3.5: Polish

- [ ] T022 [P] Debounce search inputs and memoize options to minimize re-renders
  - Files: Faceted-based controls in admin/teacher/student UIs

- [ ] T023 [P] Accessibility pass: keyboard operability, ARIA labels for combobox and chips
  - Files: the new Faceted controls; ensure labels and aria attributes

- [ ] T024 [P] i18n: Localize labels and empty/zero-result messages (JA-first)

- [ ] T025 Validation: Follow quickstart to verify reload and branch-switch persistence
  - File: /Users/muhammadnurislomtukhtamishhoji-zoda/Development/schedule-website/specs/014-we-should-add/quickstart.md

## Phase 3.6: Entity Types (from data-model) [P]

- [ ] T027 [P] Define TS interfaces for ClassType and ClassTypeOption
  - File: /Users/muhammadnurislomtukhtamishhoji-zoda/Development/schedule-website/src/types/class-type.ts
  - Contents: `export interface ClassTypeDTO { classTypeId; name; parentId; order; color }` and `export type ClassTypeOption = { value; label }`

- [ ] T028 [P] Define TS types for FilterState and ViewVariant
  - File: /Users/muhammadnurislomtukhtamishhoji-zoda/Development/schedule-website/src/types/class-type-filter.ts
  - Contents: `export type ClassTypeFilterState = { selectedClassTypeIds: string[]; updatedAt: string }`; `export type ViewVariant = 'DAY'|'WEEK'|'MONTH'`

- [ ] T026 Cleanup: Remove debug logs; run `bun lint` and `bun test`

## Dependencies
- T004–T006 (contract tests) before T020–T021 (endpoint support)
- T007–T011 (integration tests) before T012–T019 (UI + hooks)
- T012 blocks T013; T014 blocks T015; T016 blocks T017; T018 blocks T019
- API extensions (T020–T021) can proceed in parallel [P] if files are separate
- Polish (T022–T026) after core and integration

## Parallel Execution Examples
Launch contract tests together:
Task: "T004 Contract test /api/class-types in specs/014-we-should-add/contracts/__tests__/class-types.contract.test.ts"
Task: "T005 Contract test /api/teachers/me/class-sessions in specs/014-we-should-add/contracts/__tests__/teachers-me-class-sessions.contract.test.ts"
Task: "T006 Contract test /api/students/me/class-sessions in specs/014-we-should-add/contracts/__tests__/students-me-class-sessions.contract.test.ts"

Launch UI integration tests together after setup:
Task: "T007 Admin 日次 filter test"
Task: "T009 Admin 週次 filter test"
Task: "T010 Teacher Week/Month filter test"
Task: "T011 Student Week/Month filter test"

## Notes
- [P] tasks = different files, no dependencies
- Tests must fail before implementation (TDD)
- Use Bun for scripts (e.g., `bun test`, `bun lint`)
- Place tests near spec (under specs/014-we-should-add) to keep scope contained
