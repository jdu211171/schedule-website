-- Add comprehensive constraints for UserAvailability model
-- These constraints enforce business rules at the database level

-- 1. Ensure REGULAR availability has dayOfWeek and no date
ALTER TABLE "user_availability"
ADD CONSTRAINT "chk_regular_has_dayofweek"
CHECK (
  (type = 'REGULAR' AND "dayOfWeek" IS NOT NULL AND date IS NULL)
  OR type != 'REGULAR'
);

-- 2. Ensure EXCEPTION availability has date and no dayOfWeek
ALTER TABLE "user_availability"
ADD CONSTRAINT "chk_exception_has_date"
CHECK (
  (type = 'EXCEPTION' AND date IS NOT NULL AND "dayOfWeek" IS NULL)
  OR type != 'EXCEPTION'
);

-- 3. Ensure fullDay consistency with time fields
ALTER TABLE "user_availability"
ADD CONSTRAINT "chk_fullday_time_consistency"
CHECK (
  (
    "fullDay" = true
    AND "startTime" IS NULL
    AND "endTime" IS NULL
  ) OR (
    ("fullDay" = false OR "fullDay" IS NULL)
    AND (
      ("startTime" IS NOT NULL AND "endTime" IS NOT NULL)
      OR ("startTime" IS NULL AND "endTime" IS NULL)
    )
  )
);

-- 4. Ensure endTime is after startTime when both are provided
ALTER TABLE "user_availability"
ADD CONSTRAINT "chk_time_order"
CHECK (
  "startTime" IS NULL
  OR "endTime" IS NULL
  OR "endTime" > "startTime"
);

-- 5. Prevent overlapping time-specific availability slots
-- For REGULAR availability with specific time ranges (not full-day)
CREATE UNIQUE INDEX "idx_unique_regular_time_slots"
ON "user_availability" ("user_id", "dayOfWeek", "startTime", "endTime")
WHERE type = 'REGULAR' AND "fullDay" = false AND "startTime" IS NOT NULL AND "endTime" IS NOT NULL;

-- For EXCEPTION availability with specific time ranges (not full-day)
CREATE UNIQUE INDEX "idx_unique_exception_time_slots"
ON "user_availability" ("user_id", date, "startTime", "endTime")
WHERE type = 'EXCEPTION' AND "fullDay" = false AND "startTime" IS NOT NULL AND "endTime" IS NOT NULL;

-- 6. Prevent multiple full-day availabilities for the same user/day
-- For REGULAR full-day availability (only one per user per dayOfWeek)
CREATE UNIQUE INDEX "idx_unique_regular_fullday_only"
ON "user_availability" ("user_id", "dayOfWeek")
WHERE type = 'REGULAR' AND "fullDay" = true;

-- For EXCEPTION full-day availability (only one per user per date)
CREATE UNIQUE INDEX "idx_unique_exception_fullday_only"
ON "user_availability" ("user_id", date)
WHERE type = 'EXCEPTION' AND "fullDay" = true;

-- 7. Prevent multiple unavailable slots for the same user/day
-- For REGULAR unavailable (startTime and endTime are null, fullDay is false)
CREATE UNIQUE INDEX "idx_unique_regular_unavailable"
ON "user_availability" ("user_id", "dayOfWeek")
WHERE type = 'REGULAR' AND "fullDay" = false AND "startTime" IS NULL AND "endTime" IS NULL;

-- For EXCEPTION unavailable (startTime and endTime are null, fullDay is false)
CREATE UNIQUE INDEX "idx_unique_exception_unavailable"
ON "user_availability" ("user_id", date)
WHERE type = 'EXCEPTION' AND "fullDay" = false AND "startTime" IS NULL AND "endTime" IS NULL;
