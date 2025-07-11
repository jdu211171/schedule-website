-- Convert existing minute/hour-based templates to day-based templates
-- For templates with minutes < 1440 (24 hours), convert to same-day (0 days) notification
-- For templates with hours < 24, convert to same-day (0 days) notification
-- Otherwise, convert to appropriate number of days

-- First, add a default timing_hour for templates that don't have one
UPDATE "line_message_templates" 
SET "timing_hour" = 9 
WHERE "timing_hour" IS NULL;

-- Convert minute-based templates
UPDATE "line_message_templates" 
SET 
  "timing_type" = 'days',
  "timing_value" = CASE
    WHEN "timing_value" < 1440 THEN 0  -- Less than 24 hours = same day
    ELSE "timing_value" / 1440          -- Convert minutes to days
  END,
  "timing_hour" = CASE
    WHEN "timing_value" < 1440 THEN 
      -- For same-day notifications, calculate the hour based on minutes before
      -- If it's 30 minutes before, and we assume classes are around noon,
      -- we'll default to morning notifications (8 AM)
      8
    ELSE 
      COALESCE("timing_hour", 9)  -- For multi-day, keep existing or default to 9 AM
  END
WHERE "timing_type" = 'minutes';

-- Convert hour-based templates
UPDATE "line_message_templates" 
SET 
  "timing_type" = 'days',
  "timing_value" = CASE
    WHEN "timing_value" < 24 THEN 0    -- Less than 24 hours = same day
    ELSE "timing_value" / 24            -- Convert hours to days
  END,
  "timing_hour" = CASE
    WHEN "timing_value" < 24 THEN 
      -- For same-day notifications, default to 8 AM
      8
    ELSE 
      COALESCE("timing_hour", 9)  -- For multi-day, keep existing or default to 9 AM
  END
WHERE "timing_type" = 'hours';

-- Ensure all templates now have valid timing_hour values
UPDATE "line_message_templates" 
SET "timing_hour" = 9 
WHERE "timing_hour" IS NULL OR "timing_hour" < 0 OR "timing_hour" > 23;