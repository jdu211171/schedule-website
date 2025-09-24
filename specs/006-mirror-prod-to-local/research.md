Assumptions
- Local Postgres is reachable at localhost:5432 with user `postgres` and password `postgres` (can be overridden via LOCAL_URL).
- `pg_dump`, `pg_restore`, and `psql` are available on PATH.
- Production `DIRECT_URL` can be used for pg_dump operations (same as existing backup script).

Open Questions
- Do we ever need to exclude certain schemas/tables for local dev? (Current design mirrors everything.)
- Should we add an option to retain local roles/owners? (Current design uses --no-owner/--no-acl and assigns to local owner.)

Decisions
- Use `backup-prod-daily.sh` to avoid duplicating backup logic.
- Default to 4 parallel jobs for `pg_restore` (configurable via JOBS env var).
- Pre-apply `extensions.sql` best-effort before restore to reduce extension-related failures.

