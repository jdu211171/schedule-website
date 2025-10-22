# Feature Specification: Notification Sending Pipeline — Reliability & Efficiency

**Feature Branch**: `016-audit-and-improve`  
**Created**: 2025-10-10  
**Status**: Draft  
**Input**: User description: "Audit and improve our LINE notification sending pipeline deployed on Vercel. Examine current cron-triggered logic, code paths, retries/backoff, batching, rate limiting, parallelization, and error handling. Document the existing flow (data sources, queueing, scheduling, delivery), identify bottlenecks (cold starts, network latency, API constraints, serialization/IO), and propose a minimal-change plan to increase reliability, efficiency, and speed. Include: instrumentation targets and metrics, log/trace schema, retry and dedupe strategy, idempotency keys, batch sizes and concurrency limits, API usage optimization, timeouts and circuit breakers, and fallbacks to queued re-delivery. Produce a step-by-step migration plan, acceptance criteria, and a rollback path, referencing existing project patterns and prior commits to keep changes consistent."

## Clarifications

### Session 2025-10-10

- Q: Which fields should define the idempotency key for at‑most‑once delivery? → A: recipientId + recipientType + notificationType + targetDate + branchId

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Reliable, on-time delivery with visibility (Priority: P1)

As an operations owner, I need scheduled notifications to be created and delivered on time with clear visibility (counts, success/failure breakdowns, and traces), so I can trust the system and diagnose issues quickly without manual retries.

**Why this priority**: Directly impacts customer communication and operational trust; visibility reduces support burden and accelerates issue resolution.

**Independent Test**: Trigger one scheduled cycle with representative volume; verify creation, grouping, and delivery complete within target time; verify dashboards/logs report consistent counts and trace a sample notification end-to-end.

**Acceptance Scenarios**:

1. Given a scheduled window and eligible recipients, When a cycle runs, Then notifications are created and delivered within the defined target time window and totals match instrumentation (created = sent + failed + skipped).
2. Given transient connectivity issues during delivery, When the system retries, Then no recipient receives a duplicate message and the cycle finishes within the overall time budget with accurate failure categorization and audit logs.

---

### User Story 2 - Safe retries with at-most-once semantics (Priority: P2)

As a branch administrator, I need message retries that prevent duplicate deliveries even across failures and restarts, so recipients never get repeated messages for the same content/date.

**Why this priority**: Protects user trust and reduces noise; avoids manual cleanup and complaints.

**Independent Test**: Inject failures for a subset of recipients; re-run processing multiple times; verify no recipient gets a duplicate delivery while failures are retried according to policy.

**Acceptance Scenarios**:

1. Given a previously failed delivery, When the system retries, Then delivery occurs at most once per recipient for that notification.
2. Given the same content/date/recipient appears more than once in the queue, When processing occurs, Then duplicates are detected and suppressed without emitting extra deliveries.

---

### User Story 3 - Phased rollout with rollback (Priority: P3)

As a release owner, I need a step-by-step rollout with guardrails and a rollback path, so improvements can be enabled safely and reverted without disrupting current operations.

**Why this priority**: Reduces deployment risk and ensures continuity of business-critical communications.

**Independent Test**: Enable improvements in a small scope first; validate metrics and outcomes; expand scope; confirm that disabling toggles reverts to prior behavior without data loss.

**Acceptance Scenarios**:

1. Given guarded rollout stages, When a stage is enabled, Then only that stage’s changes apply and can be disabled independently.
2. Given a rollback is requested, When rollback is executed, Then prior behavior resumes immediately and queued work remains intact for normal processing.

---

### Edge Cases

