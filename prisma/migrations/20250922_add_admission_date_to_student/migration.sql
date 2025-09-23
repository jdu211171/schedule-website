-- Add optional admission_date to students for the date the student started attending
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "admission_date" DATE;

