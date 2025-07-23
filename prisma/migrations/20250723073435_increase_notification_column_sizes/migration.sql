-- AlterTable
ALTER TABLE "notification_archives" ALTER COLUMN "message" SET DATA TYPE TEXT,
ALTER COLUMN "related_class_id" SET DATA TYPE VARCHAR(500);

-- AlterTable
ALTER TABLE "notifications" ALTER COLUMN "message" SET DATA TYPE TEXT,
ALTER COLUMN "related_class_id" SET DATA TYPE VARCHAR(500);
