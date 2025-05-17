/*
  Warnings:

  - You are about to drop the column `subject_type_id` on the `class_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `template_id` on the `class_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `birth_date` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `enrollment_date` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `exam_school_category_type` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `exam_school_type` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `first_choice_school` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `grade_id` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `home_phone` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `parent_email` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `parent_mobile` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `school_name` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `school_type` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `second_choice_school` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `student_mobile` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `birth_date` on the `teachers` table. All the data in the column will be lost.
  - You are about to drop the column `department` on the `teachers` table. All the data in the column will be lost.
  - You are about to drop the column `english_proficiency` on the `teachers` table. All the data in the column will be lost.
  - You are about to drop the column `enrollment_status` on the `teachers` table. All the data in the column will be lost.
  - You are about to drop the column `evaluation_id` on the `teachers` table. All the data in the column will be lost.
  - You are about to drop the column `faculty` on the `teachers` table. All the data in the column will be lost.
  - You are about to drop the column `high_school` on the `teachers` table. All the data in the column will be lost.
  - You are about to drop the column `kanji_certification` on the `teachers` table. All the data in the column will be lost.
  - You are about to drop the column `math_certification` on the `teachers` table. All the data in the column will be lost.
  - You are about to drop the column `mobile_number` on the `teachers` table. All the data in the column will be lost.
  - You are about to drop the column `other_certifications` on the `teachers` table. All the data in the column will be lost.
  - You are about to drop the column `other_universities` on the `teachers` table. All the data in the column will be lost.
  - You are about to drop the column `toefl` on the `teachers` table. All the data in the column will be lost.
  - You are about to drop the column `toeic` on the `teachers` table. All the data in the column will be lost.
  - You are about to drop the column `university` on the `teachers` table. All the data in the column will be lost.
  - You are about to drop the `evaluations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `grades` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `regular_class_templates` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `student_preference_subjects` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `student_preference_teachers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `student_preference_time_slots` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `student_preferences` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `subject_to_subject_types` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `subject_types` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `teacher_shift_references` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `teacher_subjects` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `template_student_assignments` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[teacher_id,date,start_time,end_time]` on the table `class_sessions` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'STAFF';

-- DropForeignKey
ALTER TABLE "class_sessions" DROP CONSTRAINT "class_sessions_subject_type_id_fkey";

-- DropForeignKey
ALTER TABLE "class_sessions" DROP CONSTRAINT "class_sessions_template_id_fkey";

-- DropForeignKey
ALTER TABLE "grades" DROP CONSTRAINT "grades_student_type_id_fkey";

-- DropForeignKey
ALTER TABLE "regular_class_templates" DROP CONSTRAINT "regular_class_templates_booth_id_fkey";

-- DropForeignKey
ALTER TABLE "regular_class_templates" DROP CONSTRAINT "regular_class_templates_class_type_id_fkey";

-- DropForeignKey
ALTER TABLE "regular_class_templates" DROP CONSTRAINT "regular_class_templates_subject_id_fkey";

-- DropForeignKey
ALTER TABLE "regular_class_templates" DROP CONSTRAINT "regular_class_templates_subject_type_id_fkey";

-- DropForeignKey
ALTER TABLE "regular_class_templates" DROP CONSTRAINT "regular_class_templates_teacher_id_fkey";

-- DropForeignKey
ALTER TABLE "student_preference_subjects" DROP CONSTRAINT "student_preference_subjects_student_preference_id_fkey";

-- DropForeignKey
ALTER TABLE "student_preference_subjects" DROP CONSTRAINT "student_preference_subjects_subject_id_fkey";

-- DropForeignKey
ALTER TABLE "student_preference_subjects" DROP CONSTRAINT "student_preference_subjects_subject_type_id_fkey";

-- DropForeignKey
ALTER TABLE "student_preference_teachers" DROP CONSTRAINT "student_preference_teachers_student_preference_id_fkey";

-- DropForeignKey
ALTER TABLE "student_preference_teachers" DROP CONSTRAINT "student_preference_teachers_teacher_id_fkey";

-- DropForeignKey
ALTER TABLE "student_preference_time_slots" DROP CONSTRAINT "student_preference_time_slots_preference_id_fkey";

-- DropForeignKey
ALTER TABLE "student_preferences" DROP CONSTRAINT "student_preferences_class_type_id_fkey";

-- DropForeignKey
ALTER TABLE "student_preferences" DROP CONSTRAINT "student_preferences_student_id_fkey";

-- DropForeignKey
ALTER TABLE "students" DROP CONSTRAINT "students_grade_id_fkey";

-- DropForeignKey
ALTER TABLE "subject_to_subject_types" DROP CONSTRAINT "subject_to_subject_types_subject_id_fkey";

-- DropForeignKey
ALTER TABLE "subject_to_subject_types" DROP CONSTRAINT "subject_to_subject_types_subject_type_id_fkey";

-- DropForeignKey
ALTER TABLE "teacher_shift_references" DROP CONSTRAINT "teacher_shift_references_teacher_id_fkey";

-- DropForeignKey
ALTER TABLE "teacher_subjects" DROP CONSTRAINT "teacher_subjects_subject_id_fkey";

-- DropForeignKey
ALTER TABLE "teacher_subjects" DROP CONSTRAINT "teacher_subjects_subject_type_id_fkey";

-- DropForeignKey
ALTER TABLE "teacher_subjects" DROP CONSTRAINT "teacher_subjects_teacher_id_fkey";

-- DropForeignKey
ALTER TABLE "teachers" DROP CONSTRAINT "teachers_evaluation_id_fkey";

-- DropForeignKey
ALTER TABLE "template_student_assignments" DROP CONSTRAINT "template_student_assignments_student_id_fkey";

-- DropForeignKey
ALTER TABLE "template_student_assignments" DROP CONSTRAINT "template_student_assignments_template_id_fkey";

-- DropIndex
DROP INDEX "class_sessions_start_time_idx";

-- DropIndex
DROP INDEX "students_grade_id_idx";

-- DropIndex
DROP INDEX "students_school_name_idx";

-- AlterTable
ALTER TABLE "class_sessions" DROP COLUMN "subject_type_id",
DROP COLUMN "template_id";

-- AlterTable
ALTER TABLE "students" DROP COLUMN "birth_date",
DROP COLUMN "enrollment_date",
DROP COLUMN "exam_school_category_type",
DROP COLUMN "exam_school_type",
DROP COLUMN "first_choice_school",
DROP COLUMN "grade_id",
DROP COLUMN "home_phone",
DROP COLUMN "parent_email",
DROP COLUMN "parent_mobile",
DROP COLUMN "school_name",
DROP COLUMN "school_type",
DROP COLUMN "second_choice_school",
DROP COLUMN "student_mobile",
ADD COLUMN     "grade_year" INTEGER,
ADD COLUMN     "line_id" VARCHAR(50),
ADD COLUMN     "student_type_id" VARCHAR(50);

-- AlterTable
ALTER TABLE "teachers" DROP COLUMN "birth_date",
DROP COLUMN "department",
DROP COLUMN "english_proficiency",
DROP COLUMN "enrollment_status",
DROP COLUMN "evaluation_id",
DROP COLUMN "faculty",
DROP COLUMN "high_school",
DROP COLUMN "kanji_certification",
DROP COLUMN "math_certification",
DROP COLUMN "mobile_number",
DROP COLUMN "other_certifications",
DROP COLUMN "other_universities",
DROP COLUMN "toefl",
DROP COLUMN "toeic",
DROP COLUMN "university",
ADD COLUMN     "kana_name" VARCHAR(100),
ADD COLUMN     "line_id" VARCHAR(50),
ALTER COLUMN "email" DROP NOT NULL;

-- DropTable
DROP TABLE "evaluations";

-- DropTable
DROP TABLE "grades";

-- DropTable
DROP TABLE "regular_class_templates";

-- DropTable
DROP TABLE "student_preference_subjects";

-- DropTable
DROP TABLE "student_preference_teachers";

-- DropTable
DROP TABLE "student_preference_time_slots";

-- DropTable
DROP TABLE "student_preferences";

-- DropTable
DROP TABLE "subject_to_subject_types";

-- DropTable
DROP TABLE "subject_types";

-- DropTable
DROP TABLE "teacher_shift_references";

-- DropTable
DROP TABLE "teacher_subjects";

-- DropTable
DROP TABLE "template_student_assignments";

-- DropEnum
DROP TYPE "SchoolType";

-- DropEnum
DROP TYPE "examSchoolType";

-- CreateIndex
CREATE UNIQUE INDEX "class_sessions_teacher_id_date_start_time_end_time_key" ON "class_sessions"("teacher_id", "date", "start_time", "end_time");

-- CreateIndex
CREATE INDEX "students_student_type_id_idx" ON "students"("student_type_id");

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_student_type_id_fkey" FOREIGN KEY ("student_type_id") REFERENCES "student_types"("student_type_id") ON DELETE SET NULL ON UPDATE CASCADE;
