-- AlterTable
ALTER TABLE "students" ADD COLUMN "parent_line_id1" VARCHAR(50);
ALTER TABLE "students" ADD COLUMN "parent_line_id2" VARCHAR(50);

-- CreateIndex
CREATE UNIQUE INDEX "students_parent_line_id1_key" ON "students"("parent_line_id1");
CREATE UNIQUE INDEX "students_parent_line_id2_key" ON "students"("parent_line_id2");