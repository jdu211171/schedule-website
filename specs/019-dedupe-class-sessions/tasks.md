# Tasks — 019 Dedupe Class Sessions

- [x] Create compressed pg_dump backup to backups/
- [x] De-duplicate 1:1 duplicates across table (keep earliest)
- [x] Add partial unique index on class_sessions (1:1, non-cancelled)
- [x] Resolve duplicate ACTIVE series by pausing all but earliest
- [x] Add partial unique index on class_series ACTIVE private pairs
- [x] Patch series-advance.ts to skip if exact exists
- [x] Patch extend route to skip if exact exists
- [x] Add dedup check in POST /api/class-series (409)
- [x] Re-run counts for 2025-10-23 (expect reduced uniques)
- [ ] Optional: broader audit report (date histogram of duplicates avoided)

