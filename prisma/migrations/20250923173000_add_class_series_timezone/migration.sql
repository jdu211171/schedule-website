-- Add timezone column for DST-aware generation
ALTER TABLE "class_series" ADD COLUMN IF NOT EXISTS "timezone" VARCHAR(64);

