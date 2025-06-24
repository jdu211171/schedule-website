/*
  Warnings:

  - A unique constraint covering the columns `[linking_code]` on the table `students` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[linking_code]` on the table `teachers` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "students" ADD COLUMN     "linking_code" VARCHAR(10);

-- AlterTable
ALTER TABLE "teachers" ADD COLUMN     "linking_code" VARCHAR(10);

-- CreateIndex
CREATE UNIQUE INDEX "students_linking_code_key" ON "students"("linking_code");

-- CreateIndex
CREATE UNIQUE INDEX "teachers_linking_code_key" ON "teachers"("linking_code");
