# Mirror Prod to Local DB

## Problem
Developers need a one‑shot, safe way to refresh their local Postgres database so it exactly mirrors the current production database.

## Goals
- Create a script that:
  - Takes a fresh production backup (reusing `scripts/backup-prod-daily.sh`).
  - Drops and recreates the local database.
  - Restores from the fresh dump so local fully mirrors prod.
- Provide a dry‑run mode and an interactive confirmation for safety.

## Non‑Goals
- Scheduling/automation of the mirroring.
- Changes to Prisma schema or application code.

## Acceptance Criteria
- Running `DIRECT_URL=... scripts/mirror-prod-to-local.sh --yes`:
  - Produces a new backup under `backups/<YYYY-MM-DD>/`.
  - Drops and recreates the local DB (default `schedulewebsite`).
  - Restores from the new `full-*.dump` successfully.
  - Finishes without errors and prints a success message.
- Running with `--dry-run` prints planned actions only, without modifying anything.
- Running with `--skip-backup` restores from existing backups for the selected date.

