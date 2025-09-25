# Tasks — Normalize Class Session Statuses (Production)

- [x] Review runbook and confirm scope
- [x] Set PGHOST/PGUSER/PGDATABASE/PGSSLMODE/PGPASSWORD
- [x] Connectivity check (`SELECT 1`)
- [x] Dry‑run counts (overlap conflicts, current CONFLICTED, blanks)
- [x] Apply transaction to set CONFLICTED and CONFIRMED
- [x] Verify counts; confirm blanks reduced to 0
- [ ] Optional: spot‑check a target day
- [x] Record results in research.md

