# Tasks — Notification Sending Pipeline — Reliability & Efficiency

**Branch**: `016-audit-and-improve`  
**Spec**: specs/016-audit-and-improve/spec.md  
**Plan**: specs/016-audit-and-improve/plan.md

## Phase 1 — Setup

T001 [P] Update env template with feature toggles  
- File: .env.example  
- Add: `CRON_SECRET`, `NOTIFICATION_GROUP_MAX_RECIPIENTS=200`, `NOTIFICATION_REQUEST_TIMEOUT_MS=5000`, `NOTIFICATION_CIRCUIT_ENABLED=false`, `NOTIFICATION_CIRCUIT_COOLDOWN_MS=60000`, `NOTIFICATION_GROUP_IDEMPOTENCY_ENABLED=true`, `NOTIFICATION_WORKER_BATCH_SIZE=20`, `NOTIFICATION_WORKER_CONCURRENCY=3`, `NOTIFICATION_WORKER_MAX_TIME=300000`, `NOTIFICATION_WORKER_DELAY=1000`.

T002 [P] Create central notification config module  
- File: src/lib/notification/config.ts (new)  
- Expose typed getters for all envs with safe defaults; export constants used by route/worker/LINE client.

T003 [P] Add structured logging utility  
- File: src/lib/telemetry/logging.ts (new)  
- Provide helpers: `newFlowId()`, `newRunId()`, `hashRecipientId(id)`, `logEvent(type, payload)`; ensure fields: flow_id, run_id, ts, code, counts.

T004 [P] Verify OpenAPI contract for unified-cron  
- File: specs/016-audit-and-improve/contracts/notifications-openapi.yaml  
- Ensure response schema matches unified-cron run summary (created/sent/failed/deleted/errors/phase/executionTimeMs).

T005 [P] Ensure quickstart reflects toggles and commands  
- File: specs/016-audit-and-improve/quickstart.md  
- Confirm examples include Authorization header usage and env overrides.

## Phase 2 — Foundational (blocking for all stories)

T006 Route: add flow/run identifiers and config wiring  
- File: src/app/api/notifications/unified-cron/route.ts  
- Generate `flow_id`, `run_id` per invocation; log start/end with counts; read config from `config.ts`; pass run context into worker for logging.

T007 Worker: wire config, grouping, and counts  
- File: src/lib/notification/notification-worker.ts  
- Read from `config.ts`; ensure delay between batches; compute and return metrics (batches, totalProcessed, p50/p95 durations if available), and log per batch with run context.

T008 LINE client: timeout and error classification  
- File: src/lib/line-multi-channel.ts  
- Use axios with `timeout=NOTIFICATION_REQUEST_TIMEOUT_MS`; map errors to `TRANSIENT` (e.g., ECONNRESET, 429/5xx) vs `PERMANENT` (4xx invalid ID); no schema change.

T009 Add idempotency helpers  
- File: src/lib/notification/config.ts (or new util under src/lib/notification)  
- Export `buildQueueIdempotencyKey({ recipientId, recipientType, notificationType, targetDate, branchId })` and `buildGroupId({ channelId, message })` (hash text) for consistent usage and logs.

## Phase 3 — User Story 1 (P1): Reliable, on-time delivery with visibility

Story goal: Deliver within targets and expose accurate metrics/logs.

Independent test: Trigger cycle with sample volume; confirm totals and timing windows, and consistent logs/metrics.

T010 Enhance unified-cron response payload  
- File: src/app/api/notifications/unified-cron/route.ts  
- Include: flow_id, run_id, batches, totalProcessed, successful, failed, executionTimeMs; keep prior fields for backward compatibility.

T011 [P] Structured event logs across pipeline  
- Files: src/app/api/notifications/unified-cron/route.ts; src/lib/notification/notification-worker.ts  
- Emit standardized entries: created/sent/failed/skip counts, outcome codes, attempt histograms; hash recipient ids using helper.

T012 [P] Recipients-per-request cap and chunking  
- File: src/lib/notification/notification-worker.ts  
- Before calling `sendLineMulticast`, split `uniqueLineIds` into chunks of size `NOTIFICATION_GROUP_MAX_RECIPIENTS` and process sequentially per group with existing delay.

T013 [P] Respect concurrency and pacing knobs  
- File: src/lib/notification/notification-worker.ts  
- Ensure `maxConcurrency`, `delayBetweenBatchesMs`, and `maxExecutionTimeMs` come from config; avoid exceeding caps.

Checkpoint: US1 complete when a cycle finishes within time targets and logs/response counts reconcile (created = sent + failed + skipped).

