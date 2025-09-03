/*
  Warnings:

  - A unique constraint covering the columns `[teacher_id,date,start_time,end_time,is_cancelled]` on the table `class_sessions` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "CancellationReason" AS ENUM ('SICK', 'PERMANENTLY_LEFT', 'ADMIN_CANCELLED');

-- DropIndex
DROP INDEX "class_sessions_teacher_id_date_start_time_end_time_key";

-- AlterTable
ALTER TABLE "class_sessions" ADD COLUMN     "cancellation_reason" "CancellationReason",
ADD COLUMN     "cancelled_at" TIMESTAMP(6),
ADD COLUMN     "cancelled_by_user_id" TEXT,
ADD COLUMN     "is_cancelled" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "class_sessions_is_cancelled_idx" ON "class_sessions"("is_cancelled");

-- CreateIndex
CREATE UNIQUE INDEX "class_sessions_teacher_id_date_start_time_end_time_is_cance_key" ON "class_sessions"("teacher_id", "date", "start_time", "end_time", "is_cancelled");

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_cancelled_by_user_id_fkey" FOREIGN KEY ("cancelled_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
