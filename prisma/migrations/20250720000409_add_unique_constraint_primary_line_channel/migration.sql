-- Fix existing data: Ensure only one primary channel per branch
-- This will keep the most recently created primary channel and set others to false
UPDATE "branch_line_channels" blc1
SET "is_primary" = false
WHERE "is_primary" = true
  AND EXISTS (
    SELECT 1
    FROM "branch_line_channels" blc2
    WHERE blc2."branch_id" = blc1."branch_id"
      AND blc2."is_primary" = true
      AND blc2."created_at" > blc1."created_at"
  );

-- Create unique partial index to ensure only one primary channel per branch
-- Using a partial index because we only want uniqueness when is_primary = true
CREATE UNIQUE INDEX "branch_line_channels_branch_id_primary_unique" 
ON "branch_line_channels" ("branch_id") 
WHERE "is_primary" = true;