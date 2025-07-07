-- Test script for archive functionality
-- Run this script to create test data and verify archiving works correctly

-- First, let's check if the archive functions exist
SELECT proname FROM pg_proc WHERE proname IN ('archive_old_class_sessions', 'trigger_archive_manually');

-- Create some test class sessions that are older than 6 months
-- Note: You'll need to adjust these IDs to match existing records in your database
DO $$
DECLARE
    v_teacher_id TEXT;
    v_student_id TEXT;
    v_subject_id TEXT;
    v_booth_id TEXT;
    v_branch_id TEXT;
    v_class_type_id TEXT;
BEGIN
    -- Get sample IDs from existing records
    SELECT teacher_id INTO v_teacher_id FROM teachers LIMIT 1;
    SELECT student_id INTO v_student_id FROM students LIMIT 1;
    SELECT subject_id INTO v_subject_id FROM subjects LIMIT 1;
    SELECT booth_id INTO v_booth_id FROM booths LIMIT 1;
    SELECT branch_id INTO v_branch_id FROM branches LIMIT 1;
    SELECT class_type_id INTO v_class_type_id FROM class_types LIMIT 1;
    
    -- Only proceed if we have all required data
    IF v_teacher_id IS NOT NULL AND v_subject_id IS NOT NULL AND v_booth_id IS NOT NULL THEN
        -- Create test sessions from 7 months ago
        INSERT INTO class_sessions (
            class_id,
            teacher_id,
            student_id,
            subject_id,
            booth_id,
            branch_id,
            class_type_id,
            date,
            start_time,
            end_time,
            duration,
            notes
        ) VALUES 
        (
            'test-archive-1',
            v_teacher_id,
            v_student_id,
            v_subject_id,
            v_booth_id,
            v_branch_id,
            v_class_type_id,
            CURRENT_DATE - INTERVAL '7 months',
            '09:00:00'::time,
            '10:00:00'::time,
            60,
            'Test session for archiving - 7 months old'
        ),
        (
            'test-archive-2',
            v_teacher_id,
            NULL, -- Group class without specific student
            v_subject_id,
            v_booth_id,
            v_branch_id,
            v_class_type_id,
            CURRENT_DATE - INTERVAL '8 months',
            '14:00:00'::time,
            '15:30:00'::time,
            90,
            'Test group session for archiving - 8 months old'
        );
        
        -- Add some enrolled students to the group class
        IF v_student_id IS NOT NULL THEN
            INSERT INTO student_class_enrollments (
                enrollment_id,
                class_id,
                student_id,
                status,
                notes
            ) VALUES
            (
                'test-enrollment-1',
                'test-archive-2',
                v_student_id,
                'ENROLLED',
                'Test enrollment for archive'
            );
        END IF;
        
        RAISE NOTICE 'Test data created successfully';
    ELSE
        RAISE NOTICE 'Could not create test data - missing required records in database';
    END IF;
END $$;

-- Check how many sessions are eligible for archiving
SELECT COUNT(*) as eligible_sessions 
FROM class_sessions 
WHERE date < NOW() - INTERVAL '6 months';

-- Check current archive count
SELECT COUNT(*) as current_archives FROM archives;

-- Test the manual trigger function
SELECT trigger_archive_manually();

-- Check archive count after running
SELECT COUNT(*) as new_archives FROM archives;

-- View the most recent archives
SELECT 
    archive_id,
    class_id,
    teacher_name,
    student_name,
    subject_name,
    booth_name,
    branch_name,
    class_type_name,
    enrolled_students,
    date,
    archived_at
FROM archives 
ORDER BY archived_at DESC 
LIMIT 5;

-- Clean up test data (optional - uncomment to remove test records)
-- DELETE FROM archives WHERE class_id IN ('test-archive-1', 'test-archive-2');
-- DELETE FROM class_sessions WHERE class_id IN ('test-archive-1', 'test-archive-2');