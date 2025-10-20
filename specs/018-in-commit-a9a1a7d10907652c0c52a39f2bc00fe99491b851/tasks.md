---
description: "Task list for implementing Global Class Type Filter Visibility (Admin-Controlled)"
---

# Tasks: Global Class Type Filter Visibility (Admin-Controlled)

**Input**: Design documents from `/specs/018-in-commit-a9a1a7d10907652c0c52a39f2bc00fe99491b851/`  
**Prerequisites**: plan.md (required), spec.md (user stories), research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

- [P]: Can run in parallel (different files, no dependencies)
- [Story]: US1, US2, US3 aligned to spec user stories
- Include exact file paths in descriptions

Repo root: `/Users/muhammadnurislomtukhtamishhoji-zoda/Development/schedule-website`

---

## Phase 1: Setup (Shared Infrastructure)

- [x] T001 [P] [Setup] Ensure environment ready and deps installed
  - Commands:
    - `bun install`
    - `bun lint`
    - `bun watch`
  - Paths: N/A

- [x] T002 [P] [Setup] Verify .env is configured
  - Ensure `.env` has `DATABASE_URL` and `DIRECT_URL` (copy from `.env.example` if needed)
  - Paths: `/Users/muhammadnurislomtukhtamishhoji-zoda/Development/schedule-website/.env`

---

## Phase 2: Foundational (Blocking Prerequisites)

- [x] T003 [P] [US1] Update Prisma schema to add global flag
  - Edit: `/Users/muhammadnurislomtukhtamishhoji-zoda/Development/schedule-website/prisma/schema.prisma`
  - Add `visibleInFilters Boolean @default(true)` to `ClassType` model (follow repo Prisma style)

- [x] T004 [US1] Create migration: add field and drop per-user visibility schema
  - Commands:
    - `npx prisma migrate dev --name add-class-type-visible-in-filters-and-drop-per-user-visibility`
  - DB validation (local psql):
    - `PGPASSWORD=postgres psql -h localhost -U postgres -d schedulewebsite -c "\\d+ \"ClassType\""`

- [x] T005 [P] [US1] Backfill/verify defaults
  - Confirm all existing rows have `visibleInFilters = true`
  - Command:
    - `PGPASSWORD=postgres psql -h localhost -U postgres -d schedulewebsite -c "SELECT COUNT(*) FROM \"ClassType\" WHERE \"visibleInFilters\" IS NOT TRUE;"`

- [x] T006 [P] [US1] Update CSV import/export to include `visibleInFilters`
  - Locate CSV code:
    - `rg -n "CSV|import|export" /Users/muhammadnurislomtukhtamishhoji-zoda/Development/schedule-website/src`
    - `rg -n "ClassType|授業タイプ" /Users/muhammadnurislomtukhtamishhoji-zoda/Development/schedule-website/src`
  - Modify CSV mapping to add `visibleInFilters` (boolean per existing convention)

---

## Phase 3: User Story 1 - Admin sets global visibility (Priority: P1) 🎯

### Tests (write first)

- [ ] T007 [P] [US1] Contract test for PATCH /api/admin/masterdata/class-types/{id}
  - Create: `/Users/muhammadnurislomtukhtamishhoji-zoda/Development/schedule-website/src/app/api/admin/masterdata/class-types/__tests__/update-visibility.contract.test.ts`
  - Cover: 401 (unauth), 403 (non-admin), 404 (not found), 200 (updates `visibleInFilters`)

- [ ] T008 [P] [US1] Integration test: Admin toggles a class type; filters reflect globally
  - Create: `/Users/muhammadnurislomtukhtamishhoji-zoda/Development/schedule-website/src/app/(admin)/__tests__/class-types-visibility.integration.test.ts`
  - Verify: toggle ON/OFF changes filter options for student/teacher/staff on next fetch

### Implementation

- [x] T009 [US1] Implement PATCH endpoint to update `visibleInFilters`
  - File: `/Users/muhammadnurislomtukhtamishhoji-zoda/Development/schedule-website/src/app/api/admin/masterdata/class-types/[id]/route.ts`
  - Enforce Admin-only authorization using existing auth utilities
  - Parse/validate body (Zod if used), update via Prisma, return updated record subset

