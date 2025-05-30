-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AvailabilityType" AS ENUM ('REGULAR', 'EXCEPTION');

-- AlterTable
ALTER TABLE "vacations" RENAME CONSTRAINT "events_pkey" TO "vacations_pkey";

-- CreateTable
CREATE TABLE "user_availability" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek",
    "date" DATE,
    "startTime" TIME(6),
    "endTime" TIME(6),
    "fullDay" BOOLEAN DEFAULT false,
    "type" "AvailabilityType" NOT NULL,
    "status" "AvailabilityStatus" NOT NULL DEFAULT 'PENDING',
    "reason" VARCHAR(255),
    "notes" VARCHAR(255),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_availability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_availability_user_id_type_status_idx" ON "user_availability"("user_id", "type", "status");

-- CreateIndex
CREATE INDEX "user_availability_date_idx" ON "user_availability"("date");

-- CreateIndex
CREATE INDEX "user_availability_dayOfWeek_idx" ON "user_availability"("dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "user_availability_user_id_date_key" ON "user_availability"("user_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "user_availability_user_id_dayOfWeek_startTime_endTime_key" ON "user_availability"("user_id", "dayOfWeek", "startTime", "endTime");

-- RenameForeignKey
ALTER TABLE "vacations" RENAME CONSTRAINT "events_branch_id_fkey" TO "vacations_branch_id_fkey";

-- AddForeignKey
ALTER TABLE "user_availability" ADD CONSTRAINT "user_availability_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "events_branch_id_idx" RENAME TO "vacations_branch_id_idx";
