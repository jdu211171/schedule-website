/*
  Warnings:

  - The primary key for the `teacher_subjects` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "teacher_subjects" DROP CONSTRAINT "teacher_subjects_pkey",
ADD CONSTRAINT "teacher_subjects_pkey" PRIMARY KEY ("teacher_id", "subject_id", "subject_type_id");
