-- Time validation constraints
ALTER TABLE class_sessions 
ADD CONSTRAINT valid_class_time 
CHECK (end_time > start_time);

ALTER TABLE teacher_regular_shifts
ADD CONSTRAINT valid_shift_time 
CHECK (end_time > start_time);

ALTER TABLE teacher_special_shifts
ADD CONSTRAINT valid_special_shift_time 
CHECK (end_time > start_time);

-- Composite indexes for scheduling operations
CREATE INDEX idx_class_sessions_datetime ON class_sessions(date, start_time, end_time);
CREATE INDEX idx_teacher_regular_day_time ON teacher_regular_shifts(day_of_week, start_time, end_time);
CREATE INDEX idx_teacher_special_date_time ON teacher_special_shifts(date, start_time, end_time);

-- Teacher availability function
CREATE OR REPLACE FUNCTION get_available_teachers(
  p_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_subject_id VARCHAR(50)
) RETURNS TABLE (teacher_id VARCHAR(50)) AS $$
BEGIN
  RETURN QUERY
  SELECT t.teacher_id FROM teachers t
  JOIN teacher_subjects ts ON t.teacher_id = ts.teacher_id
  WHERE ts.subject_id = p_subject_id
  AND NOT EXISTS (
    -- Check for existing classes
    SELECT 1 FROM class_sessions cs
    WHERE cs.teacher_id = t.teacher_id
    AND cs.date = p_date
    AND (cs.start_time, cs.end_time) OVERLAPS (p_start_time, p_end_time)
  )
  AND (
    -- Check for regular shifts on that day of week
    EXISTS (
      SELECT 1 FROM teacher_regular_shifts trs
      WHERE trs.teacher_id = t.teacher_id
      AND trs.day_of_week = TRIM(TO_CHAR(p_date, 'Day'))
      AND p_start_time >= trs.start_time
      AND p_end_time <= trs.end_time
    )
    OR
    -- Check for special shifts on that specific date
    EXISTS (
      SELECT 1 FROM teacher_special_shifts tss
      WHERE tss.teacher_id = t.teacher_id
      AND tss.date = p_date
      AND p_start_time >= tss.start_time
      AND p_end_time <= tss.end_time
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Schedule conflict detection function and trigger
CREATE OR REPLACE FUNCTION check_schedule_conflicts() RETURNS TRIGGER AS $$
BEGIN
  -- Insert conflicts into schedule_conflicts if they exist
  INSERT INTO schedule_conflicts (
    conflict_id, entity_type_1, entity_id_1, entity_type_2, entity_id_2,
    conflict_date, start_time, end_time, status, created_at, updated_at
  )
  SELECT
    gen_random_uuid(),
    'ClassSession', NEW.class_id,
    'ClassSession', cs.class_id,
    NEW.date, NEW.start_time, NEW.end_time, 'PENDING',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  FROM class_sessions cs
  WHERE cs.teacher_id = NEW.teacher_id
    AND cs.date = NEW.date
    AND (cs.start_time, cs.end_time) OVERLAPS (NEW.start_time, NEW.end_time)
    AND cs.class_id != NEW.class_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER class_session_conflict_check
AFTER INSERT OR UPDATE ON class_sessions
FOR EACH ROW EXECUTE FUNCTION check_schedule_conflicts();
