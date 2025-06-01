/*
  Warnings:

  - A unique constraint covering the columns `[user_id,dayOfWeek,startTime,endTime]` on the table `user_availability` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id,date,startTime,endTime]` on the table `user_availability` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "user_availability_date_idx";

-- DropIndex
DROP INDEX "user_availability_dayOfWeek_idx";

-- DropIndex
DROP INDEX "user_availability_user_id_dayOfWeek_idx";

-- CreateIndex
CREATE INDEX "idx_date_status" ON "user_availability"("date", "status");

-- CreateIndex
CREATE INDEX "idx_dayofweek_status" ON "user_availability"("dayOfWeek", "status");

-- CreateIndex
CREATE INDEX "idx_user_dayofweek_status" ON "user_availability"("user_id", "dayOfWeek", "status");

-- CreateIndex
CREATE INDEX "idx_user_date_status" ON "user_availability"("user_id", "date", "status");

-- CreateIndex
CREATE INDEX "idx_user_type_dayofweek_status" ON "user_availability"("user_id", "type", "dayOfWeek", "status");

-- CreateIndex
CREATE INDEX "idx_user_type_date_status" ON "user_availability"("user_id", "type", "date", "status");

-- CreateIndex
CREATE INDEX "idx_status_type" ON "user_availability"("status", "type");

-- CreateIndex
CREATE INDEX "idx_created_at" ON "user_availability"("created_at");

-- CreateIndex
CREATE INDEX "idx_time_range" ON "user_availability"("startTime", "endTime");

-- CreateIndex
CREATE UNIQUE INDEX "user_availability_user_id_dayOfWeek_startTime_endTime_key" ON "user_availability"("user_id", "dayOfWeek", "startTime", "endTime");

-- CreateIndex
CREATE UNIQUE INDEX "user_availability_user_id_date_startTime_endTime_key" ON "user_availability"("user_id", "date", "startTime", "endTime");

-- RenameIndex
ALTER INDEX "user_availability_user_id_type_status_idx" RENAME TO "idx_user_type_status";
