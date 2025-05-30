-- Rename events table to vacations
ALTER TABLE "events" RENAME TO "vacations";

-- Update the Branch relation to reference vacations instead of events
-- (This is handled automatically by the foreign key constraint names)
