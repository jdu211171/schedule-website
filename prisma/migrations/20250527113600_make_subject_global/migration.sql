/*
  Warnings:

  - You are about to drop the column `branch_id` on the `subjects` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `subjects` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "subjects" DROP CONSTRAINT "subjects_branch_id_fkey";

-- DropIndex
DROP INDEX "subjects_branch_id_idx";

-- DropIndex
DROP INDEX "subjects_name_branch_id_key";

-- AlterTable
ALTER TABLE "subjects" DROP COLUMN "branch_id";

-- CreateIndex
CREATE UNIQUE INDEX "subjects_name_key" ON "subjects"("name");