- [x] T010 [P] [US1] Add Admin UI toggle column in 授業タイプ table
  - Locate 授業タイプ masterdata table component:
    - `rg -n "授業タイプ|class type" /Users/muhammadnurislomtukhtamishhoji-zoda/Development/schedule-website/src/app`
  - Modify: add per-row toggle (label 「フィルター表示」) bound to `visibleInFilters`
  - Wire optimistic update using existing table toggle pattern

- [x] T011 [P] [US1] Remove 表示管理 button and any per-user visibility UI
  - Search and remove:
    - `rg -n "表示管理" /Users/muhammadnurislomtukhtamishhoji-zoda/Development/schedule-website/src`
  - Delete related components/routes; ensure no dead links

---

## Phase 4: User Story 2 - Remove per-user management UI (Priority: P2)

### Tests (write first)

- [ ] T012 [P] [US2] Regression test: 表示管理 not rendered for any role
  - Create colocated test near removed component (path discovered via T011 search)

### Implementation

- [x] T013 [US2] Delete per-user visibility code paths (reads/writes)
  - Search:
    - `rg -n "visibility|filter|class type" /Users/muhammadnurislomtukhtamishhoji-zoda/Development/schedule-website/src`
  - Remove per-user preference storage and references

---

## Phase 5: User Story 3 - All roles consume global setting (Priority: P3)

### Tests (write first)

- [ ] T014 [P] [US3] Integration test: all roles see same filter set
  - Create: `/Users/muhammadnurislomtukhtamishhoji-zoda/Development/schedule-website/src/components/__tests__/class-type-filters.roles.integration.test.ts`

### Implementation

- [x] T015 [US3] Update filter option sources to respect `visibleInFilters`
  - Locate filter options provider/functions:
    - `rg -n "class type" /Users/muhammadnurislomtukhtamishhoji-zoda/Development/schedule-website/src`
  - Ensure queries limit to `visibleInFilters = true` for all roles

---

## Phase 6: Integration & Cross-Cutting

- [ ] T016 [P] Add server-side authorization guard reuse
  - Ensure Admin check is centralized and reused by the PATCH endpoint

- [ ] T017 [P] Update localization strings
  - Add/verify 「フィルター表示」 label in i18n file if applicable

- [ ] T018 [P] Logging/observability parity
  - Ensure consistent error handling and logging on PATCH route; no new audit logging added

---

## Phase 7: Polish

- [ ] T019 [P] Unit tests: CSV mapper, UI toggle component, service function
- [ ] T020 [P] Docs: Update admin guide and CHANGELOG; reference quickstart
- [ ] T021 [P] Validate in staging: migration applied; no per-user schema references; CSV round‑trip works

---

## Dependencies & Execution Order

- T001, T002 → T003, T004, T005, T006
- T003, T004 → T007..T011
- T011 → T012
- T015 depends on locating and updating filter sources; can run after T003/T004

Parallel opportunities [P]: T001, T002, T005, T006, T007, T008, T010, T011, T012, T014, T016, T017, T018, T019, T020, T021

---

## Parallel Execution Examples

Commands (run from repo root): `/Users/muhammadnurislomtukhtamishhoji-zoda/Development/schedule-website`

```bash
# Run setup in parallel
bun install &
bun lint &
wait

# Contract + integration tests for US1 (write-first)
# Create test files, then run (if test runner configured):
bun test

# DB checks (local Postgres)
PGPASSWORD=postgres psql -h localhost -U postgres -d schedulewebsite -c "SELECT id, name, \"visibleInFilters\" FROM \"ClassType\" LIMIT 5;"
```

---

## Implementation Strategy

- Practice TDD for T007/T008 → T009..T011
- Keep DB migration atomic: add field + drop per-user schema together
- Remove dead code as part of US2 to avoid mixed mode
- Filters-only: do not hide calendar/content (verify in tests)

## Done Criteria

- All success criteria SC-001..SC-009 satisfied and verified via tests/checks
