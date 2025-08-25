-- Add btree_gist extension for exclusion constraints
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Prevent overlapping class sessions for the same teacher on the same day
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'class_sessions_teacher_time_no_overlap'
  ) THEN
    ALTER TABLE class_sessions
    ADD CONSTRAINT class_sessions_teacher_time_no_overlap
    EXCLUDE USING gist (
      teacher_id WITH =,
      tsrange((date + start_time), (date + end_time), '[)') WITH &&
    ) WHERE (teacher_id IS NOT NULL);
  END IF;
END$$;

-- Prevent overlapping class sessions for the same student on the same day
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'class_sessions_student_time_no_overlap'
  ) THEN
    ALTER TABLE class_sessions
    ADD CONSTRAINT class_sessions_student_time_no_overlap
    EXCLUDE USING gist (
      student_id WITH =,
      tsrange((date + start_time), (date + end_time), '[)') WITH &&
    ) WHERE (student_id IS NOT NULL);
  END IF;
END$$;

