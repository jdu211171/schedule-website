-- CreateEnum
CREATE TYPE "LineAccountSlot" AS ENUM ('student', 'parent');

-- DropIndex
DROP INDEX "students_parent_line_id2_key";

-- DropIndex
DROP INDEX "notifications_recipient_id_recipient_type_notification_type_key";

-- AlterTable
ALTER TABLE "students" DROP COLUMN "parent_line_id2";

-- CreateTable
CREATE TABLE "teacher_line_links" (
    "id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "line_user_id" VARCHAR(50) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teacher_line_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_line_links" (
    "id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "account_slot" "LineAccountSlot" NOT NULL,
    "line_user_id" VARCHAR(50) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_line_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "teacher_line_links_teacher_id_idx" ON "teacher_line_links"("teacher_id");

-- CreateIndex
CREATE INDEX "teacher_line_links_channel_id_idx" ON "teacher_line_links"("channel_id");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_line_links_channel_id_teacher_id_key" ON "teacher_line_links"("channel_id", "teacher_id");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_line_links_channel_id_line_user_id_key" ON "teacher_line_links"("channel_id", "line_user_id");

-- CreateIndex
CREATE INDEX "student_line_links_student_id_idx" ON "student_line_links"("student_id");

-- CreateIndex
CREATE INDEX "student_line_links_channel_id_idx" ON "student_line_links"("channel_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_line_links_channel_id_student_id_account_slot_key" ON "student_line_links"("channel_id", "student_id", "account_slot");

-- CreateIndex
CREATE UNIQUE INDEX "student_line_links_channel_id_line_user_id_key" ON "student_line_links"("channel_id", "line_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_recipient_id_recipient_type_notification_type_key" ON "notifications"("recipient_id", "recipient_type", "notification_type", "target_date", "branch_id");

-- AddForeignKey
ALTER TABLE "teacher_line_links" ADD CONSTRAINT "teacher_line_links_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "line_channels"("channel_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_line_links" ADD CONSTRAINT "teacher_line_links_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("teacher_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_line_links" ADD CONSTRAINT "student_line_links_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "line_channels"("channel_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_line_links" ADD CONSTRAINT "student_line_links_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE CASCADE;

