-- AlterTable
ALTER TABLE "branch_scheduling_config" ADD COLUMN     "advance_generation_months" INTEGER,
ADD COLUMN     "initial_generation_months" INTEGER;

-- AlterTable
ALTER TABLE "scheduling_config" ADD COLUMN     "advance_generation_months" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "initial_generation_months" INTEGER NOT NULL DEFAULT 1;
