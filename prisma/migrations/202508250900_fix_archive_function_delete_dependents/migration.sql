-- Update archive_old_class_sessions to delete dependent enrollments first
-- to satisfy RESTRICT foreign keys on student_class_enrollments

DROP FUNCTION IF EXISTS archive_old_class_sessions();

CREATE OR REPLACE FUNCTION archive_old_class_sessions()
RETURNS TABLE (
    archived_count INTEGER,
    deleted_count INTEGER,
    error_message TEXT
) AS $$
DECLARE
    v_cutoff_date TIMESTAMP;
    v_archived_count INTEGER := 0;
    v_deleted_count INTEGER := 0;
    v_error_message TEXT := NULL;
    v_retention_months INTEGER;
BEGIN
    -- Retention months from global settings (defaults handled by helper)
    v_retention_months := get_archive_retention_months();
    v_cutoff_date := NOW() - (v_retention_months || ' months')::INTERVAL;

    BEGIN
        -- Materialize enrolled students for classes before cutoff
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
            ) AS enrolled_students
        FROM student_class_enrollments sce
        JOIN students s ON s.student_id = sce.student_id
        WHERE EXISTS (
            SELECT 1 FROM class_sessions cs
            WHERE cs.class_id = sce.class_id AND cs.date < v_cutoff_date
        )
        GROUP BY sce.class_id;

        -- Archive class sessions before cutoff (skip already archived)
        INSERT INTO archives (
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
            start_time,
            end_time,
            duration,
            notes,
            archived_at
        )
        SELECT
            gen_random_uuid()::text,
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
        FROM class_sessions cs
        LEFT JOIN teachers t ON t.teacher_id = cs.teacher_id
        LEFT JOIN students s ON s.student_id = cs.student_id
        LEFT JOIN subjects sub ON sub.subject_id = cs.subject_id
        LEFT JOIN booths b ON b.booth_id = cs.booth_id
        LEFT JOIN branches br ON br.branch_id = cs.branch_id
        LEFT JOIN class_types ct ON ct.class_type_id = cs.class_type_id
        LEFT JOIN temp_enrolled_students tes ON tes.class_id = cs.class_id
        WHERE cs.date < v_cutoff_date
          AND NOT EXISTS (
            SELECT 1 FROM archives a WHERE a.class_id = cs.class_id
          );

        GET DIAGNOSTICS v_archived_count = ROW_COUNT;

        -- Delete dependent enrollments first (RESTRICT FKs)
        DELETE FROM student_class_enrollments sce
        WHERE EXISTS (
          SELECT 1
          FROM class_sessions cs
          WHERE cs.class_id = sce.class_id
            AND cs.date < v_cutoff_date
            AND EXISTS (SELECT 1 FROM archives a WHERE a.class_id = cs.class_id)
        );

        -- Now delete the class sessions themselves
        DELETE FROM class_sessions cs
        WHERE cs.date < v_cutoff_date
          AND EXISTS (SELECT 1 FROM archives a WHERE a.class_id = cs.class_id);

        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

        DROP TABLE IF EXISTS temp_enrolled_students;

        RAISE NOTICE 'Archive completed. Archived: %, Deleted: % (retention: % months)',
          v_archived_count, v_deleted_count, v_retention_months;

    EXCEPTION WHEN OTHERS THEN
        v_error_message := SQLERRM;
        RAISE WARNING 'Archive failed: %', v_error_message;
        DROP TABLE IF EXISTS temp_enrolled_students;
    END;

    RETURN QUERY SELECT v_archived_count, v_deleted_count, v_error_message;
END;
$$ LANGUAGE plpgsql;

