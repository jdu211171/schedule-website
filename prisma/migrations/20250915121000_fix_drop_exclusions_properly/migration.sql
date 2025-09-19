-- Fix: properly drop exclusion constraints that prevented overlapped sessions
-- Context: Earlier migration attempted to DROP INDEX with the constraint names,
-- but exclusion constraints must be dropped via ALTER TABLE ... DROP CONSTRAINT.

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'class_sessions_teacher_time_no_overlap'
  ) THEN
    EXECUTE 'ALTER TABLE class_sessions DROP CONSTRAINT class_sessions_teacher_time_no_overlap';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'class_sessions_student_time_no_overlap'
  ) THEN
    EXECUTE 'ALTER TABLE class_sessions DROP CONSTRAINT class_sessions_student_time_no_overlap';
  END IF;
END $$;

-- Also ensure the exact-duplicate unique index is dropped so FORCE_CREATE can insert conflicts
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'class_sessions_teacher_id_date_start_time_end_time_is_cance_key'
  ) THEN
    EXECUTE 'DROP INDEX IF EXISTS class_sessions_teacher_id_date_start_time_end_time_is_cance_key';
  END IF;
END $$;

-- Historical name used in older migration; drop if still present
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'class_sessions_teacher_id_date_start_time_end_time_key'
  ) THEN
    EXECUTE 'DROP INDEX IF EXISTS class_sessions_teacher_id_date_start_time_end_time_key';
  END IF;
END $$;

