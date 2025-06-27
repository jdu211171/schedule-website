/*
  Warnings:

  - A unique constraint covering the columns `[line_user_id]` on the table `students` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[line_user_id]` on the table `teachers` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "students" ADD COLUMN     "line_user_id" VARCHAR(50);

-- AlterTable
ALTER TABLE "teachers" ADD COLUMN     "line_user_id" VARCHAR(50);

-- CreateIndex
CREATE UNIQUE INDEX "students_line_user_id_key" ON "students"("line_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "teachers_line_user_id_key" ON "teachers"("line_user_id");
