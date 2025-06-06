-- AlterTable
ALTER TABLE "branches" ADD COLUMN     "order" INTEGER;

-- CreateIndex
CREATE INDEX "branches_order_idx" ON "branches"("order");
