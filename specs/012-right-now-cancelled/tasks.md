# Tasks: Exclude Cancelled Lessons from Conflict Detection in Day Calendar

**Input**: Design documents from `/specs/012-right-now-cancelled/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Phase 3.1: Setup
- [ ] T001 Ensure dev env ready per repo (Bun, TS strict). Verify with `bun --version` and `bun dev` quick boot.
- [ ] T002 [P] Create test scaffolding for Day Calendar if missing in `tests/` (Vitest + RTL config or local patterns). Paths under `tests/integration/` and `tests/unit/`.
- [ ] T003 [P] Lint/typecheck baseline before changes: run `bun lint` and `bun watch` to capture existing baseline errors.

## Phase 3.2: Tests First (TDD) — MUST FAIL before 3.3
- [x] T004 [P] Integration test: Cancelled overlap does NOT show conflict in Day Calendar. Add `tests/integration/day-calendar.cancelled-exclusion.test.tsx` covering quickstart steps (toggle ON, mixed active/cancelled overlap → no conflict).
- [x] T005 [P] Integration test: Active/active overlap DOES show conflict. Add `tests/integration/day-calendar.active-conflict.test.tsx`.
- [x] T006 [P] Unit test: Overlap helpers ignore `isCancelled`. Add `tests/unit/day-calendar.overlap-helpers.test.ts` for booth/teacher/student overlap functions.
- [x] T007 [P] Unit test: LessonCard conflict visuals depend on computed overlap only (not isCancelled). Add `tests/unit/lesson-card.visuals.test.tsx`.

## Phase 3.3: Core Implementation (ONLY after tests are failing)
- [x] T008 Update `src/components/admin-schedule/DayCalendar/day-calendar.tsx`: In `hasBoothOverlap`, `hasTeacherOverlap`, `hasStudentOverlap` computations, skip any `s2.isCancelled === true` and skip current session if `session.isCancelled`.
- [ ] T009 Update `src/components/admin-schedule/DayCalendar/lesson-card.tsx`: Ensure `isConflictVisual` derives only from overlap props and that cancelled cards never set/receive conflict stripes due to cancelled neighbors.
- [ ] T010 Verify `src/components/admin-schedule/DayCalendar/admin-calendar-day.tsx` continues to use `includeCancelled` for visibility only; do not alter conflict logic there.

## Phase 3.4: Integration
- [ ] T011 Confirm fetch layer already supports cancelled visibility via `filters.includeCancelled`. No backend change needed (contracts/README.md).
- [ ] T012 Add minimal telemetry logs (console.warn only for dev) around overlap counts for debugging, then remove before final per repo standards.

## Phase 3.5: Polish
- [x] T013 [P] Refactor: Extract tiny overlap predicate util for reuse (pure function) in `src/components/admin-schedule/DayCalendar/` and update unit tests accordingly.
- [x] T014 [P] Performance pass: Validate no regression in client render for typical day loads (<= ~200ms extra on overlap compute). Document findings in `specs/012-right-now-cancelled/research.md`.
- [x] T015 [P] Docs: Update `quickstart.md` with any test data assumptions and exact selectors used in tests.
- [x] T016 Lint/typecheck: `bun lint` and fix TS/ESLint issues introduced. (Repo has pre-existing lint errors outside this feature; typecheck passes and lint for changed files shows only legacy issues we did not alter.)
- [ ] T017 Manual QA: Follow quickstart. Verify toggling “キャンセル授業を表示” changes visibility only, not conflicts.

## Dependencies
- T004–T007 (tests) before T008–T010 (implementation).
- T008 blocks T013 (refactor using finalized predicate).
- T011 can run parallel but should be verified before closing.
- T016 runs after implementation changes.

## Parallel Execution Examples
```
# Example: run tests creation in parallel
Task: "Integration test: Cancelled overlap does NOT show conflict in Day Calendar"  # T004 [P]
Task: "Integration test: Active/active overlap DOES show conflict"                  # T005 [P]
Task: "Unit test: Overlap helpers ignore isCancelled"                              # T006 [P]
Task: "Unit test: LessonCard conflict visuals"                                     # T007 [P]

# Example: polish tasks in parallel
Task: "Refactor: overlap predicate util"                                          # T013 [P]
Task: "Performance pass and doc results"                                          # T014 [P]
Task: "Docs: update quickstart details"                                           # T015 [P]
```

## Notes
- Use Vitest + RTL for tests; place under `tests/` with clear names.
- Keep changes minimal; do not alter unrelated components.
- Respect visibility toggle semantics; conflicts computed among active lessons only.
- Remove any temporary logs before completion.
