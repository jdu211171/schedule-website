# Spec: Annual Grade Promotion

## Problem Statement

We need an automatic yearly promotion for students based on `student_types.order` and `student_types.max_years`. Students should advance within type until reaching the maximum grade, then move to the next student type (lowest grade), and stop advancing when the next type has no grades.

## Goals

- Run once per year in April.
- Promote within type if below max grade.
- If at max grade, promote to next type by ascending order:
  - If next type is graded, set grade to 1.
  - If next type is ungraded, move into it and set grade to NULL; future years do nothing.
- Minimal codebase changes; implement at the database layer for Supabase.

## Acceptance Criteria

- SQL function exists and performs the rules above.
- Students at the terminal graded type (e.g., 高校生 with max grade) are promoted into the next ungraded type (e.g., 浪人生) and left there with `grade_year = NULL`.
- Scheduled cron job executes on April 1, 00:00 UTC annually.
- Manual trigger is available for validation.
- No schema changes required.

## Non-Goals

- Backfilling historical promotions.
- UI changes.
- Migration of existing data anomalies beyond tolerant handling.
