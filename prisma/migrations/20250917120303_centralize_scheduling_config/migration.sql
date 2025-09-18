/*
  Warnings:

  - You are about to drop the column `conflict_policy` on the `class_series` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "class_series" DROP COLUMN "conflict_policy";

-- CreateTable
CREATE TABLE "scheduling_config" (
    "config_id" TEXT NOT NULL DEFAULT 'GLOBAL',
    "mark_teacher_conflict" BOOLEAN NOT NULL DEFAULT true,
    "mark_student_conflict" BOOLEAN NOT NULL DEFAULT true,
    "mark_booth_conflict" BOOLEAN NOT NULL DEFAULT true,
    "mark_teacher_unavailable" BOOLEAN NOT NULL DEFAULT false,
    "mark_student_unavailable" BOOLEAN NOT NULL DEFAULT false,
    "mark_teacher_wrong_time" BOOLEAN NOT NULL DEFAULT false,
    "mark_student_wrong_time" BOOLEAN NOT NULL DEFAULT false,
    "mark_no_shared_availability" BOOLEAN NOT NULL DEFAULT false,
    "allow_outside_availability_teacher" BOOLEAN NOT NULL DEFAULT false,
    "allow_outside_availability_student" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scheduling_config_pkey" PRIMARY KEY ("config_id")
);

-- CreateTable
CREATE TABLE "branch_scheduling_config" (
    "branch_id" TEXT NOT NULL,
    "mark_teacher_conflict" BOOLEAN,
    "mark_student_conflict" BOOLEAN,
    "mark_booth_conflict" BOOLEAN,
    "mark_teacher_unavailable" BOOLEAN,
    "mark_student_unavailable" BOOLEAN,
    "mark_teacher_wrong_time" BOOLEAN,
    "mark_student_wrong_time" BOOLEAN,
    "mark_no_shared_availability" BOOLEAN,
    "allow_outside_availability_teacher" BOOLEAN,
    "allow_outside_availability_student" BOOLEAN,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "branch_scheduling_config_pkey" PRIMARY KEY ("branch_id")
);

-- AddForeignKey
ALTER TABLE "branch_scheduling_config" ADD CONSTRAINT "branch_scheduling_config_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE CASCADE ON UPDATE CASCADE;
