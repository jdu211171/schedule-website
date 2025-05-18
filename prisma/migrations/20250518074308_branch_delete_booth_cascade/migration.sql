-- DropForeignKey
ALTER TABLE "booths" DROP CONSTRAINT "booths_branch_id_fkey";

-- AddForeignKey
ALTER TABLE "booths" ADD CONSTRAINT "booths_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE CASCADE ON UPDATE CASCADE;
