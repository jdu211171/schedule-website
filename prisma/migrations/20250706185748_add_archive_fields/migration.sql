-- AlterTable
ALTER TABLE "archives" ADD COLUMN     "branch_name" VARCHAR(100),
ADD COLUMN     "class_type_name" VARCHAR(100),
ADD COLUMN     "enrolled_students" JSONB;
