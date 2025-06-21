/*
  Warnings:

  - A unique constraint covering the columns `[line_id]` on the table `students` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[line_id]` on the table `teachers` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "students_line_id_key" ON "students"("line_id");

-- CreateIndex
CREATE UNIQUE INDEX "teachers_line_id_key" ON "teachers"("line_id");
