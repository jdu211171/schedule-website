/*
  Warnings:

  - You are about to drop the column `subject_type_id` on the `subjects` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "subjects" DROP CONSTRAINT "subjects_subject_type_id_fkey";

-- AlterTable
ALTER TABLE "subjects" DROP COLUMN "subject_type_id";
