-- CreateEnum
CREATE TYPE "SchoolType" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "ExamCategory" AS ENUM ('BEGINNER', 'ELEMENTARY', 'HIGH_SCHOOL', 'UNIVERSITY');

-- CreateEnum
CREATE TYPE "ExamCategoryType" AS ENUM ('PUBLIC', 'PRIVATE');

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "birth_date" DATE,
ADD COLUMN     "exam_category" "ExamCategory",
ADD COLUMN     "exam_category_type" "ExamCategoryType",
ADD COLUMN     "exam_date" DATE,
ADD COLUMN     "first_choice" VARCHAR(255),
ADD COLUMN     "home_phone" VARCHAR(50),
ADD COLUMN     "parent_email" VARCHAR(100),
ADD COLUMN     "parent_phone" VARCHAR(50),
ADD COLUMN     "school_name" VARCHAR(255),
ADD COLUMN     "school_type" "SchoolType",
ADD COLUMN     "second_choice" VARCHAR(255),
ADD COLUMN     "student_phone" VARCHAR(50);
