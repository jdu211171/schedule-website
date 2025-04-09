-- Insert a test teacher
INSERT INTO teachers (teacher_id, name) 
VALUES ('T1', 'Test Teacher');

-- Insert a test subject
INSERT INTO subjects (subject_id, name) 
VALUES ('S1', 'Math');

-- Link teacher to subject
INSERT INTO teacher_subjects (teacher_id, subject_id, created_at, updated_at)
VALUES ('T1', 'S1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Insert a regular shift for the teacher
INSERT INTO teacher_regular_shifts (shift_id, teacher_id, day_of_week, start_time, end_time, created_at, updated_at)
VALUES ('RS1', 'T1', 'Monday', '09:00', '17:00', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Try to insert a valid class session
INSERT INTO class_sessions (class_id, teacher_id, subject_id, date, start_time, end_time, created_at, updated_at)
VALUES ('C1', 'T1', 'S1', '2025-04-07', '10:00', '11:00', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Test the time validation constraint (this should fail)
INSERT INTO class_sessions (class_id, teacher_id, subject_id, date, start_time, end_time, created_at, updated_at)
VALUES ('C2', 'T1', 'S1', '2025-04-07', '11:00', '10:00', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Test overlapping class (this should create a conflict)
INSERT INTO class_sessions (class_id, teacher_id, subject_id, date, start_time, end_time, created_at, updated_at)
VALUES ('C3', 'T1', 'S1', '2025-04-07', '10:30', '11:30', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Test the get_available_teachers function
SELECT * FROM get_available_teachers('2025-04-07', '14:00', '15:00', 'S1');

