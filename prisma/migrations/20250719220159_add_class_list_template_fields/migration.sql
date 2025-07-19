-- AlterTable
ALTER TABLE "line_message_templates" ADD COLUMN     "class_list_item_template" TEXT,
ADD COLUMN     "class_list_summary_template" TEXT;

-- RenameIndex
ALTER INDEX "notifications_target_date_20250719_idx" RENAME TO "notifications_target_date_idx";

-- RenameIndex
ALTER INDEX "notifications_unique_daily_20250719" RENAME TO "notifications_recipient_id_recipient_type_notification_type_key";
