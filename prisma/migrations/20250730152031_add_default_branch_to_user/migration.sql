-- AlterTable
ALTER TABLE "users" ADD COLUMN "default_branch_id" TEXT;

-- CreateIndex
CREATE INDEX "users_default_branch_id_idx" ON "users"("default_branch_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_default_branch_id_fkey" FOREIGN KEY ("default_branch_id") REFERENCES "branches"("branch_id") ON DELETE SET NULL ON UPDATE CASCADE;