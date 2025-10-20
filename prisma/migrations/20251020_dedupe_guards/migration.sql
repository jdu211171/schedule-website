-- Add uniqueness and idempotency guards for sessions and series

-- 1) Prevent exact duplicate 1:1 sessions (non-cancelled)
--    Only enforce when both teacher and student are present.
CREATE UNIQUE INDEX IF NOT EXISTS ux_class_sessions_unique_1on1
  ON public.class_sessions (date, start_time, end_time, teacher_id, student_id)
  WHERE is_cancelled = false AND teacher_id IS NOT NULL AND student_id IS NOT NULL;

-- 2) Prevent duplicate ACTIVE series blueprints for the same private pair/time/days
--    Scope by branch to allow the same pair in different branches.
--    Use jsonb uniqueness on days_of_week (array order matters by design).
CREATE UNIQUE INDEX IF NOT EXISTS ux_class_series_active_private
  ON public.class_series (
    COALESCE(branch_id, ''),
    COALESCE(teacher_id, ''),
    COALESCE(student_id, ''),
    start_time,
    end_time,
    days_of_week
  )
  WHERE status = 'ACTIVE' AND teacher_id IS NOT NULL AND student_id IS NOT NULL;

-- Optional helpers (non-unique) to speed lookups used by idempotency checks
CREATE INDEX IF NOT EXISTS ix_class_sessions_dedup_lookup
  ON public.class_sessions (date, start_time, end_time, teacher_id, student_id)
  WHERE is_cancelled = false;

