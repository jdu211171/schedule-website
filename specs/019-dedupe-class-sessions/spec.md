# Spec 019 — Class Session Duplication Hardening

## Problem
Multiple duplicate class sessions are being created for the same teacher/student/time window on specific dates (e.g., 2025-10-23). Duplicate `class_series` blueprints also exist, causing the advanced/extend generators to repeatedly insert overlapping sessions. There are no DB uniqueness guards to prevent exact duplicates.

## Goals
- Prevent future duplicate 1:1 session inserts at the DB layer.
- Prevent duplicate ACTIVE series blueprints for the same private pair/time/days.
- Make generation endpoints idempotent.
- Clean up historical duplicates safely after a full backup.

## Acceptance Criteria
- A compressed pg_dump backup exists before changes.
- Partial unique index on `public.class_sessions` prevents exact duplicate 1:1 (non-cancelled) sessions.
- Partial unique index on `public.class_series` prevents duplicate ACTIVE private pairs for same branch/time/days.
- `series-advance` cron and `extend` route skip creation when exact session already exists.
- `POST /api/class-series` returns 409 when attempting to create a duplicate ACTIVE blueprint.
- 2025-10-23 is de-duplicated; count reduced to unique set with earliest kept.

