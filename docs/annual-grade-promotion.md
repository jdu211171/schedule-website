# Annual Grade Promotion (Supabase/pg_cron)

This job promotes student grades once per year in April, based on `student_types.order` and `student_types.max_years`.

Key rules:
- If a student has a `student_type_id` and `grade_year`, and the current type has grades (`max_years IS NOT NULL`) and `grade_year < max_years`, increment `grade_year` by 1.
- If `grade_year >= max_years`, promote to the next student type by ascending `order`.
  - If the next type has grades, set `grade_year = 1`.
  - If the next type has no grades, set `grade_year = NULL` and stop further promotions in future years.
- Student types with `max_years IS NULL` are non-graded and never increment within-type.

Implementation lives in `scripts/annual-grade-promotion.sql` and uses `pg_cron` to run yearly on April 1 at 00:00 UTC.

## Deploy / Update

1) Enable cron (once per project):

```
PGPASSWORD=postgres psql -h localhost -U postgres -d schedulewebsite -c "CREATE EXTENSION IF NOT EXISTS pg_cron;"
```

2) Apply the function + schedule:

```
PGPASSWORD=postgres psql -h localhost -U postgres -d schedulewebsite -f scripts/annual-grade-promotion.sql
```

This creates:
- `promote_student_grades(p_force boolean default false)` — performs promotions (no-ops if not April unless `p_force = true`).
- `trigger_promote_student_grades(p_force boolean default false)` — convenience wrapper that returns a short message.
- A cron job `promote-student-grades-yearly` — runs `0 0 1 4 *` (April 1, 00:00 UTC).

> Note: If your business timezone is not UTC, keep the cron as-is (runs once per year) and optionally adjust the month check in the function to use your TZ (e.g., `NOW() AT TIME ZONE 'Asia/Tokyo'`).

## Manual Run (for validation)

```
# Force a run even if it isn't April (for testing):
PGPASSWORD=postgres psql -h localhost -U postgres -d schedulewebsite -c "SELECT trigger_promote_student_grades(true);"
```

## Unschedule

1) Find the job id:
```
PGPASSWORD=postgres psql -h localhost -U postgres -d schedulewebsite -c "SELECT jobid, jobname, schedule FROM cron.job WHERE jobname='promote-student-grades-yearly';"
```
2) Unschedule by job id (replace N):
```
PGPASSWORD=postgres psql -h localhost -U postgres -d schedulewebsite -c "SELECT cron.unschedule(N);"
```

## Data Assumptions

- `students.student_type_id` refers to `student_types.student_type_id`.
- `students.grade_year` is 1-based for graded types, `NULL` for ungraded types.
- `student_types.order`: ascending means progression (e.g., 小学生 → 中学生 → 高校生 → 大人 …).
- `student_types.max_years`: number of grades for the type; `NULL` → ungraded.
