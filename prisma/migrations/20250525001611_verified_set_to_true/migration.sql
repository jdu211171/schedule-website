/*
  Warnings:

  - You are about to drop the column `qualification_date` on the `teacher_qualifications` table. All the data in the column will be lost.
  - You are about to drop the column `verified_by` on the `teacher_qualifications` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "teacher_qualifications" DROP COLUMN "qualification_date",
DROP COLUMN "verified_by",
ALTER COLUMN "verified" SET DEFAULT true;
