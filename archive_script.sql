-- Drop the function if it exists to allow recreation
DROP FUNCTION IF EXISTS archive_old_class_sessions();

-- Create the archiving function with error handling and logging
CREATE OR REPLACE FUNCTION archive_old_class_sessions()
RETURNS TABLE (
    archived_count INTEGER,
    deleted_count INTEGER,
    error_message TEXT
) AS $$
DECLARE
    six_months_ago TIMESTAMP;
    v_archived_count INTEGER := 0;
    v_deleted_count INTEGER := 0;
    v_error_message TEXT := NULL;
BEGIN
    -- Calculate the timestamp for six months ago
    six_months_ago := NOW() - INTERVAL '6 months';
    
    BEGIN
        -- Create a temporary table to store enrolled students data
        CREATE TEMP TABLE IF NOT EXISTS temp_enrolled_students AS
        SELECT 
            sce.class_id,
            jsonb_agg(
                jsonb_build_object(
                    'student_id', s.student_id,
                    'student_name', s.name,
                    'status', sce.status,
                    'notes', sce.notes
                ) ORDER BY s.name
            ) as enrolled_students
        FROM student_class_enrollments sce
        JOIN students s ON sce.student_id = s.student_id
        WHERE sce.class_id IN (
            SELECT class_id 
            FROM class_sessions 
            WHERE date < six_months_ago
        )
        GROUP BY sce.class_id;

        -- Insert old class sessions into the archives table with all new fields
        INSERT INTO archives (
            class_id,
            teacher_name,
            student_name,
            subject_name,
            booth_name,
            branch_name,
            class_type_name,
            enrolled_students,
            date,
            start_time,
            end_time,
            duration,
            notes,
            archived_at
        )
        SELECT
            cs.class_id,
            t.name AS teacher_name,
            s.name AS student_name,
            sub.name AS subject_name,
            b.name AS booth_name,
            br.name AS branch_name,
            ct.name AS class_type_name,
            tes.enrolled_students,
            cs.date,
            cs.start_time,
            cs.end_time,
            cs.duration,
            cs.notes,
            NOW()
        FROM
            class_sessions cs
        LEFT JOIN teachers t ON cs.teacher_id = t.teacher_id
        LEFT JOIN students s ON cs.student_id = s.student_id
        LEFT JOIN subjects sub ON cs.subject_id = sub.subject_id
        LEFT JOIN booths b ON cs.booth_id = b.booth_id
        LEFT JOIN branches br ON cs.branch_id = br.branch_id
        LEFT JOIN class_types ct ON cs.class_type_id = ct.class_type_id
        LEFT JOIN temp_enrolled_students tes ON cs.class_id = tes.class_id
        WHERE
            cs.date < six_months_ago
            AND NOT EXISTS (
                SELECT 1 FROM archives a WHERE a.class_id = cs.class_id
            );
        
        -- Get the count of archived records
        GET DIAGNOSTICS v_archived_count = ROW_COUNT;
        
        -- Delete the archived class sessions from the original table
        -- This will cascade delete related records in student_class_enrollments
        DELETE FROM class_sessions
        WHERE date < six_months_ago
            AND class_id IN (SELECT class_id FROM archives);
        
        -- Get the count of deleted records
        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
        
        -- Drop the temporary table
        DROP TABLE IF EXISTS temp_enrolled_students;
        
        -- Log success
        RAISE NOTICE 'Archive operation completed. Archived: %, Deleted: %', v_archived_count, v_deleted_count;
        
    EXCEPTION
        WHEN OTHERS THEN
            -- Capture error message
            v_error_message := SQLERRM;
            -- Log error
            RAISE WARNING 'Archive operation failed: %', v_error_message;
            -- Rollback is automatic in a function
    END;
    
    -- Return the results
    RETURN QUERY SELECT v_archived_count, v_deleted_count, v_error_message;
END;
$$ LANGUAGE plpgsql;

-- Create a wrapper function for easier manual execution
CREATE OR REPLACE FUNCTION trigger_archive_manually()
RETURNS TEXT AS $$
DECLARE
    result RECORD;
BEGIN
    SELECT * INTO result FROM archive_old_class_sessions();
    
    IF result.error_message IS NULL THEN
        RETURN format('Archive successful: %s records archived, %s records deleted', 
                     result.archived_count, result.deleted_count);
    ELSE
        RETURN format('Archive failed: %s', result.error_message);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Schedule the archiving function to run daily at midnight UTC
-- Note: This requires the pg_cron extension to be enabled
-- Run: CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule(
    'archive-class-sessions-daily', -- unique name of the cron job
    '0 0 * * *',                    -- every day at midnight (UTC)
    'SELECT archive_old_class_sessions();'
);

-- To manually trigger archiving:
-- SELECT trigger_archive_manually();

-- To check archiving results:
-- SELECT * FROM archives ORDER BY archived_at DESC LIMIT 10;

-- To unschedule the cron job:
-- SELECT cron.unschedule('archive-class-sessions-daily');