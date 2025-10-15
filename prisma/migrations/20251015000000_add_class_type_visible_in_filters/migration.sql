-- Add global filter visibility flag on class types
ALTER TABLE "public"."class_types"
ADD COLUMN IF NOT EXISTS "visible_in_filters" boolean NOT NULL DEFAULT true;

-- Drop per-user visibility preferences table (replaced by global flag)
DROP TABLE IF EXISTS "public"."user_class_type_visibility_preferences" CASCADE;

