/*
  Warnings:

  - Made the column `branch_id` on table `vacations` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "vacations" DROP CONSTRAINT "vacations_branch_id_fkey";

-- AlterTable
ALTER TABLE "vacations" ALTER COLUMN "branch_id" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "vacations" ADD CONSTRAINT "vacations_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE RESTRICT ON UPDATE CASCADE;
