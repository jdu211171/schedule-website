-- Drop cancellation_reason column and enum if exists
ALTER TABLE "class_sessions" DROP COLUMN IF EXISTS "cancellation_reason";
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CancellationReason' OR typname = 'cancellationreason') THEN
    DROP TYPE IF EXISTS "CancellationReason";
  END IF;
END $$;
