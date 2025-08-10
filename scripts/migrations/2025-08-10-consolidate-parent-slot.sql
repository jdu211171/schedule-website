-- Consolidate student parent slots from parent1/parent2 to parent
-- Safe to run multiple times; uses idempotent guards where possible.

BEGIN;

-- 1) Deduplicate per-channel parent links by keeping the most recent row
--    for (student_id, channel_id) among rows where account_slot in ('parent1','parent2').
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY student_id, channel_id
           ORDER BY updated_at DESC, created_at DESC, id DESC
         ) AS rn
  FROM student_line_links
  WHERE account_slot IN ('parent1','parent2')
), to_delete AS (
  SELECT id FROM ranked WHERE rn > 1
)
DELETE FROM student_line_links sll
USING to_delete d
WHERE sll.id = d.id;

-- 2) Convert enum to text temporarily and map obsolete values to 'parent'
ALTER TABLE student_line_links
  ALTER COLUMN account_slot TYPE text
  USING account_slot::text;

UPDATE student_line_links
SET account_slot = 'parent'
WHERE account_slot IN ('parent1','parent2');

-- 3) Create the new enum and swap types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'LineAccountSlot_new'
  ) THEN
    CREATE TYPE "LineAccountSlot_new" AS ENUM ('student','parent');
  END IF;
END$$;

ALTER TABLE student_line_links
  ALTER COLUMN account_slot TYPE "LineAccountSlot_new"
  USING account_slot::"LineAccountSlot_new";

-- 4) Replace old enum type with the new one
DO $$
DECLARE
  old_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_type t WHERE t.typname = 'LineAccountSlot'
  ) INTO old_exists;

  IF old_exists THEN
    -- Drop the old enum and rename the new one to the canonical name
    DROP TYPE IF EXISTS "LineAccountSlot";
  END IF;
END$$;

ALTER TYPE "LineAccountSlot_new" RENAME TO "LineAccountSlot";

COMMIT;

-- 5) Optional: Report global conflicts (same student linked to different parent line_user_id across channels)
-- Run separately for audit:
-- SELECT student_id,
--        COUNT(DISTINCT line_user_id) AS distinct_parent_ids,
--        ARRAY_AGG(DISTINCT line_user_id) AS parent_ids,
--        ARRAY_AGG(DISTINCT channel_id) AS channels
-- FROM student_line_links
-- WHERE account_slot = 'parent'
-- GROUP BY student_id
-- HAVING COUNT(DISTINCT line_user_id) > 1;