- No eligible recipients linked for a message: cycle completes with recipients marked as skipped and no retries scheduled for them.
- Non-working/holiday dates for a site: notifications for those dates are not delivered, with clear skip reasons in logs.
- Large identical messages across many recipients: grouped delivery respects provider constraints and splits into safe batch sizes without partial data loss.
- Prolonged external service slowdown: backoff extends retries across cycles without exceeding overall time budgets; circuit breaker prevents thrashing.
- Repeated process restarts: idempotency prevents duplicate deliveries; in-flight work can resume safely.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001: Current-state documentation** — The system MUST produce an up-to-date description of the end-to-end notification flow (data sources, queueing, scheduling cadence, grouping, delivery outcomes) and surface it to stakeholders as part of the release notes.
- **FR-002: Time-windowed scheduling** — The system MUST evaluate scheduled notifications within a configurable window and create work only once per template/date/recipient/site combination.
- **FR-003: Queue uniqueness** — The system MUST ensure at most one queued item exists per (recipient, recipient role, date, template/category, site) combination for a given day.
- **FR-004: Grouped delivery** — The system MUST group deliveries by channel/site and identical content to minimize external API calls while staying within safe batch limits.
- **FR-005: Batching limits** — The system MUST enforce default batch sizes and maximum recipients per request (defaults: batch size 50; per-request recipients 200) with configuration to tune per environment.
- **FR-006: Concurrency limits** — The system MUST cap concurrent delivery groups (default: 3) and include a small, configurable delay between batches to reduce burst load.
- **FR-007: Retry/backoff policy** — The system MUST retry transient failures up to 3 attempts with exponential backoff (e.g., ~10s, ~30s, ~120s cumulative), rescheduling remaining attempts in subsequent cycles when needed.
- **FR-008: Failure classification** — The system MUST classify outcomes into success, skipped (e.g., no link/holiday), transient failure (retryable), and permanent failure (non-retryable) and record the category.
- **FR-009: At-most-once via idempotency** — The system MUST attach idempotency to each delivery target and to each grouped request. Queue-level idempotency key MUST be: recipientId + recipientType + notificationType + targetDate + branchId. Group-level idempotency SHOULD be: channelId + message content hash. These prevent duplicates across retries/replays.
- **FR-010: Send-time deduplication** — The system MUST suppress duplicate deliveries in the same or overlapping cycles, even if queue entries are duplicated downstream.
- **FR-011: Timeouts & circuit breaker** — The system MUST apply bounded per-request timeouts (default: 5 seconds) and open a circuit after repeated provider/limit errors, pausing further sends for a cooling period (default: 60 seconds) while preserving the queue.
- **FR-012: Instrumentation metrics** — The system MUST record: items created, grouped requests, recipients per group, successes, skips, transient failures, permanent failures, average/percentile time to send, age of oldest pending, attempt distribution, and per-cycle execution time.
- **FR-013: Log/trace schema** — The system MUST emit structured logs including: flow_id (cycle), run_id (invocation), template_id/category, site/channel identifier, batch_id, group_id, notification_id, recipient_id (hashed), status, attempt, duration_ms, outcome code, error category/code, and counts.
- **FR-014: Safe fallbacks** — The system MUST reschedule retryable items without manual intervention and avoid starvation; non-retryable items MUST be finalized with reasons for triage.
- **FR-015: Minimal-change posture** — The improvements MUST preserve existing user-visible behavior and data shape while strengthening reliability and performance.
- **FR-016: Rollout & rollback** — The system MUST provide a staged rollout plan (observability-only → guarded idempotency/dedupe → tuned batching/concurrency → backoff/circuit breaker) and a documented rollback that restores the prior behavior promptly.

### Key Entities _(include if feature involves data)_

- **Notification**: Business event to deliver to one recipient for a given date/category/site; attributes include identity (recipient, date, category, site), status, attempts, scheduled time, and audit log.
- **Delivery Group**: A set of recipients sharing identical content and channel/site; carries a group-level idempotency key and size limits.
- **Delivery Run**: One processing cycle with a unique flow_id/run_id that correlates creation, grouping, and delivery logs.
- **Idempotency Key**: Deterministic token for at‑most‑once semantics. Queue-level key: recipientId + recipientType + notificationType + targetDate + branchId. Group-level key: channelId + message content hash.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001 (Timeliness)**: 95% of scheduled notifications complete end-to-end within 3 minutes of the scheduled window; 99% within 10 minutes.
- **SC-002 (Reliability)**: Duplicate deliveries per notification per recipient are 0 across normal operations and during retries.
- **SC-003 (Resilience)**: Under a 30% transient error rate, at least 90% of retryable deliveries succeed within the same day without manual intervention.
- **SC-004 (Efficiency)**: External requests per 1,000 delivered recipients reduce by at least 40% through grouping and batching (baseline vs. post-change).
- **SC-005 (Observability)**: Each cycle exposes counts (created, grouped, sent, skipped, retryable failed, final failed) and latency percentiles; any discrepancy >1% between metrics and logs is flagged.
- **SC-006 (Safety)**: Rollback from any stage returns to prior behavior within one cycle, with no loss of queued work and no duplicate deliveries.
- **SC-007 (Scope Control)**: No changes to end-user UI or data entry workflows; only reliability/efficiency improvements to the sending pipeline.
