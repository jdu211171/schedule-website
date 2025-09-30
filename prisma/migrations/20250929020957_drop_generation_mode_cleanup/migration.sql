-- Cleanup stale generation_mode column per AUTOMATIC generation migration
-- Idempotent and safe to run multiple times
ALTER TABLE "public"."class_series" DROP COLUMN IF EXISTS "generation_mode";

