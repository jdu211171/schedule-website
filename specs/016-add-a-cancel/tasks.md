---
description: "Task list for implementing Cancel From This Point (キャンセル)"
---

# Tasks: Cancel Class Sessions From This Point (キャンセル)

**Input**: Design documents from `/specs/016-add-a-cancel/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are optional. The spec does not explicitly request TDD; omit test tasks unless requested later.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm environment and branch context

- [x] T001 [P] Verify active branch `016-add-a-cancel`; run `bun dev` to ensure app compiles cleanly
- [x] T002 [P] Review spec and plan for this feature: `specs/016-add-a-cancel/spec.md`, `specs/016-add-a-cancel/plan.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Confirm core building blocks required by all stories

- [x] T003 [P] Validate cancel API contract exists and is reachable: `src/app/api/class-sessions/cancel/route.ts`
- [x] T004 [P] Validate series status patch endpoint exists: `src/app/api/class-series/[seriesId]/route.ts` (PATCH with `{ status: 'PAUSED' }`)
- [x] T005 [P] Confirm hooks used by UI exist: `src/hooks/useClassSessionMutation.ts` (useClassSessionCancel), `src/hooks/use-class-series.ts` (useUpdateClassSeries)
- [x] T006 Ensure `ConfirmDeleteDialog` supports custom title/description/confirmText: `src/components/admin-schedule/confirm-delete-dialog.tsx`

**Checkpoint**: Foundation ready — proceed to user stories

---

## Phase 3: User Story 1 - Cancel this and future sessions (Priority: P1) 🎯 MVP

**Goal**: From 授業の編集, allow choosing 「この回以降をキャンセル」 to cancel the selected occurrence and all future ones, then set the series status to `PAUSED` so no new sessions generate.

**Independent Test**: In a recurring series with future sessions, open 授業の編集 → キャンセル → この回以降をキャンセル → confirm; verify current+future occurrences are cancelled and the series shows `PAUSED`; no new sessions generate thereafter.

### Implementation for User Story 1

- [x] T007 [US1] Add キャンセル action next to 削除 in edit mode UI: `src/components/admin-schedule/DayCalendar/lesson-dialog.tsx`
  - Place alongside existing delete button with similar styling and disabled states
- [x] T008 [US1] Add cancellation scope selector (single/series) for recurring lessons in edit mode: `lesson-dialog.tsx`
  - Mirror delete’s radio group pattern; labels: 「この授業のみキャンセル」「この回以降をキャンセル」
- [x] T009 [US1] Implement confirm dialog for cancellation using `ConfirmDeleteDialog`: `lesson-dialog.tsx`
  - Title: 「シリーズのキャンセル」 when series scope; otherwise 「授業のキャンセル」
  - Description: follow spec copy; include date/time for single, and scope message for series
  - Confirm text: 「キャンセル」/「シリーズをキャンセル」
- [x] T010 [US1] Implement “from this point” cancellation flow: `lesson-dialog.tsx`
  - Compute pivot from selected occurrence date (use existing `getDisplayDate()` → format `yyyy-MM-dd`)
  - Call `useClassSessionCancel().mutateAsync({ seriesId: lesson.seriesId, fromDate })`
  - On success, call `useUpdateClassSeries(lesson.seriesId).mutateAsync({ status: 'PAUSED' })`
  - Toast success/failure; close dialog; invalidate/reload affected queries
- [x] T011 [US1] Ensure idempotent UX: handle zero-updated case gracefully and still set series to `PAUSED`: `lesson-dialog.tsx`
- [x] T012 [US1] Docs: Update quickstart steps to include P1 flow verification in `specs/016-add-a-cancel/quickstart.md`

**Checkpoint**: User Story 1 complete and independently testable

---

## Addendum (Blueprint Update & Validation)

