-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "target_date" DATE;

-- CreateIndex
CREATE INDEX "notifications_target_date_20250719_idx" ON "notifications"("target_date");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_unique_daily_20250719" ON "notifications"("recipient_id", "recipient_type", "notification_type", "target_date");