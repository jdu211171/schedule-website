-- Set default after enum value exists in a previous committed migration
ALTER TABLE "branch_line_channels" ALTER COLUMN "channel_type" SET DEFAULT 'UNSPECIFIED';