- [x] T025 [US1] After series “この回以降をキャンセル”, PATCH series blueprint via `useUpdateClassSeries` with `{ endDate: pivot, lastGeneratedThrough: pivot, status: 'PAUSED' }` to mirror 削除 and prevent regeneration
- [x] T026 [P] Verify cancellation notifications mirror delete (audience/channels/timing); adjust backend if needed
- [x] T027 [P] Performance check: measure end-to-end time for cancel-from-point on a large series (hundreds of future); confirm ≤ 30s and record results in quickstart.md

---

## Phase 4: User Story 2 - Cancel only this occurrence (Priority: P2)

**Goal**: Allow canceling just the selected occurrence in edit mode without affecting series status.

**Independent Test**: In a recurring series, open 授業の編集 → キャンセル → この授業のみキャンセル → confirm; verify only the selected session is cancelled and the series remains active.

### Implementation for User Story 2

- [x] T013 [US2] Wire “single” cancellation path in edit mode scope selector: `lesson-dialog.tsx`
  - Use `useClassSessionCancel().mutateAsync({ classIds: [lesson.classId] })`
  - Preserve existing view-mode single-cancel behavior; avoid duplication
- [x] T014 [US2] Confirmation UX: Reuse `ConfirmDeleteDialog` with single-cancel title/description: `lesson-dialog.tsx`
- [x] T015 [US2] Invalidate affected day queries and close dialog on success: `lesson-dialog.tsx`

**Checkpoint**: User Story 2 complete and independently testable

---

## Phase 5: User Story 3 - Safety, idempotency, and states (Priority: P3)

**Goal**: Prevent or gracefully no-op duplicate cancellations; handle last-occurence/no-future cases; respect permissions and existing PAUSED series.

**Independent Test**: Attempt to cancel already cancelled occurrence → disabled or safe no-op; choose series-cancel with no future sessions → only current cancelled and series set to `PAUSED` without error; repeat on already `PAUSED` series → series remains `PAUSED`.

### Implementation for User Story 3

- [x] T016 [US3] Disable or no-op キャンセル when `lesson.isCancelled` is true: `lesson-dialog.tsx`
- [x] T017 [US3] Ensure series-cancel always sets `PAUSED` even if no future sessions were found: `lesson-dialog.tsx`
- [x] T018 [US3] Align permission visibility with 削除: ensure cancel controls render only for allowed roles/contexts (match existing conditions): `lesson-dialog.tsx`
- [x] T019 [US3] Ensure toasts/messages clearly differentiate “キャンセル” vs “削除”: `lesson-dialog.tsx`

**Checkpoint**: User Story 3 complete and independently testable

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements covering multiple stories

- [x] T020 [P] Documentation polish in `specs/016-add-a-cancel/quickstart.md` and `specs/016-add-a-cancel/spec.md` Clarifications
- [x] T021 Code cleanup in `lesson-dialog.tsx` to remove dead code paths and ensure consistent labels
- [ ] T022 [P] Run `bun lint` and fix TypeScript errors introduced by changes
- [x] T023 Security/permissions quick review to ensure parity with 削除 across views
- [x] T024 [P] Validate UX copy against spec: 「キャンセル」「この授業のみキャンセル」「この回以降をキャンセル」

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1): No dependencies
- Foundational (Phase 2): Depends on Setup completion — validates APIs/hooks before UI work
- User Stories (Phase 3+): Depend on Foundational — implement in priority order (P1 → P2 → P3)
- Polish (Final Phase): After user stories

### User Story Dependencies

- User Story 1 (P1): Independent after foundational
- User Story 2 (P2): Independent after foundational; shares UI scaffolding from P1 but can be implemented separately
- User Story 3 (P3): Independent after foundational; builds on behaviors from P1/P2 but testable alone

### Parallel Opportunities

- [P] T001, T002, T003, T004, T005, T006, T012, T020, T022, T024 can run in parallel (different files or docs)
- Within stories, most changes occur in `lesson-dialog.tsx` and should be sequential (no [P])

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Setup + Foundational (T001–T006)
2. Implement P1 tasks (T007–T012)
3. Validate flows via Quickstart
4. Ship MVP; then iterate on P2 and P3

### Incremental Delivery

- Deliver P1, then P2, then P3; each is independently testable and valuable
