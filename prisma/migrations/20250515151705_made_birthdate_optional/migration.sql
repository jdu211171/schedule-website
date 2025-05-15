/*
  Warnings:

  - You are about to drop the column `birthDate` on the `students` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "students" DROP COLUMN "birthDate",
ADD COLUMN     "birth_date" DATE;

-- AlterTable
ALTER TABLE "teachers" ALTER COLUMN "evaluation_id" DROP NOT NULL,
ALTER COLUMN "birth_date" DROP NOT NULL;
