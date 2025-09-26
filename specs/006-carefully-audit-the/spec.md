# Feature Specification: Audit and Refine Class Series Generation

**Feature Branch**: `006-carefully-audit-the`  
**Created**: 2025-09-23  
**Status**: Draft  
**Input**: User description: "Carefully audit the class series generation implementation end-to-end. Confirm that class sessions are generated from class series according to rules defined in the separate rules model, and that configuration resolution correctly derives from base configs, applies global branch-specific overrides, and supports per-series overrides with predictable precedence. Trace the flow step by step to identify any issues, bugs, or edge cases, including idempotency on repeated runs, timezone handling, daylight saving, boundaries at start/end dates, and partial updates. Manually test the full flow: simulate cron job executions locally, verify that sessions are created exactly as expected in the local database (counts, dates, times, instructors/rooms if applicable), and ensure deletions/cleanup occur when series reach their end time, with no orphaned or duplicate records. Validate that reruns produce consistent results, logs are clear and actionable, failures are retried or surfaced, and feature flags or environment guards prevent unintended production changes. Provide concrete fixes with minimal code changes, add unit/integration tests for rule resolution and generation/deletion, document the precedence and cron schedule, and include before/after database snapshots and test steps to reproduce."

---
## Clarifications

### Session 2025-09-23
- Q: When a generation or cleanup job is interrupted and restarted, how should it handle sessions from the failed run? → A: Identify the last successfully completed step and resume from that point.
- Q: What should happen if a class series is updated while a generation job for that same series is already in progress? → A: The running job should complete using the configuration from when it started.
- Q: For observability, what key metric should be prioritized for the generation process? → A: All of the above.
- Q: What is the maximum acceptable runtime for a single, typical class series generation job? → A: Under 30 minutes.
- Q: To be clear, which of these is the correct behavior after a series' `endDate` is reached? → A: Delete the Class Series itself, but keep all its generated Class Sessions.

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
As a System Administrator, I want to ensure the automated class session generation process is reliable, predictable, and robust, so that class schedules are always accurate and maintainable without manual intervention.

### Acceptance Scenarios
1.  **Given** a base scheduling configuration and a branch-specific override, **When** the generation process runs for a class series without its own override, **Then** the branch-specific override MUST be applied.
2.  **Given** a class series with a specific scheduling rule override, **When** the generation process runs, **Then** the series-specific override MUST take precedence over all other configurations.
3.  **Given** the generation process is executed multiple times for the same time period, **When** no underlying data has changed, **Then** the resulting class sessions in the database MUST remain identical (idempotency).
4.  **Given** a class series that spans a daylight saving time transition, **When** sessions are generated, **Then** the session times MUST be correct according to the local timezone.
5.  **Given** a class series reaches its `end` date, **When** the cleanup process runs, **Then** the class series itself MUST be deleted, leaving all its generated class sessions untouched.

### Edge Cases
- How does the system handle a run that is interrupted mid-way? → It should identify the last successfully completed step and resume from that point.
- What happens if the database connection is lost during a generation or cleanup operation? → The job should fail and resume on the next run.
- How are invalid or conflicting rules in the configuration resolved or reported? → [NEEDS CLARIFICATION: What is the desired reporting mechanism for conflicting rules? e.g., log error, admin notification]
- What is the behavior when a class series is updated while a generation job for it is already running? → The running job should complete using the configuration from when it started.

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: The system MUST correctly resolve scheduling configurations with a clear precedence order: Per-Series Override > Global Branch-Specific Override > Base Configuration.
- **FR-002**: The class session generation process MUST be idempotent.
- **FR-003**: The system MUST handle timezone conversions and daylight saving time changes accurately.
- **FR-004**: The system MUST automatically delete a `Class Series` after its `endDate` is reached.
- **FR-005**: The generation and cleanup processes MUST produce clear, actionable logs.
- **FR-006**: The system MUST have safeguards (e.g., feature flags) to prevent unintended execution in the production environment.
- **FR-007**: The system MUST include unit and/or integration tests for configuration resolution logic.
- **FR-008**: The system MUST include unit and/or integration tests for the session generation and deletion logic.
- **FR-009**: The configuration precedence, cron schedule, and manual testing procedures MUST be documented.
- **FR-010**: Interrupted jobs MUST be able to resume from the last successfully completed step.
- **FR-011**: A running generation job MUST NOT be affected by concurrent updates to its class series.
- **FR-012**: The generation process MUST record metrics for job duration, number of sessions created/deleted, and number of errors.

### Non-Functional Requirements
- **NFR-001**: A typical class series generation job MUST complete in under 30 minutes.

### Key Entities *(include if feature involves data)*
- **Scheduling Configuration**: Rules defining when and how class sessions are generated. Includes base, branch-specific, and series-specific levels.
- **Class Series**: A template for creating multiple `Class Sessions` over a period.
- **Class Session**: An individual, scheduled class instance with a specific time, date, and resources.

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [ ] No implementation details (languages, frameworks, APIs)
- [ ] Focused on user value and business needs
- [ ] Written for non-technical stakeholders
- [ ] All mandatory sections completed

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain
- [ ] Requirements are testable and unambiguous  
- [ ] Success criteria are measurable
- [ ] Scope is clearly bounded
- [ ] Dependencies and assumptions identified

---

## Execution Status
*Updated by main() during processing*

- [ ] User description parsed
- [ ] Key concepts extracted
- [ ] Ambiguities marked
- [ ] User scenarios defined
- [ ] Requirements generated
- [ ] Entities identified
- [ ] Review checklist passed

---