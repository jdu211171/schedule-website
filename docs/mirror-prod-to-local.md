# Mirror Production to Local Database

This operation takes a fresh backup from production and restores it into your local Postgres so your local DB exactly matches production.

Script: `scripts/mirror-prod-to-local.sh`

## Quick start

Fresh backup + full restore (DROPS your local DB):

```
DIRECT_URL=postgresql://user:pass@host:5432/db \
  scripts/mirror-prod-to-local.sh --yes
```

Dry-run (no changes):

```
DIRECT_URL=postgresql://user:pass@host:5432/db \
  scripts/mirror-prod-to-local.sh --dry-run
```

Restore from an existing backup date:

```
DIRECT_URL=postgresql://user:pass@host:5432/db \
  scripts/mirror-prod-to-local.sh --date 2025-09-22 --skip-backup --yes
```

Override local connection (optional):

```
LOCAL_URL=postgresql://postgres:postgres@localhost:5432/schedulewebsite \
DIRECT_URL=postgresql://user:pass@host:5432/db \
  scripts/mirror-prod-to-local.sh --yes
```

## Notes

- Local DB defaults: `localhost:5432`, user `postgres`, password `postgres`, DB `schedulewebsite`.
- Uses `pg_dump/pg_restore/psql`. For prod backup, SSL is required; for local restore, SSL is disabled.
- Parallel restore uses `JOBS` env var (default 4).
- The script reuses `scripts/backup-prod-daily.sh` to avoid duplicating backup logic.
