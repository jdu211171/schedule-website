-- Drop legacy parent_line_id2 column from students

BEGIN;

ALTER TABLE students
  DROP COLUMN IF EXISTS parent_line_id2;

COMMIT;

