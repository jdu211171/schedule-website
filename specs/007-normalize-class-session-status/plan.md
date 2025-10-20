# Plan — Normalize Class Session Statuses (Production)

Goal: Align `class_sessions.status` with actual overlaps so the Series view and Day Calendar agree. Apply the documented runbook to production safely.

Steps

1. Review runbook `docs/normalize-class-session-status.md`
2. Prepare PG connection env for production (SSL required)
3. Run dry‑run counts (conflicts, currently marked, blanks)
4. Apply normalization in a single transaction
5. Verify counts; optional spot‑check
6. Summarize results and capture metrics

Notes

- Non‑destructive: updates only `status`; no deletes or schema changes.
- Idempotent: safe to re‑run.
- Follow local policy to use psql (libpq env vars), not Prisma.