## Phase 4 — User Story 2 (P2): Safe retries with at-most-once semantics

Story goal: Retries without duplicates; enforce at-most-once delivery.

Independent test: Inject transient errors; re-run cycles; no duplicate sends per person/date; retries progress until success or attempts exhausted.

T014 Send-time dedupe via group idempotency  
- File: src/lib/notification/notification-worker.ts  
- Maintain an in-memory `Set` of `buildGroupId(channelId, message)` per run; skip a multicast if already sent in this run (log SKIPPED_DUP_GROUP).

T015 [P] Verify queue-level dedupe and improve logs  
- File: src/lib/notification/notification-service.ts  
- Use `buildQueueIdempotencyKey` in logs on duplicate prevention; ensure branchId participates in check (existing behavior) and add explicit SKIPPED_DUP_QUEUE outcome code.

T016 Retry backoff by scheduling next attempt  
- Files: src/lib/notification/notification-worker.ts; src/lib/line-multi-channel.ts  
- On `TRANSIENT` failure, update the notification `scheduledAt` to `now + backoff(attempt)` (10s, 30s, 120s) and keep status as FAILED for discovery; selection already filters `scheduledAt <= now`.

T017 Permanent failure classification  
- Files: src/lib/line-multi-channel.ts; src/lib/notification/notification-worker.ts  
- On 4xx invalid ID or SKIPPED (no link/holiday), mark non-retryable and set attempts = MAX_ATTEMPTS; add reason code to logs.

Checkpoint: US2 complete when duplicates are 0 across runs and retry progression is visible in logs without manual intervention.

## Phase 5 — User Story 3 (P3): Phased rollout with rollback

Story goal: Enable changes safely with toggles and revert instantly if needed.

Independent test: Toggle features per env; verify behavior changes accordingly and rollback restores prior behavior in next cycle.

T018 Feature flags for new behaviors  
- File: src/lib/notification/config.ts  
- Flags: `NOTIFICATION_GROUP_IDEMPOTENCY_ENABLED`, `NOTIFICATION_CIRCUIT_ENABLED`; default disabled; guard related code paths.

T019 Channel-level circuit breaker  
- File: src/lib/line-multi-channel.ts  
- Per-channel Map `{state, openedAt}`; on repeated `TRANSIENT`/rate-limit errors, open for `NOTIFICATION_CIRCUIT_COOLDOWN_MS`, skip sends (log CIRCUIT_OPEN) and preserve queue for next cycle.

T020 Log toggle states and rollback hints  
- File: src/app/api/notifications/unified-cron/route.ts  
- Log flag values at start; add guidance in error logs to disable toggles for rollback.

T021 Update docs for rollout steps  
- File: specs/016-audit-and-improve/quickstart.md  
- Document staged enablement order and rollback instructions (toggle off, redeploy).

Checkpoint: US3 complete when toggles can enable/disable features without code changes and behavior responds on next run.

## Phase 6 — Polish & Cross-Cutting

T022 Remove noisy debug logs and standardize messages  
- Files: src/lib/notification/*.ts; src/lib/line-*.ts; src/app/api/notifications/unified-cron/route.ts  
- Ensure clean structured logs only; no console noise in production paths.

T023 Align OpenAPI with enhanced response  
- File: specs/016-audit-and-improve/contracts/notifications-openapi.yaml  
- Add new fields (flow_id/run_id/batches/totalProcessed) while maintaining backward compatibility notes.

## Dependencies & Execution Order

- Story order: US1 → US2 → US3
- Foundational tasks (Phase 2) must precede all user stories.
- Parallelization rules: tasks marked [P] can run in parallel as they modify different files; tasks without [P] in the same file must run sequentially.

## Parallel Execution Examples

- During Phase 1: T001 [P], T002 [P], T003 [P], T004 [P], T005 [P] can run concurrently.
- In US1: T011 [P], T012 [P], T013 [P] can run in parallel; T010 depends on T006/T007.
- In US2: T015 [P] can proceed while T014 is implemented; T016 depends on T008/T007; T017 depends on T008.

## Implementation Strategy

- MVP: Complete Phases 1–3 (Setup, Foundational, US1). This yields on-time delivery with visibility and safe batching.
- Next: US2 for at-most-once across retries; US3 for toggled rollout and circuit protection.

## Counts & Summary

- Total tasks: 23
- Per user story: US1 (4), US2 (4), US3 (4)
- Parallel opportunities: 10 tasks marked [P]
- Independent test criteria: Defined per story at phase headers

