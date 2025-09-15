-- Allow creating class sessions even when there are hard overlaps.
-- We drop exclusion constraints and the unique index that block overlaps/duplicates.

DO $$ BEGIN
  -- Teacher overlap exclusion constraint (GiST)
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'class_sessions_teacher_time_no_overlap') THEN
    EXECUTE 'ALTER TABLE class_sessions DROP CONSTRAINT class_sessions_teacher_time_no_overlap';
  END IF;
END $$;

DO $$ BEGIN
  -- Student overlap exclusion constraint (GiST)
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'class_sessions_student_time_no_overlap') THEN
    EXECUTE 'ALTER TABLE class_sessions DROP CONSTRAINT class_sessions_student_time_no_overlap';
  END IF;
END $$;

-- Unique exact-duplicate guard on (teacher_id, date, start_time, end_time, is_cancelled)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'class_sessions_teacher_id_date_start_time_end_time_is_cance_key'
  ) THEN
    EXECUTE 'DROP INDEX IF EXISTS class_sessions_teacher_id_date_start_time_end_time_is_cance_key';
  END IF;
END $$;

-- Optional: add advisory indexes for query performance (date, teacher, student, booth already indexed or implied)
