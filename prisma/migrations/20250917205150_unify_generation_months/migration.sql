/*
  Warnings:

  - You are about to drop the column `advance_generation_months` on the `branch_scheduling_config` table. All the data in the column will be lost.
  - You are about to drop the column `initial_generation_months` on the `branch_scheduling_config` table. All the data in the column will be lost.
  - You are about to drop the column `advance_generation_months` on the `scheduling_config` table. All the data in the column will be lost.
  - You are about to drop the column `initial_generation_months` on the `scheduling_config` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "branch_scheduling_config" DROP COLUMN "advance_generation_months",
DROP COLUMN "initial_generation_months",
ADD COLUMN     "generation_months" INTEGER;

-- AlterTable
ALTER TABLE "scheduling_config" DROP COLUMN "advance_generation_months",
DROP COLUMN "initial_generation_months",
ADD COLUMN     "generation_months" INTEGER NOT NULL DEFAULT 1;
