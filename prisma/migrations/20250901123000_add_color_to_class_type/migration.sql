-- Add optional color column to class_types and unique index
ALTER TABLE "class_types"
ADD COLUMN IF NOT EXISTS "color" VARCHAR(30);

-- Create a unique index to ensure one class type per color (NULLs allowed)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = ANY (current_schemas(false)) AND indexname = 'class_types_color_key'
  ) THEN
    ALTER TABLE "class_types" ADD CONSTRAINT "class_types_color_key" UNIQUE ("color");
  END IF;
END $$;

