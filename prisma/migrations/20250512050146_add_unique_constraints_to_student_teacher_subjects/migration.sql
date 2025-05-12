/*
  Warnings:

  - A unique constraint covering the columns `[student_preference_id,subject_type_id]` on the table `student_preference_subjects` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[teacher_id,subject_type_id]` on the table `teacher_subjects` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "student_preference_subjects" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "student_preference_subjects_student_preference_id_subject_t_key" ON "student_preference_subjects"("student_preference_id", "subject_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_subjects_teacher_id_subject_type_id_key" ON "teacher_subjects"("teacher_id", "subject_type_id");
