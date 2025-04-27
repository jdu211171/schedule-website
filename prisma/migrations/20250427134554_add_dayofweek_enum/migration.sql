/*
  Warnings:

  - The `exam_school_type` column on the `students` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `course_assignments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `course_enrollments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `intensive_courses` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `student_regular_preferences` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `student_special_preferences` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `teacher_regular_shifts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `teacher_special_shifts` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `student_id` to the `class_sessions` table without a default value. This is not possible if the table is not empty.
  - Made the column `date` on table `class_sessions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `start_time` on table `class_sessions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `end_time` on table `class_sessions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `teacher_id` on table `class_sessions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `subject_id` on table `class_sessions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `booth_id` on table `class_sessions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `class_type_id` on table `class_sessions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `score` on table `evaluations` required. This step will fail if there are existing NULL values in that column.
  - Made the column `student_type_id` on table `grades` required. This step will fail if there are existing NULL values in that column.
  - Made the column `gradeYear` on table `grades` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `day_of_week` to the `regular_class_templates` table without a default value. This is not possible if the table is not empty.
  - Made the column `subject_id` on table `regular_class_templates` required. This step will fail if there are existing NULL values in that column.
  - Made the column `booth_id` on table `regular_class_templates` required. This step will fail if there are existing NULL values in that column.
  - Made the column `teacher_id` on table `regular_class_templates` required. This step will fail if there are existing NULL values in that column.
  - Made the column `start_time` on table `regular_class_templates` required. This step will fail if there are existing NULL values in that column.
  - Made the column `end_time` on table `regular_class_templates` required. This step will fail if there are existing NULL values in that column.
  - Made the column `class_id` on table `student_class_enrollments` required. This step will fail if there are existing NULL values in that column.
  - Made the column `student_id` on table `student_class_enrollments` required. This step will fail if there are existing NULL values in that column.
  - Made the column `birthDate` on table `students` required. This step will fail if there are existing NULL values in that column.
  - Made the column `user_id` on table `students` required. This step will fail if there are existing NULL values in that column.
  - Made the column `subject_type_id` on table `subjects` required. This step will fail if there are existing NULL values in that column.
  - Made the column `evaluation_id` on table `teachers` required. This step will fail if there are existing NULL values in that column.
  - Made the column `birth_date` on table `teachers` required. This step will fail if there are existing NULL values in that column.
  - Made the column `mobile_number` on table `teachers` required. This step will fail if there are existing NULL values in that column.
  - Made the column `email` on table `teachers` required. This step will fail if there are existing NULL values in that column.
  - Made the column `high_school` on table `teachers` required. This step will fail if there are existing NULL values in that column.
  - Made the column `university` on table `teachers` required. This step will fail if there are existing NULL values in that column.
  - Made the column `faculty` on table `teachers` required. This step will fail if there are existing NULL values in that column.
  - Made the column `department` on table `teachers` required. This step will fail if there are existing NULL values in that column.
  - Made the column `enrollment_status` on table `teachers` required. This step will fail if there are existing NULL values in that column.
  - Made the column `user_id` on table `teachers` required. This step will fail if there are existing NULL values in that column.
  - Made the column `template_id` on table `template_student_assignments` required. This step will fail if there are existing NULL values in that column.
  - Made the column `student_id` on table `template_student_assignments` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- DropForeignKey
ALTER TABLE "class_sessions" DROP CONSTRAINT "class_sessions_booth_id_fkey";

-- DropForeignKey
ALTER TABLE "class_sessions" DROP CONSTRAINT "class_sessions_class_type_id_fkey";

-- DropForeignKey
ALTER TABLE "class_sessions" DROP CONSTRAINT "class_sessions_subject_id_fkey";

-- DropForeignKey
ALTER TABLE "class_sessions" DROP CONSTRAINT "class_sessions_teacher_id_fkey";

-- DropForeignKey
ALTER TABLE "course_assignments" DROP CONSTRAINT "course_assignments_course_id_fkey";

-- DropForeignKey
ALTER TABLE "course_assignments" DROP CONSTRAINT "course_assignments_teacher_id_fkey";

-- DropForeignKey
ALTER TABLE "course_enrollments" DROP CONSTRAINT "course_enrollments_course_id_fkey";

-- DropForeignKey
ALTER TABLE "course_enrollments" DROP CONSTRAINT "course_enrollments_student_id_fkey";

-- DropForeignKey
ALTER TABLE "grades" DROP CONSTRAINT "grades_student_type_id_fkey";

-- DropForeignKey
ALTER TABLE "intensive_courses" DROP CONSTRAINT "intensive_courses_grade_id_fkey";

-- DropForeignKey
ALTER TABLE "intensive_courses" DROP CONSTRAINT "intensive_courses_subject_id_fkey";

-- DropForeignKey
ALTER TABLE "regular_class_templates" DROP CONSTRAINT "regular_class_templates_booth_id_fkey";

-- DropForeignKey
ALTER TABLE "regular_class_templates" DROP CONSTRAINT "regular_class_templates_subject_id_fkey";

-- DropForeignKey
ALTER TABLE "regular_class_templates" DROP CONSTRAINT "regular_class_templates_teacher_id_fkey";

-- DropForeignKey
ALTER TABLE "student_regular_preferences" DROP CONSTRAINT "student_regular_preferences_student_id_fkey";

-- DropForeignKey
ALTER TABLE "student_regular_preferences" DROP CONSTRAINT "student_regular_preferences_subject_id_fkey";

-- DropForeignKey
ALTER TABLE "student_special_preferences" DROP CONSTRAINT "student_special_preferences_class_type_id_fkey";

-- DropForeignKey
ALTER TABLE "student_special_preferences" DROP CONSTRAINT "student_special_preferences_student_id_fkey";

-- DropForeignKey
ALTER TABLE "student_special_preferences" DROP CONSTRAINT "student_special_preferences_subject_id_fkey";

-- DropForeignKey
ALTER TABLE "students" DROP CONSTRAINT "students_user_id_fkey";

-- DropForeignKey
ALTER TABLE "subjects" DROP CONSTRAINT "subjects_subject_type_id_fkey";

-- DropForeignKey
ALTER TABLE "teacher_regular_shifts" DROP CONSTRAINT "teacher_regular_shifts_teacher_id_fkey";

-- DropForeignKey
ALTER TABLE "teacher_special_shifts" DROP CONSTRAINT "teacher_special_shifts_teacher_id_fkey";

-- DropForeignKey
ALTER TABLE "teachers" DROP CONSTRAINT "teachers_evaluation_id_fkey";

-- DropForeignKey
ALTER TABLE "teachers" DROP CONSTRAINT "teachers_user_id_fkey";

-- AlterTable
ALTER TABLE "class_sessions" ADD COLUMN     "student_id" VARCHAR(50) NOT NULL,
ALTER COLUMN "date" SET NOT NULL,
ALTER COLUMN "start_time" SET NOT NULL,
ALTER COLUMN "end_time" SET NOT NULL,
ALTER COLUMN "teacher_id" SET NOT NULL,
ALTER COLUMN "subject_id" SET NOT NULL,
ALTER COLUMN "booth_id" SET NOT NULL,
ALTER COLUMN "class_type_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "evaluations" ALTER COLUMN "score" SET NOT NULL;

-- AlterTable
ALTER TABLE "grades" ALTER COLUMN "student_type_id" SET NOT NULL,
ALTER COLUMN "gradeYear" SET NOT NULL;

-- AlterTable
ALTER TABLE "regular_class_templates" DROP COLUMN "day_of_week",
ADD COLUMN     "day_of_week" "DayOfWeek" NOT NULL,
ALTER COLUMN "subject_id" SET NOT NULL,
ALTER COLUMN "booth_id" SET NOT NULL,
ALTER COLUMN "teacher_id" SET NOT NULL,
ALTER COLUMN "start_time" SET NOT NULL,
ALTER COLUMN "end_time" SET NOT NULL;

-- AlterTable
ALTER TABLE "student_class_enrollments" ALTER COLUMN "class_id" SET NOT NULL,
ALTER COLUMN "student_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "students" DROP COLUMN "exam_school_type",
ADD COLUMN     "exam_school_type" "examSchoolType",
ALTER COLUMN "birthDate" SET NOT NULL,
ALTER COLUMN "user_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "subjects" ALTER COLUMN "subject_type_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "teachers" ALTER COLUMN "evaluation_id" SET NOT NULL,
ALTER COLUMN "birth_date" SET NOT NULL,
ALTER COLUMN "mobile_number" SET NOT NULL,
ALTER COLUMN "email" SET NOT NULL,
ALTER COLUMN "high_school" SET NOT NULL,
ALTER COLUMN "university" SET NOT NULL,
ALTER COLUMN "faculty" SET NOT NULL,
ALTER COLUMN "department" SET NOT NULL,
ALTER COLUMN "enrollment_status" SET NOT NULL,
ALTER COLUMN "user_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "template_student_assignments" ALTER COLUMN "template_id" SET NOT NULL,
ALTER COLUMN "student_id" SET NOT NULL;

-- DropTable
DROP TABLE "course_assignments";

-- DropTable
DROP TABLE "course_enrollments";

-- DropTable
DROP TABLE "intensive_courses";

-- DropTable
DROP TABLE "student_regular_preferences";

-- DropTable
DROP TABLE "student_special_preferences";

-- DropTable
DROP TABLE "teacher_regular_shifts";

-- DropTable
DROP TABLE "teacher_special_shifts";

-- DropEnum
DROP TYPE "IntensiveCourseType";

-- CreateTable
CREATE TABLE "student_preference_teachers" (
    "id" TEXT NOT NULL,
    "student_preference_id" VARCHAR(50) NOT NULL,
    "teacher_id" VARCHAR(50) NOT NULL,

    CONSTRAINT "student_preference_teachers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_preference_subjects" (
    "id" TEXT NOT NULL,
    "student_preference_id" VARCHAR(50) NOT NULL,
    "subject_id" VARCHAR(50) NOT NULL,

    CONSTRAINT "student_preference_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_preferences" (
    "preference_id" TEXT NOT NULL,
    "student_id" VARCHAR(50) NOT NULL,
    "class_type_id" VARCHAR(50),
    "notes" VARCHAR(255),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_preferences_pkey" PRIMARY KEY ("preference_id")
);

-- CreateTable
CREATE TABLE "student_preference_time_slots" (
    "slot_id" TEXT NOT NULL,
    "preference_id" VARCHAR(50) NOT NULL,
    "day_of_week" "DayOfWeek" NOT NULL,
    "start_time" TIME(6) NOT NULL,
    "end_time" TIME(6) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_preference_time_slots_pkey" PRIMARY KEY ("slot_id")
);

-- CreateTable
CREATE TABLE "teacher_shift_references" (
    "shift_id" TEXT NOT NULL,
    "teacher_id" VARCHAR(50) NOT NULL,
    "day_of_week" "DayOfWeek" NOT NULL,
    "start_time" TIME(6) NOT NULL,
    "end_time" TIME(6) NOT NULL,
    "notes" VARCHAR(255),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teacher_shift_references_pkey" PRIMARY KEY ("shift_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "student_preference_teachers_student_preference_id_teacher_i_key" ON "student_preference_teachers"("student_preference_id", "teacher_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_preference_subjects_student_preference_id_subject_i_key" ON "student_preference_subjects"("student_preference_id", "subject_id");

-- CreateIndex
CREATE INDEX "student_preference_time_slots_preference_id_day_of_week_idx" ON "student_preference_time_slots"("preference_id", "day_of_week");

-- CreateIndex
CREATE INDEX "teacher_shift_references_teacher_id_day_of_week_idx" ON "teacher_shift_references"("teacher_id", "day_of_week");

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_booth_id_fkey" FOREIGN KEY ("booth_id") REFERENCES "booths"("booth_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_class_type_id_fkey" FOREIGN KEY ("class_type_id") REFERENCES "class_types"("class_type_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("subject_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("teacher_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_preference_teachers" ADD CONSTRAINT "student_preference_teachers_student_preference_id_fkey" FOREIGN KEY ("student_preference_id") REFERENCES "student_preferences"("preference_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_preference_teachers" ADD CONSTRAINT "student_preference_teachers_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("teacher_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_preference_subjects" ADD CONSTRAINT "student_preference_subjects_student_preference_id_fkey" FOREIGN KEY ("student_preference_id") REFERENCES "student_preferences"("preference_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_preference_subjects" ADD CONSTRAINT "student_preference_subjects_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("subject_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_preferences" ADD CONSTRAINT "student_preferences_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_preferences" ADD CONSTRAINT "student_preferences_class_type_id_fkey" FOREIGN KEY ("class_type_id") REFERENCES "class_types"("class_type_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_preference_time_slots" ADD CONSTRAINT "student_preference_time_slots_preference_id_fkey" FOREIGN KEY ("preference_id") REFERENCES "student_preferences"("preference_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regular_class_templates" ADD CONSTRAINT "regular_class_templates_booth_id_fkey" FOREIGN KEY ("booth_id") REFERENCES "booths"("booth_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regular_class_templates" ADD CONSTRAINT "regular_class_templates_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("subject_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regular_class_templates" ADD CONSTRAINT "regular_class_templates_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("teacher_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_shift_references" ADD CONSTRAINT "teacher_shift_references_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("teacher_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_evaluation_id_fkey" FOREIGN KEY ("evaluation_id") REFERENCES "evaluations"("evaluation_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_subject_type_id_fkey" FOREIGN KEY ("subject_type_id") REFERENCES "subject_types"("subject_type_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grades" ADD CONSTRAINT "grades_student_type_id_fkey" FOREIGN KEY ("student_type_id") REFERENCES "student_types"("student_type_id") ON DELETE CASCADE ON UPDATE CASCADE;
