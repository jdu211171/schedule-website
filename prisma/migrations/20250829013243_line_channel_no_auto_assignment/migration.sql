-- AlterEnum
ALTER TYPE "ChannelType" ADD VALUE 'UNSPECIFIED';

-- Drop unique constraint instead of index (Postgres requires dropping constraint)
ALTER TABLE "branch_line_channels" DROP CONSTRAINT IF EXISTS "branch_line_channels_branch_id_channel_type_key";

-- AlterTable
ALTER TABLE "branch_line_channels" ALTER COLUMN "channel_type" SET DEFAULT 'UNSPECIFIED';

-- AlterTable
ALTER TABLE "notifications" ALTER COLUMN "template_id" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'STUDENT';
