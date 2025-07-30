-- CreateEnum
CREATE TYPE "ChannelType" AS ENUM ('TEACHER', 'STUDENT');

-- Add channelType column with default value
ALTER TABLE "branch_line_channels" ADD COLUMN "channel_type" "ChannelType" NOT NULL DEFAULT 'TEACHER';

-- Update existing records: if isPrimary is true, set to TEACHER, otherwise STUDENT
UPDATE "branch_line_channels" SET "channel_type" = 'TEACHER' WHERE "is_primary" = true;
UPDATE "branch_line_channels" SET "channel_type" = 'STUDENT' WHERE "is_primary" = false;

-- Drop existing constraints/indexes that may exist
-- Check and drop the unique index if it exists
DROP INDEX IF EXISTS "branch_line_channels_branch_id_channel_id_key";

-- Check and drop the partial unique index if it exists  
DROP INDEX IF EXISTS "branch_line_channels_branch_id_primary_unique";

-- Add new unique constraint for branchId and channelType
ALTER TABLE "branch_line_channels" ADD CONSTRAINT "branch_line_channels_branch_id_channel_type_key" UNIQUE ("branch_id", "channel_type");

-- Drop the isPrimary column
ALTER TABLE "branch_line_channels" DROP COLUMN "is_primary";

-- Create index for channelType
CREATE INDEX "branch_line_channels_channel_type_idx" ON "branch_line_channels"("channel_type");