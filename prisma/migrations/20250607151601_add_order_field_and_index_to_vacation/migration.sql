-- AlterTable
ALTER TABLE "vacations" ADD COLUMN     "order" INTEGER;

-- CreateIndex
CREATE INDEX "vacations_order_idx" ON "vacations"("order");
