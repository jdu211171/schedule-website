/*
  Warnings:

  - You are about to drop the `student_subject_preferences` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `subject_offerings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `subject_types` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `teacher_qualifications` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "student_subject_preferences" DROP CONSTRAINT "student_subject_preferences_student_id_fkey";

-- DropForeignKey
ALTER TABLE "student_subject_preferences" DROP CONSTRAINT "student_subject_preferences_subject_offering_id_fkey";

-- DropForeignKey
ALTER TABLE "subject_offerings" DROP CONSTRAINT "subject_offerings_subject_id_fkey";

-- DropForeignKey
ALTER TABLE "subject_offerings" DROP CONSTRAINT "subject_offerings_subject_type_id_fkey";

-- DropForeignKey
ALTER TABLE "teacher_qualifications" DROP CONSTRAINT "teacher_qualifications_subject_offering_id_fkey";

-- DropForeignKey
ALTER TABLE "teacher_qualifications" DROP CONSTRAINT "teacher_qualifications_teacher_id_fkey";

-- DropTable
DROP TABLE "student_subject_preferences";

-- DropTable
DROP TABLE "subject_offerings";

-- DropTable
DROP TABLE "subject_types";

-- DropTable
DROP TABLE "teacher_qualifications";
