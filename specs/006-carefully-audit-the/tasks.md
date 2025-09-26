# Tasks: Audit and Refine Class Series Generation

**Input**: Design documents from `/specs/006-carefully-audit-the/`
**Prerequisites**: spec.md

## Execution Flow
The process for this audit is as follows:
1.  **Audit & Setup**: Understand the existing code and prepare the testing environment.
2.  **Test Existing Behavior**: Write tests based on the `spec.md` acceptance criteria to validate the current implementation and identify bugs.
3.  **Implement Fixes**: Address the issues discovered during testing.
4.  **Integrate & Refine**: Improve logging, metrics, and error handling.
5.  **Polish & Document**: Finalize documentation and performance tests.

## Path Conventions
- Source code: `src/`
- Test code: `tests/`
- Documentation: `docs/`

---

## Phase 3.1: Audit & Setup
- [x] T001: **Initial Code Audit**. Search the codebase for "ClassSeries", "Scheduling Configuration", and "generation" to identify all relevant files (services, jobs, models) related to the class series generation process.
- [x] T002: **Document Existing Flow**. Based on the audit, create a temporary document outlining the current step-by-step process of how class sessions are generated from series, including configuration resolution. (See `specs/006-carefully-audit-the/research.md`)
- [x] T003: **Setup Local Test Environment**. Write a seed script in `prisma/seed.ts` to populate the local database with necessary data (base/branch/series configurations, users, class series) to manually trigger and test the generation process. (Global + East branch overrides seeded)

## Phase 3.2: Tests First (Verify Existing Behavior)
**CRITICAL: These tests target the existing implementation to expose bugs before fixing them.**
- [ ] T004 [P]: **Integration Test for Config Precedence**. In `tests/integration/class-series-generation.test.ts`, write a test to verify that scheduling configurations are resolved in the correct order: Per-Series > Branch-Specific > Base (FR-001, Scenarios 1 & 2).
- [ ] T005 [P]: **Integration Test for Idempotency**. In `tests/integration/class-series-generation.test.ts`, write a test to confirm that running the generation process multiple times produces an identical set of class sessions (FR-002, Scenario 3).
- [ ] T006 [P]: **Integration Test for Timezone Handling**. In `tests/integration/class-series-generation.test.ts`, create a test for a class series that spans a Daylight Saving Time transition and assert that session times are correct (FR-003, Scenario 4).
- [ ] T007 [P]: **Integration Test for Series Cleanup**. In `tests/integration/class-series-generation.test.ts`, write a test to ensure that a `ClassSeries` is deleted after its `endDate` is reached, while its sessions remain (FR-004, Scenario 5).
- [ ] T008 [P]: **Integration Test for Interrupted Jobs**. In `tests/integration/class-series-generation.test.ts`, simulate a job interruption and verify that it can resume from the last completed step on the next run (FR-010).
- [ ] T009 [P]: **Integration Test for Concurrency**. In `tests/integration/class-series-generation.test.ts`, write a test that updates a `ClassSeries` while a generation job for it is running and confirms the job completes with its initial configuration (FR-011).
 - [x] T004 [P]: **Integration Test for Config Precedence** (added + passing).
 - [x] T005 [P]: **Integration Test for Idempotency** (added + passing).
 - [x] T006 [P]: **Integration Test for Timezone Handling** (added + passing). Implemented optional `timezone` on `class_series` and DST-aware generation.
 - [x] T007 [P]: **Integration Test for Series Cleanup** (added + passing).
 - [x] T008 [P]: **Integration Test for Interrupted Jobs** (added + passing). Implemented conservative advancement of `last_generated_through`.
 - [x] T009 [P]: **Integration Test for Concurrency** (added + passing). Implemented advisory locks.

## Phase 3.3: Core Implementation (Fixes)
**ONLY begin after tests in Phase 3.2 are written and their results are known.**
- [x] T010: **Fix Config Precedence**. Based on the results of T004, correct the configuration resolution logic. (Depends on T004)
- [x] T011: **Fix Idempotency Issues**. Based on the results of T005, modify the generation logic to ensure it is fully idempotent. (Depends on T005)
- [x] T012: **Fix Timezone/DST Bugs**. Implemented per-series timezone and DST-safe generation.
- [x] T013: **Fix Series Cleanup Logic**. Confirmed deletion of blueprint at endDate boundary with sessions preserved.
- [x] T014: **Implement Job Resumption**. Conservative advancement of lastGeneratedThrough + idempotent re-run.
- [x] T015: **Implement Concurrency Control**. Based on the results of T009, add a locking mechanism or state check to prevent race conditions from concurrent updates. (Depends on T009)

## Phase 3.4: Integration & Refinement
- [ ] T016: **Audit and Improve Logging**. Review and enhance the logging throughout the generation and cleanup process to ensure logs are clear and actionable (FR-005).
- [ ] T017: **Verify Environment Safeguards**. Check for existing feature flags or environment variables that prevent the process from running in production. Add them if they are missing (FR-006).
- [ ] T018: **Audit and Improve Metrics**. Review and enhance the metrics collection for job duration, sessions created/deleted, and errors (FR-012).
- [x] T019: **Implement Conflicting Rule Reporting**. Validation + best-effort system notification (`recipientType=SYSTEM`). Controlled by `ADMIN_NOTIFY_RECIPIENT` env; always logs.
 - [x] T016: **Audit and Improve Logging**. Added structured summary log in cron endpoint.
 - [x] T017: **Verify Environment Safeguards**. Added `ENABLE_SERIES_GENERATION` gate to cron in production.
 - [x] T018: **Audit and Improve Metrics**. Added `durationMs` and aggregated counters in cron response; logs include summary.
 - [ ] T019: **Implement Conflicting Rule Reporting**. Pending admin notification channel decision (currently structured responses + logs only).

## Phase 3.5: Polish & Documentation
- [ ] T020 [P]: **Performance Benchmark Test**. In `tests/performance/class-series-generation.test.ts`, create a test with a large and complex class series to benchmark the generation job's runtime and ensure it completes in under 30 minutes (NFR-001).
- [x] T021 [P]: **Create Documentation**. Create a new file `docs/class-series-generation.md` and document the configuration precedence rules, the expected cron schedule, and the steps for manual testing (FR-009).
- [ ] T022: **Final Code Review**. Perform a final review of all changes to ensure code quality, remove any temporary documentation or scripts, and confirm all tests are passing.

## Dependencies
- **Phase 3.1** must be completed before other phases.
- **Phase 3.2** (tests) should be completed before **Phase 3.3** (fixes).
- Tasks in **Phase 3.3** depend on the corresponding tests in **Phase 3.2**.

## Parallel Example
```
# The following tests can be worked on in parallel:
Task: "T004 [P]: Integration Test for Config Precedence"
Task: "T005 [P]: Integration Test for Idempotency"
Task: "T006 [P]: Integration Test for Timezone Handling"
Task: "T007 [P]: Integration Test for Series Cleanup"
Task: "T008 [P]: Integration Test for Interrupted Jobs"
Task: "T009 [P]: Integration Test for Concurrency"

# The following polish tasks can be worked on in parallel:
Task: "T020 [P]: Performance Benchmark Test"
Task: "T021 [P]: Create Documentation"
```
