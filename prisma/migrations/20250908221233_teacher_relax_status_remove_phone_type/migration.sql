-- Relax teacher.status from enum to VARCHAR(50) and drop phone_type on teacher_contact_phones
ALTER TABLE "teachers"
  ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "teachers"
  ALTER COLUMN "status" TYPE VARCHAR(50) USING "status"::text;
ALTER TABLE "teachers"
  ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- Remove phone_type from teacher_contact_phones
ALTER TABLE "teacher_contact_phones" DROP COLUMN IF EXISTS "phone_type";
