# Research & Decisions — Notification Pipeline

Date: 2025-10-10  
Spec: specs/016-audit-and-improve/spec.md

## Decisions

- Decision: Queue-level idempotency key = recipientId + recipientType + notificationType + targetDate + branchId
  - Rationale: Aligns with existing DB uniqueness; minimal change; matches daily summary semantics.
  - Alternatives considered:
    - + templateId: complicates daily dedupe without clear value; same-category templates are already covered
    - + content hash: brittle on minor text diffs; increases compute; unnecessary for daily summaries
    - per-channel idempotency: useful for group sends, but not for per-recipient queue identity

- Decision: Group-level idempotency key = channelId + message content hash
  - Rationale: Prevents duplicate multicast requests if groups re-run; content- and channel-specific by nature.
  - Alternatives: request UUIDs (non-deterministic, unsuitable for replays), time-window tokens (fragile across restarts)

- Decision: Batching and concurrency
  - Batch fetch size (queue): 10–20 (default 20 for faster drain, consistent with current route usage)
  - Max concurrent groups: 3
  - Delay between batches: 1s
  - Max recipients per multicast request: 200 (split when exceeded)
  - Rationale: Conservative defaults respect provider constraints; small changes; tunable via env.

- Decision: Retry & backoff policy
  - Attempts: up to 3 total per notification
  - Backoff: ~10s → ~30s → ~120s (bounded by cron window; retries spill over to next cycle if needed)
  - Classify: success, skipped (holiday/no-link), retryable (transient), permanent (non-retryable)
  - Rationale: Matches current worker attempts; adds clearer categories and pacing.

- Decision: Timeouts & circuit breaker
  - Per-request timeout: 5s
  - Circuit breaker: open after consecutive provider/limit errors for 60s cooldown per channel
  - Rationale: Prevents thrashing under provider incidents; preserves queue for later.

- Decision: Structured telemetry
  - Metrics: created, grouped, recipients per group, sent, skipped, retryable failed, permanent failed, p50/p95 send latency, age of oldest pending, attempt histogram, cycle duration
  - Logs (per event): flow_id, run_id, template_id, branch/channel id, batch_id/group_id, notification_id, hashed recipient_id, status, attempt, duration_ms, outcome code, error category/code
  - Rationale: Enables verification and SLO tracking without schema changes.

## Source References

- Route: src/app/api/notifications/unified-cron/route.ts (cron trigger, creation + worker)
- Worker: src/lib/notification/notification-worker.ts (batching, grouping)
- Service: src/lib/notification/notification-service.ts (create + dedupe)
- LINE: src/lib/line-multi-channel.ts (multicast, credentials)
- Schema: prisma/schema.prisma (Notification unique, LineChannel, links)

## Notes

- No schema migration required; uniqueness already enforced at the queue level.
- Group splitting (by recipient cap) to be added in a targeted change inside grouping send path.
- All changes guarded via env toggles to allow rollback.
