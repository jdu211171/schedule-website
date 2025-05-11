/*
  Warnings:

  - Added the required column `class_type_id` to the `regular_class_templates` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "regular_class_templates" ADD COLUMN     "class_type_id" VARCHAR(50) NOT NULL;

-- AddForeignKey
ALTER TABLE "regular_class_templates" ADD CONSTRAINT "regular_class_templates_class_type_id_fkey" FOREIGN KEY ("class_type_id") REFERENCES "class_types"("class_type_id") ON DELETE RESTRICT ON UPDATE CASCADE;
