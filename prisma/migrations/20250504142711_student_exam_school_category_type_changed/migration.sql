/*
  Warnings:

  - The `exam_school_type` column on the `students` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `exam_school_category_type` column on the `students` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "students" DROP COLUMN "exam_school_type",
ADD COLUMN     "exam_school_type" "SchoolType",
DROP COLUMN "exam_school_category_type",
ADD COLUMN     "exam_school_category_type" "examSchoolType";
