-- Add per-series scheduling override JSON column
ALTER TABLE "class_series" ADD COLUMN IF NOT EXISTS "scheduling_override" JSONB;

