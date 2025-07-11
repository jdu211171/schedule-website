/*
  Warnings:

  - Made the column `timing_hour` on table `line_message_templates` required. This step will fail if there are existing NULL values in that column.

*/

-- First, update existing records to convert minutes/hours to days
UPDATE "line_message_templates"
SET 
  "timing_type" = 'days',
  "timing_value" = CASE
    WHEN "timing_type" = 'minutes' AND "timing_value" <= 1440 THEN 0  -- Same day for up to 24 hours
    WHEN "timing_type" = 'minutes' THEN CEIL("timing_value"::decimal / 1440)::int  -- Convert minutes to days
    WHEN "timing_type" = 'hours' AND "timing_value" < 24 THEN 0  -- Same day for less than 24 hours
    WHEN "timing_type" = 'hours' THEN CEIL("timing_value"::decimal / 24)::int  -- Convert hours to days
    ELSE "timing_value"  -- Keep existing days value
  END,
  "timing_hour" = CASE
    WHEN "timing_hour" IS NOT NULL THEN "timing_hour"  -- Keep existing hour if set
    WHEN "timing_type" = 'minutes' AND "timing_value" <= 60 THEN 8  -- Short notice = 8 AM
    WHEN "timing_type" = 'hours' AND "timing_value" <= 3 THEN 8  -- Short notice = 8 AM
    ELSE 9  -- Default to 9 AM for longer notice
  END
WHERE "timing_type" IN ('minutes', 'hours') OR "timing_hour" IS NULL;

-- AlterTable
ALTER TABLE "line_message_templates" ALTER COLUMN "timing_type" SET DEFAULT 'days',
ALTER COLUMN "timing_hour" SET NOT NULL,
ALTER COLUMN "timing_hour" SET DEFAULT 9;

-- Add check constraint to ensure only 'days' timing type is allowed
ALTER TABLE "line_message_templates" 
ADD CONSTRAINT "timing_type_days_only" 
CHECK ("timing_type" = 'days');
