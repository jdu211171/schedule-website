# Tasks: User-Configurable Class Type Visibility

**Branch**: `017-add-logic-to`  
**Spec**: /home/user/Development/schedule-website/specs/017-add-logic-to/spec.md  
**Plan**: /home/user/Development/schedule-website/specs/017-add-logic-to/plan.md

## Phase 1: Setup

- [X] T001 [P] Ensure feature branch is checked out (`017-add-logic-to`) and dependencies are installed with Bun
  - Files: n/a
  - Notes: Use `bun install`; copy `.env.example` → `.env` and set `DATABASE_URL`/`DIRECT_URL`.
- [X] T002 [P] Confirm Spec Kit docs present; link plan/spec/research/contracts/data-model/quickstart in PR description
  - Files: specs/017-add-logic-to/*

## Phase 2: Foundational (blocks all stories)

- [X] T003 Define Prisma model for per-user class type visibility preferences
  - Files: prisma/schema.prisma
  - Add model (conceptual): `UserClassTypeVisibilityPreference { userId String @id, hiddenClassTypeIds String[] @default([]), updatedAt DateTime @updatedAt }`
- [X] T004 Create migration and generate Prisma client
  - Commands: `npx prisma migrate dev -n "user-class-type-visibility" && bun postinstall`
- [X] T005 Create Zod schemas for API payloads and responses
  - Files: src/schemas/user-preferences.schema.ts
  - Schemas: `{ hiddenClassTypeIds: z.array(z.string()).max(100) }`
- [X] T006 Implement API route for preferences (GET/PUT)
  - Files: src/app/api/preferences/class-types/route.ts
  - GET: returns `{ hiddenClassTypeIds: string[] }` for current user
  - PUT: replaces with validated array, prunes unknown IDs
- [X] T007 Add server-side service for reading/writing preferences
  - Files: src/services/user-preferences.ts
  - Functions: `getUserHiddenClassTypeIds(userId)`, `setUserHiddenClassTypeIds(userId, ids)`
- [X] T008 Add shared types for preferences
  - Files: src/types/user-preferences.ts
  - Types: `UserClassTypeVisibilityPreferenceDTO`, `SetUserClassTypeVisibilityRequest`
- [X] T009 Create client hook to load and update hidden class type IDs
  - Files: src/hooks/useClassTypeVisibility.ts
  - Expose: `useHiddenClassTypes()`, `useSetHiddenClassTypes()` using React Query
- [X] T010 Add broadcast utility for cross-tab updates
  - Files: src/lib/class-type-visibility-broadcast.ts
  - Channel: `class-type-visibility`; message `{ type: 'hiddenClassTypesChanged', ids: string[] }`
- [X] T011 Add utility to filter options by hidden IDs
  - Files: src/lib/filter-class-type-options.ts
  - Function: `applyHiddenClassTypes(options, hiddenIds)` returns filtered options

## Phase 3: User Story 1 (P1) – Hide unnecessary class types

Goal: Users choose which Class Types are visible so Day Calendar and filter controls only show needed types.

Independent Test: Hide a type → it disappears from Day Calendar and from all Class Type selection controls.

- [X] T012 Add "表示管理" button and dialog to manage Class Type visibility in Day Calendar filters
  - Files: src/components/admin-schedule/DayCalendar/day-calendar-filters.tsx, src/components/admin-schedule/DayCalendar/manage-class-type-visibility-dialog.tsx
  - Use `useHiddenClassTypes`/`useSetHiddenClassTypes` to load/save
- [X] T013 Exclude hidden types from Day Calendar filter options
  - Files: src/components/admin-schedule/DayCalendar/day-calendar-filters.tsx
  - After `fetchClassTypeOptions()`, call `applyHiddenClassTypes(options, hiddenIds)`
- [X] T014 Update: Ensure Day Calendar rendering is NOT affected by hidden class types (visibility affects filters only)
  - Files: src/components/admin-schedule/DayCalendar/day-calendar.tsx
  - Before rendering, filter sessions where `session.classTypeId` NOT IN hiddenIds
- [X] T015 Show clear empty state when all types hidden (with link to open visibility dialog)
  - Files: src/components/admin-schedule/DayCalendar/day-calendar.tsx
- [X] T016 Emit/handle broadcast on save so other open calendar views update immediately
  - Files: src/lib/class-type-visibility-broadcast.ts, src/components/admin-schedule/DayCalendar/day-calendar-filters.tsx

Checkpoint: US1 independently delivers value; Day Calendar and its controls reflect hidden types.

## Phase 4: User Story 2 (P2) – Manageable filter options across views

Goal: Filter controls across other views exclude hidden Class Types to remain manageable.

Independent Test: After hiding several types, opening any Class Type filter elsewhere shows only remaining types; search does not return hidden types.

- [ ] T017 Ensure admin Weekly view filters inherit Day Calendar hidden types
  - Files: src/components/admin-schedule/WeekCalendar/calendar-week.tsx
  - DayCalendarFilters already used; confirm hidden options applied via US1 changes
- [ ] T018 Apply hidden options to Student portal filters (Week/Month)
  - Files: src/app/student/page.tsx
  - Use `useHiddenClassTypes` to filter `classTypeOptions` before rendering Faceted options
- [ ] T019 Apply hidden options to Teacher portal filters (Week/Month)
  - Files: src/app/teacher/page.tsx
  - Use `useHiddenClassTypes` to filter `classTypeOptions`

Checkpoint: US2 independently testable by opening Student/Teacher filters and confirming hidden options are removed.

## Phase 5: User Story 3 (P2) – Quick override and reset

Goal: Users can temporarily “Show all” and permanently “Reset to default (all visible)”.

Independent Test: Toggle “Show all” → all types appear without changing saved preferences; “Reset” clears hidden list and persists.

- [ ] T020 Add "すべて表示" (Show all) temporary override toggle in Day Calendar filters
  - Files: src/components/admin-schedule/DayCalendar/day-calendar-filters.tsx
  - When active, ignore hiddenIds for options and rendering; do not save
- [ ] T021 Add "初期化" (Reset) action to clear hidden IDs
  - Files: src/components/admin-schedule/DayCalendar/manage-class-type-visibility-dialog.tsx
  - Calls `useSetHiddenClassTypes([])`; confirm persisted
- [ ] T022 Optional: Mirror override toggle in Student/Teacher portals
  - Files: src/app/student/page.tsx, src/app/teacher/page.tsx
  - Applies only to options (US2 scope); does not change saved preferences

Checkpoint: US3 independently testable through override and reset behaviors.

## Phase 6: User Story 4 (P3) – Preferences persist per user

Goal: Hidden types persist across sessions/devices tied to the user.

Independent Test: Configure on one device; sign in on another device; preferences load identically.

- [ ] T023 Load server preferences on mount of relevant views and replace local-selection fallback
  - Files: src/components/admin-schedule/DayCalendar/day-calendar-filters.tsx, src/app/student/page.tsx, src/app/teacher/page.tsx
  - Prefer server `useHiddenClassTypes` over `getClassTypeSelection` for visibility; retain local storage only for selection filter state
- [ ] T024 On sign-in/out, invalidate and refetch hidden preferences
  - Files: src/hooks/useClassTypeVisibility.ts
  - Subscribe to auth status and query invalidate on change

Checkpoint: US4 validated by cross-device sign-in test.

## Phase 7: User Story 5 (P3) – New and legacy Class Types

Goal: New Class Types are visible by default; removed/renamed types do not cause errors or stale entries.

Independent Test: New type appears until hidden; removed types are ignored/cleaned on next save.

- [ ] T025 Ensure new types appear by default
  - Files: src/lib/filter-class-type-options.ts
  - Filtering only removes `hiddenIds` that exist in options; unknown IDs ignored
- [ ] T026 Prune invalid IDs on save (server-side)
  - Files: src/app/api/preferences/class-types/route.ts, src/services/user-preferences.ts
  - Remove IDs not present in current Class Types set
- [ ] T027 Optional client cleanup on load/save
  - Files: src/hooks/useClassTypeVisibility.ts
  - If server returns IDs not in options, drop them client-side too (defense in depth)

Checkpoint: US5 validated through add/remove type scenarios.

## Phase N: Polish & Cross-Cutting

- [ ] T028 [P] Accessibility review for visibility dialog and toggles (labels, roles, focus)
- [ ] T029 [P] Performance pass: confirm ≤1s feedback for ≤100 Class Types
- [ ] T030 [P] Docs update: specs/017-add-logic-to/quickstart.md with latest UI steps
- [ ] T031 Code cleanup and consistent naming per repo conventions

---

## Dependencies & Execution Order

- Setup (Phase 1) → Foundational (Phase 2) → US1 (P1) → US2 (P2) + US3 (P2) in parallel → US4 (P3) + US5 (P3) in parallel → Polish

### Story Dependencies
- US1 depends on Foundational
- US2 depends on Foundational; independent of US1 but benefits from shared UI patterns
- US3 depends on Foundational; independent of US1/US2
- US4 depends on Foundational
- US5 depends on Foundational

### Task Parallelization Examples
- Parallel after Phase 2:
  - US2 tasks T018 and T019 can run in parallel ([P])
  - US3 tasks T020 and T022 can run in parallel ([P])
  - Polish tasks T028–T030 are parallel ([P])

## Implementation Strategy

- MVP: Complete Phases 1–3 (US1 only). Ship Day Calendar with visibility control and option filtering.
- Incremental: Add US2 (filters across portals) and US3 (override/reset). Then US4–US5.
- Keep changes minimal; follow existing patterns (Faceted UI, hooks, services). Remove debug logs before commit.

## Summary Metrics

- Independent test criteria per story included in each phase
- Parallel opportunities identified with [P]
- Suggested MVP scope: User Story 1 only
