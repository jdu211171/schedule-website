/*
  Warnings:

  - You are about to drop the column `day_of_week` on the `student_regular_preferences` table. All the data in the column will be lost.
  - You are about to drop the column `end_time` on the `student_regular_preferences` table. All the data in the column will be lost.
  - You are about to drop the column `start_time` on the `student_regular_preferences` table. All the data in the column will be lost.
  - You are about to drop the `student_preferences` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[class_id,student_id]` on the table `student_class_enrollments` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "student_preferences" DROP CONSTRAINT "student_preferences_student_id_fkey";

-- AlterTable
ALTER TABLE "class_sessions" ADD COLUMN     "template_id" VARCHAR(50);

-- AlterTable
ALTER TABLE "regular_class_templates" ADD COLUMN     "end_date" DATE,
ADD COLUMN     "start_date" DATE;

-- AlterTable
ALTER TABLE "student_regular_preferences" DROP COLUMN "day_of_week",
DROP COLUMN "end_time",
DROP COLUMN "start_time",
ADD COLUMN     "preferredSubjects" TEXT[],
ADD COLUMN     "preferredTeachers" TEXT[],
ADD COLUMN     "preferred_weekdays_times" JSONB;

-- DropTable
DROP TABLE "student_preferences";

-- CreateIndex
CREATE UNIQUE INDEX "student_class_enrollments_class_id_student_id_key" ON "student_class_enrollments"("class_id", "student_id");

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "regular_class_templates"("template_id") ON DELETE SET NULL ON UPDATE CASCADE;
