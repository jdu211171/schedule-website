/*
  Warnings:

  - You are about to alter the column `notes` on the `booths` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `notes` on the `class_sessions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `notes` on the `class_types` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `notes` on the `course_assignments` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `notes` on the `course_enrollments` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `notes` on the `evaluations` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to drop the column `grade_year` on the `grades` table. All the data in the column will be lost.
  - You are about to alter the column `notes` on the `grades` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `message` on the `notifications` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `notes` on the `notifications` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `notes` on the `regular_class_templates` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `notes` on the `student_class_enrollments` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `notes` on the `student_regular_preferences` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `notes` on the `student_special_preferences` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `description` on the `student_types` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `notes` on the `students` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `notes` on the `subject_types` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `notes` on the `subjects` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `notes` on the `teacher_regular_shifts` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `notes` on the `teacher_special_shifts` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `notes` on the `teacher_subjects` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `other_universities` on the `teachers` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `other_certifications` on the `teachers` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `notes` on the `teachers` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `notes` on the `template_student_assignments` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to drop the `Event` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `created_at` on table `users` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
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
ALTER TABLE "student_class_enrollments" DROP CONSTRAINT "student_class_enrollments_class_id_fkey";

-- DropForeignKey
ALTER TABLE "student_class_enrollments" DROP CONSTRAINT "student_class_enrollments_student_id_fkey";

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
ALTER TABLE "students" DROP CONSTRAINT "students_grade_id_fkey";

-- DropForeignKey
ALTER TABLE "subjects" DROP CONSTRAINT "subjects_subject_type_id_fkey";

-- DropForeignKey
ALTER TABLE "teacher_regular_shifts" DROP CONSTRAINT "teacher_regular_shifts_teacher_id_fkey";

-- DropForeignKey
ALTER TABLE "teacher_special_shifts" DROP CONSTRAINT "teacher_special_shifts_teacher_id_fkey";

-- DropForeignKey
ALTER TABLE "teacher_subjects" DROP CONSTRAINT "teacher_subjects_subject_id_fkey";

-- DropForeignKey
ALTER TABLE "teacher_subjects" DROP CONSTRAINT "teacher_subjects_teacher_id_fkey";

-- DropForeignKey
ALTER TABLE "teachers" DROP CONSTRAINT "teachers_evaluation_id_fkey";

-- DropForeignKey
ALTER TABLE "template_student_assignments" DROP CONSTRAINT "template_student_assignments_student_id_fkey";

-- DropForeignKey
ALTER TABLE "template_student_assignments" DROP CONSTRAINT "template_student_assignments_template_id_fkey";

-- AlterTable
ALTER TABLE "booths" ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "notes" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "class_sessions" ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "notes" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "class_types" ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "notes" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "course_assignments" ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "notes" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "course_enrollments" ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "notes" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "evaluations" ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "notes" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "grades" DROP COLUMN "grade_year",
ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "gradeYear" INTEGER,
ADD COLUMN     "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "notes" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "intensive_courses" ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "message" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "notes" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "regular_class_templates" ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "notes" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "student_class_enrollments" ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "notes" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "student_regular_preferences" ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "notes" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "student_special_preferences" ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "notes" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "student_types" ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "description" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "notes" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "subject_types" ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "notes" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "subjects" ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "notes" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "teacher_regular_shifts" ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "notes" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "teacher_special_shifts" ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "notes" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "teacher_subjects" ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "notes" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "teachers" ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "other_universities" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "other_certifications" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "notes" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "template_student_assignments" ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "notes" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL;

-- DropTable
DROP TABLE "Event";

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "class_sessions_date_idx" ON "class_sessions"("date");

-- CreateIndex
CREATE INDEX "class_sessions_start_time_idx" ON "class_sessions"("start_time");

-- CreateIndex
CREATE INDEX "class_sessions_teacher_id_idx" ON "class_sessions"("teacher_id");

-- CreateIndex
CREATE INDEX "students_grade_id_idx" ON "students"("grade_id");

-- CreateIndex
CREATE INDEX "students_school_name_idx" ON "students"("school_name");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_is_active_idx" ON "users"("is_active");

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_booth_id_fkey" FOREIGN KEY ("booth_id") REFERENCES "booths"("booth_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_class_type_id_fkey" FOREIGN KEY ("class_type_id") REFERENCES "class_types"("class_type_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("subject_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("teacher_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_grade_id_fkey" FOREIGN KEY ("grade_id") REFERENCES "grades"("grade_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_class_enrollments" ADD CONSTRAINT "student_class_enrollments_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "class_sessions"("class_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_class_enrollments" ADD CONSTRAINT "student_class_enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_regular_preferences" ADD CONSTRAINT "student_regular_preferences_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_regular_preferences" ADD CONSTRAINT "student_regular_preferences_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("subject_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_special_preferences" ADD CONSTRAINT "student_special_preferences_class_type_id_fkey" FOREIGN KEY ("class_type_id") REFERENCES "class_types"("class_type_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_special_preferences" ADD CONSTRAINT "student_special_preferences_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_special_preferences" ADD CONSTRAINT "student_special_preferences_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("subject_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_student_assignments" ADD CONSTRAINT "template_student_assignments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_student_assignments" ADD CONSTRAINT "template_student_assignments_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "regular_class_templates"("template_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regular_class_templates" ADD CONSTRAINT "regular_class_templates_booth_id_fkey" FOREIGN KEY ("booth_id") REFERENCES "booths"("booth_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regular_class_templates" ADD CONSTRAINT "regular_class_templates_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("subject_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regular_class_templates" ADD CONSTRAINT "regular_class_templates_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("teacher_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_regular_shifts" ADD CONSTRAINT "teacher_regular_shifts_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("teacher_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_special_shifts" ADD CONSTRAINT "teacher_special_shifts_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("teacher_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_subjects" ADD CONSTRAINT "teacher_subjects_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("subject_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_subjects" ADD CONSTRAINT "teacher_subjects_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("teacher_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_evaluation_id_fkey" FOREIGN KEY ("evaluation_id") REFERENCES "evaluations"("evaluation_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_subject_type_id_fkey" FOREIGN KEY ("subject_type_id") REFERENCES "subject_types"("subject_type_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grades" ADD CONSTRAINT "grades_student_type_id_fkey" FOREIGN KEY ("student_type_id") REFERENCES "student_types"("student_type_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intensive_courses" ADD CONSTRAINT "intensive_courses_grade_id_fkey" FOREIGN KEY ("grade_id") REFERENCES "grades"("grade_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intensive_courses" ADD CONSTRAINT "intensive_courses_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("subject_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_assignments" ADD CONSTRAINT "course_assignments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "intensive_courses"("course_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_assignments" ADD CONSTRAINT "course_assignments_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("teacher_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "intensive_courses"("course_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE CASCADE;
