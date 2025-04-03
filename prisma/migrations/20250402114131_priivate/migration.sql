/*
  Warnings:

  - The values [PRIIVATE] on the enum `SchoolType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `student_subjects` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "SchoolType_new" AS ENUM ('PUBLIC', 'PRIVATE');
ALTER TABLE "students" ALTER COLUMN "school_type" TYPE "SchoolType_new" USING ("school_type"::text::"SchoolType_new");
ALTER TABLE "students" ALTER COLUMN "exam_school_type" TYPE "SchoolType_new" USING ("exam_school_type"::text::"SchoolType_new");
ALTER TYPE "SchoolType" RENAME TO "SchoolType_old";
ALTER TYPE "SchoolType_new" RENAME TO "SchoolType";
DROP TYPE "SchoolType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "student_subjects" DROP CONSTRAINT "student_subjects_student_id_fkey";

-- DropForeignKey
ALTER TABLE "student_subjects" DROP CONSTRAINT "student_subjects_subject_id_fkey";

-- DropTable
DROP TABLE "student_subjects";
