# Tasks: Class Series Metadata

**Input**: Design documents from `/specs/001-class-series-metadata/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Phase 3.1: Setup

- [x] T001: [P] Create a new Prisma migration for the `ClassSeries` model and the new `status` column in `class_sessions`.
- [ ] T002: [P] Apply the migration to the database.

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

## Phase 3.1: Setup

- [x] T001: [P] Create a new Prisma migration for the `ClassSeries` model and the new `status` column in `class_sessions`.
- [ ] T002: [P] Apply the migration to the database.

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

- [ ] T003: [P] Create contract test for `GET /api/class-series`.
- [ ] T004: [P] Create contract test for `GET /api/class-series/{seriesId}`.
- [ ] T005: [P] Create contract test for `PATCH /api/class-series/{seriesId}`.
- [ ] T006: [P] Create contract test for `POST /api/class-series/{seriesId}/extend`.
- [ ] T007: [P] Create contract test for `GET /api/class-series/summary`.
- [ ] T008: [P] Create integration test for the student summary view.
- [ ] T009: [P] Create integration test for updating a class series and propagating the changes.
- [ ] T010: [P] Create integration test for on-demand generation of class sessions.
- [ ] T011: [P] Create integration test for advance generation of class sessions.

## Phase 3.3: Core Implementation (ONLY after tests are failing)

- [ ] T012: Implement the `GET /api/class-series` endpoint.
- [ ] T013: Implement the `GET /api/class-series/{seriesId}` endpoint.
- [ ] T014: Implement the `PATCH /api/class-series/{seriesId}` endpoint.
- [ ] T015: Implement the `POST /api/class-series/{seriesId}/extend` endpoint.
- [ ] T016: Implement the `GET /api/class-series/summary` endpoint.
- [ ] T017: Create the backfill script to populate the `class_series` table from existing `class_sessions` data.
- [ ] T018: Update the archive function to include the `series_id`.

## Phase 3.4: Integration

- [ ] T019: Integrate the new APIs with the frontend.
- [ ] T020: Create the UI for the student summary view.
- [ ] T021: Create the UI for the series detail drawer.

## Phase 3.5: Polish

- [ ] T022: [P] Write unit tests for the new services.
- [ ] T023: [P] Write unit tests for the new API endpoints.
- [ ] T024: Perform manual testing of the new features.
- [ ] T025: Update the documentation.
- [ ] T004: [P] Create contract test for `GET /api/class-series/{seriesId}`.
- [ ] T005: [P] Create contract test for `PATCH /api/class-series/{seriesId}`.
- [ ] T006: [P] Create contract test for `POST /api/class-series/{seriesId}/extend`.
- [ ] T007: [P] Create contract test for `GET /api/class-series/summary`.
- [ ] T008: [P] Create integration test for the student summary view.
- [ ] T009: [P] Create integration test for updating a class series and propagating the changes.
- [ ] T010: [P] Create integration test for on-demand generation of class sessions.
- [ ] T011: [P] Create integration test for advance generation of class sessions.

## Phase 3.3: Core Implementation (ONLY after tests are failing)

- [ ] T012: Implement the `GET /api/class-series` endpoint.
- [ ] T013: Implement the `GET /api/class-series/{seriesId}` endpoint.
- [ ] T014: Implement the `PATCH /api/class-series/{seriesId}` endpoint.
- [ ] T015: Implement the `POST /api/class-series/{seriesId}/extend` endpoint.
- [ ] T016: Implement the `GET /api/class-series/summary` endpoint.
- [ ] T017: Create the backfill script to populate the `class_series` table from existing `class_sessions` data.
- [ ] T018: Update the archive function to include the `series_id`.

## Phase 3.4: Integration

- [ ] T019: Integrate the new APIs with the frontend.
- [ ] T020: Create the UI for the student summary view.
- [ ] T021: Create the UI for the series detail drawer.

## Phase 3.5: Polish

- [ ] T022: [P] Write unit tests for the new services.
- [ ] T023: [P] Write unit tests for the new API endpoints.
- [ ] T024: Perform manual testing of the new features.
- [ ] T025: Update the documentation.

## Dependencies

- T001, T002 must be completed before any other tasks.
- T003-T011 must be completed before T012-T016.
- T012-T016 must be completed before T019-T021.
- T017, T018 can be done in parallel with other tasks after T002.

## Parallel Example

```
# Launch T003-T011 together:
Task: "Create contract test for GET /api/class-series"
Task: "Create contract test for GET /api/class-series/{seriesId}"
Task: "Create contract test for PATCH /api/class-series/{seriesId}"
Task: "Create contract test for POST /api/class-series/{seriesId}/extend"
Task: "Create contract test for GET /api/class-series/summary"
Task: "Create integration test for the student summary view."
Task: "Create integration test for updating a class series and propagating the changes."
Task: "Create integration test for on-demand generation of class sessions."
Task: "Create integration test for advance generation of class sessions."
```
