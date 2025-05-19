/*
  Warnings:

  - You are about to drop the column `branch_id` on the `class_types` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "class_types" DROP CONSTRAINT "class_types_branch_id_fkey";

-- DropIndex
DROP INDEX "class_types_branch_id_idx";

-- AlterTable
ALTER TABLE "class_types" DROP COLUMN "branch_id";
