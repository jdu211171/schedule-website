# Quickstart — Notification Pipeline Verification

## Prerequisites

- Copy `.env.example` to `.env`; set `DATABASE_URL`, `DIRECT_URL`, `CRON_SECRET`.
- Ensure Prisma client is generated (postinstall) and DB reachable.

## Local Run

- Start dev server: `bun dev`
- Trigger unified cron manually:
  - Public (dev): `curl -s http://localhost:3000/api/notifications/unified-cron | jq`
  - Auth (prod-style): `curl -s -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/notifications/unified-cron | jq`
- Admin manual POST (reset optional):
  - `curl -s -X POST -H "Content-Type: application/json" -d '{"reset": false}' http://localhost:3000/api/notifications/unified-cron | jq`

## Tuning (env)

- `NOTIFICATION_WORKER_BATCH_SIZE=20`
- `NOTIFICATION_WORKER_CONCURRENCY=3`
- `NOTIFICATION_WORKER_MAX_TIME=300000`
- `NOTIFICATION_WORKER_DELAY=1000`

## What to Verify

- Output contains created/sent/failed counts and phase transitions.
- No duplicate deliveries across repeated runs for same date (check DB `notifications` uniqueness and logs).
- For backoff behavior, simulate transient failures (e.g., temporary network) and confirm retries without duplicates.

## Observability (dev)

- Inspect server logs for structured entries including run/flow identifiers and outcome codes.

## Rollout & Rollback

- Stage 1 (observe only): Leave `NOTIFICATION_CIRCUIT_ENABLED=false`; deploy and verify metrics/logs.
- Stage 2 (pacing): Tune `NOTIFICATION_WORKER_*` and `NOTIFICATION_GROUP_MAX_RECIPIENTS` as needed; observe external request counts.
- Stage 3 (circuit breaker): Set `NOTIFICATION_CIRCUIT_ENABLED=true`; verify skip behavior under synthetic 429/5xx.
- Rollback: Toggle the feature flags back to previous values and redeploy; behavior reverts on next run with no data loss.
