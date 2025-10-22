# Plan — 019 Dedupe Class Sessions

1. Backup production DB (pg_dump compressed)
2. De-duplicate historical 1:1 session duplicates (keep oldest)
3. Add DB uniqueness guards (class_sessions 1:1, class_series ACTIVE private)
4. Make generators idempotent (advance + extend)
5. Prevent duplicate series creation (POST /api/class-series → 409)
6. Validate 2025-10-23 counts and spot-check
7. Document rollback (pg_restore, drop indexes)

Rollback
- Use `backups/prod_backup_<ts>.dump` with pg_restore to revert.
- Drop indexes: `ux_class_sessions_unique_1on1`, `ux_class_series_active_private`.

