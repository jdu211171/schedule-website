-- AlterTable
ALTER TABLE "students" ADD COLUMN     "line_notifications_enabled" BOOLEAN DEFAULT true;

-- AlterTable
ALTER TABLE "teachers" ADD COLUMN     "line_notifications_enabled" BOOLEAN DEFAULT true;
